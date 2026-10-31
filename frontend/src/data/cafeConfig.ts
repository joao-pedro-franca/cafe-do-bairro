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
  exibirNoCardapio: boolean
  encomenda: DisponibilidadeEncomenda
  sazonalidade: { meses: number[]; descricao: string } | null
  imagem: string | null
  ilustracao: TipoIlustracao
}

export const cafeConfig = {
  nome: 'Café do Bairro',
  apresentacao: 'Bolos caseiros, café fresquinho e aquele gostinho de casa de vó.',
  convite: 'Entre, puxe uma cadeira. O café já está passando.',
  horario: { dias: 'Segunda a sábado', horas: '8h às 18h' },
  endereco: { rua: 'Rua das Flores, 123', localidade: 'Bairro Jardim · Cidade/UF' },
  fusoHorario: 'America/Bahia',
  contato: {
    whatsapp: { exibicao: '(XX) XXXXX-XXXX', numero: null as string | null, confirmado: false, mensagem: 'Olá! Gostaria de fazer uma encomenda no Café do Bairro.' },
    instagram: { exibicao: 'Perfil ilustrativo', url: null as string | null, confirmado: false },
  },
  hero: {
    imagem: '/images/cafe-caseiro.svg',
    descricaoImagem: 'Ilustração de um bolo com cobertura de chocolate e uma xícara de café sobre a mesa.',
    legenda: 'Ilustração provisória · uma foto da nossa mesa vem depois',
  },
  cardapio: {
    titulo: 'Nosso cardápio',
    subtitulo: 'Receitas simples, feitas com muito carinho.',
    aviso: 'Preços, tamanhos e produtos fictícios para demonstração. As ilustrações são provisórias.',
    categorias: [
      { id: 'bolos-caseiros', nome: 'Bolos caseiros', descricao: 'Receitas de família para levar um pouquinho de carinho para casa.' },
      { id: 'cafe-acompanhamentos', nome: 'Café e acompanhamentos', descricao: 'Uma pausa gostosa, com café passado na hora e pão de queijo.' },
      { id: 'especial-natal', nome: 'Especial de Natal', descricao: 'Sabores de dezembro. A disponibilidade para encomenda ainda será confirmada.' },
    ] satisfies { id: CategoriaId; nome: string; descricao: string }[],
  },
  produtos: [
    { id: 'bolo-cenoura', categoria: 'bolos-caseiros', nome: 'Bolo de cenoura', descricao: 'Massa fofinha com cobertura de chocolate.', tamanho: 'Bolo inteiro · 20 cm', preco: 35, exibirNoCardapio: true, encomenda: { tipo: 'principal' }, sazonalidade: null, imagem: null, ilustracao: 'bolo' },
    { id: 'bolo-chocolate', categoria: 'bolos-caseiros', nome: 'Bolo de chocolate', descricao: 'Massa de chocolate com cobertura cremosa.', tamanho: 'Bolo inteiro · 20 cm', preco: 40, exibirNoCardapio: true, encomenda: { tipo: 'principal' }, sazonalidade: null, imagem: null, ilustracao: 'bolo' },
    { id: 'bolo-milho', categoria: 'bolos-caseiros', nome: 'Bolo de milho', descricao: 'Aquele sabor de milho que lembra a cozinha da vó.', tamanho: 'Bolo inteiro · 20 cm', preco: 35, exibirNoCardapio: true, encomenda: { tipo: 'principal' }, sazonalidade: null, imagem: null, ilustracao: 'bolo' },
    { id: 'bolo-fuba', categoria: 'bolos-caseiros', nome: 'Bolo de fubá', descricao: 'Caseiro e delicado, perfeito para a hora do café.', tamanho: 'Bolo inteiro · 20 cm', preco: 30, exibirNoCardapio: true, encomenda: { tipo: 'principal' }, sazonalidade: null, imagem: null, ilustracao: 'bolo' },
    { id: 'bolo-laranja', categoria: 'bolos-caseiros', nome: 'Bolo de laranja', descricao: 'Massa macia com calda de laranja.', tamanho: 'Bolo inteiro · 20 cm', preco: 35, exibirNoCardapio: true, encomenda: { tipo: 'principal' }, sazonalidade: null, imagem: null, ilustracao: 'bolo' },
    { id: 'bolo-coco', categoria: 'bolos-caseiros', nome: 'Bolo de coco', descricao: 'Massa fofinha com cobertura de coco ralado.', tamanho: 'Bolo inteiro · 20 cm', preco: 38, exibirNoCardapio: true, encomenda: { tipo: 'principal' }, sazonalidade: null, imagem: null, ilustracao: 'bolo' },
    { id: 'cafe-coado', categoria: 'cafe-acompanhamentos', nome: 'Café coado', descricao: 'Passado na hora, para uma pausa sem pressa.', tamanho: 'Xícara · 150 ml', preco: 5, exibirNoCardapio: true, encomenda: { tipo: 'indisponivel' }, sazonalidade: null, imagem: null, ilustracao: 'cafe' },
    { id: 'cafe-leite', categoria: 'cafe-acompanhamentos', nome: 'Café com leite', descricao: 'Café coado e leite quentinho, do jeito de casa.', tamanho: 'Xícara · 200 ml', preco: 7, exibirNoCardapio: true, encomenda: { tipo: 'indisponivel' }, sazonalidade: null, imagem: null, ilustracao: 'cafe' },
    { id: 'pao-queijo', categoria: 'cafe-acompanhamentos', nome: 'Pão de queijo', descricao: 'Douradinho por fora e macio por dentro.', tamanho: 'Unidade', preco: 3, exibirNoCardapio: true, encomenda: { tipo: 'acompanhamento', tamanho: 'Dúzia · 12 unidades', preco: 25, categoriaPrincipal: 'bolos-caseiros' }, sazonalidade: null, imagem: null, ilustracao: 'pao-queijo' },
    { id: 'panetone', categoria: 'especial-natal', nome: 'Panetone', descricao: 'Receita natalina com frutas para compartilhar.', tamanho: 'Unidade · 500 g', preco: 45, exibirNoCardapio: true, encomenda: { tipo: 'indisponivel' }, sazonalidade: { meses: [12], descricao: 'Sazonal · dezembro' }, imagem: null, ilustracao: 'panetone' },
    { id: 'bolo-natal', categoria: 'especial-natal', nome: 'Bolo de Natal', descricao: 'Bolo com frutas e especiarias para a mesa de Natal.', tamanho: 'Bolo inteiro · 20 cm', preco: 55, exibirNoCardapio: true, encomenda: { tipo: 'indisponivel' }, sazonalidade: { meses: [12], descricao: 'Sazonal · dezembro' }, imagem: null, ilustracao: 'bolo' },
  ] satisfies Produto[],
}
