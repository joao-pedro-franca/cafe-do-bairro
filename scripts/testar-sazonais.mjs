import { resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { once } from 'node:events'
import { randomBytes } from 'node:crypto'
import { criarApp } from '../backend/src/app.ts'
import { abrirEncomendas } from '../backend/src/database/encomendas.ts'
import { gerarHash } from '../backend/src/auth/senha.ts'

const audit = createRequire(new URL('../.audit-tools/package.json', import.meta.url))
const front = createRequire(new URL('../frontend/package.json', import.meta.url))
const { default: playwright } = await import(pathToFileURL(audit.resolve('playwright')).href)
const { AxeBuilder } = await import(pathToFileURL(audit.resolve('@axe-core/playwright')).href)
const { createServer } = await import(pathToFileURL(front.resolve('vite')).href)
const saida = resolve(process.argv.find((arg) => arg.startsWith('--saida='))?.slice(8) ?? 'docs/regras-encomendas-final/sazonais')
await mkdir(saida, { recursive: true })
const temporaria = await mkdtemp(join(tmpdir(), 'cafe-sazonais-'))
const arquivo = join(temporaria, 'auditoria.sqlite')
let repo = abrirEncomendas(arquivo), api, vite, browser
const senha = randomBytes(24).toString('hex')
const admin = { usuario: 'marta-auditoria', senhaHash: await gerarHash(senha), origem: 'http://127.0.0.1:5173' }
const resultado = { larguras: [], acessibilidade: [], passos: [], errosPagina: [] }
const dados = { nomeCliente: 'Cliente de Teste', telefone: '73999999999', dataEntrega: '2099-12-24', incluirPaoDeQueijo: false, itens: [{ produto: 'panetone', quantidade: 1 }] }
async function conferir(page, nome, seletor) {
  for (const largura of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width: largura, height: 900 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), largura)
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    resultado.acessibilidade.push({ estado: `${nome}-${largura}`, violacoes: axe.violations.map((v) => ({ id: v.id, alvos: v.nodes.map((n) => n.target) })) })
    assert.equal(axe.violations.length, 0, JSON.stringify(resultado.acessibilidade.at(-1)))
    if (!process.argv.includes('--sem-capturas')) await page.locator(seletor).screenshot({ path: join(saida, `${nome}-${largura}.jpg`), type: 'jpeg', quality: 86, animations: 'disabled' })
    resultado.larguras.push({ estado: nome, largura, transbordamento: false })
  }
}
try {
  api = criarApp(repo, { admin }).listen(0, '127.0.0.1')
  await once(api, 'listening')
  vite = await createServer({ cacheDir: join(temporaria, 'vite-cache'), root: fileURLToPath(new URL('../frontend', import.meta.url)), server: { host: '127.0.0.1', port: 0, hmr: false, watch: null, proxy: { '/api': { target: `http://127.0.0.1:${api.address().port}` } } }, logLevel: 'silent' })
  await vite.listen()
  admin.origem = `http://127.0.0.1:${vite.httpServer.address().port}`
  browser = await playwright.chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) })
  const contextoAdmin = await browser.newContext()
  const publico = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await contextoAdmin.newPage()
  const cliente = await publico.newPage()
  for (const p of [page, cliente]) p.on('pageerror', (e) => resultado.errosPagina.push(e.message))
  await page.goto(`${admin.origem}/admin`)
  await page.getByLabel('Usuário', { exact: true }).fill(admin.usuario)
  await page.getByLabel('Senha', { exact: true }).fill(senha)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.locator('.product-settings-card').nth(7).waitFor()
  const cartao = (nome) => page.locator('.product-settings-card').filter({ has: page.getByRole('heading', { name: nome, exact: true }) })
  const panetone = cartao('Panetone')
  await panetone.getByLabel('Aceita encomendas de Panetone', { exact: true }).check()
  await panetone.getByRole('button', { name: 'Salvar Panetone', exact: true }).click()
  await panetone.getByRole('status').waitFor()
  assert.deepEqual(repo.listarProdutos().find((p) => p.id === 'panetone').mesesPermitidos, [12])
  const natal = cartao('Bolo de Natal')
  await natal.getByLabel('Aceita encomendas de Bolo de Natal', { exact: true }).check()
  await natal.getByLabel('Meses de retirada de Bolo de Natal', { exact: true }).selectOption('ano')
  await natal.getByRole('button', { name: 'Salvar Bolo de Natal', exact: true }).click()
  await natal.getByRole('status').waitFor()
  assert.equal(await page.locator('.product-settings-card').count(), 8)
  assert.equal(await cartao('Pão de queijo').count(), 0)
  assert.equal(await cartao('Café coado').count(), 0)
  await conferir(page, 'admin-disponibilidade', '.admin-products')
  resultado.passos.push('Eight configurable products; cakes and panetone only; optional bread accompaniment accepted with Christmas cake.')

  await cliente.goto(admin.origem)
  await cliente.getByRole('button', { name: 'Quero encomendar', exact: true }).click()
  await cliente.getByLabel('Data desejada').fill(dados.dataEntrega)
  await cliente.getByLabel('Produto 1', { exact: true }).selectOption('panetone')
  await cliente.getByLabel('Nome completo').fill(dados.nomeCliente)
  await cliente.getByLabel('Telefone/WhatsApp').fill(dados.telefone)
  await cliente.getByRole('button', { name: 'Adicionar produto', exact: true }).click()
  await cliente.getByLabel('Produto 2', { exact: true }).selectOption('bolo-natal')
  await cliente.locator('[name="incluirPaoDeQueijo"]').check()
  for (const id of ['cafe-coado', 'cafe-leite', 'pao-queijo']) assert.equal(await cliente.locator(`select option[value="${id}"]`).count(), 0)
  await conferir(cliente, 'formulario-misto', '.order-form')
  await cliente.getByLabel('Data desejada').fill('2099-11-24')
  await cliente.getByText(/Há produtos selecionados/).waitFor()
  assert.equal(await cliente.getByLabel('Produto 1', { exact: true }).inputValue(), 'panetone')
  assert(await cliente.getByRole('button', { name: 'Confirmar encomenda', exact: true }).isDisabled())
  await cliente.getByLabel('Data desejada').fill(dados.dataEntrega)
  await cliente.getByRole('button', { name: 'Confirmar encomenda', exact: true }).click()
  await cliente.getByText(/Encomenda nº \d+ confirmada!/).waitFor()
  const criado = repo.listar()[0]
  assert.equal(criado.totalCentavos, 12500)
  assert.equal(criado.quantidadeProducao, 2)
  assert.equal(criado.quantidadeItens, 3)
  assert.equal(criado.valorPaoDeQueijoCentavos, 2500)
  await conferir(cliente, 'confirmacao-mista', '.form-result')
  resultado.passos.push('Panetone + Christmas cake + bread: R$125; two production units; month conflict preserves draft.')

  await page.getByRole('button', { name: 'Atualizar lista', exact: true }).click()
  await page.locator('.admin-card').waitFor()
  await panetone.getByLabel('Aceita encomendas de Panetone', { exact: true }).uncheck()
  await panetone.getByRole('button', { name: 'Salvar Panetone', exact: true }).click()
  await panetone.getByRole('status').waitFor()
  await page.getByRole('button', { name: /^Editar pedido/ }).click()
  await page.getByLabel('Telefone/WhatsApp', { exact: true }).fill('(73) 98888-8888')
  await page.getByLabel('Status', { exact: true }).selectOption('em preparo')
  assert(await panetone.getByLabel('Aceita encomendas de Panetone', { exact: true }).isDisabled())
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click()
  await page.locator('.admin-edit').waitFor({ state: 'detached' })
  assert.equal(repo.buscar(criado.id).totalCentavos, 12500)
  assert.equal(repo.buscar(criado.id).status, 'em preparo')
  assert.equal(repo.buscar(criado.id).telefone, '73988888888')
  await conferir(page, 'pedido-preservado', '.admin-card')
  assert.equal((await publico.request.post(`${admin.origem}/api/encomendas`, { data: dados })).status(), 409)
  assert.equal((await publico.request.patch(`${admin.origem}/api/admin/produtos/panetone`, { data: { aceitaEncomendas: true, mesesPermitidos: [] } })).status(), 401)
  const semCsrf = await contextoAdmin.request.patch(`${admin.origem}/api/admin/produtos/panetone`, { data: { aceitaEncomendas: true, mesesPermitidos: [] }, headers: { Origin: admin.origem } })
  assert.equal(semCsrf.status(), 403)
  resultado.passos.push('Produto desativado mantém pedido, preço e edição de contato/status; nova compra recebe409; alteração anônima401 e sessão sem CSRF403.')

  for (const produto of ['cafe-coado', 'cafe-leite', 'pao-queijo']) {
    const resposta = await publico.request.post(`${admin.origem}/api/encomendas`, { data: { ...dados, itens: [{ produto, quantidade: 1 }] } })
    assert.equal(resposta.status(), 400)
  }
  assert.equal((await publico.request.post(`${admin.origem}/api/encomendas`, { data: { ...dados, incluirPaoDeQueijo: true } })).status(), 400)

  // Legado real no SQLite temporário: itens hoje proibidos e preços acordados.
  const legadoDb = new DatabaseSync(arquivo)
  const legadoId = Number(legadoDb.prepare(`INSERT INTO encomendas(nomeCliente, telefone, dataEntrega, incluirPaoDeQueijo, valorPaoDeQueijoCentavos)
    VALUES ('Cliente Histórico', '73999999999', '2000-01-01', 1, 1800)`).run().lastInsertRowid)
  legadoDb.prepare('INSERT INTO encomenda_itens VALUES (?, ?, ?, ?, ?)').run(legadoId, 'cafe-coado', 20, 0, 321)
  legadoDb.prepare('INSERT INTO encomenda_itens VALUES (?, ?, ?, ?, ?)').run(legadoId, 'pao-queijo', 2, 1, 1234)
  legadoDb.close()
  const legadoAntes = repo.buscar(legadoId)
  await page.getByRole('button', { name: 'Atualizar lista', exact: true }).click()
  await page.getByRole('button', { name: `Editar pedido nº ${legadoId}`, exact: true }).click()
  assert.equal(await page.getByLabel('Produto 1', { exact: true }).inputValue(), 'cafe-coado')
  assert.equal(await page.getByLabel('Produto 2', { exact: true }).inputValue(), 'pao-queijo')
  await page.getByLabel('Telefone/WhatsApp', { exact: true }).fill('(73) 98888-8888')
  await page.getByLabel('Status', { exact: true }).selectOption('entregue')
  await conferir(page, 'edicao-historica', '.admin-edit')
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click()
  await page.locator('.admin-edit').waitFor({ state: 'detached' })
  assert.deepEqual(repo.buscar(legadoId).itens, legadoAntes.itens)
  assert.equal(repo.buscar(legadoId).totalCentavos, legadoAntes.totalCentavos)
  assert.equal(repo.buscar(legadoId).status, 'entregue')
  assert.equal(repo.buscar(legadoId).telefone, '73988888888')
  resultado.passos.push('Pedido histórico com café e pão individual mantém itens, quantidades e preços após edição real de contato/status.')

  const snapshot = repo.listar()
  await new Promise((r) => api.close(r)); api = null
  repo.fechar(); repo = abrirEncomendas(arquivo)
  assert.deepEqual(repo.listar(), snapshot)
  assert.equal(repo.listarProdutos().find((p) => p.id === 'panetone').aceitaEncomendas, false)
  resultado.passos.push('Coffee/bread main items and accompaniment without cake rejected; SQLite reopen preserves settings and prices.')
  assert.equal(resultado.errosPagina.length, 0)
} finally {
  await browser?.close()
  await vite?.close()
  if (api) await new Promise((r) => api.close(r))
  repo.fechar()
  // Somente a pasta retornada por mkdtemp, fora da base local do projeto.
  assert(temporaria.startsWith(join(tmpdir(), 'cafe-sazonais-')))
  await rm(temporaria, { recursive: true, force: true })
  await writeFile(join(saida, 'resultado.json'), JSON.stringify(resultado, null, 2) + '\n')
}
console.log(JSON.stringify({ estados: resultado.larguras.length, axe: resultado.acessibilidade.length, passos: resultado.passos.length, errosPagina: resultado.errosPagina.length }))
