import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { join } from 'node:path'
import { abrirEncomendas } from '../src/database/encomendas.ts'
import { CATALOGO } from '../src/catalogo.ts'
import { apiTeste, pastaTemporaria, pedido } from './helpers.ts'

const agora = () => new Date('2026-10-31T12:00:00Z')
const futuro = { produtos: { ...CATALOGO.produtos, 'bolo-cenoura': 9900, 'bolo-chocolate': 8000 }, paoDeQueijoCentavos: 5000 }

test('um bolo e mistura: preços, subtotais e totais inteiros são registrados pelo servidor', async (t) => {
  const api = await apiTeste(t)
  const unico = (await api.request('POST', '', { ...pedido, incluirPaoDeQueijo: false })).dados
  assert.deepEqual(unico.itens, [{ produto: 'bolo-cenoura', quantidade: 1, precoUnitarioCentavos: 3500, subtotalCentavos: 3500 }])
  assert.equal(unico.subtotalBolosCentavos, 3500)
  assert.equal(unico.valorPaoDeQueijoCentavos, 0)
  assert.equal(unico.totalCentavos, 3500)
  assert.equal(unico.precosInicializados, false)
  const misto = (await api.request('POST', '', { ...pedido, itens: [{ produto: 'bolo-cenoura', quantidade: 2 }, { produto: 'bolo-chocolate', quantidade: 1 }] })).dados
  assert.equal(misto.subtotalBolosCentavos, 11000)
  assert.equal(misto.valorPaoDeQueijoCentavos, 2500)
  assert.equal(misto.totalCentavos, 13500)
})

test('reiniciar com catálogo futuro mantém histórico, quantidade e adicional; novos sabores usam preço vigente', async (t) => {
  const arquivo = join(await pastaTemporaria(t), 'historico.sqlite')
  let repo = abrirEncomendas(arquivo)
  const original = repo.criar(pedido, agora)
  repo.fechar()
  repo = abrirEncomendas(arquivo, futuro)
  try {
    assert.deepEqual(repo.buscar(original.id), original)
    const quantidade = repo.atualizar(original.id, { itens: [{ produto: 'bolo-cenoura', quantidade: 2 }] }, agora)
    assert.equal(quantidade.itens[0].precoUnitarioCentavos, 3500)
    assert.equal(quantidade.totalCentavos, 9500)
    const misto = repo.atualizar(original.id, { itens: [{ produto: 'bolo-cenoura', quantidade: 2 }, { produto: 'bolo-chocolate', quantidade: 1 }] }, agora)
    assert.equal(misto.itens[1].precoUnitarioCentavos, 8000)
    assert.equal(misto.totalCentavos, 17500)
    const substituido = repo.atualizar(original.id, { itens: [{ produto: 'bolo-chocolate', quantidade: 1 }] }, agora)
    assert.equal(substituido.totalCentavos, 10500)
    const sem = repo.atualizar(original.id, { incluirPaoDeQueijo: false }, agora)
    assert.equal(sem.valorPaoDeQueijoCentavos, 0)
    assert.equal(sem.totalCentavos, 8000)
    const adicionado = repo.atualizar(original.id, { incluirPaoDeQueijo: true }, agora)
    assert.equal(adicionado.valorPaoDeQueijoCentavos, 5000)
    assert.equal(adicionado.totalCentavos, 13000)
    const novo = repo.criar({ ...pedido, incluirPaoDeQueijo: false }, agora)
    assert.equal(novo.totalCentavos, 9900)
  } finally { repo.fechar() }
})

test('somente status, contato ou data preservam exatamente os valores históricos', async (t) => {
  const arquivo = join(await pastaTemporaria(t), 'metadados.sqlite')
  let repo = abrirEncomendas(arquivo)
  const criado = repo.criar(pedido, agora)
  repo.fechar()
  repo = abrirEncomendas(arquivo, futuro)
  try {
    const alterado = repo.atualizar(criado.id, { status: 'entregue', telefone: '73988888888', dataEntrega: '2026-11-04' }, agora)
    assert.deepEqual(alterado.itens, criado.itens)
    assert.equal(alterado.totalCentavos, criado.totalCentavos)
    assert.equal(alterado.valorPaoDeQueijoCentavos, criado.valorPaoDeQueijoCentavos)
  } finally { repo.fechar() }
})

test('POST e PATCH rejeitam valores manipulados no topo e dentro de itens, sem gravar parcialmente', async (t) => {
  const api = await apiTeste(t)
  const campos = ['totalCentavos', 'subtotalBolosCentavos', 'valorPaoDeQueijoCentavos', 'precosInicializados', 'precoUnitarioCentavos', 'subtotalCentavos']
  for (const campo of campos) assert.equal((await api.request('POST', '', { ...pedido, [campo]: 1 })).status, 400)
  for (const campo of ['precoUnitarioCentavos', 'subtotalCentavos']) assert.equal((await api.request('POST', '', { ...pedido, itens: [{ ...pedido.itens[0], [campo]: 1 }] })).status, 400)
  assert.deepEqual((await api.request('GET')).dados, [])
  const criado = (await api.request('POST', '', pedido)).dados
  for (const campo of campos) assert.equal((await api.request('PATCH', '/1', { telefone: '73988888888', [campo]: 1 })).status, 400)
  for (const campo of ['precoUnitarioCentavos', 'subtotalCentavos']) assert.equal((await api.request('PATCH', '/1', { itens: [{ ...pedido.itens[0], [campo]: 1 }] })).status, 400)
  assert.deepEqual((await api.request('GET', '/1')).dados, criado)
})

test('conflito de capacidade reverte itens, adicional e valores juntos', () => {
  const repo = abrirEncomendas(':memory:')
  try {
    const original = repo.criar(pedido, agora)
    repo.criar({ ...pedido, itens: [{ produto: 'bolo-coco', quantidade: 4 }] }, agora)
    assert.throws(() => repo.atualizar(original.id, { itens: [{ produto: 'bolo-chocolate', quantidade: 2 }], incluirPaoDeQueijo: false }, agora), /disponibilidade/)
    assert.deepEqual(repo.buscar(original.id), original)
  } finally { repo.fechar() }
})

test('valores persistem depois de reiniciar API e mudar catálogo', async (t) => {
  const arquivo = join(await pastaTemporaria(t), 'api.sqlite')
  const primeira = await apiTeste(t, { arquivo })
  const criado = (await primeira.request('POST', '', pedido)).dados
  await primeira.fechar()
  const segunda = await apiTeste(t, { arquivo, catalogo: futuro })
  assert.deepEqual((await segunda.request('GET', '/1')).dados, criado)
})

function bancoLegado(arquivo: string, invalido = false) {
  const db = new DatabaseSync(arquivo)
  db.exec(`CREATE TABLE encomendas(id INTEGER PRIMARY KEY AUTOINCREMENT, nomeCliente TEXT NOT NULL, telefone TEXT NOT NULL, dataEntrega TEXT NOT NULL, status TEXT NOT NULL, incluirPaoDeQueijo INTEGER NOT NULL) STRICT;
    CREATE TABLE encomenda_itens(encomendaId INTEGER NOT NULL REFERENCES encomendas(id) ON DELETE CASCADE, produto TEXT NOT NULL, quantidade INTEGER NOT NULL, ordem INTEGER NOT NULL, PRIMARY KEY(encomendaId, produto)) STRICT;
    INSERT INTO encomendas VALUES(42, 'Cliente Legado', '73999999999', '2026-11-02', 'em preparo', 1);
    INSERT INTO encomenda_itens VALUES(42, 'bolo-coco', 2, 1);
    INSERT INTO encomenda_itens VALUES(42, 'bolo-cenoura', 1, 0);`)
  if (invalido) db.exec("INSERT INTO encomenda_itens VALUES(42, 'desconhecido', 1, 2)")
  db.close()
}

test('migração relacional inicializa catálogo, conserva IDs/ordem/metadados e é idempotente', async (t) => {
  const arquivo = join(await pastaTemporaria(t), 'legado.sqlite')
  bancoLegado(arquivo)
  let repo = abrirEncomendas(arquivo)
  const migrado = repo.buscar(42)
  assert.deepEqual(migrado.itens, [{ produto: 'bolo-cenoura', quantidade: 1, precoUnitarioCentavos: 3500, subtotalCentavos: 3500 }, { produto: 'bolo-coco', quantidade: 2, precoUnitarioCentavos: 3800, subtotalCentavos: 7600 }])
  assert.equal(migrado.nomeCliente, 'Cliente Legado')
  assert.equal(migrado.status, 'em preparo')
  assert.equal(migrado.totalCentavos, 13600)
  assert.equal(migrado.precosInicializados, true)
  repo.fechar()
  for (let i = 0; i < 2; i++) {
    repo = abrirEncomendas(arquivo, futuro)
    assert.deepEqual(repo.buscar(42), migrado)
    repo.fechar()
  }
})

test('falha durante cópia de preços reverte esquema e mantém todos os dados legados', async (t) => {
  const arquivo = join(await pastaTemporaria(t), 'invalido.sqlite')
  bancoLegado(arquivo, true)
  assert.throws(() => abrirEncomendas(arquivo))
  const db = new DatabaseSync(arquivo)
  try {
    assert.equal((db.prepare('SELECT COUNT(*) as n FROM encomenda_itens').get() as { n: number }).n, 3)
    assert.equal((db.prepare('SELECT status FROM encomendas WHERE id=42').get() as { status: string }).status, 'em preparo')
    assert(!(db.prepare('PRAGMA table_info(encomenda_itens)').all() as { name: string }[]).some((c) => c.name === 'precoUnitarioCentavos'))
    assert(!(db.prepare('PRAGMA table_info(encomendas)').all() as { name: string }[]).some((c) => c.name === 'precosInicializados'))
  } finally { db.close() }
})
