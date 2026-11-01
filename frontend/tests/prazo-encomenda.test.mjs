import assert from 'node:assert/strict'
import test from 'node:test'
import { hojeNoFuso, dentroDoPrazo } from '../src/utils/prazoEncomenda.ts'

const hoje = '2026-12-20'
const datas = ['2026-12-19', hoje, '2026-12-21', '2026-12-22', '2026-12-27', '2026-12-28', '2027-01-19', '2027-01-20', '2099-12-25']
const filtrar = (prazo) => datas.filter((data) => dentroDoPrazo(data, prazo, hoje))

test('1 dia inclui somente amanhã; 2 e 7 incluem seus limites', () => {
  assert.deepEqual(filtrar('1'), ['2026-12-21'])
  assert.deepEqual(filtrar('2'), ['2026-12-21', '2026-12-22'])
  assert.deepEqual(filtrar('7'), ['2026-12-21', '2026-12-22', '2026-12-27'])
})

test('30 inclui o trigésimo dia; 30+ inclui somente depois dele, sem teto', () => {
  assert.deepEqual(filtrar('30'), datas.slice(2, 7))
  assert.deepEqual(filtrar('30+'), ['2027-01-20', '2099-12-25'])
})

test('todos os prazos inclui hoje e o passado; qualquer prazo os exclui', () => {
  assert.deepEqual(filtrar(''), datas)
  for (const prazo of [...Array.from({ length: 30 }, (_, i) => String(i + 1)), '30+']) {
    assert.equal(dentroDoPrazo(hoje, prazo, hoje), false)
    assert.equal(dentroDoPrazo('2026-12-19', prazo, hoje), false)
  }
})

test('dias de calendário atravessam mês, ano e fevereiro bissexto', () => {
  for (const [inicio, fim] of [['2026-10-31', '2026-11-01'], ['2026-12-31', '2027-01-01'], ['2028-02-28', '2028-02-29'], ['2028-02-29', '2028-03-01']]) {
    assert(dentroDoPrazo(fim, '1', inicio))
  }
  assert(dentroDoPrazo('2027-01-30', '30', '2026-12-31'))
  assert.equal(dentroDoPrazo('2027-01-31', '30', '2026-12-31'), false)
})

test('hoje muda à meia-noite da Bahia, independentemente do fuso do computador', () => {
  const antes = hojeNoFuso('America/Bahia', new Date('2027-01-01T02:59:59Z'))
  const depois = hojeNoFuso('America/Bahia', new Date('2027-01-01T03:00:00Z'))
  assert.equal(antes, '2026-12-31')
  assert.equal(depois, '2027-01-01')
  assert(dentroDoPrazo('2027-01-01', '1', antes))
  assert.equal(dentroDoPrazo('2027-01-01', '1', depois), false)
  assert(dentroDoPrazo('2027-01-02', '1', depois))
})
