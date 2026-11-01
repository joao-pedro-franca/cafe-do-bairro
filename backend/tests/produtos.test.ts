import assert from 'node:assert/strict'
import { test } from 'node:test'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { abrirEncomendas } from '../src/database/encomendas.ts'
import { PRODUTOS } from '../src/produtos.ts'
import { apiTeste, pastaTemporaria, pedido, requisicao } from './helpers.ts'

const ativo = { aceitaEncomendas: true, mesesPermitidos: [] as number[] }
const agora = () => new Date('2026-11-01T15:00:00Z')
const itens = (produto: string, quantidade = 1) => [{ produto, quantidade }]

test('catálogo público contém os 11 padrões; qualquer produto pode ser ativado/desativado com persistência', async (t) => {
  const arquivo = join(await pastaTemporaria(t), 'produtos.sqlite')
  const a = await apiTeste(t, { arquivo })
  const base = a.base.replace('/encomendas', '')
  const publico = await requisicao(base, 'GET', '/produtos', undefined, false)
  assert.equal(publico.status, 200)
  assert.equal(publico.headers.get('cache-control'), 'no-store')
  assert.equal(publico.dados.length, 11)
  for (const p of publico.dados) {
    assert.equal(p.aceitaEncomendas, p.id.startsWith('bolo-') && p.id !== 'bolo-natal' || p.id === 'pao-queijo')
    assert.deepEqual(p.mesesPermitidos, ['panetone', 'bolo-natal'].includes(p.id) ? [12] : [])
    assert.equal((await requisicao(base, 'PATCH', `/admin/produtos/${p.id}`, { ...ativo, mesesPermitidos: [12, 7] })).status, 200)
  }
  await a.fechar()
  const b = await apiTeste(t, { arquivo })
  const base2 = b.base.replace('/encomendas', '')
  const confirmados = await requisicao(base2, 'GET', '/admin/produtos')
  for (const p of confirmados.dados) {
    assert.equal(p.aceitaEncomendas, true)
    assert.deepEqual(p.mesesPermitidos, [7, 12])
    assert.equal((await requisicao(base2, 'PATCH', `/admin/produtos/${p.id}`, { ...ativo, aceitaEncomendas: false })).status, 200)
  }
  assert((await requisicao(base2, 'GET', '/produtos')).dados.every((p: { aceitaEncomendas: boolean }) => !p.aceitaEncomendas))
})

test('rotas públicas não alteram configuração; admin exige credencial e valida IDs, booleanos e meses', async (t) => {
  const api = await apiTeste(t)
  const base = api.base.replace('/encomendas', '')
  assert.equal((await requisicao(base, 'GET', '/admin/produtos', undefined, false)).status, 401)
  assert.equal((await requisicao(base, 'PATCH', '/admin/produtos/panetone', ativo, false)).status, 401)
  assert.equal((await requisicao(base, 'PATCH', '/produtos/panetone', ativo, false)).status, 404)
  assert.equal((await requisicao(base, 'PATCH', '/admin/produtos/desconhecido', ativo)).status, 404)
  for (const corpo of [null, [], {}, { aceitaEncomendas: true }, { ...ativo, aceitaEncomendas: 'true' }, { ...ativo, precoCentavos: 1 }, ...[[0], [13], [1.5], ['12'], [12, 12], null, '12'].map((mesesPermitidos) => ({ ...ativo, mesesPermitidos }))]) {
    assert.equal((await requisicao(base, 'PATCH', '/admin/produtos/panetone', corpo)).status, 400, JSON.stringify(corpo))
  }
  assert.equal((await requisicao(base, 'GET', '/produtos')).dados.find((p: { id: string }) => p.id === 'panetone').aceitaEncomendas, false)
})

test('em novembro encomenda panetone para dezembro; mês de retirada e estado são autoritativos', async (t) => {
  const api = await apiTeste(t)
  api.mudarRelogio('2026-11-01T15:00:00Z')
  const base = api.base.replace('/encomendas', '')
  await requisicao(base, 'PATCH', '/admin/produtos/panetone', { ...ativo, mesesPermitidos: [12] })
  const dados = { ...pedido, incluirPaoDeQueijo: false, itens: itens('panetone'), dataEntrega: '2026-12-01' }
  const criado = await api.request('POST', '', dados, false)
  assert.equal(criado.status, 201)
  assert.equal(criado.dados.totalBolos, 0)
  assert.equal(criado.dados.quantidadeProducao, 1)
  assert.equal(criado.dados.totalCentavos, 4500)
  const fora = await api.request('POST', '', { ...dados, dataEntrega: '2026-11-30' }, false)
  assert.equal(fora.status, 409)
  assert.equal(fora.dados.codigo, 'PRODUTO_INDISPONIVEL')
  await requisicao(base, 'PATCH', '/admin/produtos/bolo-natal', ativo)
  assert.equal((await api.request('POST', '', { ...dados, itens: itens('bolo-natal'), dataEntrega: '2027-07-10' })).status, 201)
  await requisicao(base, 'PATCH', '/admin/produtos/panetone', { ...ativo, aceitaEncomendas: false })
  assert.equal((await api.request('POST', '', dados)).status, 409)
  assert.equal((await api.request('GET', `/${criado.dados.id}`)).dados.totalCentavos, 4500)
})

test('todos os produtos usam sua unidade e preço; café/dúzias não consomem capacidade nem duplicam adicional', () => {
  const repo = abrirEncomendas(':memory:')
  try {
    for (const p of PRODUTOS) repo.configurarProduto(p.id, ativo)
    const misto = repo.criar({ ...pedido, incluirPaoDeQueijo: false, itens: [{ produto: 'cafe-coado', quantidade: 20 }, { produto: 'pao-queijo', quantidade: 2 }] }, agora)
    assert.equal(misto.quantidadeItens, 22)
    assert.equal(misto.quantidadeProducao, 0)
    assert.equal(misto.totalBolos, 0)
    assert.equal(misto.subtotalBolosCentavos, 15000)
    assert.equal(misto.valorPaoDeQueijoCentavos, 0)
    assert.equal(misto.totalCentavos, 15000)
    for (const p of repo.listarProdutos()) {
      const criado = repo.criar({ ...pedido, dataEntrega: `2027-01-${String(PRODUTOS.findIndex((r) => r.id === p.id) + 1).padStart(2, '0')}`, incluirPaoDeQueijo: false, itens: itens(p.id) }, agora)
      assert.equal(criado.itens[0]!.precoUnitarioCentavos, p.precoCentavos)
      assert.equal(criado.totalCentavos, p.precoCentavos)
      assert.equal(criado.quantidadeProducao, Number(p.consomeCapacidade))
      assert.equal(criado.quantidadeItens, 1)
    }
    assert.match(repo.listarProdutos().find((p) => p.id === 'pao-queijo')!.unidade, /Dúzia/)
    assert.throws(() => repo.criar({ ...pedido, itens: itens('pao-queijo') }, agora), /sem duplicar/)
    assert.throws(() => repo.atualizar(misto.id, { incluirPaoDeQueijo: true }, agora), /sem duplicar/)
    const legado = repo.criar(pedido, agora)
    assert.equal(legado.totalCentavos, 6000)
    assert.equal(legado.valorPaoDeQueijoCentavos, 2500)
    assert.equal(legado.quantidadeItens, 2)
  } finally { repo.fechar() }
})

test('bolos e panetones dividem cinco vagas, produtos sem quota continuam permitidos no dia cheio', () => {
  const repo = abrirEncomendas(':memory:')
  try {
    repo.configurarProduto('panetone', ativo)
    repo.configurarProduto('cafe-leite', ativo)
    repo.criar({ ...pedido, incluirPaoDeQueijo: false, itens: [{ produto: 'bolo-cenoura', quantidade: 3 }, { produto: 'panetone', quantidade: 2 }] }, agora)
    assert.equal(repo.disponibilidade(pedido.dataEntrega).quantidadeReservada, 5)
    assert.throws(() => repo.criar({ ...pedido, itens: itens('panetone') }, agora), /disponibilidade/)
    const cafe = repo.criar({ ...pedido, incluirPaoDeQueijo: false, itens: itens('cafe-leite', 60) }, agora)
    assert.equal(cafe.totalCentavos, 42000)
    assert.equal(repo.disponibilidade(pedido.dataEntrega).quantidadeReservada, 5)
    assert.throws(() => repo.atualizar(cafe.id, { itens: itens('panetone') }, agora), /disponibilidade/)
    assert.equal(repo.buscar(cafe.id).quantidadeProducao, 0)
  } finally { repo.fechar() }
})

test('produtos sem quota continuam limitados a valores monetários inteiros seguros, com rollback', async (t) => {
  const api = await apiTeste(t)
  const base = api.base.replace('/encomendas', '')
  await requisicao(base, 'PATCH', '/admin/produtos/cafe-coado', ativo)
  await requisicao(base, 'PATCH', '/admin/produtos/cafe-leite', ativo)
  const quantidade = Math.floor(Number.MAX_SAFE_INTEGER / 500)
  const criado = await api.request('POST', '', { ...pedido, itens: itens('cafe-coado', quantidade), incluirPaoDeQueijo: false })
  assert.equal(criado.status, 201)
  assert.equal((await api.request('PATCH', `/${criado.dados.id}`, { incluirPaoDeQueijo: true })).status, 400)
  assert.deepEqual((await api.request('GET', `/${criado.dados.id}`)).dados, criado.dados)
  assert.equal((await api.request('POST', '', { ...pedido, incluirPaoDeQueijo: false, itens: [{ produto: 'cafe-coado', quantidade }, { produto: 'cafe-leite', quantidade: Math.floor(Number.MAX_SAFE_INTEGER / 700) }] })).status, 400)
  assert.equal((await api.request('GET')).dados.length, 1)
})

test('desativar preserva histórico e manutenção; aumentos/inclusões e nova data validam regras atuais', () => {
  const repo = abrirEncomendas(':memory:')
  try {
    const original = repo.criar({ ...pedido, itens: itens('bolo-cenoura', 2) }, agora)
    repo.configurarProduto('bolo-cenoura', { ...ativo, aceitaEncomendas: false })
    repo.configurarProduto('pao-queijo', { ...ativo, aceitaEncomendas: false })
    assert.deepEqual(repo.buscar(original.id), original)
    const editado = repo.atualizar(original.id, { status: 'em preparo', telefone: '73988888888', nomeCliente: 'Outro Cliente' }, agora)
    assert.equal(editado.totalCentavos, original.totalCentavos)
    assert.equal(editado.itens[0]!.precoUnitarioCentavos, 3500)
    for (const mudanca of [{ itens: itens('bolo-cenoura', 3) }, { dataEntrega: '2026-12-02' }]) {
      assert.throws(() => repo.atualizar(original.id, mudanca, agora), /não aceita encomendas/)
      assert.deepEqual(repo.buscar(original.id), editado)
    }
    const reduzido = repo.atualizar(original.id, { itens: itens('bolo-cenoura'), incluirPaoDeQueijo: false }, agora)
    assert.equal(reduzido.totalCentavos, 3500)
    assert.throws(() => repo.atualizar(original.id, { incluirPaoDeQueijo: true }, agora), /não aceita encomendas/)
    repo.atualizar(original.id, { itens: itens('bolo-chocolate') }, agora)
    assert.equal(repo.buscar(original.id).totalCentavos, 4000)
  } finally { repo.fechar() }
})

function legado(arquivo: string, desconhecido = false) {
  const db = new DatabaseSync(arquivo)
  db.exec(`CREATE TABLE encomendas(id INTEGER PRIMARY KEY AUTOINCREMENT, nomeCliente TEXT NOT NULL, telefone TEXT NOT NULL, dataEntrega TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'recebida', incluirPaoDeQueijo INTEGER NOT NULL DEFAULT 0, valorPaoDeQueijoCentavos INTEGER NOT NULL DEFAULT 0, precosInicializados INTEGER NOT NULL DEFAULT 0) STRICT;
    INSERT INTO encomendas VALUES(27,'Cliente Histórico','73999999999','2026-12-24','em preparo',1,1800,0);
    CREATE TABLE encomenda_itens(encomendaId INTEGER REFERENCES encomendas(id) ON DELETE CASCADE, produto TEXT ${desconhecido ? '' : "CHECK(produto IN ('bolo-cenoura','bolo-chocolate','bolo-milho','bolo-fuba','bolo-laranja','bolo-coco'))"}, quantidade INTEGER NOT NULL, ordem INTEGER NOT NULL, precoUnitarioCentavos INTEGER NOT NULL, PRIMARY KEY(encomendaId,produto), UNIQUE(encomendaId,ordem)) STRICT;
    INSERT INTO encomenda_itens VALUES(27,'${desconhecido ? 'desconhecido' : 'bolo-cenoura'}',2,0,1234);`)
  db.close()
}
test('migração de banco precificado restrito preserva IDs e valores, é repetível e admite catálogo geral', async (t) => {
  const arquivo = join(await pastaTemporaria(t), 'legado.sqlite')
  legado(arquivo)
  let repo = abrirEncomendas(arquivo)
  const antes = repo.buscar(27)
  assert.equal(antes.itens[0]!.precoUnitarioCentavos, 1234)
  assert.equal(antes.totalCentavos, 4268)
  assert.equal(antes.precosInicializados, false)
  repo.configurarProduto('cafe-coado', ativo)
  repo.fechar()
  repo = abrirEncomendas(arquivo)
  assert.deepEqual(repo.buscar(27), antes)
  const novo = repo.criar({ ...pedido, itens: itens('cafe-coado'), incluirPaoDeQueijo: false }, agora)
  assert(novo.id > 27)
  assert.equal(repo.listar().length, 2)
  repo.fechar()
  const db = new DatabaseSync(arquivo)
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), [])
  assert.equal(db.prepare('SELECT COUNT(*) n FROM produto_disponibilidade').get()!.n, 11)
  assert.equal(db.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE name='encomenda_itens_restritos'").get()!.n, 0)
  db.close()
})
test('erro na nova FK reverte integralmente esquema e configurações sem tocar no legado', async (t) => {
  const arquivo = join(await pastaTemporaria(t), 'rollback.sqlite')
  legado(arquivo, true)
  assert.throws(() => abrirEncomendas(arquivo), /FOREIGN KEY/)
  const db = new DatabaseSync(arquivo)
  assert.equal(db.prepare('SELECT produto FROM encomenda_itens').get()!.produto, 'desconhecido')
  assert.equal(db.prepare('SELECT precoUnitarioCentavos FROM encomenda_itens').get()!.precoUnitarioCentavos, 1234)
  assert.equal(db.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE name IN ('produto_disponibilidade','encomenda_itens_restritos')").get()!.n, 0)
  db.close()
})
