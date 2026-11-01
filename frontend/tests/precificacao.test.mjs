import assert from 'node:assert/strict'
import { test } from 'node:test'
import { previaFinanceira, financeiroValido, reais } from '../src/utils/precificacao.ts'
import { criarEncomenda } from '../src/services/encomendas.ts'
import { listarPedidos } from '../src/services/admin.ts'

const historico = {
  itens: [{ produto: 'bolo-cenoura', quantidade: 2, precoUnitarioCentavos: 2333, subtotalCentavos: 4666 }],
  incluirPaoDeQueijo: true, subtotalBolosCentavos: 4666, valorPaoDeQueijoCentavos: 1900, totalCentavos: 6566, precosInicializados: false,
}
test('prévia mantém preços históricos com quantidades e adicional existentes, em centavos exatos', () => {
  const copia = structuredClone(historico)
  const previa = previaFinanceira([{ produto: 'bolo-cenoura', quantidade: 3 }], true, historico)
  assert.equal(previa.itens[0].precoUnitarioCentavos, 2333)
  assert.equal(previa.itens[0].subtotalCentavos, 6999)
  assert.equal(previa.totalCentavos, 8899)
  assert.deepEqual(historico, copia)
  assert.equal(reais(8899).replace(/\s/g, ' '), 'R$ 88,99')
})
test('novo sabor e substituição usam catálogo; remover e adicionar acompanhamento respeita sua origem', () => {
  const misto = previaFinanceira([{ produto: 'bolo-cenoura', quantidade: 1 }, { produto: 'bolo-chocolate', quantidade: 1 }], false, historico)
  assert.equal(misto.totalCentavos, 6333)
  assert.equal(misto.valorPaoDeQueijoCentavos, 0)
  const substituido = previaFinanceira([{ produto: 'bolo-coco', quantidade: 1 }], true, { ...historico, incluirPaoDeQueijo: false, valorPaoDeQueijoCentavos: 0 })
  assert.equal(substituido.totalCentavos, 6300)
})
test('prévia inválida não apresenta total parcial ou NaN', () => {
  for (const itens of [[], [{ produto: '', quantidade: 1 }], [{ produto: 'bolo-cenoura', quantidade: NaN }], [{ produto: 'bolo-cenoura', quantidade: 6 }]]) assert.equal(previaFinanceira(itens, true, historico), null)
})
test('resposta financeira deve ter preços inteiros, subtotais, adicional e total coerentes', async (t) => {
  assert(financeiroValido(historico))
  const pedido = { ...historico, id: 1, status: 'recebida', nomeCliente: 'Cliente Teste', telefone: '73999999999', dataEntrega: '2099-12-25', totalBolos: 2 }
  const entrada = { nomeCliente: pedido.nomeCliente, telefone: pedido.telefone, dataEntrega: pedido.dataEntrega, itens: [{ produto: 'bolo-cenoura', quantidade: 2 }], incluirPaoDeQueijo: true }
  for (const mudanca of [
    { totalCentavos: 1 }, { subtotalBolosCentavos: 1 }, { valorPaoDeQueijoCentavos: -1 }, { valorPaoDeQueijoCentavos: 0, totalCentavos: 4666 }, { totalCentavos: 1.5 },
    { itens: [{ ...historico.itens[0], subtotalCentavos: 1 }] }, { itens: [{ ...historico.itens[0], precoUnitarioCentavos: 2333.5 }] },
    { precosInicializados: undefined }, { itens: [{ ...historico.itens[0], produto: undefined }] },
  ]) {
    const resposta = { ...pedido, ...mudanca }
    assert.equal(financeiroValido(resposta), false)
    t.mock.method(globalThis, 'fetch', async () => Response.json(resposta, { status: 201 }))
    await assert.rejects(criarEncomenda(entrada), /confirmação/)
    t.mock.method(globalThis, 'fetch', async () => Response.json([resposta]))
    await assert.rejects(listarPedidos(), /inválida/)
  }
})
