import assert from 'node:assert/strict'
import { test } from 'node:test'
import { alteracoesPedido, validarEdicao } from '../src/utils/edicaoEncomenda.ts'

const pedido = { id: 5, totalBolos: 2, nomeCliente: 'Cliente de Teste', telefone: '73999999999', dataEntrega: '2026-11-03', incluirPaoDeQueijo: true, status: 'recebida', itens: [{ produto: 'bolo-cenoura', quantidade: 2 }] }
const { id: _id, ...campos } = pedido
const agora = new Date('2026-11-01T12:00:00Z')
test('diferenças normalizam contato e não incluem ID, data inalterada ou campos iguais', () => {
  assert.deepEqual(alteracoesPedido(pedido, { ...campos, telefone: '(73) 99999-9999', nomeCliente: '  Cliente de Teste  ' }), {})
  assert.deepEqual(alteracoesPedido(pedido, { ...campos, status: 'entregue' }), { status: 'entregue' })
  assert.deepEqual(alteracoesPedido(pedido, { ...campos, dataEntrega: '2026-11-04', incluirPaoDeQueijo: false, itens: [{ produto: 'bolo-cenoura', quantidade: 3 }] }), { dataEntrega: '2026-11-04', incluirPaoDeQueijo: false, itens: [{ produto: 'bolo-cenoura', quantidade: 3 }] })
})
test('edição exige nome, telefone, sabor, status, quantidade inteira de 1 a 5 e nova data futura', () => {
  assert.deepEqual(validarEdicao(pedido, campos, agora), {})
  const falhas = validarEdicao(pedido, { ...campos, nomeCliente: 'Ana', telefone: '123', status: 'aprovada', dataEntrega: '2026-11-01', itens: [{ produto: 'cafe-coado', quantidade: 1.5 }] }, agora)
  for (const campo of ['nomeCliente', 'telefone', 'itens', 'status', 'dataEntrega']) assert(falhas[campo])
  for (const quantidadeBolos of [0, 6, NaN]) assert(validarEdicao(pedido, { ...campos, itens: [{ produto: 'bolo-cenoura', quantidade: quantidadeBolos }] }, agora).itens)
})
test('pedido antigo mantém data ao editar contato/status; mudar quantidade exige data futura', () => {
  const antigo = { ...pedido, dataEntrega: '2000-01-01' }
  const dados = { ...campos, dataEntrega: antigo.dataEntrega, status: 'entregue' }
  assert.deepEqual(validarEdicao(antigo, dados, agora), {})
  assert(validarEdicao(antigo, { ...dados, itens: [{ produto: 'bolo-cenoura', quantidade: 1 }] }, agora).dataEntrega)
  assert.deepEqual(validarEdicao(antigo, { ...dados, dataEntrega: '2026-11-02', itens: [{ produto: 'bolo-cenoura', quantidade: 1 }] }, agora), {})
})

test('composição de mesmo total em pedido antigo é permitida e apenas itens são enviados', () => {
  const antigo = { ...pedido, dataEntrega: '2000-01-01', totalBolos: 3, itens: [{ produto: 'bolo-cenoura', quantidade: 3 }] }
  const novos = { ...campos, dataEntrega: antigo.dataEntrega, itens: [{ produto: 'bolo-cenoura', quantidade: 2 }, { produto: 'bolo-chocolate', quantidade: 1 }] }
  assert.deepEqual(validarEdicao(antigo, novos, agora), {})
  assert.deepEqual(alteracoesPedido(antigo, novos), { itens: novos.itens })
})
