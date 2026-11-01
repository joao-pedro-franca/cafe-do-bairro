import { cafeConfig } from '../data/cafeConfig.ts'
import { unidadesBolos, unidadesProducao, unidadesItens } from '../../../backend/src/produtos.ts'

export interface ItemEncomenda { produto: string; quantidade: number }
export const totalBolos = unidadesBolos
export { unidadesProducao, unidadesItens }
export function contagensValidas(valor: { itens: ItemEncomenda[]; incluirPaoDeQueijo: unknown; quantidadeItens?: unknown; quantidadeProducao?: unknown }): valor is typeof valor & { quantidadeItens: number; quantidadeProducao: number } {
  return typeof valor.incluirPaoDeQueijo === 'boolean' && Number.isSafeInteger(valor.quantidadeItens) && valor.quantidadeItens === unidadesItens(valor.itens) + Number(valor.incluirPaoDeQueijo)
    && valor.quantidadeProducao === unidadesProducao(valor.itens)
}
export const sabores = cafeConfig.produtos

export function validarItens(itens: readonly ItemEncomenda[], limite?: number) {
  if (!itens.length) return 'Adicione pelo menos um produto.'
  if (itens.length > sabores.length || new Set(itens.map((item) => item.produto)).size !== itens.length) return 'Não repita produtos. Reúna a quantidade na mesma linha.'
  if (itens.some((item) => !sabores.some((sabor) => sabor.id === item.produto))) return 'Selecione um produto do cardápio em cada linha.'
  if (itens.some((item) => !Number.isSafeInteger(item.quantidade) || item.quantidade < 1) || !Number.isSafeInteger(unidadesItens(itens))) return 'Cada produto precisa de uma quantidade inteira, a partir de uma unidade de venda.'
  if (limite !== undefined && unidadesProducao(itens) > limite) return `O total ultrapassa as ${limite} unidade(s) disponíveis de bolos/panetones. Ajuste os itens ou escolha outra data.`
}

export function itensConfirmados(valor: unknown): valor is ItemEncomenda[] {
  return Array.isArray(valor) && valor.every((item) => item && typeof item === 'object' && typeof item.produto === 'string' && typeof item.quantidade === 'number') && !validarItens(valor)
}
