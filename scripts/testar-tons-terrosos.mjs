import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const front = createRequire(new URL('../frontend/package.json', import.meta.url))
const audit = createRequire(new URL('../.audit-tools/package.json', import.meta.url))
const { createServer } = await import(pathToFileURL(front.resolve('vite')).href)
const { default: playwright } = await import(pathToFileURL(audit.resolve('playwright')).href)
const { AxeBuilder } = await import(pathToFileURL(audit.resolve('@axe-core/playwright')).href)
const antes = process.argv.includes('--antes')
const saida = new URL(`../docs/tons-terrosos/${antes ? 'antes/' : 'depois/'}`, import.meta.url)
let vite, browser
const resultados = [], erros = []
try {
  await mkdir(saida, { recursive: true })
  vite = await createServer({ root: fileURLToPath(new URL('../frontend', import.meta.url)), server: { host: '127.0.0.1', port: 0, hmr: false, watch: null }, logLevel: 'silent' })
  await vite.listen()
  browser = await playwright.chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) })
  const contexto = await browser.newContext()
  const page = await contexto.newPage()
  page.on('pageerror', (erro) => erros.push(erro.message))
  const nome = (arquivo) => fileURLToPath(new URL(arquivo, saida))
  const capturar = (arquivo) => page.screenshot({ path: nome(arquivo), type: 'jpeg', quality: 88, animations: 'disabled' })
  for (const largura of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width: largura, height: 1000 })
    await page.goto(`http://127.0.0.1:${vite.httpServer.address().port}`, { waitUntil: 'networkidle' })
    const secoes = ['.hero', '#cardapio', '#encomendas', '#contato', '.site-footer']
    const conteudo = await page.locator('body').evaluate((el) => ({
      titulos: [...el.querySelectorAll('h1,h2,h3,h4')].map((n) => n.textContent),
      produtos: [...el.querySelectorAll('.product-card')].map((n) => n.textContent),
      hero: el.querySelector('.hero-figure img').getAttribute('src'),
      grades: ['.hero-layout', '.product-grid', '.info-grid', '.footer-main'].map((s) => ({ seletor: s, colunas: getComputedStyle(el.querySelector(s)).gridTemplateColumns.split(' ').length })),
    }))
    if (!antes) {
      const anterior = JSON.parse(await readFile(new URL(`../docs/tons-terrosos/antes/conteudo-${largura}.json`, import.meta.url)))
      assert.deepEqual(conteudo, anterior, 'Conteúdo, imagem do hero ou estrutura da grade mudou')
    }
    await writeFile(nome(`conteudo-${largura}.json`), JSON.stringify(conteudo, null, 2))
    const geometria = await page.evaluate(() => ({ largura: innerWidth, documento: document.documentElement.scrollWidth }))
    assert.equal(geometria.largura, geometria.documento)
    for (const [i, seletor] of secoes.entries()) {
      await page.locator(seletor).evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }))
      await capturar(`${i + 1}-${seletor.replace(/[.#]/g, '')}-${largura}.jpg`)
    }
    const landing = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    assert.deepEqual(landing.violations.map(({ id }) => id), [])
    await page.getByRole('button', { name: 'Quero encomendar', exact: true }).click()
    await page.locator('.order-form').scrollIntoViewIfNeeded()
    await page.locator('.order-form').screenshot({ path: nome(`6-formulario-${largura}.jpg`), type: 'jpeg', quality: 88, animations: 'disabled' })
    const formulario = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    assert.deepEqual(formulario.violations.map(({ id }) => id), [])
    assert(await page.getByLabel('Data desejada').isEnabled())
    const precos = await page.locator('.product-price').evaluateAll((els) => els.every((el) => el.scrollWidth <= el.clientWidth + 1))
    assert(precos)
    resultados.push({ ...geometria, precosSemCorte: precos, violacoesLanding: 0, violacoesFormulario: 0 })
  }
  assert.deepEqual(erros, [])
  await writeFile(nome('resultado.json'), JSON.stringify({ resultados, erros }, null, 2))
  console.log('Conteúdo, grades, preços, formulário e axe aprovados em 360, 390, 768 e 1280 px.')
} finally {
  await browser?.close()
  await vite?.close()
}
