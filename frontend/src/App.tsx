import { Header } from './components/Header'
import { Hero } from './sections/Hero'

function App() {
  return (
    <>
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <Header />
      <main id="conteudo" tabIndex={-1}>
        <Hero />
        <div className="container placeholders">
          <section className="placeholder" id="cardapio" aria-labelledby="cardapio-title" tabIndex={-1}>
            <h2 id="cardapio-title">Nosso cardápio</h2>
            <p>Este é o destino do botão de cardápio. Os produtos serão apresentados na próxima etapa.</p>
          </section>
          <section className="placeholder" id="encomendas" aria-labelledby="encomendas-title" tabIndex={-1}>
            <h2 id="encomendas-title">Faça sua encomenda</h2>
            <p>Espaço reservado para a próxima etapa. Ainda não é possível enviar ou reservar encomendas.</p>
          </section>
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
