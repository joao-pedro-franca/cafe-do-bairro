import assert from 'node:assert/strict'
import { once } from 'node:events'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { criarApp } from '../src/app.ts'
import { abrirEncomendas } from '../src/database/encomendas.ts'
import { ApiError } from '../src/errors.ts'
import { pedido, TOKEN_TESTE } from './helpers.ts'

async function preparar(t: TestContext) {
  const repo = abrirEncomendas(':memory:')
  // Deixa o aviso experimental do runtime ser emitido antes de observar os logs da API.
  await new Promise<void>((resolve) => setImmediate(resolve))
  const registros: string[] = []
  t.mock.method(console, 'error', (linha: string) => { registros.push(linha) })
  const servidor = criarApp(repo, { adminToken: TOKEN_TESTE }).listen(0, '127.0.0.1')
  t.after(async () => {
    await new Promise<void>((resolve, reject) => servidor.close((erro) => erro ? reject(erro) : resolve()))
    repo.fechar()
  })
  await once(servidor, 'listening')
  const endereco = servidor.address()
  if (!endereco || typeof endereco === 'string') throw new Error('Porta de teste indisponível')
  return { repo, registros, base: `http://127.0.0.1:${endereco.port}/api` }
}

test('erro inesperado registra apenas campos permitidos e mantém resposta 500 genérica', async (t) => {
  const { repo, registros, base } = await preparar(t)
  const segredo = 'segredo-que-nao-pode-aparecer'
  const erro = new Error(`SELECT telefone FROM encomendas: ${segredo}`)
  erro.name = segredo
  t.mock.method(repo, 'criar', () => { throw erro })
  const resposta = await fetch(`${base}/encomendas?senha=${segredo}&telefone=${pedido.telefone}`, {
    method: 'POST', signal: AbortSignal.timeout(5000),
    headers: { 'Content-Type': 'application/json', Cookie: `cafe_admin=${segredo}`, Authorization: `Bearer ${segredo}`, 'X-Request-ID': segredo },
    body: JSON.stringify(pedido),
  })
  assert.equal(resposta.status, 500)
  assert.deepEqual(await resposta.json(), { erro: 'Não foi possível concluir a operação.' })
  assert.equal(registros.length, 1)
  const registro = JSON.parse(registros[0]!)
  assert.deepEqual(Object.keys(registro).sort(), ['categoria', 'evento', 'idRequisicao', 'metodo', 'rota'])
  assert.equal(registro.evento, 'erro_inesperado')
  assert.equal(registro.metodo, 'POST')
  assert.equal(registro.rota, '/api/encomendas')
  assert.equal(registro.categoria, 'Error')
  assert.match(registro.idRequisicao, /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/)
  for (const sensivel of [segredo, pedido.nomeCliente, pedido.telefone, 'SELECT', 'stack', 'Cookie', 'Authorization']) {
    assert(!registros[0]!.includes(sensivel), `Log contém informação proibida: ${sensivel}`)
  }
})

test('rota dinâmica usa modelo fixo e cada falha recebe identificador próprio', async (t) => {
  const { repo, registros, base } = await preparar(t)
  const segredo = 'cliente-privado@example.com'
  t.mock.method(repo, 'configurarProduto', () => { throw new TypeError(segredo) })
  for (let i = 0; i < 2; i++) {
    const resposta = await fetch(`${base}/admin/produtos/${encodeURIComponent(segredo)}?token=${segredo}`, {
      method: 'PATCH', signal: AbortSignal.timeout(5000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN_TESTE}` }, body: '{}',
    })
    assert.equal(resposta.status, 500)
    assert.deepEqual(await resposta.json(), { erro: 'Não foi possível concluir a operação.' })
  }
  assert.equal(registros.length, 2)
  const [a, b] = registros.map((linha) => JSON.parse(linha))
  assert.equal(a.rota, '/api/admin/produtos/:id')
  assert.equal(a.categoria, 'TypeError')
  assert.notEqual(a.idRequisicao, b.idRequisicao)
  assert(!registros.join('').includes(segredo))
  assert(!registros.join('').includes(encodeURIComponent(segredo)))
  assert(!registros.join('').includes(TOKEN_TESTE))
})

test('erros conhecidos preservam status, corpo e Retry-After sem gerar registro inesperado', async (t) => {
  const { repo, registros, base } = await preparar(t)
  let falha: unknown
  t.mock.method(repo, 'listarProdutos', () => { throw falha })
  const casos = [
    { erro: new ApiError(409, 'Produto indisponível.', 'PRODUTO_INDISPONIVEL'), status: 409, corpo: { erro: 'Produto indisponível.', codigo: 'PRODUTO_INDISPONIVEL' } },
    { erro: { type: 'entity.parse.failed' }, status: 400, corpo: { erro: 'O JSON enviado é inválido.' } },
    { erro: { type: 'entity.too.large' }, status: 413, corpo: { erro: 'O corpo da requisição é muito grande.' } },
    ...[5, 6].map((errcode) => ({ erro: { errcode }, status: 503, corpo: { erro: 'O banco está ocupado. Tente novamente em instantes.' } })),
  ]
  for (const caso of casos) {
    falha = caso.erro
    const resposta = await fetch(`${base}/produtos`, { signal: AbortSignal.timeout(5000) })
    assert.equal(resposta.status, caso.status)
    assert.deepEqual(await resposta.json(), caso.corpo)
    assert.equal(resposta.headers.get('retry-after'), caso.status === 503 ? '1' : null)
  }
  assert.deepEqual(registros, [])
})
