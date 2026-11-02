import { CATALOGO, PRECOS_CENTAVOS } from './catalogo.ts'

export type CategoriaId = 'bolos-caseiros' | 'cafe-acompanhamentos' | 'especial-natal'
export type TipoIlustracao = 'bolo' | 'cafe' | 'pao-queijo' | 'panetone'

export type DisponibilidadeEncomenda =
  | { tipo: 'principal' }
  | { tipo: 'indisponivel' }
  | { tipo: 'acompanhamento'; tamanho: string; preco: number; categoriaPrincipal: CategoriaId }

export interface Produto {
  id: string
  categoria: CategoriaId
  nome: string
  descricao: string
  tamanho: string
  preco: number
  consomeCapacidade: boolean
  exibirNoCardapio: boolean
  encomenda: DisponibilidadeEncomenda
  sazonalidade: { meses: number[]; descricao: string } | null
  imagem: string | null
  imagemPequena?: string | null
  imagemAlt?: string
  ilustracao: TipoIlustracao
}

export const CATEGORIAS = [
      { id: 'bolos-caseiros', nome: 'Bolos caseiros', descricao: 'Receitas de família para levar um pouquinho de carinho para casa.' },
      { id: 'cafe-acompanhamentos', nome: 'Café e acompanhamentos', descricao: 'Uma pausa gostosa, com café passado na hora e pão de queijo.' },
      { id: 'especial-natal', nome: 'Especial de Natal', descricao: 'Receitas especiais para compartilhar. Confira os meses de retirada em cada produto.' },
    ] satisfies { id: CategoriaId; nome: string; descricao: string }[]

export const PRODUTOS = [
    { id: 'bolo-cenoura', categoria: 'bolos-caseiros', nome: 'Bolo de cenoura', descricao: 'Massa fofinha com cobertura de chocolate.', tamanho: 'Bolo inteiro · 20 cm', preco: PRECOS_CENTAVOS['bolo-cenoura'] / 100, consomeCapacidade: true, exibirNoCardapio: true, encomenda: { tipo: 'principal' }, sazonalidade: null, imagem: "/images/produtos/bolo-cenoura.webp", imagemPequena: "/images/produtos/bolo-cenoura-480.webp", imagemAlt: "Bolo de cenoura com cobertura de chocolate e uma fatia cortada.", ilustracao: 'bolo' },
    { id: 'bolo-chocolate', categoria: 'bolos-caseiros', nome: 'Bolo de chocolate', descricao: 'Massa de chocolate com cobertura cremosa.', tamanho: 'Bolo inteiro · 20 cm', preco: PRECOS_CENTAVOS['bolo-chocolate'] / 100, consomeCapacidade: true, exibirNoCardapio: true, encomenda: { tipo: 'principal' }, sazonalidade: null, imagem: "/images/produtos/bolo-chocolate.webp", imagemPequena: "/images/produtos/bolo-chocolate-480.webp", imagemAlt: "Bolo de chocolate com cobertura cremosa e uma fatia à frente.", ilustracao: 'bolo' },
    { id: 'bolo-milho', categoria: 'bolos-caseiros', nome: 'Bolo de milho', descricao: 'Aquele sabor de milho que lembra a cozinha da vó.', tamanho: 'Bolo inteiro · 20 cm', preco: PRECOS_CENTAVOS['bolo-milho'] / 100, consomeCapacidade: true, exibirNoCardapio: true, encomenda: { tipo: 'principal' }, sazonalidade: null, imagem: "/images/produtos/bolo-milho.webp", imagemPequena: "/images/produtos/bolo-milho-480.webp", imagemAlt: "Fatia de bolo de milho dourado em um prato.", ilustracao: 'bolo' },
    { id: 'bolo-fuba', categoria: 'bolos-caseiros', nome: 'Bolo de fubá', descricao: 'Caseiro e delicado, perfeito para a hora do café.', tamanho: 'Bolo inteiro · 20 cm', preco: PRECOS_CENTAVOS['bolo-fuba'] / 100, consomeCapacidade: true, exibirNoCardapio: true, encomenda: { tipo: 'principal' }, sazonalidade: null, imagem: "/images/produtos/bolo-fuba.webp", imagemPequena: "/images/produtos/bolo-fuba-480.webp", imagemAlt: "Bolo de fubá redondo sobre uma mesa de madeira.", ilustracao: 'bolo' },
    { id: 'bolo-laranja', categoria: 'bolos-caseiros', nome: 'Bolo de laranja', descricao: 'Massa macia com calda de laranja.', tamanho: 'Bolo inteiro · 20 cm', preco: PRECOS_CENTAVOS['bolo-laranja'] / 100, consomeCapacidade: true, exibirNoCardapio: true, encomenda: { tipo: 'principal' }, sazonalidade: null, imagem: "/images/produtos/bolo-laranja.webp", imagemPequena: "/images/produtos/bolo-laranja-480.webp", imagemAlt: "Bolo de laranja em formato de anel, com cobertura clara e uma fatia cortada.", ilustracao: 'bolo' },
    { id: 'bolo-coco', categoria: 'bolos-caseiros', nome: 'Bolo de coco', descricao: 'Massa fofinha com cobertura de coco ralado.', tamanho: 'Bolo inteiro · 20 cm', preco: PRECOS_CENTAVOS['bolo-coco'] / 100, consomeCapacidade: true, exibirNoCardapio: true, encomenda: { tipo: 'principal' }, sazonalidade: null, imagem: "/images/produtos/bolo-coco.webp", imagemPequena: "/images/produtos/bolo-coco-480.webp", imagemAlt: "Fatia de bolo de coco em prato escuro, com o restante do bolo ao fundo.", ilustracao: 'bolo' },
    { id: 'cafe-coado', categoria: 'cafe-acompanhamentos', nome: 'Café coado', descricao: 'Passado na hora, para uma pausa sem pressa.', tamanho: 'Xícara · 150 ml', preco: PRECOS_CENTAVOS['cafe-coado'] / 100, consomeCapacidade: false, exibirNoCardapio: true, encomenda: { tipo: 'indisponivel' }, sazonalidade: null, imagem: "/images/produtos/cafe-coado.webp", imagemPequena: "/images/produtos/cafe-coado-480.webp", imagemAlt: "Café preto em xícara com pires sobre uma mesa de madeira.", ilustracao: 'cafe' },
    { id: 'cafe-leite', categoria: 'cafe-acompanhamentos', nome: 'Café com leite', descricao: 'Café coado e leite quentinho, do jeito de casa.', tamanho: 'Xícara · 200 ml', preco: PRECOS_CENTAVOS['cafe-leite'] / 100, consomeCapacidade: false, exibirNoCardapio: true, encomenda: { tipo: 'indisponivel' }, sazonalidade: null, imagem: "/images/produtos/cafe-leite.webp", imagemPequena: "/images/produtos/cafe-leite-480.webp", imagemAlt: "Café com leite em xícara branca sobre um pires.", ilustracao: 'cafe' },
    { id: 'pao-queijo', categoria: 'cafe-acompanhamentos', nome: 'Pão de queijo', descricao: 'Douradinho por fora e macio por dentro.', tamanho: 'Unidade', preco: PRECOS_CENTAVOS['pao-queijo'] / 100, consomeCapacidade: false, exibirNoCardapio: true, encomenda: { tipo: 'acompanhamento', tamanho: 'Dúzia · 12 unidades', preco: CATALOGO.paoDeQueijoCentavos / 100, categoriaPrincipal: 'bolos-caseiros' }, sazonalidade: null, imagem: "/images/produtos/pao-queijo.webp", imagemPequena: "/images/produtos/pao-queijo-480.webp", imagemAlt: "Pães de queijo dourados em uma travessa sobre a mesa.", ilustracao: 'pao-queijo' },
    { id: 'panetone', categoria: 'especial-natal', nome: 'Panetone', descricao: 'Receita natalina com frutas para compartilhar.', tamanho: 'Unidade · 500 g', preco: PRECOS_CENTAVOS['panetone'] / 100, consomeCapacidade: true, exibirNoCardapio: true, encomenda: { tipo: 'indisponivel' }, sazonalidade: { meses: [12], descricao: 'Sazonal · dezembro' }, imagem: "/images/produtos/panetone.webp", imagemPequena: "/images/produtos/panetone-480.webp", imagemAlt: "Panetone com uma fatia cortada, mostrando a massa com frutas.", ilustracao: 'panetone' },
    { id: 'bolo-natal', categoria: 'especial-natal', nome: 'Bolo de Natal', descricao: 'Bolo com frutas e especiarias para a mesa de Natal.', tamanho: 'Bolo inteiro · 20 cm', preco: PRECOS_CENTAVOS['bolo-natal'] / 100, consomeCapacidade: true, exibirNoCardapio: true, encomenda: { tipo: 'indisponivel' }, sazonalidade: { meses: [12], descricao: 'Sazonal · dezembro' }, imagem: "/images/produtos/bolo-natal.webp", imagemPequena: "/images/produtos/bolo-natal-480.webp", imagemAlt: "Bolo de frutas com frutas cristalizadas e fatias sobre uma tábua.", ilustracao: 'bolo' },
  ] satisfies Produto[]

export const produtoPorId = (id: string) => PRODUTOS.find((produto) => produto.id === id)
export const produtoEncomendavel = (id: string) => produtoPorId(id)?.categoria === 'bolos-caseiros' || id === 'bolo-natal' || id === 'panetone'
export function erroComposicao(itens: readonly { produto: string; quantidade: number }[], incluirPaoDeQueijo: boolean) {
  if (itens.some((item) => !produtoEncomendavel(item.produto))) return 'Escolha somente bolos ou panetone como produtos. Pão de queijo é exclusivo do acompanhamento; cafés não aceitam encomendas.'
  if (incluirPaoDeQueijo && unidadesBolos(itens) < 1) return 'O acompanhamento de pão de queijo exige pelo menos um bolo no pedido, inclusive bolo de Natal.'
}
export const unidadesItens = (itens: readonly { quantidade: number }[]) => itens.reduce((soma, item) => soma + item.quantidade, 0)
export const unidadesProducao = (itens: readonly { produto: string; quantidade: number }[]) => itens.reduce((soma, item) => soma + (produtoPorId(item.produto)?.consomeCapacidade ? item.quantidade : 0), 0)
export const unidadesBolos = (itens: readonly { produto: string; quantidade: number }[]) => itens.reduce((soma, item) => soma + (produtoPorId(item.produto)?.categoria === 'bolos-caseiros' || item.produto === 'bolo-natal' ? item.quantidade : 0), 0)
export const unidadeEncomenda = (id: string) => { const p = produtoPorId(id); return p?.encomenda.tipo === 'acompanhamento' ? p.encomenda.tamanho : p?.tamanho ?? id }

