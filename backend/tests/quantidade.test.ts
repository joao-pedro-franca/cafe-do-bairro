import assert from 'node:assert/strict'
import test from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { join } from 'node:path'
import { apiTeste, pastaTemporaria, pedido } from './helpers.ts'

async function saldo(base: string, data = pedido.dataEntrega) {
  const resposta = await fetch(`${new URL(base).origin}/api/disponibilidade?data=${data}`)
  return { status: resposta.status, dados: await resposta.json(), cache: resposta.headers.get('cache-control') }
}

test('consulta pública agrega bolos, não registros, sem nomes, telefone, ID ou token', async (t) => {
  const api = await apiTeste(t)
  assert.deepEqual((await saldo(api.base)).dados, { data: pedido.dataEntrega, limiteDiario: 5, quantidadeReservada: 0, quantidadeDisponivel: 5 })
  const criado = await api.request('POST', '', { ...pedido, quantidadeBolos: 3 }, false)
  assert.equal(criado.status, 201)
  await api.request('PATCH', '/1', { status: 'entregue' })
  const resultado = await saldo(api.base)
  assert.equal(resultado.status, 200)
  assert.equal(resultado.cache, 'no-store')
  assert.deepEqual(resultado.dados, { data: pedido.dataEntrega, limiteDiario: 5, quantidadeReservada: 3, quantidadeDisponivel: 2 })
  assert.equal((await api.request('POST', '', { ...pedido, quantidadeBolos: 3 })).status, 409)
  assert.equal((await api.request('POST', '', { ...pedido, quantidadeBolos: 2 })).status, 201)
  assert.equal((await saldo(api.base)).dados.quantidadeDisponivel, 0)
  assert.equal((await api.request('GET')).dados.length, 2)
  assert.equal((await api.request('POST', '', pedido)).status, 409)
  assert.equal((await saldo(api.base, '2026-11-03')).dados.quantidadeDisponivel, 5)
  await api.request('DELETE', '/1')
  assert.equal((await saldo(api.base)).dados.quantidadeDisponivel, 3)
})

test('quantidade obrigatória deve ser inteiro positivo; excesso de capacidade é 409', async (t) => {
  const api = await apiTeste(t)
  for (const quantidadeBolos of [undefined, null, '2', true, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal((await api.request('POST', '', { ...pedido, quantidadeBolos })).status, 400)
  }
  assert.equal((await api.request('POST', '', { ...pedido, quantidadeBolos: 6 })).status, 409)
  assert.equal((await api.request('POST', '', { ...pedido, quantidadeBolos: 5 })).status, 201)
  for (const quantidadeBolos of [null, '2', 0, -1, 1.5]) assert.equal((await api.request('PATCH', '/1', { quantidadeBolos })).status, 400)
  assert.equal((await api.request('GET', '/1')).dados.quantidadeBolos, 5)
})

test('PATCH de quantidade/data exclui a própria reserva, libera bolos ao reduzir e faz rollback se faltar capacidade', async (t) => {
  const api = await apiTeste(t)
  await api.request('POST', '', { ...pedido, quantidadeBolos: 3 })
  await api.request('POST', '', { ...pedido, quantidadeBolos: 2 })
  assert.equal((await api.request('PATCH', '/1', { quantidadeBolos: 4, nomeCliente: 'Nome Alterado' })).status, 409)
  assert.equal((await api.request('GET', '/1')).dados.nomeCliente, pedido.nomeCliente)
  assert.equal((await api.request('PATCH', '/1', { quantidadeBolos: 1 })).status, 200)
  assert.equal((await saldo(api.base)).dados.quantidadeDisponivel, 2)
  assert.equal((await api.request('PATCH', '/2', { quantidadeBolos: 4 })).status, 200)
  await api.request('POST', '', { ...pedido, quantidadeBolos: 3, dataEntrega: '2026-11-03' })
  assert.equal((await api.request('PATCH', '/2', { dataEntrega: '2026-11-03' })).status, 409)
  assert.equal((await api.request('PATCH', '/2', { dataEntrega: '2026-11-03', quantidadeBolos: 2 })).status, 200)
  assert.equal((await saldo(api.base, '2026-11-03')).dados.quantidadeDisponivel, 0)
  assert.equal((await saldo(api.base)).dados.quantidadeDisponivel, 4)
  api.mudarRelogio('2026-11-04T15:00:00Z')
  assert.equal((await api.request('PATCH', '/1', { quantidadeBolos: 2 })).status, 400)
  assert.equal((await api.request('PATCH', '/1', { status: 'entregue' })).status, 200)
})

test('consulta recusa datas inválidas, hoje, passado e parâmetros repetidos, no fuso da Bahia', async (t) => {
  const api = await apiTeste(t)
  const origem = new URL(api.base).origin
  for (const query of ['', '?data=2026-10-31', '?data=2026-10-30', '?data=2026-02-30', '?data=abc', '?data=2026-11-02&data=2026-11-03']) {
    assert.equal((await fetch(`${origem}/api/disponibilidade${query}`)).status, 400)
  }
  api.mudarRelogio('2026-11-01T02:59:59Z')
  assert.equal((await saldo(api.base, '2026-11-01')).status, 200)
  api.mudarRelogio('2026-11-01T03:00:00Z')
  assert.equal((await saldo(api.base, '2026-11-01')).status, 400)
})

test('migração mantém IDs/dados/status/adicional antigos e atribui um bolo, inclusive ao reabrir', async (t) => {
  const pasta = await pastaTemporaria(t)
  const arquivo = join(pasta, 'antigo.sqlite')
  const antigo = new DatabaseSync(arquivo)
  antigo.exec(`CREATE TABLE encomendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT, nomeCliente TEXT NOT NULL, telefone TEXT NOT NULL,
    produto TEXT NOT NULL, dataEntrega TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'recebida',
    incluirPaoDeQueijo INTEGER NOT NULL DEFAULT 0
  ) STRICT`)
  antigo.prepare('INSERT INTO encomendas (id, nomeCliente, telefone, produto, dataEntrega, status, incluirPaoDeQueijo) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(17, pedido.nomeCliente, '73999999999', pedido.produto, pedido.dataEntrega, 'em preparo', 1)
  antigo.close()
  const api = await apiTeste(t, { arquivo })
  assert.deepEqual((await api.request('GET', '/17')).dados, { ...pedido, id: 17, telefone: '73999999999', status: 'em preparo', quantidadeBolos: 1 })
  assert.equal((await saldo(api.base)).dados.quantidadeReservada, 1)
  assert.equal((await api.request('POST', '', { ...pedido, quantidadeBolos: 4 })).dados.id, 18)
  await api.fechar()
  const reaberta = await apiTeste(t, { arquivo })
  assert.equal((await reaberta.request('GET', '/17')).dados.quantidadeBolos, 1)
  assert.equal((await reaberta.request('GET', '/18')).dados.quantidadeBolos, 4)
  assert.equal((await saldo(reaberta.base)).dados.quantidadeDisponivel, 0)
})
