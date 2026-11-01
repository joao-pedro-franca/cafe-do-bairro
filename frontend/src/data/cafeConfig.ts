import { PRODUTOS, CATEGORIAS } from '../../../backend/src/produtos.ts'
export type { CategoriaId, TipoIlustracao, DisponibilidadeEncomenda, Produto } from '../../../backend/src/produtos.ts'

const nomeCafe = 'Café do Bairro'
export const cafeConfig = {
  nome: nomeCafe,
  tituloPagina: `${nomeCafe} · Café e carinho à mesa`,
  apresentacao: 'Bolos caseiros, café fresquinho e aquele gostinho de casa de vó.',
  convite: 'Entre, puxe uma cadeira. O café já está passando.',
  // Dados fictícios autorizados para a apresentação do desafio, não de uma empresa verificada.
  horario: { dias: 'Segunda a sábado' as string | null, horas: '8h às 18h' as string | null, confirmado: true, pendente: 'Horários em atualização' },
  endereco: { rua: 'Rua Mariano Gonçalves, 128' as string | null, localidade: 'Bairro das Acácias · Vila Aurora – BA' as string | null, confirmado: true, pendente: 'Localização em atualização' },
  fusoHorario: 'America/Bahia',
  contato: {
    whatsapp: { numero: '5573988255560' as string | null, confirmado: true, mensagem: `Olá! Gostaria de fazer uma encomenda no ${nomeCafe}.` },
    instagram: { url: 'https://www.instagram.com/tecnojr/' as string | null, confirmado: true, rotulo: 'Instagram da TecnoJr' },
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
