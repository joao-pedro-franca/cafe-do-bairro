import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { abrirEncomendas } from '../src/database/encomendas.ts'
import { pedido } from './helpers.ts'

const agora = () => new Date('2026-11-01T15:00:00Z')
const ativo = { aceitaEncomendas: true, mesesPermitidos: [] as number[] }

function preparar(t: TestContext) {
  const repo = abrirEncomendas(':memory:')
  t.after(() => repo.fechar())
  const eventos: string[] = []
  const prepararOriginal = DatabaseSync.prototype.prepare
  const executarOriginal = DatabaseSync.prototype.exec
  t.mock.method(DatabaseSync.prototype, 'prepare', function (this: DatabaseSync, sql: string) {
    if (/^SELECT \* FROM produto_disponibilidade$/.test(sql)) eventos.push('SELECT disponibilidade')
    return prepararOriginal.call(this, sql)
  })
  t.mock.method(DatabaseSync.prototype, 'exec', function (this: DatabaseSync, sql: string) {
    if (['BEGIN IMMEDIATE', 'COMMIT', 'ROLLBACK'].includes(sql)) eventos.push(sql)
    return executarOriginal.call(this, sql)
  })
  return { repo, eventos }
}

test('listagem faz um SELECT e a próxima consulta já observa mudanças sem cache global', (t) => {
  const { repo, eventos } = preparar(t)
  const antes = repo.listarProdutos()
  assert.equal(antes.length, 11)
  assert.equal(antes.find((p) => p.id === 'panetone')!.aceitaEncomendas, false)
  assert.deepEqual(eventos, ['SELECT disponibilidade'])
  repo.configurarProduto('panetone', { ...ativo, mesesPermitidos: [12] })
  eventos.length = 0
  const depois = repo.listarProdutos()
  assert.equal(depois.length, 11)
  assert.equal(depois.find((p) => p.id === 'panetone')!.aceitaEncomendas, true)
  assert.deepEqual(depois.find((p) => p.id === 'panetone')!.mesesPermitidos, [12])
  assert.deepEqual(eventos, ['SELECT disponibilidade'])
})

test('vários produtos e acompanhamento compartilham um SELECT dentro de cada transação', (t) => {
  const { repo, eventos } = preparar(t)
  repo.configurarProduto('bolo-natal', ativo)
  eventos.length = 0
  const criado = repo.criar({ ...pedido, itens: [
    { produto: 'bolo-cenoura', quantidade: 1 }, { produto: 'bolo-milho', quantidade: 1 }, { produto: 'bolo-natal', quantidade: 2 },
  ] }, agora)
  assert.deepEqual(eventos, ['BEGIN IMMEDIATE', 'SELECT disponibilidade', 'COMMIT'])
  assert.equal(criado.totalCentavos, 20500)
  eventos.length = 0
  const movido = repo.atualizar(criado.id, { dataEntrega: '2026-12-02' }, agora)
  assert.deepEqual(eventos, ['BEGIN IMMEDIATE', 'SELECT disponibilidade', 'COMMIT'])
  assert.equal(movido.totalCentavos, criado.totalCentavos)
  assert.deepEqual(movido.itens, criado.itens)

  repo.configurarProduto('bolo-natal', { ...ativo, aceitaEncomendas: false })
  eventos.length = 0
  assert.throws(() => repo.atualizar(criado.id, { dataEntrega: '2026-12-03' }, agora), /não aceita encomendas/)
  assert.deepEqual(eventos, ['BEGIN IMMEDIATE', 'SELECT disponibilidade', 'ROLLBACK'])
  assert.deepEqual(repo.buscar(criado.id), movido)
  eventos.length = 0
  const mantido = repo.atualizar(criado.id, { status: 'em preparo' }, agora)
  assert.deepEqual(eventos, ['BEGIN IMMEDIATE', 'COMMIT'])
  assert.deepEqual(mantido.itens, criado.itens)
})
