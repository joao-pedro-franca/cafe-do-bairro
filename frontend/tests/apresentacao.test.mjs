import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { readFile, stat } from 'node:fs/promises'
import { createServer } from 'vite'
import { Window } from 'happy-dom'
import { act, createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PRODUTOS } from '../../backend/src/produtos.ts'
import { cafeConfig } from '../src/data/cafeConfig.ts'

const janela = new Window({ url: 'http://127.0.0.1/' })
const globais = { window: janela, document: janela.document, navigator: janela.navigator, HTMLElement: janela.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true }
const descritores = new Map(Object.keys(globais).map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]))
for (const [k, v] of Object.entries(globais)) Object.defineProperty(globalThis, k, { value: v, configurable: true })
const { createRoot } = await import('react-dom/client')
let vite, ContactLinks, ProductPhoto, Hero, InformacoesContato, Footer, Encomendas
before(async () => {
  vite = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true, watch: null }, logLevel: 'silent' })
  ;({ ContactLinks } = await vite.ssrLoadModule('/src/components/ContactLinks.tsx'))
  ;({ ProductPhoto } = await vite.ssrLoadModule('/src/components/ProductPhoto.tsx'))
  ;({ Hero } = await vite.ssrLoadModule('/src/sections/Hero.tsx'))
  ;({ InformacoesContato } = await vite.ssrLoadModule('/src/sections/InformacoesContato.tsx'))
  ;({ Footer } = await vite.ssrLoadModule('/src/components/Footer.tsx'))
  ;({ Encomendas } = await vite.ssrLoadModule('/src/sections/Encomendas.tsx'))
})
after(async () => {
  await vite?.close(); await janela.happyDOM.close()
  for (const [k, d] of descritores) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k] }
})

test('canais sem dados autorizados mostram controles com ícones, sem destinos externos falsos', () => {
  const contato = { whatsapp: { numero: null, confirmado: false, mensagem: '' }, instagram: { url: null, confirmado: false } }
  const html = renderToStaticMarkup(createElement(ContactLinks, { contato }))
  assert(!html.includes('href='))
  assert(!/demo|ilustrativo|XXXXX/.test(html))
  assert.equal((html.match(/<summary>/g) ?? []).length, 2)
  assert(html.includes('social-whatsapp') && html.includes('social-instagram'))
  assert(html.includes('Em breve'))
})
test('canais autorizados geram links seguros e mensagem codificada sem acessar terceiros', () => {
  const contato = { whatsapp: { numero: '+55 (73) 99999-9999', confirmado: true, mensagem: 'Mensagem de teste & café' }, instagram: { url: 'https://www.instagram.com/perfil_de_teste/', confirmado: true } }
  const html = renderToStaticMarkup(createElement(ContactLinks, { contato }))
  const documento = new Window().document
  documento.body.innerHTML = html
  const links = [...documento.querySelectorAll('a')]
  assert.equal(links.length, 2)
  for (const link of links) { assert.equal(link.target, '_blank'); assert.equal(link.rel, 'noopener noreferrer'); assert(link.textContent.includes('nova aba')) }
  assert.equal(new URL(links[0].href).searchParams.get('text'), contato.whatsapp.mensagem)
  assert.equal(links[1].href, contato.instagram.url)
})
test('dados fictícios autorizados são consistentes e contatos reais identificam corretamente a TecnoJr', () => {
  for (const componente of [Hero, InformacoesContato]) {
    const html = renderToStaticMarkup(createElement(componente))
    for (const valor of ['Rua Mariano Gonçalves, 128', 'Bairro das Acácias', 'Vila Aurora – BA', 'Segunda a sábado', '8h às 18h']) assert(html.includes(valor))
  }
  const html = [Hero, InformacoesContato, Footer].map((componente) => renderToStaticMarkup(createElement(componente))).join('')
  assert(!/Rua das Flores|Cidade\/UF|XXXXX|em atualização|Em breve|a definir|· demo/.test(html))
  const documento = new Window().document
  documento.body.innerHTML = html
  for (const grupo of documento.querySelectorAll('.contact-links')) {
    const links = [...grupo.querySelectorAll('a')]
    assert.equal(links.length, 2)
    const whatsapp = new URL(links[0].href)
    assert.equal(whatsapp.origin, 'https://wa.me')
    assert.equal(whatsapp.pathname, '/5573988255560')
    assert.equal(whatsapp.searchParams.get('text'), 'Olá! Gostaria de fazer uma encomenda no Café do Bairro.')
    assert.equal(links[1].href, 'https://www.instagram.com/tecnojr/')
    assert(links[1].textContent.includes('Instagram da TecnoJr'))
    for (const link of links) {
      assert.equal(link.target, '_blank'); assert.equal(link.rel, 'noopener noreferrer')
      assert(link.querySelector('.social-icon[aria-hidden="true"]'))
    }
  }
  assert(html.includes('imagem criada com IA'))
  assert(html.includes('/creditos-imagens.html'))
  assert.equal(cafeConfig.demonstracao, true)
  assert(cafeConfig.avisoEncomendas.includes('não serão preparados'))
  const formulario = renderToStaticMarkup(createElement(Encomendas))
  assert(formulario.includes('aria-describedby="orders-demo orders-disclosure"'))
  assert(formulario.includes('id="orders-disclosure"'))
})
test('horário e endereço autorizados são lidos da configuração compartilhada nos dois locais', async () => {
  const { cafeConfig: config } = await vite.ssrLoadModule('/src/data/cafeConfig.ts')
  const horario = { ...config.horario }, endereco = { ...config.endereco }
  try {
    Object.assign(config.horario, { dias: 'Dias de teste', horas: 'Hora de teste', confirmado: true })
    Object.assign(config.endereco, { rua: 'Endereço controlado', localidade: 'Local de teste', confirmado: true })
    for (const componente of [Hero, InformacoesContato]) {
      const html = renderToStaticMarkup(createElement(componente))
      assert(html.includes('Dias de teste') && html.includes('Hora de teste'))
      assert(html.includes('Endereço controlado') && html.includes('Local de teste'))
      assert(!html.includes('em atualização'))
    }
  } finally { Object.assign(config.horario, horario); Object.assign(config.endereco, endereco) }
})
test('os 11 produtos possuem fotografias locais WebP, versão menor, alt e créditos', async () => {
  const fontes = JSON.parse(await readFile(new URL('../../docs/apresentacao-comercial/fontes-fotografias.json', import.meta.url), 'utf8'))
  assert.equal(fontes.length, 11)
  const pagina = await readFile(new URL('../public/creditos-imagens.html', import.meta.url), 'utf8')
  for (const p of PRODUTOS) {
    assert(p.imagem?.startsWith('/images/produtos/'))
    assert(p.imagemAlt?.length > 20)
    const fonte = fontes.find((f) => f.id === p.id)
    assert(fonte?.autor && fonte.licencaUrl && fonte.pagina && fonte.obtidaEm)
    assert(pagina.includes(fonte.pagina.replaceAll('&', '&amp;')))
    for (const caminho of [p.imagem, p.imagemPequena]) {
      const url = new URL('../public' + caminho, import.meta.url)
      const bytes = await readFile(url)
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF')
      assert.equal(bytes.toString('ascii', 8, 12), 'WEBP')
      assert((await stat(url)).size < 200_000)
    }
  }
})
test('falha de fotografia oferece fallback e novo caminho permite carregar a substituição', async () => {
  const container = document.createElement('div'); document.body.append(container)
  const raiz = createRoot(container)
  try {
    const produto = PRODUTOS[0]
    await act(async () => raiz.render(createElement(ProductPhoto, { produto })))
    const img = container.querySelector('img')
    assert.equal(img.loading, 'lazy'); assert.equal(img.width, 960); assert.equal(img.height, 720)
    assert(img.getAttribute('srcset').includes('480w'))
    await act(async () => img.dispatchEvent(new janela.Event('error')))
    assert(!container.querySelector('img'))
    assert(container.querySelector('[role="img"]').getAttribute('aria-label').includes(produto.nome))
    await act(async () => raiz.render(createElement(ProductPhoto, { produto: { ...produto, imagem: '/images/produtos/substituicao.webp' } })))
    assert(container.querySelector('img'))
  } finally { await act(async () => raiz.unmount()); container.remove() }
})
