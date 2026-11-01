import { CATALOGO } from '../../../backend/src/catalogo.ts'
import { precificarItens, resumirValores } from '../../../backend/src/precificacao.ts'
import type { Financeiro } from '../../../backend/src/precificacao.ts'
import { validarItens } from './itens.ts'
import type { ItemEncomenda } from './itens.ts'

export { financeiroValido } from '../../../backend/src/precificacao.ts'
export type { Financeiro, ItemPrecificado } from '../../../backend/src/precificacao.ts'
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const reais = (centavos: number) => moeda.format(centavos / 100)

export function previaFinanceira(itens: ItemEncomenda[], incluirPaoDeQueijo: boolean, anterior: Financeiro & { incluirPaoDeQueijo: boolean }): Financeiro | null {
  if (validarItens(itens, 5)) return null
  if (incluirPaoDeQueijo && itens.some((i) => i.produto === 'pao-queijo')) return null
  const adicional = incluirPaoDeQueijo ? (anterior.incluirPaoDeQueijo ? anterior.valorPaoDeQueijoCentavos : CATALOGO.paoDeQueijoCentavos) : 0
  try { return resumirValores(precificarItens(itens, CATALOGO, anterior.itens), adicional, anterior.precosInicializados) } catch { return null }
}
