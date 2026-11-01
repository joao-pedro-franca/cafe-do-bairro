import { useEffect } from 'react'
import { ativarRolagemSuave } from './utils/rolagem'
import { Header } from './components/Header'
import { Hero } from './sections/Hero'
import { Cardapio } from './sections/Cardapio'
import { Encomendas } from './sections/Encomendas'
import { InformacoesContato } from './sections/InformacoesContato'
import { Footer } from './components/Footer'
import { Admin } from './pages/Admin'

function App() {
  useEffect(ativarRolagemSuave, [])
  if (window.location.pathname.replace(/\/$/, '') === '/admin') return <Admin />
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
