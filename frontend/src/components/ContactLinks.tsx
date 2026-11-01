import { cafeConfig } from '../data/cafeConfig'
import { linkInstagram, linkWhatsApp } from '../utils/contato'

export function ContactLinks({ contato = cafeConfig.contato }: { contato?: typeof cafeConfig.contato }) {
  const { whatsapp, instagram } = contato
  const whatsappUrl = linkWhatsApp(whatsapp)
  const instagramUrl = linkInstagram(instagram)

  return (
    <div className="contact-links" aria-label="Canais de contato">
      {whatsappUrl ? <a className="contact-link" href={whatsappUrl} target="_blank" rel="noopener noreferrer"><span className="social-icon social-whatsapp" aria-hidden="true" />WhatsApp <span className="contact-new-tab">(nova aba)</span></a> : (
        <details className="contact-pending">
          <summary><span className="social-icon social-whatsapp" aria-hidden="true" /><span>WhatsApp <small className="contact-status">Em breve</small></span></summary>
          <p>Este canal ainda não está disponível. Para escolher seus sabores e a data, veja a seção de encomendas.</p>
        </details>
      )}
      {instagramUrl ? <a className="contact-link" href={instagramUrl} target="_blank" rel="noopener noreferrer"><span className="social-icon social-instagram" aria-hidden="true" />Instagram <span className="contact-new-tab">(nova aba)</span></a> : (
        <details className="contact-pending">
          <summary><span className="social-icon social-instagram" aria-hidden="true" /><span>Instagram <small className="contact-status">Em breve</small></span></summary>
          <p>Nosso perfil será disponibilizado aqui quando o canal estiver confirmado.</p>
        </details>
      )}
    </div>
  )
}
