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
const saida = fileURLToPath(new URL('../docs/produtos-sazonais/', import.meta.url))
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
    await page.locator(seletor).screenshot({ path: join(saida, `${nome}-${largura}.jpg`), type: 'jpeg', quality: 86, animations: 'disabled' })
    resultado.larguras.push({ estado: nome, largura, transbordamento: false })
  }
}
try {
  api = criarApp(repo, { admin }).listen(0, '127.0.0.1')
  await once(api, 'listening')
  vite = await createServer({ root: fileURLToPath(new URL('../frontend', import.meta.url)), server: { host: '127.0.0.1', port: 0, hmr: false, watch: null, proxy: { '/api': { target: `http://127.0.0.1:${api.address().port}` } } }, logLevel: 'silent' })
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
  await page.locator('.product-settings-card').nth(10).waitFor()
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
  const cafe = cartao('Café coado')
  await cafe.getByLabel('Aceita encomendas de Café coado', { exact: true }).check()
  await cafe.getByRole('button', { name: 'Salvar Café coado', exact: true }).click()
  await cafe.getByRole('status').waitFor()
  await conferir(page, 'admin-disponibilidade', '.admin-products')
  resultado.passos.push('Sessão real salva panetone em dezembro, bolo de Natal no ano todo e café coado habilitado; quatro larguras sem transbordamento e sem violações axe.')

  await cliente.goto(admin.origem)
  await cliente.getByRole('button', { name: 'Quero encomendar', exact: true }).click()
  await cliente.getByLabel('Data desejada').fill(dados.dataEntrega)
  await cliente.getByLabel('Produto 1', { exact: true }).selectOption('panetone')
  await cliente.getByLabel('Nome completo').fill(dados.nomeCliente)
  await cliente.getByLabel('Telefone/WhatsApp').fill(dados.telefone)
  await cliente.getByRole('button', { name: 'Adicionar produto', exact: true }).click()
  await cliente.getByLabel('Produto 2', { exact: true }).selectOption('cafe-coado')
  await cliente.getByLabel('Quantidade do produto 2', { exact: true }).fill('2')
  await cliente.getByRole('button', { name: 'Adicionar produto', exact: true }).click()
  await cliente.getByLabel('Produto 3', { exact: true }).selectOption('pao-queijo')
  await cliente.getByLabel('Quantidade do produto 3', { exact: true }).fill('2')
  assert(await cliente.getByRole('checkbox').isDisabled())
  await conferir(cliente, 'formulario-misto', '.order-form')
  await cliente.getByLabel('Data desejada').fill('2099-11-24')
  await cliente.getByText(/Há produtos selecionados/).waitFor()
  assert.equal(await cliente.getByLabel('Produto 1', { exact: true }).inputValue(), 'panetone')
  assert(await cliente.getByRole('button', { name: 'Confirmar encomenda', exact: true }).isDisabled())
  await cliente.getByLabel('Data desejada').fill(dados.dataEntrega)
  await cliente.getByRole('button', { name: 'Confirmar encomenda', exact: true }).click()
  await cliente.getByText(/Encomenda nº \d+ confirmada!/).waitFor()
  const criado = repo.listar()[0]
  assert.equal(criado.totalCentavos, 10500)
  assert.equal(criado.quantidadeProducao, 1)
  assert.equal(criado.quantidadeItens, 5)
  assert.equal(criado.valorPaoDeQueijoCentavos, 0)
  await conferir(cliente, 'confirmacao-mista', '.form-result')
  resultado.passos.push('Cliente confirma panetone + duas xícaras + duas dúzias por R$105,00; novembro bloqueia panetone sem removê-lo; produção=1, unidades de venda=5, adicional=0.')

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
  assert.equal(repo.buscar(criado.id).totalCentavos, 10500)
  assert.equal(repo.buscar(criado.id).status, 'em preparo')
  assert.equal(repo.buscar(criado.id).telefone, '73988888888')
  await conferir(page, 'pedido-preservado', '.admin-card')
  assert.equal((await publico.request.post(`${admin.origem}/api/encomendas`, { data: dados })).status(), 409)
  assert.equal((await publico.request.patch(`${admin.origem}/api/admin/produtos/panetone`, { data: { aceitaEncomendas: true, mesesPermitidos: [] } })).status(), 401)
  const semCsrf = await contextoAdmin.request.patch(`${admin.origem}/api/admin/produtos/panetone`, { data: { aceitaEncomendas: true, mesesPermitidos: [] }, headers: { Origin: admin.origem } })
  assert.equal(semCsrf.status(), 403)
  resultado.passos.push('Produto desativado mantém pedido, preço e edição de contato/status; nova compra recebe409; alteração anônima401 e sessão sem CSRF403.')

  // API real: café sozinho e dúzias sozinhas, sem depender de haver bolos.
  for (const [produto, quantidade, total] of [['cafe-coado', 20, 10000], ['pao-queijo', 2, 5000]]) {
    const resposta = await publico.request.post(`${admin.origem}/api/encomendas`, { data: { ...dados, itens: [{ produto, quantidade }] } })
    assert.equal(resposta.status(), 201)
    const pedido = await resposta.json()
    assert.equal(pedido.totalCentavos, total)
    assert.equal(pedido.quantidadeProducao, 0)
  }
  const snapshot = repo.listar()
  await new Promise((r) => api.close(r)); api = null
  repo.fechar(); repo = abrirEncomendas(arquivo)
  assert.deepEqual(repo.listar(), snapshot)
  assert.equal(repo.listarProdutos().find((p) => p.id === 'panetone').aceitaEncomendas, false)
  resultado.passos.push('Pedidos sem bolos aceitos; reabertura do SQLite preserva todas as configurações, itens e preços.')
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
