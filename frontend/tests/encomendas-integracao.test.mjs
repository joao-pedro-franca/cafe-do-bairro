import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, test } from 'node:test'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { Window } from 'happy-dom'
import { createServer } from 'vite'
import { act, createElement } from 'react'
import { criarApp } from '../../backend/src/app.ts'
import { abrirEncomendas } from '../../backend/src/database/encomendas.ts'

const fetchOriginal = globalThis.fetch
const janela = new Window({ url: 'http://127.0.0.1/' })
const globais = { window: janela, document: janela.document, navigator: janela.navigator, HTMLElement: janela.HTMLElement, HTMLInputElement: janela.HTMLInputElement, Event: janela.Event, MouseEvent: janela.MouseEvent, IS_REACT_ACT_ENVIRONMENT: true, requestAnimationFrame: (callback) => setTimeout(callback, 0), cancelAnimationFrame: clearTimeout }
const descritores = new Map(Object.keys(globais).map((chave) => [chave, Object.getOwnPropertyDescriptor(globalThis, chave)]))
for (const [chave, valor] of Object.entries(globais)) Object.defineProperty(globalThis, chave, { value: valor, configurable: true, writable: true })
janela.HTMLElement.prototype.scrollIntoView = () => {}
const { createRoot } = await import('react-dom/client')

let vite, servidorApi, repo, componente, raiz, container, base
let interceptor
const dados = { nomeCliente: 'Cliente de Teste', telefone: '(73) 99999-9999', produto: 'bolo-cenoura', dataEntrega: '2099-12-25', incluirPaoDeQueijo: true }

before(async () => {
  repo = abrirEncomendas(':memory:')
  servidorApi = criarApp(repo).listen(0, '127.0.0.1')
  await once(servidorApi, 'listening')
  const target = `http://127.0.0.1:${servidorApi.address().port}`
  vite = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)),
    server: { host: '127.0.0.1', port: 0, hmr: false, watch: null, proxy: { '/api': { target } } },
    logLevel: 'silent',
  })
  await vite.listen()
  base = `http://127.0.0.1:${vite.httpServer.address().port}`
  componente = (await vite.ssrLoadModule('/src/sections/Encomendas.tsx')).Encomendas
})

beforeEach(async () => {
  interceptor = (url, opcoes) => fetchOriginal(new URL(url, base), opcoes)
  globalThis.fetch = (...args) => interceptor(...args)
  container = document.createElement('div')
  document.body.append(container)
  raiz = createRoot(container)
  await act(async () => raiz.render(createElement(componente)))
  await clicar(container.querySelector('.orders-toggle'))
})

afterEach(async () => {
  await act(async () => raiz?.unmount())
  container?.remove()
  for (const pedido of repo.listar()) repo.remover(pedido.id)
  globalThis.fetch = fetchOriginal
})

after(async () => {
  await vite?.close()
  if (servidorApi) await new Promise((resolver) => servidorApi.close(resolver))
  repo?.fechar()
  await janela.happyDOM.close()
  for (const [chave, descritor] of descritores) {
    if (descritor) Object.defineProperty(globalThis, chave, descritor)
    else delete globalThis[chave]
  }
})

async function clicar(elemento) { await act(async () => elemento.click()) }
async function preencher(campo, valor) {
  const elemento = container.querySelector(`[name="${campo}"]`)
  await act(async () => {
    if (elemento.type === 'checkbox') elemento.click()
    else {
      const prototipo = elemento.tagName === 'SELECT' ? janela.HTMLSelectElement.prototype : janela.HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(prototipo, 'value').set.call(elemento, valor)
      elemento.dispatchEvent(new janela.Event(elemento.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }))
    }
  })
}
async function preencherTudo() {
  for (const [campo, valor] of Object.entries(dados)) await preencher(campo, valor)
}
function dispararEnvio() { container.querySelector('form').dispatchEvent(new janela.Event('submit', { bubbles: true, cancelable: true })) }
async function enviar() { await act(async () => dispararEnvio()) }
async function esperar(condicao) {
  for (let i = 0; i < 200; i++) {
    await act(async () => { await new Promise((resolver) => setTimeout(resolver, 10)) })
    if (condicao()) return
  }
  assert.fail(`A interface não chegou ao resultado esperado: ${container.textContent}`)
}

test('validação local impede POST e a gaveta preserva preenchimento ao fechar/reabrir', async () => {
  let chamadas = 0
  interceptor = async () => { chamadas++; throw new Error('Não deveria enviar') }
  await preencher('nomeCliente', dados.nomeCliente)
  await clicar(container.querySelector('.orders-toggle'))
  await clicar(container.querySelector('.orders-toggle'))
  assert.equal(container.querySelector('[name="nomeCliente"]').value, dados.nomeCliente)
  await enviar()
  assert.equal(chamadas, 0)
  assert(container.querySelector('#erro-telefone'))
  assert(container.querySelector('#erro-produto'))
  assert(container.querySelector('#erro-dataEntrega'))
})

test('formulário → proxy Vite → API → SQLite: só confirma depois do 201 e bloqueia duplicidade', async () => {
  await preencherTudo()
  let liberar
  const espera = new Promise((resolver) => { liberar = resolver })
  let chamadas = 0
  interceptor = async (url, opcoes) => {
    chamadas++
    assert.equal(opcoes.credentials, 'omit')
    assert.equal(opcoes.headers.Authorization, undefined)
    await espera
    return fetchOriginal(new URL(url, base), opcoes)
  }
  await act(async () => { dispararEnvio(); dispararEnvio() })
  assert.equal(chamadas, 1)
  assert(container.querySelector('[type="submit"]').disabled)
  assert(container.querySelector('fieldset').disabled)
  assert(!container.textContent.includes('confirmada!'))
  assert.equal(repo.listar().length, 0)
  await clicar(container.querySelector('.orders-toggle'))
  await clicar(container.querySelector('.orders-toggle'))
  assert.equal(container.querySelector('[name="nomeCliente"]').value, dados.nomeCliente)
  liberar()
  await esperar(() => container.textContent.includes('confirmada!'))
  const pedidos = repo.listar()
  assert.equal(pedidos.length, 1)
  assert.equal(pedidos[0].incluirPaoDeQueijo, true)
  assert(container.textContent.includes(`Encomenda nº ${pedidos[0].id} confirmada!`))
  assert(container.textContent.includes('pagamento será realizado na retirada'))
  await clicar(container.querySelector('.orders-toggle'))
  await clicar(container.querySelector('.orders-toggle'))
  assert(container.textContent.includes(`Encomenda nº ${pedidos[0].id} confirmada!`))
  await enviar()
  assert.equal(chamadas, 1)
  await clicar([...container.querySelectorAll('button')].find((botao) => botao.textContent === 'Fazer outra encomenda'))
  assert.equal(container.querySelector('[name="nomeCliente"]').value, '')
  assert(!container.querySelector('fieldset').disabled)
})

test('409 real preserva dados, destaca a data e permite corrigir e enviar para outro dia', async () => {
  for (let i = 0; i < 5; i++) repo.criar(dados, () => new Date())
  await preencherTudo()
  await enviar()
  await esperar(() => container.querySelector('.form-api-error'))
  assert(container.querySelector('.form-api-error').textContent.includes('cinco encomendas'))
  assert(container.querySelector('#erro-dataEntrega'))
  assert(!container.textContent.includes('confirmada!'))
  assert.equal(container.querySelector('[name="nomeCliente"]').value, dados.nomeCliente)
  assert.equal(container.querySelector('[name="incluirPaoDeQueijo"]').checked, true)
  await preencher('dataEntrega', '2099-12-26')
  await enviar()
  await esperar(() => container.textContent.includes('confirmada!'))
  assert.equal(repo.listar().length, 6)
  assert.equal(container.querySelector('.form-api-error'), null)
})

test('falha de rede não confirma, não repete automaticamente e libera o formulário preservado', async () => {
  await preencherTudo()
  let chamadas = 0
  interceptor = async () => { chamadas++; throw new TypeError('Failed to fetch') }
  await enviar()
  await esperar(() => container.querySelector('.form-api-error'))
  assert.equal(chamadas, 1)
  assert(container.querySelector('.form-api-error').textContent.includes('pode ter sido recebido'))
  assert(!container.textContent.includes('confirmada!'))
  assert(!container.querySelector('fieldset').disabled)
  assert.equal(container.querySelector('[name="nomeCliente"]').value, dados.nomeCliente)
  assert.equal(repo.listar().length, 0)
})

test('400 real mostra a validação do servidor sem apagar campos nem confirmar', async () => {
  await preencherTudo()
  const nomeLongo = `Cliente ${'x'.repeat(100)}`
  await preencher('nomeCliente', nomeLongo)
  await enviar()
  await esperar(() => container.querySelector('.form-api-error'))
  assert(container.querySelector('.form-api-error').textContent.includes('até 100 caracteres'))
  assert(!container.textContent.includes('confirmada!'))
  assert.equal(container.querySelector('[name="nomeCliente"]').value, nomeLongo)
  assert(!container.querySelector('fieldset').disabled)
  assert.equal(repo.listar().length, 0)
})

test('o proxy não libera leituras administrativas da API', async () => {
  const resposta = await fetchOriginal(`${base}/api/encomendas`)
  assert.equal(resposta.status, 503)
  assert.deepEqual(Object.keys(await resposta.json()), ['erro'])
})
