import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
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
const visual = process.argv.includes('--visual')
const saidaPersonalizada = process.argv.find((arg) => arg.startsWith('--saida='))?.slice('--saida='.length)
const saida = saidaPersonalizada ? resolve(saidaPersonalizada) : join(raiz, 'docs', ...(process.argv.includes('--comercial') ? ['apresentacao-comercial', 'regressao-publico'] : process.argv.includes('--sazonais') ? ['produtos-sazonais', 'regressao-publico'] : visual ? ['refinamento-visual'] : process.argv.includes('--itens') ? ['multissabores', 'publico'] : process.argv.includes('--final') ? ['auditoria-final', 'publico'] : ['auditoria']))
await mkdir(saida, { recursive: true })
const temporaria = await mkdtemp(join(tmpdir(), 'cafe-auditoria-'))
const arquivo = join(temporaria, 'auditoria.sqlite')
let repo, api, vite, browser
const resultado = { larguras: [], passos: [], acessibilidade: [], console: [], errosPagina: [], falhasRede: [], consultasCanceladas: [], errosHttp: [] }
const data = dataMinima(new Date())
const dados = { nomeCliente: 'Cliente de Teste', telefone: '(73) 99999-9999', dataEntrega: data, incluirPaoDeQueijo: true, itens: [{ produto: 'bolo-cenoura', quantidade: 3 }] }

async function captura(page, nome, fullPage = false) {
  if (process.argv.includes('--sem-capturas')) return
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
  assert.equal(analise.violations.length, 0, `Violação de acessibilidade em ${passo}`)
}

try {
  repo = abrirEncomendas(arquivo)
  api = criarApp(repo, { adminToken: randomBytes(32).toString('hex') }).listen(0, '127.0.0.1')
  await once(api, 'listening')
  const target = `http://127.0.0.1:${api.address().port}`
  vite = await createServer({ cacheDir: join(temporaria, 'vite-cache'), root: join(raiz, 'frontend'), server: { host: '127.0.0.1', port: 0, hmr: false, watch: null, proxy: { '/api': { target } } }, logLevel: 'warn' })
  await vite.listen()
  const url = `http://127.0.0.1:${vite.httpServer.address().port}`
  browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) })
  const contexto = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await contexto.newPage()
  page.on('console', (msg) => { if (msg.type() === 'error') resultado.console.push({ mensagem: msg.text(), local: msg.location() }) })
  page.on('pageerror', (erro) => resultado.errosPagina.push(erro.message))
  page.on('requestfailed', (req) => {
    const falha = { url: new URL(req.url()).pathname, erro: req.failure()?.errorText }
    if (falha.erro === 'net::ERR_ABORTED' && ['/api/produtos', '/api/disponibilidade'].includes(falha.url)) resultado.consultasCanceladas.push(falha)
    else resultado.falhasRede.push(falha)
  })
  page.on('response', (res) => { if (res.status() >= 400) resultado.errosHttp.push({ url: new URL(res.url()).pathname, status: res.status() }) })

  for (const largura of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width: largura, height: largura < 768 ? 844 : 900 })
    await page.goto(url, { waitUntil: 'networkidle' })
    await captura(page, `01-pagina-${largura}.png`, true)
    await captura(page, `02-hero-${largura}.png`)
    resultado.larguras.push(await geometria(page))
    const ancoras = await page.locator('a[href^="#"]').evaluateAll((links) => links.map((a) => ({ href: a.getAttribute('href'), destino: Boolean(document.getElementById(a.hash.slice(1))) })))
    assert(ancoras.every((a) => a.destino), 'Existe âncora sem destino')
    if (visual || largura === 390 || largura === 1280) await acessibilidade(page, `landing-${largura}`)
    await page.locator('#cardapio').evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }))
    await captura(page, `02b-cardapio-${largura}.png`)
    if (visual) {
      await page.locator('#encomendas').evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }))
      await captura(page, `02c-encomendas-${largura}.png`)
      await page.locator('#contato').evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }))
      await captura(page, `09-contato-${largura}.png`)
      await page.locator('.site-footer').evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }))
      await captura(page, `10-rodape-${largura}.png`)
    }
  }
  resultado.passos.push('Landing e âncoras nas quatro larguras')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.locator('.skip-link').waitFor({ state: 'visible' })
  assert(await page.evaluate(() => document.activeElement === document.body))
  await page.keyboard.press('Tab')
  assert.equal(await page.locator(':focus').textContent(), 'Pular para o conteúdo')
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => document.activeElement?.id === 'conteudo')
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
  assert.deepEqual(await page.locator('.availability-summary dd').allTextContents(), ['5 unidades', '3', '2'])
  await page.getByRole('button', { name: 'Confirmar encomenda', exact: true }).click()
  await page.locator('.form-errors').waitFor()
  await captura(page, '04-validacao-390.png')
  await acessibilidade(page, 'formulario-erros-390')
  await page.getByLabel('Produto 1', { exact: true }).selectOption('bolo-cenoura')
  await page.getByLabel('Nome completo').fill('Cliente de Teste')
  await page.getByLabel('Telefone/WhatsApp').fill('(73) 99999-9999')
  await page.getByRole('button', { name: 'Aumentar quantidade do produto 1' }).click()
  assert(await page.getByRole('button', { name: 'Aumentar quantidade do produto 1' }).isDisabled())
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
    if (visual) await acessibilidade(page, `formulario-preenchido-${largura}`)
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
  assert.equal(gravados[1].totalBolos, 2)
  assert.equal(gravados[1].status, 'recebida')
  assert.equal(gravados[1].incluirPaoDeQueijo, true)
  await captura(page, '07-confirmacao-1280.png')
  await acessibilidade(page, 'confirmacao-1280')
  resultado.passos.push('POST único 201, gravação em SQLite e saldo final zero')

  await page.getByRole('button', { name: 'Fazer outra encomenda' }).click()
  await page.getByLabel('Data desejada').fill(data)
  await page.locator('.availability-full').waitFor()
  await page.locator('.order-details').waitFor({ state: 'visible' })
  assert(await page.locator('option[value="bolo-cenoura"]').isDisabled())
  assert.equal(await page.locator('option[value="pao-queijo"]').count(), 0)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.availability-full').scrollIntoViewIfNeeded()
  await captura(page, '08-data-lotada-390.png')
  resultado.passos.push('Dia lotado bloqueia seleção de bolos')

  const outraData = new Date(`${data}T12:00:00Z`)
  outraData.setUTCDate(outraData.getUTCDate() + 1)
  const diaSeguinte = outraData.toISOString().slice(0, 10)
  await page.getByLabel('Data desejada').fill(diaSeguinte)
  await page.locator('.order-details').waitFor({ state: 'visible' })
  await page.getByLabel('Produto 1', { exact: true }).selectOption('bolo-chocolate')
  await page.getByLabel('Nome completo').fill('Cliente de Teste')
  await page.getByLabel('Telefone/WhatsApp').fill('(73) 99999-9999')
  await page.getByRole('spinbutton', { name: 'Quantidade do produto 1' }).fill('3')
  repo.criar({ ...dados, dataEntrega: diaSeguinte }, () => new Date())
  await page.getByRole('button', { name: 'Confirmar encomenda', exact: true }).click()
  await page.locator('#pedido-itens-erro').waitFor()
  assert.equal(await page.getByRole('spinbutton', { name: 'Quantidade do produto 1' }).inputValue(), '3')
  assert.equal(await page.getByLabel('Nome completo').inputValue(), 'Cliente de Teste')
  await page.locator('#pedido-itens-erro').scrollIntoViewIfNeeded()
  await captura(page, '08b-conflito-390.png')
  await page.getByRole('button', { name: 'Diminuir quantidade do produto 1' }).click()
  await page.getByRole('button', { name: 'Confirmar encomenda', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.form-result')?.textContent.includes('confirmada!'))
  await page.waitForFunction(() => document.querySelector('.availability-summary > div:last-child dd')?.textContent === '0')
  resultado.passos.push('409 real atualiza saldo e permite corrigir quantidade sem perder dados')

  await page.locator('header nav a[href="#contato"]').click()
  await page.waitForFunction(() => document.activeElement?.id === 'contato')
  assert.equal(await page.locator('.contact-pending').count(), 0)
  assert.equal(await page.locator('.contact-links a').count(), 6)
  for (const secao of ['.hero', '#contato', '.site-footer']) {
    const links = page.locator(`${secao} .contact-links a`)
    assert.equal(await links.count(), 2)
    const whatsapp = new URL(await links.nth(0).getAttribute('href'))
    assert.equal(whatsapp.origin, 'https://wa.me')
    assert.equal(whatsapp.pathname, '/5573988255560')
    assert.equal(whatsapp.searchParams.get('text'), 'Olá! Gostaria de fazer uma encomenda no Café do Bairro.')
    assert.equal(await links.nth(1).getAttribute('href'), 'https://www.instagram.com/tecnojr/')
    for (const [indice, link] of (await links.all()).entries()) {
      const rotulo = ['WhatsApp', 'Instagram'][indice]
      assert.equal(await link.innerText(), rotulo)
      assert.equal(await link.getAttribute('aria-label'), `${rotulo} (abre em nova aba)`)
      assert.equal(await link.locator('.contact-new-tab').count(), 0)
      assert.equal(await link.getAttribute('target'), '_blank')
      assert.equal(await link.getAttribute('rel'), 'noopener noreferrer')
    }
  }
  const destinos = []
  for (const padrao of ['https://wa.me/**', 'https://www.instagram.com/**']) {
    await contexto.route(padrao, async (rota) => {
      destinos.push(rota.request().url())
      await rota.fulfill({ contentType: 'text/html', body: '<title>Contato interceptado para teste</title>' })
    })
  }
  for (const link of await page.locator('#contato .contact-links a').all()) {
    const novaAba = contexto.waitForEvent('page')
    await link.click()
    const popup = await novaAba
    await popup.waitForLoadState()
    assert.equal(await popup.title(), 'Contato interceptado para teste')
    await popup.close()
  }
  assert.equal(destinos.length, 2)
  assert.equal(new URL(destinos[0]).pathname, '/5573988255560')
  assert.equal(new URL(destinos[0]).searchParams.get('text'), 'Olá! Gostaria de fazer uma encomenda no Café do Bairro.')
  assert.equal(destinos[1], 'https://www.instagram.com/tecnojr/')
  await captura(page, '09-contato-390.png')
  await acessibilidade(page, 'contatos-autorizados-390')
  await page.locator('footer').scrollIntoViewIfNeeded()
  await captura(page, '10-rodape-390.png')
  await page.getByRole('link', { name: /Área administrativa/ }).click()
  await page.getByRole('heading', { name: 'Entre no seu caderno' }).waitFor()
  assert.equal(await page.locator('.admin-card').count(), 0)
  await captura(page, '11-login-admin-390.png')
  await acessibilidade(page, 'login-admin-390')
  resultado.passos.push('Seis links comerciais seguros; WhatsApp e Instagram abrem novas abas com destinos interceptados, sem acessar terceiros; rodapé e login /admin sem expor pedidos')
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
