import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { mkdir, writeFile } from 'node:fs/promises'
import { once } from 'node:events'
import { randomBytes } from 'node:crypto'
import { criarApp } from '../backend/src/app.ts'
import { abrirEncomendas } from '../backend/src/database/encomendas.ts'
import { gerarHash } from '../backend/src/auth/senha.ts'

const raiz = fileURLToPath(new URL('..', import.meta.url))
const audit = createRequire(new URL('../.audit-tools/package.json', import.meta.url))
const front = createRequire(new URL('../frontend/package.json', import.meta.url))
const { default: playwright } = await import(pathToFileURL(audit.resolve('playwright')).href)
const { AxeBuilder } = await import(pathToFileURL(audit.resolve('@axe-core/playwright')).href)
const { createServer } = await import(pathToFileURL(front.resolve('vite')).href)
const saida = new URL('../docs/painel/', import.meta.url)
await mkdir(saida, { recursive: true })
const repo = abrirEncomendas(':memory:')
const senha = randomBytes(24).toString('hex')
const admin = { usuario: 'administradora-teste', senhaHash: await gerarHash(senha), origem: 'http://127.0.0.1:5173' }
let api, vite, browser
const resultado = { larguras: [], acessibilidade: [], errosPagina: [], passos: [] }
async function verificar(page, nome, largura) {
  await page.setViewportSize({ width: largura, height: 900 })
  await page.screenshot({ path: fileURLToPath(new URL(`${nome}-${largura}.png`, saida)), fullPage: true, animations: 'disabled' })
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  assert.equal(scrollWidth, largura)
  resultado.larguras.push({ estado: nome, largura, scrollWidth })
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  resultado.acessibilidade.push({ estado: `${nome}-${largura}`, violacoes: axe.violations.map((v) => ({ id: v.id, alvos: v.nodes.map((n) => n.target) })) })
  assert.equal(axe.violations.length, 0)
}
try {
  api = criarApp(repo, { admin }).listen(0, '127.0.0.1')
  await once(api, 'listening')
  vite = await createServer({ root: fileURLToPath(new URL('../frontend', import.meta.url)), server: { host: '127.0.0.1', port: 0, hmr: false, watch: null, proxy: { '/api': { target: `http://127.0.0.1:${api.address().port}` } } }, logLevel: 'silent' })
  await vite.listen()
  admin.origem = `http://127.0.0.1:${vite.httpServer.address().port}`
  browser = await playwright.chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) })
  const context = await browser.newContext()
  const page = await context.newPage()
  page.on('pageerror', (erro) => resultado.errosPagina.push(erro.message))
  await page.goto(`${admin.origem}/admin`)
  await page.getByLabel('Usuário', { exact: true }).waitFor()
  for (const largura of [360, 390, 768, 1280]) await verificar(page, 'login', largura)
  const dados = { nomeCliente: 'Cliente de Demonstração', telefone: '73999999999', produto: 'bolo-cenoura', dataEntrega: '2099-12-25', incluirPaoDeQueijo: true, quantidadeBolos: 2 }
  const pedido = repo.criar(dados, () => new Date())
  repo.criar({ ...dados, produto: 'bolo-coco', incluirPaoDeQueijo: false, quantidadeBolos: 1 }, () => new Date())
  await page.getByLabel('Usuário', { exact: true }).fill(admin.usuario)
  await page.getByLabel('Senha', { exact: true }).fill(senha)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.locator('.admin-card').first().waitFor()
  for (const largura of [360, 390, 768, 1280]) await verificar(page, 'pedidos', largura)
  assert.equal((await context.cookies()).find((c) => c.name === 'cafe_admin')?.httpOnly, true)
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0)
  await page.getByLabel(`Status do pedido nº ${pedido.id}`, { exact: true }).selectOption('em preparo')
  await page.locator('.admin-card').first().getByRole('button', { name: 'Salvar status' }).click()
  await page.getByText(`Status do pedido nº ${pedido.id} atualizado para em preparo.`, { exact: true }).waitFor()
  assert.equal(repo.buscar(pedido.id).status, 'em preparo')
  await page.getByLabel('Filtrar por status', { exact: true }).selectOption('entregue')
  await page.getByText('Nenhuma encomenda por aqui com esses filtros.').waitFor()
  await page.getByRole('button', { name: 'Limpar filtros' }).click()
  await page.getByRole('button', { name: `Excluir pedido nº ${pedido.id}`, exact: true }).click()
  await verificar(page, 'confirmacao-exclusao', 390)
  await page.getByRole('button', { name: 'Manter pedido' }).click()
  assert.equal(repo.listar().length, 2)
  await page.getByRole('button', { name: `Excluir pedido nº ${pedido.id}`, exact: true }).click()
  await page.getByRole('button', { name: `Sim, excluir pedido nº ${pedido.id}`, exact: true }).click()
  await page.getByText(`Pedido nº ${pedido.id} excluído.`, { exact: true }).waitFor()
  assert.equal(repo.listar().length, 1)
  await page.reload()
  await page.locator('.admin-card').waitFor()
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await page.getByLabel('Usuário', { exact: true }).waitFor()
  const negado = await context.request.get(`${admin.origem}/api/encomendas`)
  assert.equal(negado.status(), 401)
  assert.equal(resultado.errosPagina.length, 0)
  resultado.passos.push('Login por cookie real, sessão após reload, filtros, status no SQLite, cancelar/confirmar exclusão e logout com acesso negado')
  console.log(JSON.stringify(resultado, null, 2))
} finally {
  await writeFile(new URL('resultado.json', saida), JSON.stringify(resultado, null, 2))
  await browser?.close()
  await vite?.close()
  if (api) await new Promise((resolve) => api.close(resolve))
  repo.fechar()
}
