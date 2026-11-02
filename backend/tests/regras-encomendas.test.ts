import assert from 'node:assert/strict'
import { test } from 'node:test'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { abrirEncomendas } from '../src/database/encomendas.ts'
import { apiTeste, pastaTemporaria, pedido, requisicao } from './helpers.ts'

const agora = () => new Date('2026-11-01T15:00:00Z')
const ativo = { aceitaEncomendas: true, mesesPermitidos: [] as number[] }
const itens = (produto: string, quantidade = 1) => [{ produto, quantidade }]

test('API restringe itens a oito produtos; acompanhamento exige bolo e não usa quota', async (t) => {
  const api = await apiTeste(t)
  const base = api.base.replace('/encomendas', '')
  for (const produto of ['cafe-coado', 'cafe-leite', 'pao-queijo']) {
    assert.equal((await requisicao(base, 'PATCH', `/admin/produtos/${produto}`, ativo)).status, 400)
    for (const incluirPaoDeQueijo of [false, true]) {
      assert.equal((await api.request('POST', '', { ...pedido, itens: itens(produto), incluirPaoDeQueijo }, false)).status, 400)
      assert.equal((await api.request('POST', '', { ...pedido, itens: [...pedido.itens, ...itens(produto)], incluirPaoDeQueijo }, false)).status, 400)
    }
  }
  await requisicao(base, 'PATCH', '/admin/produtos/panetone', { ...ativo, mesesPermitidos: [12] })
  await requisicao(base, 'PATCH', '/admin/produtos/bolo-natal', { ...ativo, mesesPermitidos: [12] })
  assert.equal((await api.request('POST', '', { ...pedido, itens: itens('panetone'), dataEntrega: '2026-12-01' }, false)).status, 400)
  assert.equal((await api.request('POST', '', { ...pedido, itens: itens('bolo-natal') }, false)).status, 409)
  const natal = await api.request('POST', '', { ...pedido, itens: itens('bolo-natal'), dataEntrega: '2026-12-01' }, false)
  assert.equal(natal.status, 201)
  assert.equal(natal.dados.totalBolos, 1)
  assert.equal(natal.dados.totalCentavos, 8000)
  const misto = await api.request('POST', '', { ...pedido, itens: [...itens('bolo-cenoura', 2), ...itens('panetone', 3)], dataEntrega: '2026-12-02' }, false)
  assert.equal(misto.status, 201)
  assert.equal(misto.dados.quantidadeProducao, 5)
  assert.equal(misto.dados.quantidadeItens, 6)
  assert.equal((await api.request('POST', '', { ...pedido, dataEntrega: '2026-12-02' }, false)).status, 409)
  assert.equal((await api.request('PATCH', `/${misto.dados.id}`, { itens: itens('panetone', 5) })).status, 400)
  assert.equal((await api.request('PATCH', `/${misto.dados.id}`, { itens: itens('pao-queijo') })).status, 400)
  assert.equal((await api.request('PATCH', `/${misto.dados.id}`, { itens: itens('cafe-coado') })).status, 400)
  assert.equal((await api.request('GET', `/${misto.dados.id}`)).dados.totalCentavos, misto.dados.totalCentavos)
  await requisicao(base, 'PATCH', '/admin/produtos/bolo-cenoura', { ...ativo, aceitaEncomendas: false })
  assert.equal((await api.request('POST', '', pedido, false)).status, 409)
})

test('SQLite antigo preserva itens, preços, quantidades e configurações; contato/status e reabertura funcionam', async (t) => {
  const arquivo = join(await pastaTemporaria(t), 'historico.sqlite')
  let repo = abrirEncomendas(arquivo)
  const original = repo.criar(pedido, agora)
  repo.fechar()
  const db = new DatabaseSync(arquivo)
  const esquema = db.prepare('SELECT sql FROM sqlite_master WHERE type = ? ORDER BY name').all('table')
  db.exec(`UPDATE produto_disponibilidade SET aceitaEncomendas = 1 WHERE id IN ('cafe-coado', 'cafe-leite');
    UPDATE produto_disponibilidade SET aceitaEncomendas = 0, mesesPermitidos = '[7]' WHERE id = 'pao-queijo';
    UPDATE encomendas SET dataEntrega = '2000-01-01', valorPaoDeQueijoCentavos = 1800;
    DELETE FROM encomenda_itens;
    INSERT INTO encomenda_itens VALUES (1, 'cafe-coado', 20, 0, 321), (1, 'pao-queijo', 2, 1, 1234);`)
  const configuracoes = db.prepare('SELECT * FROM produto_disponibilidade ORDER BY id').all()
  db.close()
  repo = abrirEncomendas(arquivo)
  const legado = repo.buscar(original.id)
  assert.equal(legado.totalCentavos, 10688)
  assert.equal(legado.itens[0]!.quantidade, 20)
  assert.equal(legado.itens[1]!.precoUnitarioCentavos, 1234)
  assert.equal(legado.incluirPaoDeQueijo, true)
  for (const produto of ['cafe-coado', 'cafe-leite', 'pao-queijo']) assert.equal(repo.listarProdutos().find((p) => p.id === produto)!.aceitaEncomendas, false)
  for (const produto of ['cafe-coado', 'cafe-leite', 'pao-queijo']) assert.throws(() => repo.criar({ ...pedido, itens: itens(produto), incluirPaoDeQueijo: false }, agora), /somente bolos/)
  const mantido = repo.atualizar(legado.id, { nomeCliente: 'Cliente Atualizado', telefone: '73988888888', status: 'entregue', itens: legado.itens.map(({ produto, quantidade }) => ({ produto, quantidade })) }, agora)
  assert.deepEqual(mantido.itens, legado.itens)
  assert.equal(mantido.totalCentavos, legado.totalCentavos)
  for (const mudanca of [
    { itens: [...itens('cafe-coado', 21), ...itens('pao-queijo', 2)] },
    { itens: [...itens('cafe-coado', 20), ...itens('pao-queijo', 2), ...itens('bolo-cenoura')] },
    { dataEntrega: '2026-12-01' },
  ]) {
    assert.throws(() => repo.atualizar(legado.id, mudanca, agora), /somente bolos/)
    assert.deepEqual(repo.buscar(legado.id), mantido)
  }
  // Acompanhamento ignora inclusive o mês e o estado antigos de pão de queijo.
  const novo = repo.criar(pedido, agora)
  assert.equal(novo.totalCentavos, 6000)
  assert.equal(novo.quantidadeProducao, 1)
  repo.fechar()
  repo = abrirEncomendas(arquivo)
  assert.deepEqual(repo.buscar(legado.id), mantido)
  assert.deepEqual(repo.buscar(novo.id), novo)
  repo.fechar()
  const conferir = new DatabaseSync(arquivo)
  assert.deepEqual(conferir.prepare('SELECT sql FROM sqlite_master WHERE type = ? ORDER BY name').all('table'), esquema)
  assert.deepEqual(conferir.prepare('SELECT * FROM produto_disponibilidade ORDER BY id').all(), configuracoes)
  assert.deepEqual(conferir.prepare('PRAGMA foreign_key_check').all(), [])
  conferir.close()
})

test('oito produtos mantêm preços de catálogo e podem ser encomendados individualmente quando habilitados', () => {
  const repo = abrirEncomendas(':memory:')
  try {
    const valores = { 'bolo-cenoura': 3500, 'bolo-chocolate': 4000, 'bolo-milho': 3500, 'bolo-fuba': 3000, 'bolo-laranja': 3500, 'bolo-coco': 3800, 'bolo-natal': 5500, panetone: 4500 }
    for (const [indice, [produto, preco]] of Object.entries(valores).entries()) {
      repo.configurarProduto(produto, ativo)
      const criado = repo.criar({ ...pedido, dataEntrega: `2026-12-${String(indice + 1).padStart(2, '0')}`, itens: itens(produto), incluirPaoDeQueijo: false }, agora)
      assert.equal(criado.totalCentavos, preco)
      assert.equal(criado.itens[0]!.precoUnitarioCentavos, preco)
      assert.equal(criado.quantidadeProducao, 1)
    }
  } finally { repo.fechar() }
})
