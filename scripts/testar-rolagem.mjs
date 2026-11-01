import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { mkdir, writeFile } from 'node:fs/promises'

const front = createRequire(new URL('../frontend/package.json', import.meta.url))
const audit = createRequire(new URL('../.audit-tools/package.json', import.meta.url))
const { createServer } = await import(pathToFileURL(front.resolve('vite')).href)
const { default: playwright } = await import(pathToFileURL(audit.resolve('playwright')).href)
let vite, browser
const resultados = []
try {
  vite = await createServer({ root: fileURLToPath(new URL('../frontend', import.meta.url)), server: { host: '127.0.0.1', port: 0, hmr: false, watch: null }, logLevel: 'silent' })
  await vite.listen()
  browser = await playwright.chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const base = `http://127.0.0.1:${vite.httpServer.address().port}`
  for (const motion of ['no-preference', 'reduce']) {
    await page.emulateMedia({ reducedMotion: motion })
    await page.goto(base, { waitUntil: 'networkidle' })
    const resultado = await page.evaluate(async () => {
      const link = document.querySelector('.hero-actions a[href="#cardapio"]')
      const amostras = []
      const inicio = performance.now()
      link.click()
      for (let i = 0; i < 75; i++) {
        await new Promise(requestAnimationFrame)
        amostras.push({ ms: Math.round(performance.now() - inicio), y: scrollY })
      }
      return { reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, css: getComputedStyle(document.documentElement).scrollBehavior, hash: location.hash, amostras }
    })
    assert.equal(resultado.hash, '#cardapio')
    const posicoes = new Set(resultado.amostras.map((item) => item.y))
    if (motion === 'no-preference') assert(posicoes.size > 2, 'A rolagem precisa ter posições intermediárias')
    else assert.equal(posicoes.size, 1, 'Movimento reduzido deve chegar diretamente ao destino')
    resultados.push(resultado)
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  for (const seletor of ['header nav a[href="#contato"]', '.hero-actions a[href="#encomendas"]', '.menu-order-action a', 'footer nav a[href="#inicio"]']) {
    await page.goto(base, { waitUntil: 'networkidle' })
    const teste = await page.evaluate(async (seletor) => {
      if (seletor.startsWith('footer')) window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })
      const link = document.querySelector(seletor)
      const antes = history.length
      const posicoes = []
      link.click()
      for (let i = 0; i < 40; i++) { await new Promise(requestAnimationFrame); posicoes.push(scrollY) }
      return { seletor, hash: location.hash, esperado: link.hash, historicoAcrescentado: history.length - antes, posicoesDistintas: new Set(posicoes).size }
    }, seletor)
    assert.equal(teste.hash, teste.esperado)
    assert.equal(teste.historicoAcrescentado, 1)
    assert(teste.posicoesDistintas > 2)
    resultados.push(teste)
  }
  await page.goto(base)
  await page.locator('header nav a[href="#contato"]').focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(600)
  assert.equal(new URL(page.url()).hash, '#contato')
  await page.goBack()
  assert.equal(new URL(page.url()).hash, '')
  await page.goForward()
  assert.equal(new URL(page.url()).hash, '#contato')
  console.log(JSON.stringify(resultados.map((item) => item.amostras ? { movimentoReduzido: item.reducedMotion, css: item.css, posicoesDistintas: new Set(item.amostras.map((amostra) => amostra.y)).size } : item), null, 2))
  await mkdir(new URL('../docs/v1.1/', import.meta.url), { recursive: true })
  await writeFile(new URL('../docs/v1.1/rolagem.json', import.meta.url), JSON.stringify(resultados, null, 2))
} finally { await browser?.close(); await vite?.close() }
