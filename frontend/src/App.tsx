import { Header } from './components/Header'
import { Hero } from './sections/Hero'
import { Cardapio } from './sections/Cardapio'
import { Encomendas } from './sections/Encomendas'
import { InformacoesContato } from './sections/InformacoesContato'
import { Footer } from './components/Footer'
import { AdminNotice } from './components/AdminNotice'

function App() {
  if (window.location.pathname.replace(/\/$/, '') === '/admin') return <AdminNotice />
  return (
    <>
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <Header />
      <main id="conteudo" tabIndex={-1}>
        <Hero />
        <Cardapio />
        <Encomendas />
        <InformacoesContato />
      </main>
      <Footer />
    </>
  )
}

export default App
