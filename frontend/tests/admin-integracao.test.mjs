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
import { hojeNoFuso } from '../src/utils/prazoEncomenda.ts'

const originalFetch = globalThis.fetch
const janela = new Window({ url: 'http://127.0.0.1/admin' })
const globais = { window: janela, document: janela.document, navigator: janela.navigator, HTMLElement: janela.HTMLElement, HTMLInputElement: janela.HTMLInputElement, Event: janela.Event, IS_REACT_ACT_ENVIRONMENT: true }
const descritores = new Map(Object.keys(globais).map((chave) => [chave, Object.getOwnPropertyDescriptor(globalThis, chave)]))
for (const [chave, valor] of Object.entries(globais)) Object.defineProperty(globalThis, chave, { value: valor, configurable: true, writable: true })
const { createRoot } = await import('react-dom/client')
let vite, api, repo, base, Admin, raiz, container, cookie = '', interceptar
let deslocamentoRelogio = 0
const senha = 'senha-ficticia-integracao'
const dados = { nomeCliente: 'Cliente de Teste', telefone: '73999999999', dataEntrega: '2099-12-25', incluirPaoDeQueijo: true, itens: [{ produto: 'bolo-cenoura', quantidade: 2 }] }

before(async () => {
  const admin = { usuario: 'marta-teste', senhaHash: await gerarHash(senha), origem: 'http://127.0.0.1:5173' }
  repo = abrirEncomendas(':memory:')
  api = criarApp(repo, { admin, agora: () => new Date(Date.now() + deslocamentoRelogio) }).listen(0, '127.0.0.1')
  await once(api, 'listening')
  vite = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { host: '127.0.0.1', port: 0, hmr: false, watch: null, proxy: { '/api': { target: `http://127.0.0.1:${api.address().port}` } } }, logLevel: 'silent' })
  await vite.listen()
  base = `http://127.0.0.1:${vite.httpServer.address().port}`
  // A origem de teste só é conhecida depois de o sistema escolher a porta temporária.
  admin.origem = base
  Admin = (await vite.ssrLoadModule('/src/pages/Admin.tsx')).Admin
})
beforeEach(async () => {
  // Isola a janela de tentativas de cada cenário sem desabilitar a proteção da API.
  deslocamentoRelogio += 16 * 60 * 1000
  repo.criar(dados, () => new Date())
  cookie = ''
  interceptar = null
  globalThis.fetch = async (url, opcoes) => {
    assert.equal(opcoes.credentials, 'same-origin')
    assert.equal(opcoes.headers.Authorization, undefined)
    if (interceptar) {
      const resposta = await interceptar(url, opcoes)
      if (resposta) return resposta
    }
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
  if (Array.isArray(valor)) {
    for (let i = 0; i < valor.length; i++) {
      await preencher(seletor + '-sabor-' + i, valor[i].produto)
      await preencher(seletor + '-quantidade-' + i, String(valor[i].quantidade))
    }
    return
  }
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
async function abrirEdicao() {
  await login()
  await esperar(() => container.querySelector('.admin-card'))
  await clicar(botao('Editar pedido'))
  const id = repo.listar()[0].id
  assert.equal(document.activeElement?.id, `editar-titulo-${id}`)
  return id
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
  assert.equal(document.activeElement?.id, `status-${id}`)
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

test('resposta inválida ao atualizar mostra erro sem apagar pedidos nem quebrar o painel', async () => {
  await login()
  await esperar(() => container.querySelector('.admin-card'))
  interceptar = async (url) => url === '/api/encomendas' ? new Response('<html>Resposta incompleta</html>', { status: 200 }) : undefined
  await clicar(botao('Atualizar lista'))
  await esperar(() => container.querySelector('[role="alert"]'))
  assert(container.textContent.includes('resposta do servidor está incompleta ou inválida'))
  assert.equal(container.querySelectorAll('.admin-card').length, 1)
  assert(container.textContent.includes(dados.nomeCliente))
})

test('edição completa envia só os sete campos modificados, espera o servidor e bloqueia duplicidade', async () => {
  const id = await abrirEdicao()
  assert.equal(container.querySelector(`#editar-${id}-nomeCliente`).value, dados.nomeCliente)
  assert.equal(container.querySelector(`#editar-${id}-dataEntrega`).value, dados.dataEntrega)
  assert.equal(container.querySelector(`#editar-${id}-incluirPaoDeQueijo`).checked, true)
  const mudancas = { nomeCliente: 'Cliente Revisado', telefone: '(73) 98888-8888', dataEntrega: '2099-12-26', status: 'em preparo', itens: [{ produto: 'bolo-coco', quantidade: '3' }] }
  for (const [campo, valor] of Object.entries(mudancas)) await preencher(`#editar-${id}-${campo}`, valor)
  await clicar(container.querySelector(`#editar-${id}-incluirPaoDeQueijo`))
  let liberar, chamadas = 0
  const espera = new Promise((resolve) => { liberar = resolve })
  interceptar = async (_url, opcoes) => {
    if (opcoes.method !== 'PATCH') return
    chamadas++
    assert.deepEqual(JSON.parse(opcoes.body), { ...mudancas, telefone: '73988888888', incluirPaoDeQueijo: false, itens: [{ produto: 'bolo-coco', quantidade: 3 }] })
    assert(opcoes.headers['X-CSRF-Token'])
    await espera
  }
  await enviar(container.querySelector('.admin-edit'))
  await enviar(container.querySelector('.admin-edit'))
  assert.equal(chamadas, 1)
  assert.equal(repo.buscar(id).nomeCliente, dados.nomeCliente)
  assert.equal(container.querySelector('.admin-customer').textContent, dados.nomeCliente)
  liberar()
  await esperar(() => !container.querySelector('.admin-edit'))
  assert.equal(repo.buscar(id).nomeCliente, 'Cliente Revisado')
  assert.equal(repo.buscar(id).incluirPaoDeQueijo, false)
  assert.equal(repo.disponibilidade(dados.dataEntrega).quantidadeReservada, 0)
  assert.equal(repo.disponibilidade('2099-12-26').quantidadeReservada, 3)
  assert.equal(document.activeElement?.id, `editar-botao-${id}`)
})

test('cancelar edição descarta rascunho sem PATCH e devolve foco ao cartão', async () => {
  const id = await abrirEdicao()
  let chamadas = 0
  interceptar = async (_url, opcoes) => { if (opcoes.method === 'PATCH') chamadas++ }
  await preencher(`#editar-${id}-nomeCliente`, 'Rascunho Cancelado')
  await clicar(botao('Adicionar sabor'))
  await clicar(container.querySelector('[aria-label="Remover sabor 1"]'))
  await clicar(botao('Cancelar'))
  assert.equal(chamadas, 0)
  assert.equal(repo.buscar(id).nomeCliente, dados.nomeCliente)
  assert.deepEqual(repo.buscar(id).itens, dados.itens)
  assert.equal(document.activeElement?.id, `editar-botao-${id}`)
  await clicar(botao('Editar pedido'))
  assert.equal(container.querySelector(`#editar-${id}-nomeCliente`).value, dados.nomeCliente)
})

test('validação de edição impede campos inválidos e nenhuma alteração não faz PATCH', async () => {
  const id = await abrirEdicao()
  let chamadas = 0
  interceptar = async (_url, opcoes) => { if (opcoes.method === 'PATCH') chamadas++ }
  await enviar(container.querySelector('.admin-edit'))
  assert(container.textContent.includes('Nenhuma informação foi alterada'))
  for (const [campo, valor] of Object.entries({ nomeCliente: 'Ana', telefone: '123', dataEntrega: '2000-01-01', itens: [{ produto: 'bolo-cenoura', quantidade: '1.5' }] })) await preencher(`#editar-${id}-${campo}`, valor)
  await enviar(container.querySelector('.admin-edit'))
  assert.equal(chamadas, 0)
  for (const campo of ['nomeCliente', 'telefone', 'dataEntrega']) assert.equal(container.querySelector(`#editar-${id}-${campo}`).getAttribute('aria-invalid'), 'true')
  assert.equal(document.activeElement?.getAttribute('role'), 'alert')
  assert.equal(repo.buscar(id).totalBolos, 2)
})

test('contato de pedido antigo é editado sem reenviar data ou quantidade', async () => {
  const id = repo.listar()[0].id
  repo.atualizar(id, { dataEntrega: '2000-01-01' }, () => new Date('1999-12-01T12:00:00Z'))
  await abrirEdicao()
  let enviado
  interceptar = async (_url, opcoes) => { if (opcoes.method === 'PATCH') enviado = JSON.parse(opcoes.body) }
  await preencher(`#editar-${id}-nomeCliente`, 'Contato Revisado')
  await enviar(container.querySelector('.admin-edit'))
  await esperar(() => !container.querySelector('.admin-edit'))
  assert.deepEqual(enviado, { nomeCliente: 'Contato Revisado' })
  assert.equal(repo.buscar(id).dataEntrega, '2000-01-01')
})

test('409 preserva rascunho sem salvar parcialmente; corrigir quantidade exclui a própria reserva', async () => {
  const id = repo.listar()[0].id
  repo.criar({ ...dados, nomeCliente: 'Outro Cliente', itens: [{ produto: 'bolo-cenoura', quantidade: 3 }] }, () => new Date())
  await abrirEdicao()
  const antes = repo.buscar(id)
  await preencher(`#editar-${id}-nomeCliente`, 'Nome Aguardando Vaga')
  await preencher(`#editar-${id}-itens-quantidade-0`, '3')
  await enviar(container.querySelector('.admin-edit'))
  await esperar(() => container.querySelector('.admin-edit [role="alert"]'))
  assert(container.textContent.includes('ultrapassa a disponibilidade'))
  assert.equal(container.querySelector(`#editar-${id}-nomeCliente`).value, 'Nome Aguardando Vaga')
  assert.equal(container.querySelector(`#editar-${id}-itens-quantidade-0`).value, '3')
  assert.deepEqual(repo.buscar(id), antes)
  await preencher(`#editar-${id}-itens-quantidade-0`, '1')
  await enviar(container.querySelector('.admin-edit'))
  await esperar(() => !container.querySelector('.admin-edit'))
  assert.equal(repo.buscar(id).nomeCliente, 'Nome Aguardando Vaga')
  assert.equal(repo.disponibilidade(dados.dataEntrega).quantidadeReservada, 4)
})

test('resposta perdida após PATCH não confirma nem repete; rascunho fica disponível para conferência', async () => {
  const id = await abrirEdicao()
  let chamadas = 0
  interceptar = async (url, opcoes) => {
    if (opcoes.method !== 'PATCH') return
    chamadas++
    await originalFetch(new URL(url, base), { ...opcoes, headers: { ...opcoes.headers, Origin: base, Cookie: cookie } })
    throw new Error('Conexão perdida após gravar')
  }
  await preencher(`#editar-${id}-nomeCliente`, 'Alteração Incerta')
  await enviar(container.querySelector('.admin-edit'))
  await esperar(() => container.querySelector('.admin-edit [role="alert"]'))
  assert.equal(chamadas, 1)
  assert.equal(repo.buscar(id).nomeCliente, 'Alteração Incerta')
  assert.equal(container.querySelector('.admin-customer').textContent, dados.nomeCliente)
  assert.equal(container.querySelector(`#editar-${id}-nomeCliente`).value, 'Alteração Incerta')
  assert(container.textContent.includes('Ela pode ter sido salva'))
})

test('edição que deixa de corresponder ao filtro devolve foco ao título da lista', async () => {
  await login()
  await esperar(() => container.querySelector('.admin-card'))
  await preencher('#filtro-status', 'recebida')
  await clicar(botao('Editar pedido'))
  const id = repo.listar()[0].id
  await preencher(`#editar-${id}-status`, 'entregue')
  await enviar(container.querySelector('.admin-edit'))
  await esperar(() => !container.querySelector('.admin-edit'))
  assert.equal(container.querySelectorAll('.admin-card').length, 0)
  assert.equal(document.activeElement?.id, 'pedidos-titulo')
  assert.equal(repo.buscar(id).status, 'entregue')
})

test('administradora adiciona, remove e recompõe 2 X + 1 Y ↔ 3 X sem mudar o ID', async () => {
  const id = await abrirEdicao()
  await clicar(botao('Adicionar sabor'))
  await enviar(container.querySelector('.admin-edit'))
  await esperar(() => !container.querySelector('.admin-edit'))
  assert.deepEqual(repo.buscar(id).itens, [{ produto: 'bolo-cenoura', quantidade: 2 }, { produto: 'bolo-chocolate', quantidade: 1 }])
  await clicar(botao('Editar pedido'))
  await clicar(container.querySelector('[aria-label="Remover sabor 2"]'))
  await preencher(`#editar-${id}-itens-quantidade-0`, '3')
  await enviar(container.querySelector('.admin-edit'))
  await esperar(() => !container.querySelector('.admin-edit'))
  assert.deepEqual(repo.buscar(id).itens, [{ produto: 'bolo-cenoura', quantidade: 3 }])
  await clicar(botao('Editar pedido'))
  await preencher(`#editar-${id}-itens-quantidade-0`, '2')
  await clicar(botao('Adicionar sabor'))
  await enviar(container.querySelector('.admin-edit'))
  await esperar(() => !container.querySelector('.admin-edit'))
  assert.equal(repo.buscar(id).totalBolos, 3)
  assert.equal(repo.buscar(id).itens.length, 2)
})

test('prazo filtra a lista carregada com status, alterna com data e limpa todos os filtros', async () => {
  for (const pedido of repo.listar()) repo.remover(pedido.id)
  const hoje = hojeNoFuso('America/Bahia')
  const dataApos = (dias) => new Date(Date.parse(`${hoje}T00:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10)
  for (const dias of [-1, 0, 1, 2, 7, 8, 30, 31]) {
    const pedido = repo.criar({ ...dados, dataEntrega: dataApos(dias) }, () => new Date('1999-01-01T12:00:00Z'))
    if (dias === 2) repo.atualizar(pedido.id, { status: 'entregue' })
  }
  await login()
  await esperar(() => container.querySelectorAll('.admin-card').length === 8)
  // Trocar filtros não deve buscar novamente nem alterar pedidos.
  let consultas = 0
  interceptar = async (url) => { if (url === '/api/encomendas') consultas++ }
  const contar = (quantidade) => {
    assert.equal(container.querySelectorAll('.admin-card').length, quantidade)
    assert.equal(container.querySelector('.admin-count').textContent, `${quantidade} ${quantidade === 1 ? 'pedido encontrado' : 'pedidos encontrados'}.`)
  }
  assert.equal(container.querySelector('#filtro-prazo').options.length, 32)
  assert.equal(container.querySelector('#filtro-prazo').value, '')
  for (const [prazo, quantidade] of [['1', 1], ['2', 2], ['7', 3], ['30', 5], ['30+', 1]]) {
    await preencher('#filtro-prazo', prazo)
    contar(quantidade)
  }
  await preencher('#filtro-prazo', '7')
  await preencher('#filtro-status', 'entregue')
  contar(1)
  await preencher('#filtro-data', dataApos(-1))
  assert.equal(container.querySelector('#filtro-prazo').value, '')
  contar(0)
  await preencher('#filtro-status', '')
  contar(1)
  await preencher('#filtro-prazo', '2')
  assert.equal(container.querySelector('#filtro-data').value, '')
  contar(2)
  await preencher('#filtro-status', 'em preparo')
  contar(0)
  assert(container.querySelector('.admin-empty').textContent.includes('Nenhuma encomenda no prazo selecionado'))
  await clicar(botao('Limpar filtros'))
  for (const campo of ['prazo', 'data', 'status']) assert.equal(container.querySelector(`#filtro-${campo}`).value, '')
  contar(8)
  await preencher('#filtro-data', dataApos(2))
  await preencher('#filtro-status', 'entregue')
  contar(1)
  await clicar(botao('Limpar filtros'))
  contar(8)
  assert.equal(consultas, 0)
})

test('virada na Bahia atualiza prazo sem recarregar e preserva rascunho durante edição', async (t) => {
  await act(async () => raiz.unmount())
  raiz = createRoot(container)
  const DataOriginal = globalThis.Date
  let agora = DataOriginal.parse('2027-01-01T02:59:59Z')
  let atualizarRelogio
  t.mock.method(janela, 'setInterval', (callback, intervalo) => {
    assert.equal(intervalo, 30_000)
    atualizarRelogio = callback
    return 123
  })
  t.mock.method(janela, 'clearInterval', () => {})
  globalThis.Date = class extends DataOriginal {
    constructor(...args) { super(...(args.length ? args : [agora])) }
    static now() { return agora }
  }
  try {
    await act(async () => raiz.render(createElement(Admin)))
    await esperar(() => container.querySelector('#admin-usuario'))
    for (const pedido of repo.listar()) repo.remover(pedido.id)
    const amanha = repo.criar({ ...dados, dataEntrega: '2027-01-01' }, () => new DataOriginal('2026-12-01T12:00:00Z'))
    const depois = repo.criar({ ...dados, dataEntrega: '2027-01-02' }, () => new DataOriginal('2026-12-01T12:00:00Z'))
    await login()
    await esperar(() => container.querySelectorAll('.admin-card').length === 2)
    await act(async () => janela.dispatchEvent(new janela.Event('focus')))
    await preencher('#filtro-prazo', '1')
    assert(container.querySelector(`#editar-botao-${amanha.id}`))
    agora = DataOriginal.parse('2027-01-01T03:00:00Z')
    await act(async () => atualizarRelogio())
    assert.equal(container.querySelectorAll('.admin-card').length, 1)
    assert(container.querySelector(`#editar-botao-${depois.id}`))
    await clicar(botao('Editar pedido'))
    await preencher(`#editar-${depois.id}-nomeCliente`, 'Rascunho Preservado')
    for (const campo of ['prazo', 'data', 'status']) assert(container.querySelector(`#filtro-${campo}`).disabled)
    assert(botao('Limpar filtros').disabled)
    agora = DataOriginal.parse('2027-01-02T03:00:00Z')
    await act(async () => {
      janela.dispatchEvent(new janela.Event('focus'))
      document.dispatchEvent(new janela.Event('visibilitychange'))
    })
    assert.equal(container.querySelector(`#editar-${depois.id}-nomeCliente`).value, 'Rascunho Preservado')
    await clicar(botao('Cancelar'))
    assert.equal(container.querySelectorAll('.admin-card').length, 0)
    assert.equal(container.querySelector('#filtro-prazo').value, '1')
    assert(!container.querySelector('#filtro-prazo').disabled)
    assert.equal(document.activeElement?.id, 'pedidos-titulo')
    assert.equal(repo.buscar(depois.id).nomeCliente, dados.nomeCliente)
    await clicar(botao('Limpar filtros'))
    assert.equal(container.querySelectorAll('.admin-card').length, 2)
  } finally {
    globalThis.Date = DataOriginal
  }
})
