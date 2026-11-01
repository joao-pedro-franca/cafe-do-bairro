import assert from 'node:assert/strict'
import test from 'node:test'
import { criarEncomenda, consultarDisponibilidade, ErroEncomenda } from '../src/services/encomendas.ts'
import { comPrecos } from './fixtures/precos.mjs'

const dados = { nomeCliente: 'Cliente de Teste', telefone: '(73) 99999-9999', dataEntrega: '2099-12-25', incluirPaoDeQueijo: true, itens: [{ produto: 'bolo-cenoura', quantidade: 1 }] }

test('POST público envia quantidade e demais campos sem credenciais e aceita somente 201 com ID/status válidos', async (t) => {
  const confirmado = comPrecos({ id: 42, status: 'recebida', itens: dados.itens, totalBolos: 1, incluirPaoDeQueijo: true })
  const chamada = t.mock.method(globalThis, 'fetch', async () => Response.json(confirmado, { status: 201 }))
  assert.deepEqual(await criarEncomenda(dados), confirmado)
  const [url, opcoes] = chamada.mock.calls[0].arguments
  assert.equal(url, '/api/encomendas')
  assert.equal(opcoes.method, 'POST')
  assert.deepEqual(JSON.parse(opcoes.body), dados)
  assert.deepEqual(opcoes.headers, { 'Content-Type': 'application/json' })
  assert.equal(opcoes.credentials, 'omit')
  assert.equal(opcoes.redirect, 'error')
})

test('409 tem mensagem para escolher outra data', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ erro: 'Data esgotada.' }, { status: 409 }))
  await assert.rejects(criarEncomenda(dados), (erro) => erro instanceof ErroEncomenda && erro.status === 409 && /ajuste a quantidade/.test(erro.message))
})

test('400 apresenta a mensagem de validação do servidor', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ erro: 'Escolha amanhã ou depois.' }, { status: 400 }))
  await assert.rejects(criarEncomenda(dados), { status: 400, message: 'Escolha amanhã ou depois.' })
})

test('não confirma com outros códigos HTTP nem com resposta 201 incompleta', async (t) => {
  const chamada = t.mock.method(globalThis, 'fetch')
  for (const status of [200, 202, 500, 503]) {
    chamada.mock.mockImplementation(async () => Response.json({ id: 1, status: 'recebida' }, { status }))
    await assert.rejects(criarEncomenda(dados), /Não foi possível obter a confirmação/)
  }
  for (const corpo of [{}, { id: 0, status: 'recebida' }, { id: 1, status: 'entregue' }, { id: '1', status: 'recebida' }]) {
    chamada.mock.mockImplementation(async () => Response.json(corpo, { status: 201 }))
    await assert.rejects(criarEncomenda(dados), /Não foi possível obter a confirmação/)
  }
})

test('resposta que não é JSON não vira confirmação nem expõe HTML interno', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>Erro interno</html>', { status: 502 }))
  await assert.rejects(criarEncomenda(dados), (erro) => !erro.message.includes('<html>') && /confirmação/.test(erro.message))
})

test('falha de rede/timeout não repete POST automaticamente e avisa sobre resultado incerto', async (t) => {
  const chamada = t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch') })
  await assert.rejects(criarEncomenda(dados), /pode ter sido recebido/)
  assert.equal(chamada.mock.callCount(), 1)
})

test('consulta pública sem credenciais não usa cache e devolve apenas agregados válidos', async (t) => {
  const saldo = { data: dados.dataEntrega, limiteDiario: 5, quantidadeReservada: 3, quantidadeDisponivel: 2 }
  const chamada = t.mock.method(globalThis, 'fetch', async () => Response.json(saldo))
  assert.deepEqual(await consultarDisponibilidade(dados.dataEntrega), saldo)
  const [url, opcoes] = chamada.mock.calls[0].arguments
  assert.equal(url, `/api/disponibilidade?data=${dados.dataEntrega}`)
  assert.equal(opcoes.credentials, 'omit')
  assert.equal(opcoes.cache, 'no-store')
  assert.equal(opcoes.headers, undefined)
})

test('resposta de disponibilidade inconsistente ou de outra data é recusada', async (t) => {
  const chamada = t.mock.method(globalThis, 'fetch')
  for (const corpo of [{}, { data: '2099-12-26', limiteDiario: 5, quantidadeReservada: 3, quantidadeDisponivel: 2 }, { data: dados.dataEntrega, limiteDiario: 5, quantidadeReservada: 3, quantidadeDisponivel: 5 }]) {
    chamada.mock.mockImplementation(async () => Response.json(corpo))
    await assert.rejects(consultarDisponibilidade(dados.dataEntrega))
  }
})

test('resumo público só é confirmado com itens válidos e total coerente na resposta', async (t) => {
  const chamada = t.mock.method(globalThis, 'fetch')
  for (const corpo of [
    { id: 1, status: 'recebida', itens: dados.itens, totalBolos: 4 },
    { id: 1, status: 'recebida', itens: [], totalBolos: 0 },
    { id: 1, status: 'recebida', itens: [dados.itens[0], dados.itens[0]], totalBolos: 2 },
  ]) {
    chamada.mock.mockImplementation(async () => Response.json(corpo, { status: 201 }))
    await assert.rejects(criarEncomenda(dados), /Não foi possível obter a confirmação/)
  }
})
