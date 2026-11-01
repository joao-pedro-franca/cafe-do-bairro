import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { join } from 'node:path'
import { apiTeste, pastaTemporaria, pedido } from './helpers.ts'
import { abrirEncomendas } from '../src/database/encomendas.ts'

const misto = [{ produto: 'bolo-cenoura', quantidade: 2 }, { produto: 'bolo-chocolate', quantidade: 1 }]
test('vários sabores somam capacidade e total é somente calculado pelo servidor', async (t) => {
  const api = await apiTeste(t)
  const criado = await api.request('POST', '', { ...pedido, itens: misto }, false)
  assert.equal(criado.status, 201)
  assert.deepEqual(criado.dados.itens, misto)
  assert.equal(criado.dados.totalBolos, 3)
  assert(!('produto' in criado.dados) && !('quantidadeBolos' in criado.dados))
  assert.equal((await api.request('POST', '', { ...pedido, itens: [{ produto: 'bolo-milho', quantidade: 1 }, { produto: 'bolo-coco', quantidade: 1 }] })).status, 201)
  assert.equal((await api.request('POST', '', pedido)).status, 409)
  assert.equal((await api.request('POST', '', { ...pedido, totalBolos: 1 })).status, 400)
  assert.equal((await api.request('DELETE', '/1')).status, 204)
  assert.equal((await api.request('POST', '', { ...pedido, itens: misto })).status, 201)
})

test('itens vazios, repetidos, inválidos ou com quantidades inválidas não são gravados', async (t) => {
  const api = await apiTeste(t)
  const invalidos = [undefined, null, [], {}, [null], [{ produto: 'cafe-coado', quantidade: 1 }], [misto[0], misto[0]], [{ ...misto[0], id: 1 }]]
  for (const quantidade of [undefined, null, '1', true, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) invalidos.push([{ produto: 'bolo-cenoura', quantidade }] as never)
  for (const itens of invalidos) assert.equal((await api.request('POST', '', { ...pedido, itens })).status, 400, JSON.stringify(itens))
  assert.equal((await api.request('POST', '', { ...pedido, itens: [{ produto: 'bolo-cenoura', quantidade: 3 }, { produto: 'bolo-coco', quantidade: 3 }] })).status, 409)
  assert.deepEqual((await api.request('GET')).dados, [])
})

test('substituição atômica: 2 X + 1 Y ↔ 3 X; datas antigas permitem composição de mesmo total', async (t) => {
  const api = await apiTeste(t)
  await api.request('POST', '', { ...pedido, itens: misto })
  const unico = [{ produto: 'bolo-cenoura', quantidade: 3 }]
  for (const itens of [unico, misto, [{ produto: 'bolo-coco', quantidade: 3 }]]) {
    assert.equal((await api.request('PATCH', '/1', { itens })).status, 200)
    assert.deepEqual((await api.request('GET', '/1')).dados.itens, itens)
  }
  api.mudarRelogio('2026-11-10T12:00:00Z')
  assert.equal((await api.request('PATCH', '/1', { itens: misto })).status, 200)
  assert.equal((await api.request('PATCH', '/1', { itens: [{ produto: 'bolo-coco', quantidade: 2 }] })).status, 400)
})

test('conflito de itens/data reverte composição e todos os demais campos; transferência desconta reserva anterior', async (t) => {
  const api = await apiTeste(t)
  const antes = (await api.request('POST', '', { ...pedido, itens: misto })).dados
  await api.request('POST', '', { ...pedido, itens: [{ produto: 'bolo-milho', quantidade: 2 }] })
  assert.equal((await api.request('PATCH', '/1', { itens: [{ produto: 'bolo-cenoura', quantidade: 4 }], nomeCliente: 'Não Salvar', status: 'entregue', incluirPaoDeQueijo: false })).status, 409)
  assert.deepEqual((await api.request('GET', '/1')).dados, antes)
  const resultado = await api.request('PATCH', '/1', { itens: [{ produto: 'bolo-cenoura', quantidade: 4 }], dataEntrega: '2026-11-03' })
  assert.equal(resultado.status, 200)
  assert.equal(resultado.dados.totalBolos, 4)
})

test('migração relacional preserva tudo, remove fontes antigas, não duplica e mantém FK/constraints', async (t) => {
  const arquivo = join(await pastaTemporaria(t), 'legado.sqlite')
  const antigo = new DatabaseSync(arquivo)
  antigo.exec(`CREATE TABLE encomendas (id INTEGER PRIMARY KEY AUTOINCREMENT, nomeCliente TEXT NOT NULL, telefone TEXT NOT NULL, produto TEXT NOT NULL, quantidadeBolos INTEGER NOT NULL DEFAULT 1 CHECK(quantidadeBolos > 0), dataEntrega TEXT NOT NULL, status TEXT NOT NULL, incluirPaoDeQueijo INTEGER NOT NULL DEFAULT 0) STRICT`)
  antigo.prepare('INSERT INTO encomendas VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(42, 'Cliente Antigo', '73999999999', 'bolo-coco', 3, '2026-11-02', 'em preparo', 1)
  antigo.close()
  for (let vez = 0; vez < 3; vez++) {
    const repo = abrirEncomendas(arquivo)
    try { assert.deepEqual(repo.buscar(42), { id: 42, nomeCliente: 'Cliente Antigo', telefone: '73999999999', itens: [{ produto: 'bolo-coco', quantidade: 3 }], totalBolos: 3, dataEntrega: '2026-11-02', status: 'em preparo', incluirPaoDeQueijo: true }) } finally { repo.fechar() }
  }
  const db = new DatabaseSync(arquivo)
  try {
    db.exec('PRAGMA foreign_keys = ON')
    const colunas = db.prepare('PRAGMA table_info(encomendas)').all() as { name: string }[]
    assert(!colunas.some((c) => ['produto', 'quantidadeBolos', 'totalBolos'].includes(c.name)))
    assert.equal((db.prepare('SELECT COUNT(*) as n FROM encomenda_itens').get() as { n: number }).n, 1)
    assert.throws(() => db.exec("INSERT INTO encomenda_itens VALUES(999, 'bolo-coco', 1, 0)"))
    assert.throws(() => db.exec("INSERT INTO encomenda_itens VALUES(42, 'bolo-coco', 1, 1)"))
    assert.throws(() => db.exec("INSERT INTO encomenda_itens VALUES(42, 'bolo-milho', 0, 1)"))
    db.exec('DELETE FROM encomendas WHERE id = 42')
    assert.equal((db.prepare('SELECT COUNT(*) as n FROM encomenda_itens').get() as { n: number }).n, 0)
  } finally { db.close() }
})
