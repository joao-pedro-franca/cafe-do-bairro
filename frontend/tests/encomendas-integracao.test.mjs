import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, test } from 'node:test'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { Window } from 'happy-dom'
import { createServer } from 'vite'
import { act, createElement } from 'react'
import { criarApp } from '../../backend/src/app.ts'
import { abrirEncomendas } from '../../backend/src/database/encomendas.ts'
import { comPrecos } from './fixtures/precos.mjs'
import { produtoEncomendavel } from '../../backend/src/produtos.ts'
import { configuracaoPadrao } from '../../backend/src/disponibilidadeProdutos.ts'

const fetchOriginal = globalThis.fetch
const janela = new Window({ url: 'http://127.0.0.1/' })
const globais = { window: janela, document: janela.document, navigator: janela.navigator, HTMLElement: janela.HTMLElement, HTMLInputElement: janela.HTMLInputElement, Event: janela.Event, MouseEvent: janela.MouseEvent, IS_REACT_ACT_ENVIRONMENT: true, requestAnimationFrame: (callback) => setTimeout(callback, 0), cancelAnimationFrame: clearTimeout }
const descritores = new Map(Object.keys(globais).map((chave) => [chave, Object.getOwnPropertyDescriptor(globalThis, chave)]))
for (const [chave, valor] of Object.entries(globais)) Object.defineProperty(globalThis, chave, { value: valor, configurable: true, writable: true })
janela.HTMLElement.prototype.scrollIntoView = () => {}
const { createRoot } = await import('react-dom/client')

let vite, servidorApi, repo, componente, raiz, container, base
let interceptor
const dados = { nomeCliente: 'Cliente de Teste', telefone: '(73) 99999-9999', dataEntrega: '2099-12-25', incluirPaoDeQueijo: true, itens: [{ produto: 'bolo-cenoura', quantidade: 1 }] }

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
  await esperar(() => !catalogoCarregando())
})

afterEach(async () => {
  await act(async () => raiz?.unmount())
  container?.remove()
  for (const pedido of repo.listar()) repo.remover(pedido.id)
  for (const produto of repo.listarProdutos().filter((p) => produtoEncomendavel(p.id))) { const { id, ...config } = configuracaoPadrao(produto.id); repo.configurarProduto(id, config) }
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
  await preencher('dataEntrega', dados.dataEntrega)
  await esperarConsultas()
  for (const [campo, valor] of Object.entries(dados)) if (!['dataEntrega', 'itens', 'incluirPaoDeQueijo'].includes(campo)) await preencher(campo, valor)
  await preencher('itens[0].produto', dados.itens[0].produto)
  await preencher('itens[0].quantidade', dados.itens[0].quantidade)
  await preencher('incluirPaoDeQueijo', true)
}
function dispararEnvio() { container.querySelector('form').dispatchEvent(new janela.Event('submit', { bubbles: true, cancelable: true })) }
async function enviar() { await act(async () => dispararEnvio()) }
function catalogoCarregando() {
  return [...container.querySelectorAll('[role="status"]')].some((elemento) => elemento.textContent === 'Consultando os produtos habilitados…')
}
async function esperarConsultas() {
  // Saldo e catálogo terminam independentemente, inclusive após um conflito.
  await esperar(() => container.querySelector('.availability[aria-busy="false"] .availability-summary')
    && !catalogoCarregando() && !container.querySelector('.order-details').hidden)
}
async function esperar(condicao) {
  for (let i = 0; i < 200; i++) {
    await act(async () => { await new Promise((resolver) => setTimeout(resolver, 10)) })
    if (condicao()) return
  }
  assert.fail(`A interface não chegou ao resultado esperado: ${container.textContent}`)
}

test('validação local impede POST e a gaveta preserva preenchimento ao fechar/reabrir', async () => {
  assert.equal(container.querySelector('form input').name, 'dataEntrega')
  assert(container.querySelector('.order-details').hidden)
  await enviar()
  assert(container.querySelector('#erro-dataEntrega'))
  await preencher('dataEntrega', dados.dataEntrega)
  await esperarConsultas()
  let chamadas = 0
  interceptor = async () => { chamadas++; throw new Error('Não deveria enviar') }
  await preencher('nomeCliente', dados.nomeCliente)
  await clicar(container.querySelector('.orders-toggle'))
  await clicar(container.querySelector('.orders-toggle'))
  assert.equal(container.querySelector('[name="nomeCliente"]').value, dados.nomeCliente)
  await enviar()
  assert.equal(chamadas, 0)
  assert(container.querySelector('#erro-telefone'))
  assert(container.querySelector('#pedido-itens-erro'))
  assert.equal(container.querySelector('#erro-dataEntrega'), null)
})

test('formulário → proxy Vite → API → SQLite: só confirma depois do 201 e bloqueia duplicidade', async () => {
  await preencherTudo()
  let liberar
  const espera = new Promise((resolver) => { liberar = resolver })
  let chamadas = 0
  interceptor = async (url, opcoes) => {
    if (opcoes.method !== 'POST') return fetchOriginal(new URL(url, base), opcoes)
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
  assert.equal(pedidos[0].totalCentavos, 6000)
  assert(container.querySelector('.form-result .financial-total').textContent.replace(/\s/g, ' ').includes('R$ 60,00'))
  assert(container.textContent.includes(`Encomenda nº ${pedidos[0].id} confirmada!`))
  assert(container.textContent.includes('pagamento será realizado na retirada'))
  await esperar(() => container.querySelector('.availability-summary dd:last-child') && !container.querySelector('.availability').getAttribute('aria-busy').includes('true'))
  assert.equal(container.querySelector('.availability-summary > div:last-child dd').textContent, '4')
  await clicar(container.querySelector('.orders-toggle'))
  await clicar(container.querySelector('.orders-toggle'))
  assert(container.textContent.includes(`Encomenda nº ${pedidos[0].id} confirmada!`))
  await enviar()
  assert.equal(chamadas, 1)
  await clicar([...container.querySelectorAll('button')].find((botao) => botao.textContent === 'Fazer outra encomenda'))
  assert.equal(container.querySelector('[name="nomeCliente"]').value, '')
  assert(!container.querySelector('fieldset').disabled)
})

test('409 real atualiza o saldo e permite reduzir quantidade sem perder contato e adicional', async () => {
  await preencherTudo()
  let conflito = false
  let liberarCatalogo
  const catalogoPendente = new Promise((resolver) => { liberarCatalogo = resolver })
  interceptor = async (url, opcoes) => {
    // Garante a ordem que expunha a corrida: saldo pronto, catálogo pendente.
    if (conflito && url === '/api/produtos') await catalogoPendente
    const resposta = await fetchOriginal(new URL(url, base), opcoes)
    if (opcoes.method === 'POST' && resposta.status === 409) conflito = true
    return resposta
  }
  await preencher('itens[0].quantidade', 3)
  repo.criar({ ...dados, itens: [{ produto: 'bolo-cenoura', quantidade: 3 }] }, () => new Date())
  await enviar()
  await esperar(() => container.querySelector('.form-api-error'))
  await esperar(() => container.querySelector('.availability-summary > div:last-child dd')?.textContent === '2')
  assert(container.querySelector('#pedido-itens-erro'))
  assert(container.querySelector('.form-api-error').textContent.includes('disponibilidade mudou'))
  assert.equal(container.querySelector('.availability-summary > div:last-child dd').textContent, '2')
  assert(!container.textContent.includes('confirmada!'))
  assert.equal(container.querySelector('[name="nomeCliente"]').value, dados.nomeCliente)
  assert.equal(container.querySelector('[name="incluirPaoDeQueijo"]').checked, true)
  await clicar(container.querySelector('[aria-label="Diminuir quantidade do produto 1"]'))
  assert.equal(container.querySelector('[name="itens[0].quantidade"]').value, '2')
  assert(catalogoCarregando())
  assert(container.querySelector('[type="submit"]').disabled)
  await act(async () => { liberarCatalogo() })
  await esperarConsultas()
  assert(!container.querySelector('[type="submit"]').disabled)
  await enviar()
  await esperar(() => container.textContent.includes('confirmada!'))
  assert.equal(repo.listar().length, 2)
  assert.equal(repo.listar().reduce((total, item) => total + item.totalBolos, 0), 5)
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
  // A consulta inicial do componente também pode terminar durante esta leitura.
  await act(async () => {
    const resposta = await fetchOriginal(`${base}/api/encomendas`)
    assert.equal(resposta.status, 503)
    assert.deepEqual(Object.keys(await resposta.json()), ['erro'])
  })
})

test('três bolos reservados deixam dois disponíveis e os botões respeitam esse limite', async () => {
  repo.criar({ ...dados, itens: [{ produto: 'bolo-cenoura', quantidade: 3 }] }, () => new Date())
  await preencher('dataEntrega', dados.dataEntrega)
  await esperar(() => container.querySelector('.availability-summary') && !container.querySelector('.order-details').hidden)
  assert.deepEqual([...container.querySelectorAll('.availability-summary dd')].map((item) => item.textContent), ['5 unidades', '3', '2'])
  assert(!container.querySelector('.order-details').hidden)
  await preencher('itens[0].produto', 'bolo-cenoura')
  const aumentar = container.querySelector('[aria-label="Aumentar quantidade do produto 1"]')
  await clicar(aumentar)
  assert.equal(container.querySelector('[name="itens[0].quantidade"]').value, '2')
  assert(aumentar.disabled)
  await clicar(aumentar)
  assert.equal(container.querySelector('[name="itens[0].quantidade"]').value, '2')
  await clicar(container.querySelector('[aria-label="Diminuir quantidade do produto 1"]'))
  assert.equal(container.querySelector('[name="itens[0].quantidade"]').value, '1')
  assert(container.querySelector('[aria-label="Diminuir quantidade do produto 1"]').disabled)
  assert.equal(repo.listar().length, 1) // Consultar não reserva nada.
})

test('dia lotado permite dúzias; outra data libera produção de bolos', async () => {
  repo.criar({ ...dados, itens: [{ produto: 'bolo-cenoura', quantidade: 5 }] }, () => new Date())
  await preencher('dataEntrega', dados.dataEntrega)
  await esperar(() => container.querySelector('.availability-full') && !container.querySelector('.order-details').hidden)
  assert(!container.querySelector('.order-details').hidden)
  assert(container.querySelector('[name="itens[0].produto"] option[value="bolo-cenoura"]').disabled)
  assert.equal(container.querySelector('[name="itens[0].produto"] option[value="pao-queijo"]'), null)
  assert(container.querySelector('.availability-full').textContent.includes('Escolha outra data'))
  await preencher('dataEntrega', '2099-12-26')
  await esperar(() => container.querySelector('.availability-summary > div:last-child dd')?.textContent === '5')
  assert(!container.querySelector('.order-details').hidden)
})

test('consulta exibe carregamento e erro com nova tentativa, sem liberar confirmação', async () => {
  let liberar
  const espera = new Promise((resolver) => { liberar = resolver })
  interceptor = async (url, opcoes) => { if (url === '/api/produtos') return fetchOriginal(new URL(url, base), opcoes); await espera; throw new TypeError('Offline') }
  await preencher('dataEntrega', dados.dataEntrega)
  assert(container.querySelector('.availability').textContent.includes('Conferindo'))
  assert(container.querySelector('.order-details').hidden)
  assert.equal(container.querySelector('[type="submit"]'), null)
  liberar()
  await esperar(() => container.querySelector('.availability [role="alert"]'))
  assert(container.querySelector('.order-details').hidden)
  interceptor = (url, opcoes) => fetchOriginal(new URL(url, base), opcoes)
  await clicar(container.querySelector('.availability button'))
  await esperar(() => container.querySelector('.availability-summary'))
  assert(!container.querySelector('.order-details').hidden)
})

test('resposta atrasada da data anterior não substitui o saldo da data escolhida', async () => {
  repo.criar({ ...dados, dataEntrega: '2099-12-26', itens: [{ produto: 'bolo-cenoura', quantidade: 4 }] }, () => new Date())
  let liberar
  const espera = new Promise((resolver) => { liberar = resolver })
  let sinalAntigo
  interceptor = async (url, opcoes) => {
    if (url.includes('data=2099-12-25')) {
      sinalAntigo = opcoes.signal
      await espera // Simula um transporte que entrega uma resposta mesmo após cancelado.
      return Response.json({ data: dados.dataEntrega, limiteDiario: 5, quantidadeReservada: 0, quantidadeDisponivel: 5 })
    }
    return fetchOriginal(new URL(url, base), opcoes)
  }
  await preencher('dataEntrega', dados.dataEntrega)
  await preencher('dataEntrega', '2099-12-26')
  await esperar(() => container.querySelector('.availability-summary > div:last-child dd')?.textContent === '1')
  assert(sinalAntigo.aborted)
  liberar()
  await act(async () => { await new Promise((resolver) => setTimeout(resolver, 20)) })
  assert.equal(container.querySelector('.availability-summary > div:last-child dd').textContent, '1')
})

test('data inválida não consulta disponibilidade e não permite enviar', async () => {
  let chamadas = 0
  interceptor = async (url, opcoes) => { if (url === '/api/produtos') return fetchOriginal(new URL(url, base), opcoes); chamadas++; throw new Error('Não deveria consultar') }
  await preencher('dataEntrega', '2000-01-01')
  await enviar()
  assert.equal(chamadas, 0)
  assert(container.querySelector('#erro-dataEntrega'))
  assert(container.querySelector('.order-details').hidden)
})

test('vários sabores, soma, remoção e resumo confirmado usam os itens retornados pelo servidor', async () => {
  await preencherTudo()
  await clicar(container.querySelector('[aria-label="Aumentar quantidade do produto 1"]'))
  await clicar([...container.querySelectorAll('button')].find((b) => b.textContent === 'Adicionar produto'))
  assert.equal(document.activeElement?.id, 'pedido-itens-sabor-1')
  const segundo = container.querySelector('[name="itens[1].produto"]')
  assert.equal(segundo.value, 'bolo-chocolate')
  assert([...segundo.options].find((o) => o.value === 'bolo-cenoura').disabled)
  assert(container.querySelector('.items-total').textContent.includes('3 unidade(s) de venda'))
  await clicar(container.querySelector('[aria-label="Remover produto 2"]'))
  assert(container.querySelector('.items-total').textContent.includes('2 unidade(s) de venda'))
  await clicar([...container.querySelectorAll('button')].find((b) => b.textContent === 'Adicionar produto'))
  await enviar()
  await esperar(() => container.textContent.includes('confirmada!'))
  assert.deepEqual(repo.listar()[0].itens, comPrecos({ itens: [{ produto: 'bolo-cenoura', quantidade: 2 }, { produto: 'bolo-chocolate', quantidade: 1 }] }).itens)
  assert.equal(repo.listar()[0].totalBolos, 3)
  assert(container.querySelector('.form-result').textContent.includes('2 × Bolo de cenoura'))
  assert(container.querySelector('.form-result').textContent.includes('1 × Bolo de chocolate'))
})

test('remover todos os sabores impede confirmar com total zero', async () => {
  await preencherTudo()
  await preencher('itens[0].quantidade', 5)
  container.querySelector('[aria-label="Remover produto 1"]').focus()
  await clicar(container.querySelector('[aria-label="Remover produto 1"]'))
  assert.equal(document.activeElement?.textContent, 'Adicionar produto')
  assert(container.querySelector('[type="submit"]').disabled)
  await enviar()
  assert.equal(repo.listar().length, 0)
  assert(container.textContent.includes('pelo menos um bolo'))
})

test('409 mantém todos os sabores e permite corrigir o total sem perder contatos', async () => {
  await preencherTudo()
  await clicar(container.querySelector('[aria-label="Aumentar quantidade do produto 1"]'))
  await clicar([...container.querySelectorAll('button')].find((b) => b.textContent === 'Adicionar produto'))
  repo.criar({ ...dados, itens: [{ produto: 'bolo-coco', quantidade: 3 }] }, () => new Date())
  await enviar()
  await esperar(() => container.querySelector('.form-api-error') && container.querySelector('.availability-summary > div:last-child dd')?.textContent === '2')
  assert.equal(container.querySelectorAll('.order-item').length, 2)
  assert.equal(container.querySelector('[name="itens[0].quantidade"]').value, '2')
  assert.equal(container.querySelector('[name="itens[1].produto"]').value, 'bolo-chocolate')
  assert.equal(container.querySelector('[name="nomeCliente"]').value, dados.nomeCliente)
  await clicar(container.querySelector('[aria-label="Diminuir quantidade do produto 1"]'))
  await esperarConsultas()
  await enviar()
  await esperar(() => container.textContent.includes('confirmada!'))
  assert.equal(repo.listar().reduce((soma, pedido) => soma + pedido.totalBolos, 0), 5)
})

test('panetone para dezembro mantém seleção e aponta conflito ao mudar retirada para novembro', async () => {
  repo.configurarProduto('panetone', { aceitaEncomendas: true, mesesPermitidos: [12] })
  await preencherTudo()
  await esperar(() => !container.querySelector('[name="itens[0].produto"] option[value="panetone"]').disabled)
  await preencher('incluirPaoDeQueijo', false)
  await preencher('itens[0].produto', 'panetone')
  await preencher('dataEntrega', '2099-11-25')
  await esperar(() => container.querySelector('#pedido-itens-erro')?.textContent.includes('mês de retirada'))
  assert.equal(container.querySelector('[name="itens[0].produto"]').value, 'panetone')
  await esperar(() => container.querySelector('[type="submit"]')?.disabled)
  assert.equal(container.querySelector('[name="nomeCliente"]').value, dados.nomeCliente)
  await preencher('dataEntrega', dados.dataEntrega)
  await esperar(() => container.querySelector('[type="submit"]')?.disabled === false)
  await enviar()
  await esperar(() => container.textContent.includes('confirmada!'))
  assert.equal(repo.listar()[0].totalCentavos, 4500)
  assert.equal(repo.listar()[0].quantidadeProducao, 1)
})

test('produto desabilitado durante preenchimento recebe 409, atualiza cardápio e conserva rascunho', async () => {
  await preencherTudo()
  repo.configurarProduto('bolo-cenoura', { aceitaEncomendas: false, mesesPermitidos: [] })
  await enviar()
  await esperar(() => container.querySelector('.form-api-error')?.textContent.includes('cardápio mudou'))
  await esperar(() => container.querySelector('#pedido-itens-erro')?.textContent.includes('mês de retirada'))
  assert.equal(repo.listar().length, 0)
  assert.equal(container.querySelector('[name="itens[0].produto"]').value, 'bolo-cenoura')
  assert.equal(container.querySelector('[name="nomeCliente"]').value, dados.nomeCliente)
  await esperar(() => container.querySelector('[type="submit"]')?.disabled)
  await preencher('itens[0].produto', 'bolo-chocolate')
  await esperarConsultas()
  await enviar()
  await esperar(() => container.textContent.includes('confirmada!'))
  assert.equal(repo.listar()[0].totalCentavos, 6500)
})

test('catálogo público com erro pode ser consultado novamente sem descartar dados', async () => {
  interceptor = async (url, opcoes) => url === '/api/produtos' ? Response.json({}, { status: 500 }) : fetchOriginal(new URL(url, base), opcoes)
  await preencher('dataEntrega', dados.dataEntrega)
  await esperar(() => container.textContent.includes('Não conseguimos consultar o cardápio'))
  assert.equal(container.querySelector('[type="submit"]'), null)
  interceptor = (url, opcoes) => fetchOriginal(new URL(url, base), opcoes)
  await clicar([...container.querySelectorAll('button')].find((b) => b.textContent === 'Tentar consultar produtos novamente'))
  await esperar(() => !container.querySelector('.order-details').hidden)
  assert.equal(container.querySelector('[name="dataEntrega"]').value, dados.dataEntrega)
})

test('seletor só contém bolos/panetone e remover último bolo invalida acompanhamento sem perder dados', async () => {
  repo.configurarProduto('panetone', { aceitaEncomendas: true, mesesPermitidos: [12] })
  await preencherTudo()
  const select = container.querySelector('[name="itens[0].produto"]')
  for (const id of ['cafe-coado', 'cafe-leite', 'pao-queijo']) assert.equal(select.querySelector(`option[value="${id}"]`), null)
  await preencher('itens[0].produto', 'panetone')
  assert(container.querySelector('[name="incluirPaoDeQueijo"]').checked)
  assert(container.querySelector('[type="submit"]').disabled)
  await enviar()
  assert.equal(repo.listar().length, 0)
  assert(container.textContent.includes('pelo menos um bolo'))
  assert.equal(container.querySelector('[name="nomeCliente"]').value, dados.nomeCliente)
  await preencher('incluirPaoDeQueijo', false)
  assert(!container.querySelector('[type="submit"]').disabled)
  await enviar()
  await esperar(() => container.textContent.includes('confirmada!'))
  assert.equal(repo.listar()[0].totalCentavos, 4500)
})
