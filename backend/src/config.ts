import { PRODUTOS } from './produtos.ts'
export const FUSO_HORARIO = 'America/Bahia'
export const LIMITE_DIARIO = 5
export const STATUS = ['recebida', 'em preparo', 'entregue'] as const

// IDs conhecidos; a elegibilidade efetiva vem do SQLite e da data de retirada.
export const PRODUTOS_ENCOMENDAVEIS = PRODUTOS.map((produto) => produto.id)
