import { cafeConfig } from '../data/cafeConfig'
import { CupIcon } from './CupIcon'
import '../styles/contato.css'

export function AdminNotice() {
  return (
    <main className="container admin-notice">
      <a className="brand" href="/"><CupIcon /><span>{cafeConfig.nome}</span></a>
      <p className="eyebrow">Um espaço que ainda estamos preparando</p>
      <h1>Área administrativa em breve</h1>
      <p>Esta área ainda não está disponível. Por enquanto, te esperamos na página do café.</p>
      <a className="button button-primary" href="/">Voltar para o café</a>
    </main>
  )
}
