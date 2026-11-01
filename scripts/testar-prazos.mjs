import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { mkdir, writeFile } from 'node:fs/promises'

const front = createRequire(new URL('../frontend/package.json', import.meta.url))
const audit = createRequire(new URL('../.audit-tools/package.json', import.meta.url))
const { createServer } = await import(pathToFileURL(front.resolve('vite')).href)
const { default: playwright } = await import(pathToFileURL(audit.resolve('playwright')).href)
const { AxeBuilder } = await import(pathToFileURL(audit.resolve('@axe-core/playwright')).href)
const saida = new URL('../docs/prazos/', import.meta.url)
const resultados = []
let vite, browser
try {
  await mkdir(saida, { recursive: true })
  vite = await createServer({ root: fileURLToPath(new URL('../frontend', import.meta.url)), server: { host: '127.0.0.1', port: 0, hmr: false, watch: null }, logLevel: 'silent' })
  await vite.listen()
  browser = await playwright.chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) })
  // O computador está em Tóquio; o calendário do painel deve continuar na Bahia.
  const context = await browser.newContext({ timezoneId: 'Asia/Tokyo' })
  const page = await context.newPage()
  await page.clock.install({ time: new Date('2027-01-01T02:59:50Z') })
  await page.route('**/api/admin/sessao', (route) => route.fulfill({ json: { csrfToken: 'a'.repeat(64), expiraEm: '2027-01-01T10:00:00Z' } }))
  await page.route('**/api/encomendas', (route) => route.fulfill({ json: ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-30', '2027-01-31'].map((dataEntrega, i) => ({
    id: i + 1, nomeCliente: 'Cliente de Demonstração', telefone: '73999999999', dataEntrega,
    itens: [{ produto: 'bolo-cenoura', quantidade: 1 }, { produto: 'bolo-coco', quantidade: 1 }],
    totalBolos: 2, status: i === 3 ? 'entregue' : 'recebida', incluirPaoDeQueijo: false,
  })) }))
  await page.goto(`http://127.0.0.1:${vite.httpServer.address().port}/admin`)
  await page.locator('.admin-card').first().waitFor()
  const prazo = page.getByLabel('Ver pedidos dentro dos próximos:', { exact: true })
  for (const [valor, quantidade] of [['1', 1], ['2', 2], ['7', 2], ['30', 3], ['30+', 1], ['', 6]]) {
    await prazo.selectOption(valor)
    assert.equal(await page.locator('.admin-card').count(), quantidade)
  }
  await prazo.selectOption('7')
  for (const largura of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width: largura, height: 844 })
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    assert.deepEqual(violations.map(({ id }) => id), [])
    await page.screenshot({ path: fileURLToPath(new URL(`filtros-${largura}.png`, saida)), fullPage: true })
    resultados.push({ largura, overflowHorizontal: false, violacoesAxe: 0 })
  }
  await prazo.selectOption('1')
  assert(await page.locator('#editar-botao-3').count())
  await page.clock.fastForward(30_000)
  assert(await page.locator('#editar-botao-4').count())
  assert.equal(await page.locator('#editar-botao-3').count(), 0)
  await page.locator('#editar-botao-4').click()
  assert(await prazo.isDisabled())
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await page.getByLabel('Filtrar por status', { exact: true }).selectOption('recebida')
  assert.equal(await page.locator('.admin-card').count(), 0)
  await page.getByText('Nenhuma encomenda no prazo selecionado com esses filtros.', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click()
  assert.equal(await page.locator('.admin-card').count(), 6)
  await writeFile(new URL('navegador.json', saida), JSON.stringify({ fusoDispositivo: 'Asia/Tokyo', viradaBahia: true, resultados }, null, 2))
  console.log('Prazos, virada na Bahia, edição, responsividade e axe aprovados em 360, 390, 768 e 1280 px.')
} finally {
  await browser?.close()
  await vite?.close()
}
