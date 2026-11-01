import assert from 'node:assert/strict'
import test from 'node:test'
import { join } from 'node:path'
import { apiTeste, pastaTemporaria, pedido } from './helpers.ts'
import { cafeConfig } from '../../frontend/src/data/cafeConfig.ts'
import { dataMinima, validarEntrada } from '../src/encomenda.ts'
import { PRODUTOS_ENCOMENDAVEIS, FUSO_HORARIO } from '../src/config.ts'

test('CRUD HTTP completo: cria recebida, lista, consulta, edita dados/status e remove', async (t) => {
  const api = await apiTeste(t)
  const criado = await api.request('POST', '', pedido, false)
  assert.equal(criado.status, 201)
  assert.deepEqual(criado.dados, { ...pedido, telefone: '73999999999', id: 1, status: 'recebida', totalBolos: 1 })
  assert.equal(criado.headers.get('location'), '/api/encomendas/1')
  assert.equal(criado.headers.get('cache-control'), 'no-store')
  assert.deepEqual((await api.request('GET')).dados, [criado.dados])
  assert.deepEqual((await api.request('GET', '/1')).dados, criado.dados)
  const alterado = await api.request('PATCH', '/1', { nomeCliente: 'Outra Cliente', telefone: '+55 (73) 3333-3333', dataEntrega: '2026-11-03', incluirPaoDeQueijo: false, status: 'em preparo', itens: [{ produto: 'bolo-coco', quantidade: 1 }] })
  assert.equal(alterado.status, 200)
  assert.deepEqual(alterado.dados, { totalBolos: 1, id: 1, nomeCliente: 'Outra Cliente', telefone: '557333333333', dataEntrega: '2026-11-03', incluirPaoDeQueijo: false, status: 'em preparo', itens: [{ produto: 'bolo-coco', quantidade: 1 }] })
  assert.equal((await api.request('PATCH', '/1', { status: 'entregue' })).dados.status, 'entregue')
  assert.equal((await api.request('DELETE', '/1')).status, 204)
  assert.deepEqual((await api.request('GET')).dados, [])
})

test('adicional omitido fica false e status inicial não pode ser escolhido pelo cliente', async (t) => {
  const api = await apiTeste(t)
  const { incluirPaoDeQueijo: _adicional, ...semAdicional } = pedido
  assert.equal((await api.request('POST', '', semAdicional)).dados.incluirPaoDeQueijo, false)
  assert.equal((await api.request('POST', '', { ...pedido, status: 'entregue' })).status, 400)
})

test('capacidade conta todos os status, recusa a sexta e permite outras datas', async (t) => {
  const api = await apiTeste(t)
  for (let i = 0; i < 5; i++) assert.equal((await api.request('POST', '', pedido)).status, 201)
  await api.request('PATCH', '/1', { status: 'entregue' })
  await api.request('PATCH', '/2', { status: 'em preparo' })
  const sexto = await api.request('POST', '', pedido)
  assert.equal(sexto.status, 409)
  assert.equal((await api.request('GET')).dados.length, 5)
  assert.equal((await api.request('POST', '', { ...pedido, dataEntrega: '2026-11-03' })).status, 201)
})

test('troca de data respeita limite, rollback preserva dados e exclusão libera vaga', async (t) => {
  const api = await apiTeste(t)
  for (let i = 0; i < 5; i++) await api.request('POST', '', pedido)
  const outro = await api.request('POST', '', { ...pedido, dataEntrega: '2026-11-03' })
  assert.equal((await api.request('PATCH', '/6', { dataEntrega: pedido.dataEntrega, nomeCliente: 'Nome Alterado' })).status, 409)
  assert.deepEqual((await api.request('GET', '/6')).dados, outro.dados)
  assert.equal((await api.request('PATCH', '/1', { status: 'em preparo', dataEntrega: pedido.dataEntrega })).status, 200)
  assert.equal((await api.request('PATCH', '/6', { dataEntrega: '2026-10-31' })).status, 400)
  assert.equal((await api.request('DELETE', '/1')).status, 204)
  assert.equal((await api.request('PATCH', '/6', { dataEntrega: pedido.dataEntrega })).status, 200)
  assert.equal((await api.request('POST', '', pedido)).status, 409)
  assert.equal((await api.request('POST', '', { ...pedido, dataEntrega: '2026-11-03' })).status, 201)
})

test('somente mudar status de pedido antigo não exige mudar a data nem ocupa nova vaga', async (t) => {
  const api = await apiTeste(t)
  await api.request('POST', '', pedido)
  api.mudarRelogio('2026-11-04T15:00:00Z')
  assert.equal((await api.request('PATCH', '/1', { status: 'entregue' })).status, 200)
  assert.equal((await api.request('PATCH', '/1', { dataEntrega: '2026-11-04' })).status, 400)
  assert.equal((await api.request('GET')).dados.length, 1)
})

test('valida tipos, campos, calendário, telefone, produto e status, sem gravar inválidos', async (t) => {
  const api = await apiTeste(t)
  const invalidos: unknown[] = [null, [], {}, { ...pedido, nomeCliente: ' ' }, { ...pedido, nomeCliente: 'Nome' }, { ...pedido, telefone: 123 }, { ...pedido, telefone: 'abc73999999999' }, { ...pedido, telefone: '999999999' }, { ...pedido, dataEntrega: '2026-10-31' }, { ...pedido, dataEntrega: '2026-10-30' }, { ...pedido, dataEntrega: '2027-02-29' }, { ...pedido, dataEntrega: '2026-13-01' }, { ...pedido, dataEntrega: '02/11/2026' }, { ...pedido, itens: [{ produto: 'cafe-coado', quantidade: 1 }] }, { ...pedido, itens: [{ produto: 'panetone', quantidade: 1 }] }, { ...pedido, itens: [{ produto: 'pao-queijo', quantidade: 1 }] }, { ...pedido, incluirPaoDeQueijo: 'true' }, { ...pedido, campoExtra: true }]
  for (const corpo of invalidos) assert.equal((await api.request('POST', '', corpo)).status, 400, JSON.stringify(corpo))
  assert.deepEqual((await api.request('GET')).dados, [])
  await api.request('POST', '', pedido)
  for (const corpo of [{}, { status: 'aprovada' }, { incluirPaoDeQueijo: 1 }, { telefone: null }, { id: 8 }]) assert.equal((await api.request('PATCH', '/1', corpo)).status, 400)
})

test('404 para inexistentes, 400 para IDs inválidos e SQL é parametrizado', async (t) => {
  const api = await apiTeste(t)
  for (const [metodo, corpo] of [['GET', undefined], ['DELETE', undefined], ['PATCH', { status: 'entregue' }]] as const) {
    assert.equal((await api.request(metodo, '/999', corpo)).status, 404)
    for (const id of ['0', '-1', '1abc', '9007199254740992']) assert.equal((await api.request(metodo, `/${id}`, corpo)).status, 400)
  }
  const nome = "Cliente Teste'); DROP TABLE encomendas; --"
  assert.equal((await api.request('POST', '', { ...pedido, nomeCliente: nome })).status, 201)
  assert.equal((await api.request('GET')).dados[0].nomeCliente, nome)
})

test('leituras e alterações administrativas são bloqueadas sem autenticação', async (t) => {
  const api = await apiTeste(t)
  await api.request('POST', '', pedido, false)
  for (const [metodo, caminho, corpo] of [['GET', '', undefined], ['GET', '/1', undefined], ['PATCH', '/1', { status: 'entregue' }], ['DELETE', '/1', undefined]] as const) {
    const resposta = await api.request(metodo, caminho, corpo, false)
    assert.equal(resposta.status, 401)
    assert.deepEqual(Object.keys(resposta.dados), ['erro'])
    assert(!JSON.stringify(resposta.dados).includes(pedido.nomeCliente))
  }
  const bloqueada = await apiTeste(t, { adminToken: null })
  assert.equal((await bloqueada.request('GET')).status, 503)
})

test('dados persistem depois de fechar e reabrir o banco', async (t) => {
  const pasta = await pastaTemporaria(t)
  const arquivo = join(pasta, 'persistencia.sqlite')
  const primeira = await apiTeste(t, { arquivo })
  const criado = await primeira.request('POST', '', pedido)
  await primeira.fechar()
  const segunda = await apiTeste(t, { arquivo })
  assert.deepEqual((await segunda.request('GET', '/1')).dados, criado.dados)
})

test('telefone com DDI normalizado pela API pode ser reenviado em uma atualização', async (t) => {
  const api = await apiTeste(t)
  const criado = await api.request('POST', '', { ...pedido, telefone: '+55 (73) 99999-9999' })
  assert.equal(criado.dados.telefone, '5573999999999')
  const atualizado = await api.request('PATCH', `/${criado.dados.id}`, { telefone: criado.dados.telefone })
  assert.equal(atualizado.status, 200)
  assert.equal(atualizado.dados.telefone, criado.dados.telefone)
})

test('erros de JSON, tamanho e credencial não expõem detalhes internos', async (t) => {
  const api = await apiTeste(t)
  for (const [body, tipo, esperado] of [['{', 'application/json', 400], ['a'.repeat(17000), 'application/json', 413], ['texto', 'text/plain', 415]] as const) {
    const resposta = await fetch(api.base, { method: 'POST', headers: { 'Content-Type': tipo }, body })
    assert.equal(resposta.status, esperado)
    const dados = await resposta.json()
    assert.deepEqual(Object.keys(dados), ['erro'])
    assert(!JSON.stringify(dados).includes('SyntaxError'))
  }
  const negada = await fetch(api.base, { headers: { Authorization: 'Bearer token-incorreto' } })
  assert.equal(negada.status, 401)
  assert.deepEqual(Object.keys(await negada.json()), ['erro'])
})

test('fuso, IDs e campos permanecem compatíveis com o contrato do front-end', () => {
  assert.equal(FUSO_HORARIO, cafeConfig.fusoHorario)
  assert.deepEqual([...PRODUTOS_ENCOMENDAVEIS].sort(), cafeConfig.produtos.filter((produto) => produto.encomenda.tipo === 'principal' && !produto.sazonalidade).map((produto) => produto.id).sort())
  assert.equal(dataMinima(new Date('2026-11-01T02:59:59Z')), '2026-11-01')
  assert.equal(dataMinima(new Date('2026-11-01T03:00:00Z')), '2026-11-02')
  assert.equal(dataMinima(new Date('2026-12-31T15:00:00Z')), '2027-01-01')
  assert.equal(dataMinima(new Date('2028-02-28T15:00:00Z')), '2028-02-29')
  assert.doesNotThrow(() => validarEntrada({ ...pedido, dataEntrega: '2026-11-01' }, false, new Date('2026-11-01T02:59:59Z')))
  assert.throws(() => validarEntrada({ ...pedido, dataEntrega: '2026-11-01' }, false, new Date('2026-11-01T03:00:00Z')))
})
