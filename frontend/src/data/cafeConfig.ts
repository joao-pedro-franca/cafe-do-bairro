import { PRODUTOS, CATEGORIAS } from '../../../backend/src/produtos.ts'
export type { CategoriaId, TipoIlustracao, DisponibilidadeEncomenda, Produto } from '../../../backend/src/produtos.ts'

const nomeCafe = 'Café do Bairro'
export const cafeConfig = {
  nome: nomeCafe,
  tituloPagina: `${nomeCafe} · Café e carinho à mesa`,
  apresentacao: 'Bolos caseiros, café fresquinho e aquele gostinho de casa de vó.',
  convite: 'Entre, puxe uma cadeira. O café já está passando.',
  horario: { dias: null as string | null, horas: null as string | null, confirmado: false, pendente: 'Horários em atualização' },
  endereco: { rua: null as string | null, localidade: null as string | null, confirmado: false, pendente: 'Localização em atualização' },
  fusoHorario: 'America/Bahia',
  contato: {
    whatsapp: { numero: null as string | null, confirmado: false, mensagem: `Olá! Gostaria de saber mais sobre os produtos do ${nomeCafe}.` },
    instagram: { url: null as string | null, confirmado: false },
  },
  // Manter true enquanto o projeto não representar um estabelecimento operacional.
  demonstracao: true,
  avisoEncomendas: 'Ambiente de demonstração: use dados de teste. Os pedidos são registrados apenas neste projeto e não serão preparados por um estabelecimento.',
  hero: {
    imagem: '/images/mesa-caseira.webp',
    imagemPequena: '/images/mesa-caseira-768.webp',
    descricaoImagem: 'Cena ilustrativa de bolo de chocolate, café em xícara com coração e flores sobre uma mesa com renda e tecido xadrez.',
    legenda: 'Uma mesa cheia de afeto · imagem criada com IA',
  },
  cardapio: {
    titulo: 'Nosso cardápio',
    subtitulo: 'Receitas simples, feitas com muito carinho.',
    categorias: CATEGORIAS,
  },
  produtos: PRODUTOS,
}
