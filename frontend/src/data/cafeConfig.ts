import { PRODUTOS, CATEGORIAS } from '../../../backend/src/produtos.ts'
export type { CategoriaId, TipoIlustracao, DisponibilidadeEncomenda, Produto } from '../../../backend/src/produtos.ts'

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
    imagem: '/images/mesa-caseira.webp',
    imagemPequena: '/images/mesa-caseira-768.webp',
    descricaoImagem: 'Cena ilustrativa de bolo de chocolate, café em xícara com coração e flores sobre uma mesa com renda e tecido xadrez.',
    legenda: 'Uma mesa cheia de afeto · imagem criada com IA',
  },
  cardapio: {
    titulo: 'Nosso cardápio',
    subtitulo: 'Receitas simples, feitas com muito carinho.',
    aviso: 'Preços, tamanhos e produtos fictícios para demonstração. As ilustrações são provisórias.',
    categorias: CATEGORIAS,
  },
  produtos: PRODUTOS,
}
