import assert from 'node:assert/strict'
import { test } from 'node:test'
import { consultarProdutos, listarProdutosAdmin, salvarProduto, permitidoNaData } from '../src/services/produtos.ts'
import { produtoDisponivel, configuracaoPadrao } from '../../backend/src/disponibilidadeProdutos.ts'
import { criarEncomenda } from '../src/services/encomendas.ts'
import { comPrecos } from './fixtures/precos.mjs'

const produto = produtoDisponivel(configuracaoPadrao('panetone'))
test('consulta catálogo sem cookie/cache; admin usa sessão e PATCH envia apenas configuração com CSRF', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json([produto]))
  assert.deepEqual(await consultarProdutos(), [produto])
  const [url, opcoes] = mock.mock.calls[0].arguments
  assert.equal(url, '/api/produtos')
  assert.equal(opcoes.credentials, 'omit')
  assert.equal(opcoes.cache, 'no-store')
  await listarProdutosAdmin()
  assert.equal(mock.mock.calls[1].arguments[1].credentials, 'same-origin')
  const config = { ...produto, aceitaEncomendas: true, mesesPermitidos: [7, 12] }
  mock.mock.mockImplementation(async () => Response.json(config))
  assert.deepEqual(await salvarProduto(config, 'csrf-teste'), config)
  const [, enviado] = mock.mock.calls[2].arguments
  assert.equal(enviado.headers['X-CSRF-Token'], 'csrf-teste')
  assert.deepEqual(JSON.parse(enviado.body), { aceitaEncomendas: true, mesesPermitidos: [7, 12] })
})
test('listas incompletas e confirmação divergente não são apresentadas como disponibilidade salva', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json(null))
  for (const lista of [null, [], [null], [produto, produto], [{ ...produto, aceitaEncomendas: 'sim' }], [{ ...produto, mesesPermitidos: [13] }], [{ ...produto, mesesPermitidos: [12, 12] }], [{ ...produto, precoCentavos: 3.5 }]]) {
    mock.mock.mockImplementation(async () => Response.json(lista))
    await assert.rejects(consultarProdutos(), /inválida/)
  }
  for (const resposta of [null, produto, { ...produto, id: 'outro', aceitaEncomendas: true }]) {
    mock.mock.mockImplementation(async () => Response.json(resposta))
    await assert.rejects(salvarProduto({ ...produto, aceitaEncomendas: true }, 'csrf'), /não confirmou/)
  }
})
test('regra pura usa mês da retirada, atravessa anos e não libera produto desativado', () => {
  assert(permitidoNaData({ ...produto, aceitaEncomendas: true }, '2026-12-01'))
  assert(permitidoNaData({ ...produto, aceitaEncomendas: true }, '2027-12-31'))
  assert(!permitidoNaData({ ...produto, aceitaEncomendas: true }, '2027-01-01'))
  assert(!permitidoNaData(produto, '2026-12-24'))
  assert(permitidoNaData({ ...produto, aceitaEncomendas: true, mesesPermitidos: [] }, '2027-07-01'))
})
test('confirmação pública recusa contagens de produção/venda inconsistentes', async (t) => {
  const dados = { nomeCliente: 'Cliente Teste', telefone: '73999999999', dataEntrega: '2099-12-25', itens: [{ produto: 'pao-queijo', quantidade: 2 }], incluirPaoDeQueijo: false }
  const confirmado = comPrecos({ ...dados, id: 1, status: 'recebida', totalBolos: 0 })
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json(confirmado, { status: 201 }))
  assert.equal((await criarEncomenda(dados)).quantidadeItens, 2)
  for (const alterado of [{ quantidadeItens: 24 }, { quantidadeProducao: 2 }, { quantidadeProducao: undefined }]) {
    mock.mock.mockImplementation(async () => Response.json({ ...confirmado, ...alterado }, { status: 201 }))
    await assert.rejects(criarEncomenda(dados), /confirmação/)
  }
})
