import type { CatalogoPrecos } from './catalogo.ts'

export interface ItemPrecificado {
  produto: string
  quantidade: number
  precoUnitarioCentavos: number
  subtotalCentavos: number
}
export interface Financeiro {
  itens: ItemPrecificado[]
  subtotalBolosCentavos: number
  valorPaoDeQueijoCentavos: number
  totalCentavos: number
  precosInicializados: boolean
}
export function centavosValidos(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isSafeInteger(valor) && valor >= 0
}
export function precificarItens(itens: readonly { produto: string; quantidade: number }[], catalogo: CatalogoPrecos, anteriores: readonly ItemPrecificado[] = []): ItemPrecificado[] {
  return itens.map(({ produto, quantidade }) => {
    const precoUnitarioCentavos = anteriores.find((item) => item.produto === produto)?.precoUnitarioCentavos ?? catalogo.produtos[produto]
    const subtotalCentavos = quantidade * precoUnitarioCentavos
    if (!Number.isSafeInteger(quantidade) || quantidade < 1 || !centavosValidos(precoUnitarioCentavos) || precoUnitarioCentavos === 0 || !centavosValidos(subtotalCentavos)) throw new Error('Valores monetários inválidos.')
    return { produto, quantidade, precoUnitarioCentavos, subtotalCentavos }
  })
}
export function resumirValores(itens: ItemPrecificado[], valorPaoDeQueijoCentavos: number, precosInicializados = false): Financeiro {
  const subtotalBolosCentavos = itens.reduce((soma, item) => soma + item.subtotalCentavos, 0)
  const totalCentavos = subtotalBolosCentavos + valorPaoDeQueijoCentavos
  if (!centavosValidos(subtotalBolosCentavos) || !centavosValidos(valorPaoDeQueijoCentavos) || !centavosValidos(totalCentavos)) throw new Error('Total monetário inválido.')
  return { itens, subtotalBolosCentavos, valorPaoDeQueijoCentavos, totalCentavos, precosInicializados }
}
export function financeiroValido(valor: unknown): valor is Financeiro {
  const pedido = valor as Financeiro & { incluirPaoDeQueijo?: boolean } | null
  if (!pedido || !Array.isArray(pedido.itens) || !pedido.itens.length || typeof pedido.precosInicializados !== 'boolean') return false
  if (!pedido.itens.every((item) => item && typeof item.produto === 'string' && Number.isSafeInteger(item.quantidade) && item.quantidade > 0 && centavosValidos(item.precoUnitarioCentavos) && item.precoUnitarioCentavos > 0 && centavosValidos(item.subtotalCentavos) && item.subtotalCentavos === item.quantidade * item.precoUnitarioCentavos)) return false
  const soma = pedido.itens.reduce((total, item) => total + item.subtotalCentavos, 0)
  return centavosValidos(soma) && centavosValidos(pedido.subtotalBolosCentavos) && pedido.subtotalBolosCentavos === soma
    && centavosValidos(pedido.valorPaoDeQueijoCentavos) && (pedido.incluirPaoDeQueijo === undefined || (pedido.incluirPaoDeQueijo ? pedido.valorPaoDeQueijoCentavos > 0 : pedido.valorPaoDeQueijoCentavos === 0))
    && centavosValidos(pedido.totalCentavos) && pedido.totalCentavos === soma + pedido.valorPaoDeQueijoCentavos
}
