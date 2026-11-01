import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { mkdir, writeFile } from 'node:fs/promises'

const front = createRequire(new URL('../frontend/package.json', import.meta.url))
const audit = createRequire(new URL('../.audit-tools/package.json', import.meta.url))
const { createServer } = await import(pathToFileURL(front.resolve('vite')).href)
const { default: playwright } = await import(pathToFileURL(audit.resolve('playwright')).href)
const diagnostico = process.argv.includes('--diagnostico')
let vite, browser
const resultados = []
try {
  vite = await createServer({ root: fileURLToPath(new URL('../frontend', import.meta.url)), server: { host: '127.0.0.1', port: 0, hmr: false, watch: null }, logLevel: 'silent' })
  await vite.listen()
  browser = await playwright.chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const base = 'http://127.0.0.1:' + vite.httpServer.address().port
  async function medir(seletor, teclado = false, reduce = false, largura = 390) {
    await page.setViewportSize({ width: largura, height: 844 })
    await page.emulateMedia({ reducedMotion: reduce ? 'reduce' : 'no-preference' })
    await page.goto(base, { waitUntil: 'networkidle' })
    const link = page.locator(seletor)
    await link.scrollIntoViewIfNeeded()
    if (teclado) await link.focus()
    await page.evaluate((seletor) => {
      window.medicao = new Promise((resolve) => {
        document.querySelector(seletor).addEventListener('click', () => {
          const inicio = performance.now()
          const amostras = [{ ms: 0, y: scrollY }]
          const alvo = document.getElementById(document.querySelector(seletor).hash.slice(1))
          const final = Math.max(0, Math.min(alvo.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(alvo).scrollMarginTop) || 0), document.documentElement.scrollHeight - innerHeight))
          const historico = history.length
          function registrar() {
            amostras.push({ ms: Math.round(performance.now() - inicio), y: scrollY })
            if (performance.now() - inicio < 1450) requestAnimationFrame(registrar)
            else resolve({ amostras, final, hash: location.hash, foco: document.activeElement.id, historicoAcrescentado: history.length - historico })
          }
          requestAnimationFrame(registrar)
        }, { once: true, capture: true })
      })
    }, seletor)
    if (teclado) await page.keyboard.press('Enter')
    else await link.click()
    const medicao = await page.evaluate(() => window.medicao)
    const nosTempos = [100, 300, 600, 900, 1200].map((ms) => medicao.amostras.find((item) => item.ms >= ms))
    resultados.push({ seletor, teclado, reduce, largura, ...medicao, nosTempos })
    assert.equal(medicao.hash, await link.getAttribute('href'))
    assert.equal(medicao.historicoAcrescentado, 1)
    assert(Math.abs(medicao.amostras.at(-1).y - medicao.final) <= 2)
    if (!diagnostico) {
      assert.equal(medicao.foco, medicao.hash.slice(1))
      if (reduce) assert(medicao.amostras.slice(1).every((item) => Math.abs(item.y - medicao.final) <= 2))
      else {
        const inicio = medicao.amostras[0].y
        for (const item of nosTempos.slice(0, 4)) assert(Math.abs(item.y - inicio) > 2 && Math.abs(item.y - medicao.final) > 2, 'Salto detectado em ' + item.ms + 'ms')
        assert(new Set(medicao.amostras.map((item) => item.y)).size > 30)
        for (let i = 1; i < medicao.amostras.length; i++) assert((medicao.amostras[i].y - medicao.amostras[i - 1].y) * Math.sign(medicao.final - inicio) >= 0, JSON.stringify({ seletor, anterior: medicao.amostras[i - 1], atual: medicao.amostras[i], inicio, final: medicao.final }))
      }
    }
  }
  await medir('header nav a[href="#encomendas"]')
  if (!diagnostico) {
    for (const largura of [360, 768, 1280]) await medir('.hero-actions a[href="#encomendas"]', false, false, largura)
    await medir('.hero-actions a[href="#cardapio"]')
    await medir('.menu-order-action a')
    await medir('footer nav a[href="#inicio"]')
    await medir('header nav a[href="#contato"]', true)
    await page.keyboard.press('Tab')
    assert(await page.locator(':focus').evaluate((alvo) => Boolean(alvo.closest('#contato'))))
    await page.goBack()
    await page.waitForFunction(() => !location.hash && scrollY < 2)
    assert.equal(await page.locator(':focus').getAttribute('id'), 'inicio')
    await page.goForward()
    await page.waitForFunction(() => location.hash === '#contato' && scrollY > 100)
    assert.equal(await page.locator(':focus').getAttribute('id'), 'contato')
    await medir('header nav a[href="#encomendas"]', false, true)
    await medir('header nav a[href="#contato"]', true, true)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto(base, { waitUntil: 'networkidle' })
    await page.locator('header nav a[href="#encomendas"]').click()
    await page.waitForTimeout(300)
    await page.mouse.wheel(0, -200)
    await page.waitForTimeout(150)
    const parada = await page.evaluate(() => scrollY)
    await page.waitForTimeout(1000)
    assert.equal(await page.evaluate(() => scrollY), parada)
    resultados.push({ interrupcaoRoda: true, parada })
    await page.goto(base, { waitUntil: 'networkidle' })
    await page.locator('header nav a[href="#encomendas"]').click()
    await page.waitForTimeout(300)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.waitForTimeout(100)
    const final = await page.evaluate(() => scrollY)
    await page.waitForTimeout(1000)
    assert.equal(await page.evaluate(() => scrollY), final)
    resultados.push({ movimentoReduzidoDuranteAnimacao: true, final, historicoVoltarAvancar: true })
  }
  const visual = process.argv.includes('--visual')
  const terrosos = process.argv.includes('--terrosos')
  await mkdir(new URL(terrosos ? '../docs/tons-terrosos/' : visual ? '../docs/refinamento-visual/' : '../docs/v1.1/', import.meta.url), { recursive: true })
  if (process.argv.includes('--itens')) await mkdir(new URL('../docs/multissabores/', import.meta.url), { recursive: true })
  await writeFile(new URL(terrosos ? '../docs/tons-terrosos/rolagem.json' : visual ? '../docs/refinamento-visual/rolagem.json' : diagnostico ? '../docs/v1.1/rolagem-450ms.json' : process.argv.includes('--itens') ? '../docs/multissabores/rolagem.json' : '../docs/v1.1/rolagem-1200ms.json', import.meta.url), JSON.stringify(resultados, null, 2))
  console.log(JSON.stringify(resultados.map(({ amostras, ...resumo }) => ({ ...resumo, quadros: amostras?.length })), null, 2))
} finally { await browser?.close(); await vite?.close() }
