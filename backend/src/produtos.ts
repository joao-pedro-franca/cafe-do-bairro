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
  ilustracao: TipoIlustracao
}

export const CATEGORIAS = [
      { id: 'bolos-caseiros', nome: 'Bolos caseiros', descricao: 'Receitas de família para levar um pouquinho de carinho para casa.' },
      { id: 'cafe-acompanhamentos', nome: 'Café e acompanhamentos', descricao: 'Uma pausa gostosa, com café passado na hora e pão de queijo.' },
      { id: 'especial-natal', nome: 'Especial de Natal', descricao: 'Receitas especiais para compartilhar. Confira os meses de retirada em cada produto.' },
    ] satisfies { id: CategoriaId; nome: string; descricao: string }[]

export const PRODUTOS = [
    { id: 'bolo-cenoura', categoria: 'bolos-caseiros', nome: 'Bolo de cenoura', descricao: 'Massa fofinha com cobertura de chocolate.', tamanho: 'Bolo inteiro · 20 cm', preco: PRECOS_CENTAVOS['bolo-cenoura'] / 100, consomeCapacidade: true, exibirNoCardapio: true, encomenda: { tipo: 'principal' }, sazonalidade: null, imagem: null, ilustracao: 'bolo' },
    { id: 'bolo-chocolate', categoria: 'bolos-caseiros', nome: 'Bolo de chocolate', descricao: 'Massa de chocolate com cobertura cremosa.', tamanho: 'Bolo inteiro · 20 cm', preco: PRECOS_CENTAVOS['bolo-chocolate'] / 100, consomeCapacidade: true, exibirNoCardapio: true, encomenda: { tipo: 'principal' }, sazonalidade: null, imagem: null, ilustracao: 'bolo' },
    { id: 'bolo-milho', categoria: 'bolos-caseiros', nome: 'Bolo de milho', descricao: 'Aquele sabor de milho que lembra a cozinha da vó.', tamanho: 'Bolo inteiro · 20 cm', preco: PRECOS_CENTAVOS['bolo-milho'] / 100, consomeCapacidade: true, exibirNoCardapio: true, encomenda: { tipo: 'principal' }, sazonalidade: null, imagem: null, ilustracao: 'bolo' },
    { id: 'bolo-fuba', categoria: 'bolos-caseiros', nome: 'Bolo de fubá', descricao: 'Caseiro e delicado, perfeito para a hora do café.', tamanho: 'Bolo inteiro · 20 cm', preco: PRECOS_CENTAVOS['bolo-fuba'] / 100, consomeCapacidade: true, exibirNoCardapio: true, encomenda: { tipo: 'principal' }, sazonalidade: null, imagem: null, ilustracao: 'bolo' },
    { id: 'bolo-laranja', categoria: 'bolos-caseiros', nome: 'Bolo de laranja', descricao: 'Massa macia com calda de laranja.', tamanho: 'Bolo inteiro · 20 cm', preco: PRECOS_CENTAVOS['bolo-laranja'] / 100, consomeCapacidade: true, exibirNoCardapio: true, encomenda: { tipo: 'principal' }, sazonalidade: null, imagem: null, ilustracao: 'bolo' },
    { id: 'bolo-coco', categoria: 'bolos-caseiros', nome: 'Bolo de coco', descricao: 'Massa fofinha com cobertura de coco ralado.', tamanho: 'Bolo inteiro · 20 cm', preco: PRECOS_CENTAVOS['bolo-coco'] / 100, consomeCapacidade: true, exibirNoCardapio: true, encomenda: { tipo: 'principal' }, sazonalidade: null, imagem: null, ilustracao: 'bolo' },
    { id: 'cafe-coado', categoria: 'cafe-acompanhamentos', nome: 'Café coado', descricao: 'Passado na hora, para uma pausa sem pressa.', tamanho: 'Xícara · 150 ml', preco: PRECOS_CENTAVOS['cafe-coado'] / 100, consomeCapacidade: false, exibirNoCardapio: true, encomenda: { tipo: 'indisponivel' }, sazonalidade: null, imagem: null, ilustracao: 'cafe' },
    { id: 'cafe-leite', categoria: 'cafe-acompanhamentos', nome: 'Café com leite', descricao: 'Café coado e leite quentinho, do jeito de casa.', tamanho: 'Xícara · 200 ml', preco: PRECOS_CENTAVOS['cafe-leite'] / 100, consomeCapacidade: false, exibirNoCardapio: true, encomenda: { tipo: 'indisponivel' }, sazonalidade: null, imagem: null, ilustracao: 'cafe' },
    { id: 'pao-queijo', categoria: 'cafe-acompanhamentos', nome: 'Pão de queijo', descricao: 'Douradinho por fora e macio por dentro.', tamanho: 'Unidade', preco: PRECOS_CENTAVOS['pao-queijo'] / 100, consomeCapacidade: false, exibirNoCardapio: true, encomenda: { tipo: 'acompanhamento', tamanho: 'Dúzia · 12 unidades', preco: CATALOGO.paoDeQueijoCentavos / 100, categoriaPrincipal: 'bolos-caseiros' }, sazonalidade: null, imagem: null, ilustracao: 'pao-queijo' },
    { id: 'panetone', categoria: 'especial-natal', nome: 'Panetone', descricao: 'Receita natalina com frutas para compartilhar.', tamanho: 'Unidade · 500 g', preco: PRECOS_CENTAVOS['panetone'] / 100, consomeCapacidade: true, exibirNoCardapio: true, encomenda: { tipo: 'indisponivel' }, sazonalidade: { meses: [12], descricao: 'Sazonal · dezembro' }, imagem: null, ilustracao: 'panetone' },
    { id: 'bolo-natal', categoria: 'especial-natal', nome: 'Bolo de Natal', descricao: 'Bolo com frutas e especiarias para a mesa de Natal.', tamanho: 'Bolo inteiro · 20 cm', preco: PRECOS_CENTAVOS['bolo-natal'] / 100, consomeCapacidade: true, exibirNoCardapio: true, encomenda: { tipo: 'indisponivel' }, sazonalidade: { meses: [12], descricao: 'Sazonal · dezembro' }, imagem: null, ilustracao: 'bolo' },
  ] satisfies Produto[]

export const produtoPorId = (id: string) => PRODUTOS.find((produto) => produto.id === id)
export const unidadesItens = (itens: readonly { quantidade: number }[]) => itens.reduce((soma, item) => soma + item.quantidade, 0)
export const unidadesProducao = (itens: readonly { produto: string; quantidade: number }[]) => itens.reduce((soma, item) => soma + (produtoPorId(item.produto)?.consomeCapacidade ? item.quantidade : 0), 0)
export const unidadesBolos = (itens: readonly { produto: string; quantidade: number }[]) => itens.reduce((soma, item) => soma + (item.produto.startsWith('bolo-') ? item.quantidade : 0), 0)
export const unidadeEncomenda = (id: string) => { const p = produtoPorId(id); return p?.encomenda.tipo === 'acompanhamento' ? p.encomenda.tamanho : p?.tamanho ?? id }

