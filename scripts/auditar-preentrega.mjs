import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { once } from 'node:events'
import { randomBytes } from 'node:crypto'
import { criarApp } from '../backend/src/app.ts'
import { abrirEncomendas } from '../backend/src/database/encomendas.ts'
import { dataMinima } from '../backend/src/encomenda.ts'

const raiz = fileURLToPath(new URL('..', import.meta.url))
const ferramentas = createRequire(new URL('../.audit-tools/package.json', import.meta.url))
const front = createRequire(new URL('../frontend/package.json', import.meta.url))
const { default: playwright } = await import(pathToFileURL(ferramentas.resolve('playwright')).href)
const { chromium } = playwright
const { AxeBuilder } = await import(pathToFileURL(ferramentas.resolve('@axe-core/playwright')).href)
const { createServer } = await import(pathToFileURL(front.resolve('vite')).href)
const saida = join(raiz, 'docs', 'auditoria')
await mkdir(saida, { recursive: true })
const temporaria = await mkdtemp(join(tmpdir(), 'cafe-auditoria-'))
const arquivo = join(temporaria, 'auditoria.sqlite')
let repo, api, vite, browser
const resultado = { larguras: [], passos: [], acessibilidade: [], console: [], errosPagina: [], falhasRede: [], errosHttp: [] }
const data = dataMinima(new Date())
const dados = { nomeCliente: 'Cliente de Teste', telefone: '(73) 99999-9999', produto: 'bolo-cenoura', dataEntrega: data, incluirPaoDeQueijo: true, quantidadeBolos: 3 }

async function captura(page, nome, fullPage = false) {
  await page.screenshot({ path: join(saida, nome), fullPage, animations: 'disabled' })
}
async function geometria(page) {
  return page.evaluate(() => ({
    largura: innerWidth,
    documento: document.documentElement.scrollWidth,
    corLinkCabecalho: getComputedStyle(document.querySelector('header nav a')).color,
    transbordamentos: [...document.querySelectorAll('body *')].filter((el) => {
      const r = el.getBoundingClientRect()
      return r.width && r.height && getComputedStyle(el).visibility !== 'hidden' && (r.right > innerWidth + 1 || r.left < -1)
    }).slice(0, 12).map((el) => ({ tag: el.tagName, classe: el.className?.baseVal ?? el.className })),
  }))
}
async function acessibilidade(page, passo) {
  const analise = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  resultado.acessibilidade.push({ passo, violacoes: analise.violations.map((v) => ({ id: v.id, impacto: v.impact, descricao: v.description, elementos: v.nodes.map((n) => ({ alvo: n.target, resumo: n.failureSummary })) })) })
}

try {
  repo = abrirEncomendas(arquivo)
  api = criarApp(repo, { adminToken: randomBytes(32).toString('hex') }).listen(0, '127.0.0.1')
  await once(api, 'listening')
  const target = `http://127.0.0.1:${api.address().port}`
  vite = await createServer({ root: join(raiz, 'frontend'), server: { host: '127.0.0.1', port: 0, hmr: false, watch: null, proxy: { '/api': { target } } }, logLevel: 'warn' })
  await vite.listen()
  const url = `http://127.0.0.1:${vite.httpServer.address().port}`
  browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) })
  const contexto = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await contexto.newPage()
  page.on('console', (msg) => { if (msg.type() === 'error') resultado.console.push({ mensagem: msg.text(), local: msg.location() }) })
  page.on('pageerror', (erro) => resultado.errosPagina.push(erro.message))
  page.on('requestfailed', (req) => resultado.falhasRede.push({ url: new URL(req.url()).pathname, erro: req.failure()?.errorText }))
  page.on('response', (res) => { if (res.status() >= 400) resultado.errosHttp.push({ url: new URL(res.url()).pathname, status: res.status() }) })

  for (const largura of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width: largura, height: largura < 768 ? 844 : 900 })
    await page.goto(url, { waitUntil: 'networkidle' })
    await captura(page, `01-pagina-${largura}.png`, true)
    await captura(page, `02-hero-${largura}.png`)
    resultado.larguras.push(await geometria(page))
    const ancoras = await page.locator('a[href^="#"]').evaluateAll((links) => links.map((a) => ({ href: a.getAttribute('href'), destino: Boolean(document.getElementById(a.hash.slice(1))) })))
    assert(ancoras.every((a) => a.destino), 'Existe âncora sem destino')
    if (largura === 390 || largura === 1280) await acessibilidade(page, `landing-${largura}`)
    await page.locator('#cardapio').evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }))
    await captura(page, `02b-cardapio-${largura}.png`)
  }
  resultado.passos.push('Landing e âncoras nas quatro larguras')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.keyboard.press('Tab')
  assert.equal(await page.locator(':focus').textContent(), 'Pular para o conteúdo')
  await page.keyboard.press('Enter')
  assert.equal(await page.locator(':focus').getAttribute('id'), 'conteudo')
  await page.locator('.hero-actions a[href="#encomendas"]').click()
  await page.locator('.menu-order-action a[href="#encomendas"]').click()
  await page.getByRole('button', { name: 'Quero encomendar', exact: true }).click()
  await page.locator('#form-title').waitFor({ state: 'visible' })
  await page.waitForTimeout(400)
  await captura(page, '03-data-primeiro-390.png')
  assert(await page.locator('.order-details').isHidden())

  repo.criar(dados, () => new Date())
  await page.getByLabel('Data desejada').fill(data)
  await page.locator('.availability-summary').waitFor()
  assert.deepEqual(await page.locator('.availability-summary dd').allTextContents(), ['5 bolos', '3', '2'])
  await page.getByRole('button', { name: 'Confirmar encomenda', exact: true }).click()
  await page.locator('.form-errors').waitFor()
  await captura(page, '04-validacao-390.png')
  await acessibilidade(page, 'formulario-erros-390')
  await page.getByLabel('Bolo escolhido').selectOption('bolo-cenoura')
  await page.getByLabel('Nome completo').fill('Cliente de Teste')
  await page.getByLabel('Telefone/WhatsApp').fill('(73) 99999-9999')
  await page.getByRole('button', { name: 'Aumentar quantidade de bolos' }).click()
  assert(await page.getByRole('button', { name: 'Aumentar quantidade de bolos' }).isDisabled())
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Fechar e manter os dados' }).click()
  assert.equal(await page.locator(':focus').getAttribute('aria-controls'), 'gaveta-encomenda')
  await page.keyboard.press('Tab')
  assert.equal(await page.locator(':focus').evaluate((el) => Boolean(el.closest('#gaveta-encomenda'))), false)
  await page.getByRole('button', { name: 'Quero encomendar', exact: true }).click()
  assert.equal(await page.getByLabel('Nome completo').inputValue(), 'Cliente de Teste')
  for (const largura of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width: largura, height: largura < 768 ? 844 : 900 })
    await page.locator('form').scrollIntoViewIfNeeded()
    await captura(page, `05-formulario-${largura}.png`)
    resultado.larguras.push({ estado: 'formulario', ...await geometria(page) })
  }
  await acessibilidade(page, 'formulario-preenchido-1280')
  resultado.passos.push('Data real, saldo 3/2, validação, quantidade e preservação da gaveta')

  let liberarPost
  const espera = new Promise((resolver) => { liberarPost = resolver })
  let posts = 0
  await page.route('**/api/encomendas', async (rota) => {
    if (rota.request().method() === 'POST') { posts++; await espera }
    await rota.continue()
  })
  await page.getByRole('button', { name: 'Confirmar encomenda', exact: true }).click()
  assert(await page.getByRole('button', { name: 'Enviando encomenda…' }).isDisabled())
  await page.evaluate(() => document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
  await captura(page, '06-envio-pendente-1280.png')
  liberarPost()
  await page.waitForFunction(() => document.querySelector('.form-result')?.textContent.includes('confirmada!'))
  await page.waitForFunction(() => document.querySelector('.availability-summary > div:last-child dd')?.textContent === '0')
  assert.equal(posts, 1)
  const gravados = repo.listar()
  assert.equal(gravados.length, 2)
  assert.equal(gravados[1].quantidadeBolos, 2)
  assert.equal(gravados[1].status, 'recebida')
  assert.equal(gravados[1].incluirPaoDeQueijo, true)
  await captura(page, '07-confirmacao-1280.png')
  await acessibilidade(page, 'confirmacao-1280')
  resultado.passos.push('POST único 201, gravação em SQLite e saldo final zero')

  await page.getByRole('button', { name: 'Fazer outra encomenda' }).click()
  await page.getByLabel('Data desejada').fill(data)
  await page.locator('.availability-full').waitFor()
  assert(await page.locator('.order-details').isHidden())
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.availability-full').scrollIntoViewIfNeeded()
  await captura(page, '08-data-lotada-390.png')
  resultado.passos.push('Dia lotado bloqueia seleção de bolos')

  const outraData = new Date(`${data}T12:00:00Z`)
  outraData.setUTCDate(outraData.getUTCDate() + 1)
  const diaSeguinte = outraData.toISOString().slice(0, 10)
  await page.getByLabel('Data desejada').fill(diaSeguinte)
  await page.locator('.order-details').waitFor({ state: 'visible' })
  await page.getByLabel('Bolo escolhido').selectOption('bolo-chocolate')
  await page.getByLabel('Nome completo').fill('Cliente de Teste')
  await page.getByLabel('Telefone/WhatsApp').fill('(73) 99999-9999')
  await page.getByRole('spinbutton', { name: 'Quantidade de bolos' }).fill('3')
  repo.criar({ ...dados, dataEntrega: diaSeguinte }, () => new Date())
  await page.getByRole('button', { name: 'Confirmar encomenda', exact: true }).click()
  await page.locator('#erro-quantidadeBolos').waitFor()
  assert.equal(await page.getByRole('spinbutton', { name: 'Quantidade de bolos' }).inputValue(), '3')
  assert.equal(await page.getByLabel('Nome completo').inputValue(), 'Cliente de Teste')
  await page.locator('#erro-quantidadeBolos').scrollIntoViewIfNeeded()
  await captura(page, '08b-conflito-390.png')
  await page.getByRole('button', { name: 'Diminuir quantidade de bolos' }).click()
  await page.getByRole('button', { name: 'Confirmar encomenda', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.form-result')?.textContent.includes('confirmada!'))
  await page.waitForFunction(() => document.querySelector('.availability-summary > div:last-child dd')?.textContent === '0')
  resultado.passos.push('409 real atualiza saldo e permite corrigir quantidade sem perder dados')

  await page.locator('header nav a[href="#contato"]').click()
  await page.locator('#contato .contact-demo summary').first().click()
  await captura(page, '09-contato-390.png')
  assert.equal(await page.locator('a[href^="https://wa.me/"]').count(), 0)
  await page.locator('footer').scrollIntoViewIfNeeded()
  await captura(page, '10-rodape-390.png')
  await page.getByRole('link', { name: /Área administrativa/ }).click()
  await page.getByRole('heading', { name: 'Entre no seu caderno' }).waitFor()
  assert.equal(await page.locator('.admin-card').count(), 0)
  await captura(page, '11-login-admin-390.png')
  await acessibilidade(page, 'login-admin-390')
  resultado.passos.push('Contato em demonstração, rodapé e login /admin sem expor pedidos')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto')
  resultado.passos.push('Preferência de movimento reduzido respeitada')

  const negada = await fetch(`${url}/api/encomendas`)
  assert.equal(negada.status, 401)
  await new Promise((resolver) => api.close(resolver))
  api = null
  repo.fechar()
  repo = abrirEncomendas(arquivo)
  assert.equal(repo.listar().length, 4)
  assert.equal(repo.disponibilidade(data).quantidadeDisponivel, 0)
  resultado.passos.push('Persistência após reabrir SQLite e listagem administrativa negada')
  assert(resultado.larguras.every((item) => item.largura === item.documento), 'Rolagem horizontal detectada')
  assert.equal(resultado.errosPagina.length, 0, 'Erro JavaScript no navegador')
  assert(resultado.errosHttp.every((item) => item.status === 409 || (item.status === 401 && item.url === '/api/admin/sessao')), 'Erro HTTP inesperado')
  console.log(JSON.stringify(resultado, null, 2))
} finally {
  await writeFile(join(saida, 'resultado.json'), JSON.stringify(resultado, null, 2))
  await browser?.close()
  await vite?.close()
  if (api) await new Promise((resolver) => api.close(resolver))
  repo?.fechar()
  await rm(temporaria, { recursive: true, force: true })
}
