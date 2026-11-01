import assert from 'node:assert/strict'
import { test } from 'node:test'
import { alteracoesPedido, validarEdicao } from '../src/utils/edicaoEncomenda.ts'

const pedido = { id: 5, nomeCliente: 'Cliente de Teste', telefone: '73999999999', produto: 'bolo-cenoura', quantidadeBolos: 2, dataEntrega: '2026-11-03', incluirPaoDeQueijo: true, status: 'recebida' }
const { id: _id, ...campos } = pedido
const agora = new Date('2026-11-01T12:00:00Z')
test('diferenças normalizam contato e não incluem ID, data inalterada ou campos iguais', () => {
  assert.deepEqual(alteracoesPedido(pedido, { ...campos, telefone: '(73) 99999-9999', nomeCliente: '  Cliente de Teste  ' }), {})
  assert.deepEqual(alteracoesPedido(pedido, { ...campos, status: 'entregue' }), { status: 'entregue' })
  assert.deepEqual(alteracoesPedido(pedido, { ...campos, dataEntrega: '2026-11-04', quantidadeBolos: 3, incluirPaoDeQueijo: false }), { dataEntrega: '2026-11-04', quantidadeBolos: 3, incluirPaoDeQueijo: false })
})
test('edição exige nome, telefone, sabor, status, quantidade inteira de 1 a 5 e nova data futura', () => {
  assert.deepEqual(validarEdicao(pedido, campos, agora), {})
  const falhas = validarEdicao(pedido, { ...campos, nomeCliente: 'Ana', telefone: '123', produto: 'cafe-coado', status: 'aprovada', quantidadeBolos: 1.5, dataEntrega: '2026-11-01' }, agora)
  for (const campo of ['nomeCliente', 'telefone', 'produto', 'status', 'quantidadeBolos', 'dataEntrega']) assert(falhas[campo])
  for (const quantidadeBolos of [0, 6, NaN]) assert(validarEdicao(pedido, { ...campos, quantidadeBolos }, agora).quantidadeBolos)
})
test('pedido antigo mantém data ao editar contato/status; mudar quantidade exige data futura', () => {
  const antigo = { ...pedido, dataEntrega: '2000-01-01' }
  const dados = { ...campos, dataEntrega: antigo.dataEntrega, status: 'entregue' }
  assert.deepEqual(validarEdicao(antigo, dados, agora), {})
  assert(validarEdicao(antigo, { ...dados, quantidadeBolos: 1 }, agora).dataEntrega)
  assert.deepEqual(validarEdicao(antigo, { ...dados, quantidadeBolos: 1, dataEntrega: '2026-11-02' }, agora), {})
})
