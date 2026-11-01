import { ProductIllustration } from '../components/ProductIllustration'
import { cafeConfig } from '../data/cafeConfig'
import type { Produto } from '../data/cafeConfig'
import '../styles/cardapio.css'
import { useProdutos } from '../hooks/useProdutos'
import { MESES } from '../services/produtos'
import type { ProdutoDisponivel } from '../services/produtos'

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function Disponibilidade({ produto, config }: { produto: Produto; config?: ProdutoDisponivel }) {
  if (!config) return <p className="product-availability">Consulte a disponibilidade no formulário de encomenda.</p>
  return <p className="product-availability">{config.aceitaEncomendas ? `Aceita encomenda · retirada ${config.mesesPermitidos.length ? 'em ' + config.mesesPermitidos.map((m) => MESES[m - 1]).join(', ') : 'o ano todo'}.` : 'Não aceita encomendas no momento.'}{config.aceitaEncomendas && produto.encomenda.tipo === 'acompanhamento' && ` Para encomenda: ${config.unidade}, ${moeda.format(config.precoCentavos / 100)}.`}</p>
}

export function Cardapio() {
  const { cardapio, produtos } = cafeConfig
  const disponibilidade = useProdutos()

  return (
    <section className="menu-section" id="cardapio" aria-labelledby="cardapio-title" tabIndex={-1}>
      <div className="container">
        <header className="menu-heading">
          <h2 id="cardapio-title">{cardapio.titulo} <span aria-hidden="true">♡</span></h2>
          <p>{cardapio.subtitulo}</p>
          <p className="menu-demo-note">{cardapio.aviso}</p>
          <p className="handwritten-note">Um pedacinho de carinho<br />em cada receita <span aria-hidden="true">♡</span></p>
        </header>
        {disponibilidade.falhou && <p className="menu-demo-note" role="status">Não conseguimos atualizar a disponibilidade. <button type="button" className="button" onClick={disponibilidade.atualizar}>Consultar cardápio novamente</button></p>}
        {cardapio.categorias.map((categoria) => (
          <section className="menu-category" key={categoria.id} aria-labelledby={`categoria-${categoria.id}`}>
            <header className="category-heading">
              <h3 id={`categoria-${categoria.id}`}>{categoria.nome}</h3>
              <p>{categoria.descricao}</p>
            </header>
            <ul className="product-grid">
              {produtos.filter((produto) => produto.categoria === categoria.id && produto.exibirNoCardapio).map((produto) => (
                <li key={produto.id}>
                  <article className="product-card" aria-labelledby={`produto-${produto.id}`}>
                    <div className="product-image">
                      {produto.imagem ? <img src={produto.imagem} alt={produto.nome} width="320" height="180" loading="lazy" /> : <ProductIllustration tipo={produto.ilustracao} />}
                    </div>
                    <div className="product-content">
                      {produto.sazonalidade && <p className="seasonal-label">Receita natalina</p>}
                      <h4 id={`produto-${produto.id}`}>{produto.nome}</h4>
                      <p className="product-description">{produto.descricao}</p>
                      <p className="product-size">{produto.tamanho}</p>
                      <p className="product-price">{moeda.format(produto.preco)}</p>
                      <Disponibilidade produto={produto} config={disponibilidade.produtos.find((p) => p.id === produto.id)} />
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <div className="menu-order-action">
          <a className="button button-primary" href="#encomendas">Faça sua encomenda <span aria-hidden="true">↓</span></a>
          <p className="demo-note">Confira as regras e escolha a data da sua encomenda.</p>
        </div>
      </div>
      <div className="gingham" aria-hidden="true" />
    </section>
  )
}
