import assert from 'node:assert/strict'
import test from 'node:test'
import { cafeConfig } from '../src/data/cafeConfig.ts'
import { dataMinimaEncomenda, formatarTelefone, produtoEncomendavel, telefoneValido, validarEncomenda } from '../src/utils/encomenda.ts'

const dadosValidos = {
  nomeCliente: 'Cliente de Teste', telefone: '(73) 99999-9999', produto: 'bolo-cenoura',
  dataEntrega: '2026-11-01', incluirPaoDeQueijo: false, quantidadeBolos: 1,
}
const validar = (alteracoes = {}, minima = '2026-11-01') => validarEncomenda({ ...dadosValidos, ...alteracoes }, cafeConfig.produtos, minima)

test('a data mínima segue o calendário do café, inclusive perto da meia-noite UTC', () => {
  assert.equal(dataMinimaEncomenda('America/Bahia', new Date('2026-11-01T02:59:59Z')), '2026-11-01')
  assert.equal(dataMinimaEncomenda('America/Bahia', new Date('2026-11-01T03:00:00Z')), '2026-11-02')
  assert.equal(dataMinimaEncomenda('Asia/Tokyo', new Date('2026-10-31T16:00:00Z')), '2026-11-02')
})

test('amanhã funciona na virada do ano e em ano bissexto', () => {
  assert.equal(dataMinimaEncomenda('America/Bahia', new Date('2026-12-31T15:00:00Z')), '2027-01-01')
  assert.equal(dataMinimaEncomenda('America/Bahia', new Date('2028-02-28T15:00:00Z')), '2028-02-29')
})

test('campos obrigatórios vazios apresentam quatro erros', () => {
  assert.deepEqual(Object.keys(validar({ nomeCliente: ' ', telefone: '', produto: '', dataEntrega: '' })), ['nomeCliente', 'telefone', 'produto', 'dataEntrega'])
  assert(validar({ nomeCliente: 'Cliente' }).nomeCliente)
})

test('valida formato brasileiro e formata telefone sem apagar entrada inválida', () => {
  for (const numero of ['73999999999', '(73) 3333-3333', '+55 (73) 99999-9999']) assert(telefoneValido(numero))
  for (const numero of ['99999-9999', '123', '(03) 99999-9999', 'abc73999999999', '73899999999', '+1 73999999999']) assert.equal(telefoneValido(numero), false)
  assert.equal(formatarTelefone('73999999999'), '(73) 99999-9999')
  assert.equal(formatarTelefone('+55 7333333333'), '+55 (73) 3333-3333')
  assert.equal(formatarTelefone('123'), '123')
})

test('telefone normalizado com DDI é aceito sem confundir DDD 55 com prefixo internacional', () => {
  assert(telefoneValido('5573999999999'))
  assert.equal(formatarTelefone('5573999999999'), '+55 (73) 99999-9999')
  assert.equal(formatarTelefone('55999999999'), '(55) 99999-9999')
})

test('aceita amanhã e datas futuras, rejeita hoje, passado e calendário inválido', () => {
  assert.deepEqual(validar(), {})
  assert.deepEqual(validar({ dataEntrega: '2026-12-20' }), {})
  for (const dataEntrega of ['2026-10-31', '2026-10-30', '2026-02-30', '2026-13-01', '01/11/2026']) assert(validar({ dataEntrega }).dataEntrega)
  assert.deepEqual(validar({ dataEntrega: '2028-02-29' }), {})
  // Mesmo com a página aberta durante a madrugada, a nova data mínima invalida o dia anterior.
  assert(validar({}, '2026-11-02').dataEntrega)
})

test('somente os seis bolos são produtos principais; café, dúzia e Natal não entram no seletor', () => {
  assert.equal(cafeConfig.produtos.filter(produtoEncomendavel).length, 6)
  for (const produto of ['cafe-coado', 'cafe-leite', 'pao-queijo', 'panetone', 'bolo-natal', 'inexistente']) assert(validar({ produto }).produto)
  for (const produto of cafeConfig.produtos.filter(produtoEncomendavel)) assert.deepEqual(validar({ produto: produto.id }), {})
})

test('adicional opcional não impede a validação de um bolo', () => {
  assert.deepEqual(validar({ incluirPaoDeQueijo: true }), {})
})

test('quantidade deve ser inteira positiva e caber na disponibilidade consultada', () => {
  for (const quantidadeBolos of [0, -1, 1.5, NaN]) assert(validar({ quantidadeBolos }).quantidadeBolos)
  assert(validarEncomenda({ ...dadosValidos, quantidadeBolos: 3 }, cafeConfig.produtos, '2026-11-01', 2).quantidadeBolos)
  assert.deepEqual(validarEncomenda({ ...dadosValidos, quantidadeBolos: 2 }, cafeConfig.produtos, '2026-11-01', 2), {})
})
