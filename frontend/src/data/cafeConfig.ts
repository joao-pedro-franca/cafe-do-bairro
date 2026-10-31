export interface Produto {
  id: string
  nome: string
  descricao: string
  tamanho: string
  preco: number
  aceitaEncomenda: boolean
  imagem: string | null
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
  produtos: [
    { id: 'bolo-cenoura', nome: 'Bolo de cenoura', descricao: 'Massa fofinha com cobertura de chocolate.', tamanho: 'Bolo de 20 cm', preco: 35, aceitaEncomenda: true, imagem: null },
    { id: 'bolo-chocolate', nome: 'Bolo de chocolate', descricao: 'Feito com chocolate e carinho.', tamanho: 'Bolo de 20 cm', preco: 40, aceitaEncomenda: true, imagem: null },
    { id: 'bolo-milho', nome: 'Bolo de milho', descricao: 'Aquele sabor de receita de família.', tamanho: 'Bolo de 20 cm', preco: 35, aceitaEncomenda: true, imagem: null },
    { id: 'pao-queijo', nome: 'Pão de queijo (dúzia)', descricao: 'Doze pães de queijo para dividir à mesa.', tamanho: '12 unidades', preco: 25, aceitaEncomenda: true, imagem: null },
  ] satisfies Produto[],
}
