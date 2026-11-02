import assert from 'node:assert/strict'
import test from 'node:test'
import { cafeConfig } from '../src/data/cafeConfig.ts'
import { dataMinimaEncomenda, formatarTelefone, telefoneValido, validarEncomenda } from '../src/utils/encomenda.ts'

const dadosValidos = { nomeCliente: 'Cliente de Teste', telefone: '(73) 99999-9999', dataEntrega: '2026-11-01', incluirPaoDeQueijo: false, itens: [{ produto: 'bolo-cenoura', quantidade: 1 }] }
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
  assert.deepEqual(Object.keys(validar({ nomeCliente: ' ', telefone: '', dataEntrega: '', itens: [{ produto: '', quantidade: 1 }] })), ['nomeCliente', 'telefone', 'itens', 'dataEntrega'])
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

test('encomendas aceitam somente bolos e panetone; disponibilidade é conferida separadamente', () => {
  assert(validar({ itens: [{ produto: 'inexistente', quantidade: 1 }] }).itens)
  for (const produto of cafeConfig.produtos) {
    const erros = validar({ itens: [{ produto: produto.id, quantidade: 1 }] })
    if (['cafe-coado', 'cafe-leite', 'pao-queijo'].includes(produto.id)) assert(erros.itens)
    else assert.deepEqual(erros, {})
  }
})

test('adicional opcional não impede a validação de um bolo', () => {
  assert.deepEqual(validar({ incluirPaoDeQueijo: true }), {})
  assert.deepEqual(validar({ incluirPaoDeQueijo: true, itens: [{ produto: 'bolo-natal', quantidade: 1 }] }), {})
  assert(validar({ incluirPaoDeQueijo: true, itens: [{ produto: 'panetone', quantidade: 1 }] }).itens)
})

test('quantidade deve ser inteira positiva e caber na disponibilidade consultada', () => {
  for (const quantidadeBolos of [0, -1, 1.5, NaN]) assert(validar({ itens: [{ produto: 'bolo-cenoura', quantidade: quantidadeBolos }] }).itens)
  assert(validarEncomenda({ ...dadosValidos, itens: [{ produto: 'bolo-cenoura', quantidade: 3 }] }, cafeConfig.produtos, '2026-11-01', 2).itens)
  assert.deepEqual(validarEncomenda({ ...dadosValidos, itens: [{ produto: 'bolo-cenoura', quantidade: 2 }] }, cafeConfig.produtos, '2026-11-01', 2), {})
})

test('composição soma sabores, recusa vazio/duplicado e respeita o saldo compartilhado', () => {
  const itens = [{ produto: 'bolo-cenoura', quantidade: 2 }, { produto: 'bolo-chocolate', quantidade: 1 }]
  assert.deepEqual(validar({ itens }), {})
  assert(validar({ itens: [] }).itens)
  assert(validar({ itens: [itens[0], itens[0]] }).itens)
  assert(validarEncomenda({ ...dadosValidos, itens }, cafeConfig.produtos, '2026-11-01', 2).itens)
})
