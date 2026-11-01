import { cafeConfig } from '../data/cafeConfig'
import { linkInstagram, linkWhatsApp } from '../utils/contato'

type CanaisContato = {
  whatsapp: Parameters<typeof linkWhatsApp>[0]
  instagram: Parameters<typeof linkInstagram>[0] & { rotulo?: string }
}

export function ContactLinks({ contato = cafeConfig.contato }: { contato?: CanaisContato }) {
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
      {instagramUrl ? <a className="contact-link" href={instagramUrl} target="_blank" rel="noopener noreferrer"><span className="social-icon social-instagram" aria-hidden="true" />{instagram.rotulo ?? 'Instagram'} <span className="contact-new-tab">(nova aba)</span></a> : (
        <details className="contact-pending">
          <summary><span className="social-icon social-instagram" aria-hidden="true" /><span>{instagram.rotulo ?? 'Instagram'} <small className="contact-status">Em breve</small></span></summary>
          <p>O link deste perfil será disponibilizado quando o canal estiver confirmado.</p>
        </details>
      )}
    </div>
  )
}
