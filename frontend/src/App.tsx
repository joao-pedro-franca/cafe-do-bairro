import { Header } from './components/Header'
import { Hero } from './sections/Hero'
import { Cardapio } from './sections/Cardapio'
import { Encomendas } from './sections/Encomendas'

function App() {
  return (
    <>
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <Header />
      <main id="conteudo" tabIndex={-1}>
        <Hero />
        <Cardapio />
        <Encomendas />
        <div className="container placeholders">
          <section className="placeholder" id="contato" aria-labelledby="contato-title" tabIndex={-1}>
            <h2 id="contato-title">Informações e contato</h2>
            <p>Os acessos de demonstração estão no início da página. Esta área será construída em uma etapa futura.</p>
          </section>
        </div>
      </main>
    </>
  )
}

export default App
