import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { mkdir, writeFile } from 'node:fs/promises'
import { cafeConfig } from '../frontend/src/data/cafeConfig.ts'

const front = createRequire(new URL('../frontend/package.json', import.meta.url))
const audit = createRequire(new URL('../.audit-tools/package.json', import.meta.url))
const { createServer } = await import(pathToFileURL(front.resolve('vite')).href)
const { default: playwright } = await import(pathToFileURL(audit.resolve('playwright')).href)
const { AxeBuilder } = await import(pathToFileURL(audit.resolve('@axe-core/playwright')).href)
const antes = process.argv.includes('--antes')
const saida = new URL(`../docs/cardapio-madeira/${antes ? 'antes/' : 'depois/'}`, import.meta.url)
const produtos = cafeConfig.produtos.filter((produto) => produto.exibirNoCardapio)
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const resultados = []
let vite, browser
try {
  await mkdir(saida, { recursive: true })
  vite = await createServer({ root: fileURLToPath(new URL('../frontend', import.meta.url)), server: { host: '127.0.0.1', port: 0, hmr: false, watch: null }, logLevel: 'silent' })
  await vite.listen()
  browser = await playwright.chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) })
  const contexto = await browser.newContext()
  const page = await contexto.newPage()
  const erros = []
  page.on('pageerror', (erro) => erros.push(erro.message))
  for (const largura of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width: largura, height: 1100 })
    await page.goto(`http://127.0.0.1:${vite.httpServer.address().port}`, { waitUntil: 'networkidle' })
    const cardapio = page.locator('#cardapio')
    assert.equal(await cardapio.locator('.product-card').count(), produtos.length)
    assert.deepEqual(await cardapio.locator('.category-heading h3').allTextContents(), cafeConfig.cardapio.categorias.map((categoria) => categoria.nome))
    assert.deepEqual(await cardapio.locator('.product-content h4').allTextContents(), produtos.map((produto) => produto.nome))
    assert.deepEqual(await cardapio.locator('.product-price').allTextContents(), produtos.map((produto) => moeda.format(produto.preco)))
    const geometria = await cardapio.evaluate((el) => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      precos: [...el.querySelectorAll('.product-price')].map((preco) => {
        const r = preco.getBoundingClientRect(), cartao = preco.closest('.product-card').getBoundingClientRect()
        return { texto: preco.textContent, legivel: r.width > 0 && r.left >= cartao.left && r.right <= cartao.right && r.top >= cartao.top && r.bottom <= cartao.bottom && preco.scrollWidth <= preco.clientWidth + 1 }
      }),
    }))
    assert.equal(geometria.overflow, false)
    assert(geometria.precos.every((preco) => preco.legivel), 'Preço cortado ou fora do cartão')
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    assert.deepEqual(violations.map(({ id }) => id), [])
    await cardapio.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }))
    await page.screenshot({ path: fileURLToPath(new URL(`cardapio-${largura}.png`, saida)), animations: 'disabled' })
    await cardapio.locator('.menu-category').first().screenshot({ path: fileURLToPath(new URL(`bolos-${largura}.png`, saida)), animations: 'disabled' })
    await cardapio.locator('.menu-order-action').evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
    await page.screenshot({ path: fileURLToPath(new URL(`transicao-${largura}.png`, saida)), animations: 'disabled' })
    resultados.push({ largura, produtos: produtos.length, categorias: cafeConfig.cardapio.categorias.length, violacoesAxe: 0, ...geometria })
  }
  assert.deepEqual(erros, [])
  await writeFile(new URL('resultado.json', saida), JSON.stringify({ resultados, erros }, null, 2))
  console.log('Cardápio, nomes, categorias, preços, acessibilidade e responsividade aprovados nas quatro larguras.')
} finally {
  await browser?.close()
  await vite?.close()
}
