interface WhatsAppConfig {
  numero: string | null
  confirmado: boolean
  mensagem: string
}

export function linkWhatsApp(contato: WhatsAppConfig) {
  if (!contato.confirmado || !contato.numero || !/^\+?[\d\s().-]+$/.test(contato.numero)) return null
  const numero = contato.numero.replace(/\D/g, '')
  // Exige DDI 55, DDD e um telefone brasileiro antes de formar o destino externo.
  if (!/^55[1-9]{2}(?:[2-5]\d{7}|9\d{8})$/.test(numero)) return null
  return `https://wa.me/${numero}?text=${encodeURIComponent(contato.mensagem)}`
}

export function linkInstagram(contato: { url: string | null; confirmado: boolean }) {
  if (!contato.confirmado || !contato.url) return null
  try {
    const url = new URL(contato.url)
    if (url.protocol !== 'https:' || !['instagram.com', 'www.instagram.com'].includes(url.hostname)
      || url.username || url.password || url.port || url.search || url.hash || !/^\/[a-zA-Z0-9._]+\/?$/.test(url.pathname)
      || ['accounts', 'explore', 'direct', 'p', 'reel', 'reels', 'stories', 'oauth', 'challenge'].includes(url.pathname.replaceAll('/', '').toLowerCase())) return null
    return url.href
  } catch { return null }
}
