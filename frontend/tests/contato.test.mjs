import assert from 'node:assert/strict'
import test from 'node:test'
import { linkInstagram, linkWhatsApp } from '../src/utils/contato.ts'

const whatsapp = { numero: null, confirmado: false, mensagem: 'Olá! Quero um café & um bolo.' }

test('WhatsApp fictício, sem autorização ou com número inválido não gera destino externo', () => {
  assert.equal(linkWhatsApp(whatsapp), null)
  assert.equal(linkWhatsApp({ ...whatsapp, numero: '5573999999999' }), null)
  for (const numero of [null, '', '(XX) XXXXX-XXXX', '123', '73999999999', 'abc5573999999999']) {
    assert.equal(linkWhatsApp({ ...whatsapp, numero, confirmado: true }), null)
  }
})

test('WhatsApp autorizado normaliza DDI/DDD e codifica a mensagem sem enviar requisição', () => {
  const link = linkWhatsApp({ ...whatsapp, numero: '+55 (73) 99999-9999', confirmado: true })
  const url = new URL(link)
  assert.equal(url.origin, 'https://wa.me')
  assert.equal(url.pathname, '/5573999999999')
  assert.equal(url.searchParams.get('text'), whatsapp.mensagem)
})

test('Instagram não confirmado, inválido ou fora do domínio oficial não gera link', () => {
  assert.equal(linkInstagram({ url: 'https://www.instagram.com/perfil_de_teste/', confirmado: false }), null)
  for (const url of [null, '', 'javascript:alert(1)', 'http://instagram.com/perfil/', 'https://instagram.com.exemplo.org/perfil/', 'https://usuario:senha@instagram.com/perfil/', 'https://instagram.com/']) {
    assert.equal(linkInstagram({ url, confirmado: true }), null)
  }
})

test('Instagram com perfil HTTPS confirmado gera somente o link configurado', () => {
  const url = 'https://www.instagram.com/perfil_de_teste/'
  assert.equal(linkInstagram({ url, confirmado: true }), url)
})
