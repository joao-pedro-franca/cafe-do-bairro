import { useState } from 'react'
import type { Produto } from '../data/cafeConfig'
import { ProductIllustration } from './ProductIllustration'

export function ProductPhoto({ produto }: { produto: Produto }) {
  const [falhou, setFalhou] = useState<string | null>(null)
  if (!produto.imagem || falhou === produto.imagem) return <div className="product-photo-fallback" role="img" aria-label={`Fotografia de ${produto.nome} indisponível; representação desenhada do produto.`}>
    <ProductIllustration tipo={produto.ilustracao} />
    <span>Foto em atualização</span>
  </div>
  return <img src={produto.imagem} srcSet={produto.imagemPequena ? `${produto.imagemPequena} 480w, ${produto.imagem} 960w` : undefined}
    sizes="(min-width: 1000px) 360px, (min-width: 600px) 45vw, 90vw" alt={produto.imagemAlt ?? produto.nome}
    width="960" height="720" loading="lazy" decoding="async" onError={() => setFalhou(produto.imagem)} />
}
