import assert from 'node:assert/strict'
import { fork } from 'node:child_process'
import { once } from 'node:events'
import { join } from 'node:path'
import test from 'node:test'
import type { TestContext } from 'node:test'
import { fileURLToPath } from 'node:url'
import { abrirEncomendas } from '../src/database/encomendas.ts'
import { aoTerminar, pastaTemporaria, pedido, requisicao } from './helpers.ts'

async function processo(t: TestContext, arquivo: string) {
  const filho = fork(fileURLToPath(new URL('./fixtures/servidor.ts', import.meta.url)), [], {
    execArgv: ['--experimental-strip-types'],
    env: { ...process.env, TEST_DATABASE_PATH: arquivo },
    stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
  })
  aoTerminar(t, async () => {
    if (filho.exitCode !== null || filho.signalCode !== null) return
    const encerrado = once(filho, 'exit')
    filho.send('fechar')
    await encerrado
  })
  const porta = await new Promise<number>((resolver, rejeitar) => {
    filho.once('message', (mensagem) => resolver((mensagem as { porta: number }).porta))
    filho.once('error', rejeitar)
    filho.once('exit', (codigo) => rejeitar(new Error(`Servidor de teste encerrou: ${codigo}`)))
  })
  return `http://127.0.0.1:${porta}/api/encomendas`
}

test('dois processos concorrentes disputam a última vaga sem criar a sexta', { timeout: 15000 }, async (t) => {
  const pasta = await pastaTemporaria(t)
  const arquivo = join(pasta, 'concorrencia.sqlite')
  const inicial = abrirEncomendas(arquivo)
  inicial.fechar()
  const a = await processo(t, arquivo)
  const b = await processo(t, arquivo)
  for (let i = 0; i < 4; i++) assert.equal((await requisicao(a, 'POST', '', pedido)).status, 201)
  const respostas = await Promise.all([requisicao(a, 'POST', '', pedido), requisicao(b, 'POST', '', pedido)])
  assert.deepEqual(respostas.map((resposta) => resposta.status).sort(), [201, 409])
  assert.equal((await requisicao(a, 'GET')).dados.length, 5)
})

test('dois pedidos simultâneos de três bolos não ultrapassam cinco bolos', { timeout: 15000 }, async (t) => {
  const pasta = await pastaTemporaria(t)
  const arquivo = join(pasta, 'quantidades.sqlite')
  const a = await processo(t, arquivo)
  const b = await processo(t, arquivo)
  const respostas = await Promise.all([requisicao(a, 'POST', '', { ...pedido, itens: [{ produto: 'bolo-cenoura', quantidade: 3 }] }), requisicao(b, 'POST', '', { ...pedido, itens: [{ produto: 'bolo-cenoura', quantidade: 3 }] })])
  assert.deepEqual(respostas.map((resposta) => resposta.status).sort(), [201, 409])
  const todos = (await requisicao(a, 'GET')).dados as { totalBolos: number }[]
  assert.equal(todos.reduce((total, item) => total + item.totalBolos, 0), 3)
})

test('aumentos simultâneos de quantidade na mesma data respeitam soma e rollback', { timeout: 15000 }, async (t) => {
  const pasta = await pastaTemporaria(t)
  const arquivo = join(pasta, 'aumentos.sqlite')
  const a = await processo(t, arquivo)
  const b = await processo(t, arquivo)
  await requisicao(a, 'POST', '', pedido)
  await requisicao(a, 'POST', '', pedido)
  const respostas = await Promise.all([requisicao(a, 'PATCH', '/1', { itens: [{ produto: 'bolo-cenoura', quantidade: 3 }] }), requisicao(b, 'PATCH', '/2', { itens: [{ produto: 'bolo-cenoura', quantidade: 3 }] })])
  assert.deepEqual(respostas.map((resposta) => resposta.status).sort(), [200, 409])
  const todos = (await requisicao(a, 'GET')).dados as { totalBolos: number }[]
  assert.deepEqual(todos.map((item) => item.totalBolos).sort(), [1, 3])
})

test('trocas de data concorrentes também disputam uma única vaga com rollback do perdedor', { timeout: 15000 }, async (t) => {
  const pasta = await pastaTemporaria(t)
  const arquivo = join(pasta, 'troca.sqlite')
  const inicial = abrirEncomendas(arquivo)
  inicial.fechar()
  const a = await processo(t, arquivo)
  const b = await processo(t, arquivo)
  for (let i = 0; i < 4; i++) await requisicao(a, 'POST', '', pedido)
  for (let i = 0; i < 2; i++) await requisicao(a, 'POST', '', { ...pedido, dataEntrega: '2026-11-03' })
  const respostas = await Promise.all([requisicao(a, 'PATCH', '/5', { dataEntrega: pedido.dataEntrega }), requisicao(b, 'PATCH', '/6', { dataEntrega: pedido.dataEntrega })])
  assert.deepEqual(respostas.map((resposta) => resposta.status).sort(), [200, 409])
  const todos = (await requisicao(a, 'GET')).dados as { dataEntrega: string }[]
  assert.equal(todos.filter((item) => item.dataEntrega === pedido.dataEntrega).length, 5)
  assert.equal(todos.filter((item) => item.dataEntrega === '2026-11-03').length, 1)
})

test('última vaga de um dia com sabores mistos é reservada por somente um dos dois processos', { timeout: 15000 }, async (t) => {
  const arquivo = join(await pastaTemporaria(t), 'mistos.sqlite')
  const a = await processo(t, arquivo)
  const b = await processo(t, arquivo)
  await requisicao(a, 'POST', '', { ...pedido, itens: [{ produto: 'bolo-cenoura', quantidade: 2 }, { produto: 'bolo-chocolate', quantidade: 2 }] })
  const respostas = await Promise.all([
    requisicao(a, 'POST', '', { ...pedido, itens: [{ produto: 'bolo-coco', quantidade: 1 }] }),
    requisicao(b, 'POST', '', { ...pedido, itens: [{ produto: 'bolo-milho', quantidade: 1 }] }),
  ])
  assert.deepEqual(respostas.map((resposta) => resposta.status).sort(), [201, 409])
  const lista = (await requisicao(a, 'GET')).dados as { totalBolos: number }[]
  assert.equal(lista.reduce((soma, item) => soma + item.totalBolos, 0), 5)
})
