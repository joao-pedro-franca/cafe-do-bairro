import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { mkdir, mkdtemp, rm, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { once } from 'node:events'
import { criarApp } from '../backend/src/app.ts'
import { abrirEncomendas } from '../backend/src/database/encomendas.ts'
import { dataMinima } from '../backend/src/encomenda.ts'

const audit = createRequire(new URL('../.audit-tools/package.json', import.meta.url))
const front = createRequire(new URL('../frontend/package.json', import.meta.url))
const { default: playwright } = await import(pathToFileURL(audit.resolve('playwright')).href)
const { AxeBuilder } = await import(pathToFileURL(audit.resolve('@axe-core/playwright')).href)
const { createServer } = await import(pathToFileURL(front.resolve('vite')).href)
const saidaPersonalizada = process.argv.find((arg) => arg.startsWith('--saida='))?.slice('--saida='.length)
const saida = saidaPersonalizada ? resolve(saidaPersonalizada) : fileURLToPath(new URL(process.argv.includes('--contatos') ? '../docs/apresentacao-comercial/contatos-autorizados/' : '../docs/apresentacao-comercial/', import.meta.url))
await mkdir(saida, { recursive: true })
const temporaria = await mkdtemp(join(tmpdir(), 'cafe-comercial-'))
const repo = abrirEncomendas(join(temporaria, 'auditoria.sqlite'))
let api, vite, browser
const resultado = { larguras: [], fotografias: [], acessibilidade: [], passos: [], errosPagina: [], contatosInterceptados: [], falhasEsperadas: [] }
async function capturar(page, nome, seletor) {
  if (process.argv.includes('--sem-capturas')) return
  const opcoes = { path: join(saida, nome + '.jpg'), type: 'jpeg', quality: 85, animations: 'disabled' }
  if (seletor) await page.locator(seletor).screenshot(opcoes)
  else await page.screenshot({ ...opcoes, fullPage: true })
}
async function axe(page, estado) {
  const analise = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  resultado.acessibilidade.push({ estado, violacoes: analise.violations.map((v) => ({ id: v.id, elementos: v.nodes.map((n) => n.target) })) })
  assert.equal(analise.violations.length, 0, JSON.stringify(resultado.acessibilidade.at(-1)))
}
try {
  api = criarApp(repo).listen(0, '127.0.0.1')
  await once(api, 'listening')
  vite = await createServer({ root: fileURLToPath(new URL('../frontend', import.meta.url)), server: { host: '127.0.0.1', port: 0, hmr: false, watch: null, proxy: { '/api': { target: `http://127.0.0.1:${api.address().port}` } } }, logLevel: 'silent' })
  await vite.listen()
  const base = `http://127.0.0.1:${vite.httpServer.address().port}`
  browser = await playwright.chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) })
  const contexto = await browser.newContext()
  const page = await contexto.newPage()
  page.on('pageerror', (e) => resultado.errosPagina.push(e.message))
  for (const largura of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width: largura, height: 900 })
    await page.goto(base)
    const fotos = page.locator('.product-image img')
    await fotos.first().waitFor()
    assert.equal(await fotos.count(), 11)
    // Carrega explicitamente todos os itens lazy antes da inspeção da landing completa.
    for (const foto of await fotos.all()) {
      await foto.scrollIntoViewIfNeeded()
      await foto.evaluate((img) => img.decode())
    }
    const imagens = await fotos.evaluateAll((lista) => lista.map((img) => ({ src: img.currentSrc, alt: img.alt, largura: img.naturalWidth, altura: img.naturalHeight, loading: img.loading })))
    // naturalWidth com srcset é corrigido pela densidade escolhida pelo navegador.
    assert(imagens.every((i) => i.src.startsWith(base + '/images/produtos/') && i.alt.length > 20 && i.largura > 0 && i.altura > 0 && Math.abs(i.largura / i.altura - 4 / 3) < .02 && i.loading === 'lazy'), JSON.stringify(imagens))
    resultado.fotografias.push({ largura, carregadas: imagens.length, imagens })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), largura)
    assert(await page.locator('.product-price').evaluateAll((precos) => precos.every((el) => el.scrollWidth <= el.clientWidth + 1)))
    const textoComercial = await page.locator('.hero, #cardapio, #contato, .site-footer').allTextContents()
    assert(!/protótipo|demonstração|dados fictícios|provisóri|XXXXX|Rua das Flores|Cidade\/UF|· demo/i.test(textoComercial.join(' ')))
    assert.equal(await page.locator('.contact-links a').count(), 6)
    assert.equal(await page.locator('.contact-pending').count(), 0)
    for (const secao of ['.hero', '#contato']) {
      const texto = await page.locator(secao).textContent()
      for (const valor of ['Rua Mariano Gonçalves, 128', 'Bairro das Acácias', 'Vila Aurora – BA', 'Segunda a sábado', '8h às 18h']) assert(texto.includes(valor))
    }
    assert(!/em atualização|a definir|em breve/i.test(textoComercial.join(' ')))
    for (const grupo of await page.locator('.contact-links').all()) {
      const links = grupo.locator('a')
      const whats = new URL(await links.nth(0).getAttribute('href'))
      assert.equal(whats.origin, 'https://wa.me')
      assert.equal(whats.pathname, '/5573988255560')
      assert.equal(whats.searchParams.get('text'), 'Olá! Gostaria de fazer uma encomenda no Café do Bairro.')
      assert.equal(await links.nth(1).getAttribute('href'), 'https://www.instagram.com/tecnojr/')
      for (const [indice, link] of (await links.all()).entries()) {
        const rotulo = ['WhatsApp', 'Instagram'][indice]
        assert.equal(await link.innerText(), rotulo)
        assert.equal(await link.getAttribute('aria-label'), `${rotulo} (abre em nova aba)`)
        assert.equal(await link.locator('.contact-new-tab').count(), 0)
        assert.equal(await link.getAttribute('target'), '_blank')
        assert.equal(await link.getAttribute('rel'), 'noopener noreferrer')
        assert(await link.locator('.social-icon').evaluate((el) => getComputedStyle(el).maskImage.includes('/images/icons/') && el.getBoundingClientRect().width >= 22))
        assert((await link.boundingBox()).height >= 44)
      }
    }
    assert(await page.locator('.hero-figure figcaption').textContent().then((t) => t.includes('criada com IA')))
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
    await capturar(page, `landing-${largura}`)
    await capturar(page, `cardapio-${largura}`, '#cardapio')
    await axe(page, `landing-${largura}`)
    resultado.larguras.push({ largura, paginaSemTransbordamento: true, precosSemCorte: true })
    // Teclado: canais habilitados, âncora e formulário; sem abrir contas externas.
    await page.locator('.hero .contact-link').first().focus()
    await page.keyboard.press('Tab')
    assert.equal(await page.locator(':focus').innerText(), 'Instagram')
    assert.equal(await page.locator(':focus').getAttribute('aria-label'), 'Instagram (abre em nova aba)')
    await page.locator('.hero-actions a[href="#encomendas"]').focus()
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.activeElement?.id === 'encomendas')
    await page.getByRole('button', { name: 'Quero encomendar', exact: true }).click()
    await page.getByLabel('Data desejada').fill(dataMinima(new Date()))
    await page.getByLabel('Produto 1', { exact: true }).selectOption('bolo-cenoura')
    assert(await page.locator('.order-disclosure').isVisible())
    assert((await page.locator('.order-disclosure').textContent()).includes('não serão preparados'))
    await capturar(page, `formulario-${largura}`, '.order-form')
    await axe(page, `formulario-${largura}`)
  }
  resultado.passos.push('Onze fotografias locais decodificadas, preços legíveis, hero identificado e teclado nas quatro larguras.')
  await page.goto(base)
  // O evento load pode anteceder o primeiro commit do createRoot do React.
  // Esperar o link existir não move o foco nem substitui a navegação por teclado.
  await page.locator('.skip-link').waitFor({ state: 'visible' })
  assert(await page.evaluate(() => document.activeElement === document.body))
  await page.keyboard.press('Tab')
  assert.equal(await page.locator(':focus').textContent(), 'Pular para o conteúdo')
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => document.activeElement?.id === 'conteudo')
  assert.equal(await page.locator(':focus').getAttribute('id'), 'conteudo')
  resultado.passos.push('Após recarregar e montar a landing, o primeiro Tab alcança o link de pular conteúdo e Enter foca o main, sem foco programático no teste.')

  // Exercita os contatos autorizados sem alcançar as contas: interceptação antes da rede.
  await contexto.route('https://wa.me/**', async (route) => { resultado.contatosInterceptados.push(route.request().url()); await route.fulfill({ contentType: 'text/html', body: '<title>Destino de teste interceptado</title>' }) })
  await contexto.route('https://www.instagram.com/**', async (route) => { resultado.contatosInterceptados.push(route.request().url()); await route.fulfill({ contentType: 'text/html', body: '<title>Destino de teste interceptado</title>' }) })
  await page.setViewportSize({ width: 390, height: 844 })
  // Exercita os controles publicados, sem injetar outra instância do componente.
  for (const link of await page.locator('#contato .contact-links a').all()) {
    assert.equal(await link.getAttribute('target'), '_blank')
    assert.equal(await link.getAttribute('rel'), 'noopener noreferrer')
    const popupPromise = contexto.waitForEvent('page')
    await link.focus(); await page.keyboard.press('Enter')
    const popup = await popupPromise
    await popup.waitForLoadState()
    assert.equal(await popup.title(), 'Destino de teste interceptado')
    await popup.close()
  }
  assert.equal(resultado.contatosInterceptados.length, 2)
  const whatsapp = new URL(resultado.contatosInterceptados[0])
  assert.equal(whatsapp.pathname, '/5573988255560')
  assert.equal(whatsapp.searchParams.get('text'), 'Olá! Gostaria de fazer uma encomenda no Café do Bairro.')
  assert.equal(resultado.contatosInterceptados[1], 'https://www.instagram.com/tecnojr/')
  await capturar(page, 'contatos-autorizados-teste-390', '#contato .contact-links')
  await axe(page, 'contatos-autorizados-teste-390')
  resultado.passos.push('WhatsApp/Instagram autorizados com SVG, nova aba, rel seguro e destinos interceptados; nenhuma conta externa acessada.')

  await page.goto(base + '/creditos-imagens.html')
  assert.equal(await page.locator('li').count(), 11)
  await capturar(page, 'creditos-390')
  await axe(page, 'creditos-390')
  resultado.passos.push('Créditos públicos dos onze produtos com fontes, autores, licenças e alterações.')

  await page.route('**/images/produtos/bolo-cenoura*.webp', async (route) => { resultado.falhasEsperadas.push(route.request().url()); await route.abort() })
  await page.goto(base)
  await page.locator('.product-photo-fallback').waitFor()
  assert.equal(await page.locator('.product-photo-fallback img').count(), 0)
  assert((await page.locator('.product-photo-fallback').getAttribute('aria-label')).includes('Bolo de cenoura'))
  await capturar(page, 'fallback-foto-390', '.product-card[aria-labelledby="produto-bolo-cenoura"]')
  await axe(page, 'fallback-foto-390')
  resultado.passos.push('Falha de arquivo apresenta fallback acessível, sem ícone de imagem quebrada.')
  assert.equal(resultado.errosPagina.length, 0)
} finally {
  await browser?.close(); await vite?.close()
  if (api) await new Promise((r) => api.close(r))
  repo.fechar()
  assert(temporaria.startsWith(join(tmpdir(), 'cafe-comercial-')))
  await rm(temporaria, { recursive: true, force: true })
  await writeFile(join(saida, 'resultado.json'), JSON.stringify(resultado, null, 2) + '\n')
}
const fontes = JSON.parse(await readFile(new URL('../docs/apresentacao-comercial/fontes-fotografias.json', import.meta.url), 'utf8'))
console.log(JSON.stringify({ larguras: resultado.larguras.length, fotos: fontes.length, bytesPrincipais: fontes.reduce((s,f) => s + f.bytesWebp,0), axe: resultado.acessibilidade.length, errosPagina: resultado.errosPagina.length }))
