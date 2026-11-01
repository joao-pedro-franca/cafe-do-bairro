import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, test } from 'node:test'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { Window } from 'happy-dom'
import { createServer } from 'vite'
import { act, createElement } from 'react'
import { criarApp } from '../../backend/src/app.ts'
import { gerarHash } from '../../backend/src/auth/senha.ts'
import { abrirEncomendas } from '../../backend/src/database/encomendas.ts'

const originalFetch = globalThis.fetch
const janela = new Window({ url: 'http://127.0.0.1/admin' })
const globais = { window: janela, document: janela.document, navigator: janela.navigator, HTMLElement: janela.HTMLElement, HTMLInputElement: janela.HTMLInputElement, Event: janela.Event, IS_REACT_ACT_ENVIRONMENT: true }
const descritores = new Map(Object.keys(globais).map((chave) => [chave, Object.getOwnPropertyDescriptor(globalThis, chave)]))
for (const [chave, valor] of Object.entries(globais)) Object.defineProperty(globalThis, chave, { value: valor, configurable: true, writable: true })
const { createRoot } = await import('react-dom/client')
let vite, api, repo, base, Admin, raiz, container, cookie = '', interceptar
const senha = 'senha-ficticia-integracao'
const dados = { nomeCliente: 'Cliente de Teste', telefone: '73999999999', produto: 'bolo-cenoura', dataEntrega: '2099-12-25', incluirPaoDeQueijo: true, quantidadeBolos: 2 }

before(async () => {
  const admin = { usuario: 'marta-teste', senhaHash: await gerarHash(senha), origem: 'http://127.0.0.1:5173' }
  repo = abrirEncomendas(':memory:')
  api = criarApp(repo, { admin }).listen(0, '127.0.0.1')
  await once(api, 'listening')
  vite = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { host: '127.0.0.1', port: 0, hmr: false, watch: null, proxy: { '/api': { target: `http://127.0.0.1:${api.address().port}` } } }, logLevel: 'silent' })
  await vite.listen()
  base = `http://127.0.0.1:${vite.httpServer.address().port}`
  // A origem de teste só é conhecida depois de o sistema escolher a porta temporária.
  admin.origem = base
  Admin = (await vite.ssrLoadModule('/src/pages/Admin.tsx')).Admin
})
beforeEach(async () => {
  repo.criar(dados, () => new Date())
  cookie = ''
  interceptar = null
  globalThis.fetch = async (url, opcoes) => {
    assert.equal(opcoes.credentials, 'same-origin')
    assert.equal(opcoes.headers.Authorization, undefined)
    if (interceptar) await interceptar(url, opcoes)
    const res = await originalFetch(new URL(url, base), { ...opcoes, headers: { ...opcoes.headers, Origin: base, ...(cookie ? { Cookie: cookie } : {}) } })
    // O Node não tem cookie jar: simula apenas o transporte que o navegador faz.
    const novoCookie = res.headers.get('set-cookie')
    if (novoCookie) cookie = novoCookie.split(';')[0]
    return res
  }
  container = document.createElement('div')
  document.body.append(container)
  raiz = createRoot(container)
  await act(async () => raiz.render(createElement(Admin)))
  await esperar(() => container.querySelector('#admin-usuario'))
})
afterEach(async () => {
  await act(async () => raiz.unmount())
  container.remove()
  for (const pedido of repo.listar()) repo.remover(pedido.id)
  globalThis.fetch = originalFetch
})
after(async () => {
  await vite?.close()
  if (api) await new Promise((resolve) => api.close(resolve))
  repo?.fechar()
  await janela.happyDOM.close()
  for (const [chave, descritor] of descritores) {
    if (descritor) Object.defineProperty(globalThis, chave, descritor)
    else delete globalThis[chave]
  }
})
async function esperar(condicao) {
  for (let i = 0; i < 400; i++) {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)) })
    if (condicao()) return
  }
  assert.fail(`Estado esperado não encontrado: ${container.textContent}`)
}
async function preencher(seletor, valor) {
  const el = container.querySelector(seletor)
  await act(async () => {
    const proto = el.tagName === 'SELECT' ? janela.HTMLSelectElement.prototype : janela.HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, valor)
    el.dispatchEvent(new janela.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }))
  })
}
const botao = (texto) => [...container.querySelectorAll('button')].find((el) => el.textContent === texto)
async function clicar(el) { await act(async () => { el.focus(); el.click() }) }
async function enviar(form) { await act(async () => form.dispatchEvent(new janela.Event('submit', { bubbles: true, cancelable: true }))) }
async function login(senhaEscolhida = senha) {
  await preencher('#admin-usuario', 'marta-teste')
  await preencher('#admin-senha', senhaEscolhida)
  await enviar(container.querySelector('form'))
}

test('login → proxy → sessão → SQLite: dados só aparecem após autenticação; filtros e status funcionam', async () => {
  assert(!container.textContent.includes(dados.nomeCliente))
  await login()
  await esperar(() => container.querySelector('.admin-card'))
  assert(container.textContent.includes('Bolo de cenoura'))
  assert(container.textContent.includes('2 bolos'))
  assert(container.textContent.includes('Sim, uma dúzia'))
  await preencher('#filtro-status', 'entregue')
  assert.equal(container.querySelectorAll('.admin-card').length, 0)
  await clicar(botao('Limpar filtros'))
  await preencher('#filtro-data', '2099-12-24')
  assert.equal(container.querySelectorAll('.admin-card').length, 0)
  await preencher('#filtro-data', dados.dataEntrega)
  const id = repo.listar()[0].id
  await preencher(`#status-${id}`, 'em preparo')
  await enviar(container.querySelector('.admin-card form'))
  await esperar(() => container.querySelector('[role="status"]')?.textContent.includes('atualizado'))
  assert.equal(repo.buscar(id).status, 'em preparo')
  assert.equal(repo.disponibilidade(dados.dataEntrega).quantidadeReservada, 2)
  assert.equal(window.localStorage.length, 0)
  assert.equal(window.sessionStorage.length, 0)
})

test('credenciais incorretas mantêm login e não mostram dados pessoais', async () => {
  await login('incorreta')
  await esperar(() => container.querySelector('[role="alert"]'))
  assert(container.textContent.includes('Usuário ou senha incorretos'))
  assert(!container.textContent.includes(dados.nomeCliente))
  assert.equal(container.querySelector('#admin-senha').value, '')
})

test('exclusão exige confirmação explícita; cancelar mantém pedido; confirmar libera capacidade', async () => {
  await login()
  await esperar(() => container.querySelector('.admin-card'))
  await clicar(botao('Excluir pedido'))
  assert(container.querySelector('[role="alertdialog"]'))
  assert.equal(repo.listar().length, 1)
  await clicar(botao('Manter pedido'))
  assert.equal(repo.listar().length, 1)
  assert(!container.querySelector('[role="alertdialog"]'))
  assert.equal(document.activeElement?.getAttribute('aria-label'), botao('Excluir pedido').getAttribute('aria-label'))
  await clicar(botao('Excluir pedido'))
  await clicar([...container.querySelectorAll('button')].find((el) => el.textContent.startsWith('Sim, excluir')))
  await esperar(() => repo.listar().length === 0 && container.textContent.includes('excluído'))
  assert.equal(repo.disponibilidade(dados.dataEntrega).quantidadeReservada, 0)
})

test('logout invalida acesso e remove dados da tela; reabrir exige login', async () => {
  await login()
  await esperar(() => container.querySelector('.admin-card'))
  await clicar(botao('Sair'))
  await esperar(() => container.querySelector('#admin-usuario'))
  assert(!container.textContent.includes(dados.nomeCliente))
  const res = await originalFetch(`${base}/api/encomendas`, { headers: { Cookie: cookie } })
  assert.equal(res.status, 401)
  await act(async () => raiz.unmount())
  raiz = createRoot(container)
  await act(async () => raiz.render(createElement(Admin)))
  await esperar(() => container.querySelector('#admin-usuario'))
})

test('duplo login é bloqueado e sessão perdida durante operação limpa dados privados', async () => {
  let liberar
  const espera = new Promise((resolve) => { liberar = resolve })
  let chamadas = 0
  interceptar = async (url) => { if (url.endsWith('/login')) { chamadas++; await espera } }
  await login()
  await enviar(container.querySelector('form'))
  assert.equal(chamadas, 1)
  assert(botao('Entrando…').disabled)
  liberar()
  await esperar(() => container.querySelector('.admin-card'))
  cookie = ''
  await clicar(botao('Atualizar lista'))
  await esperar(() => container.querySelector('#admin-usuario'))
  assert(!container.textContent.includes(dados.nomeCliente))
  assert(container.querySelector('[role="alert"]'))
})
