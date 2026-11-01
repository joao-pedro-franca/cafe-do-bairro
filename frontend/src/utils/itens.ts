import { cafeConfig } from '../data/cafeConfig.ts'

export interface ItemEncomenda { produto: string; quantidade: number }
export const totalBolos = (itens: readonly ItemEncomenda[]) => itens.reduce((total, item) => total + item.quantidade, 0)
export const sabores = cafeConfig.produtos.filter((produto) => produto.encomenda.tipo === 'principal' && !produto.sazonalidade)

export function validarItens(itens: readonly ItemEncomenda[], limite?: number) {
  if (!itens.length) return 'Adicione pelo menos um sabor e um bolo.'
  if (itens.length > sabores.length || new Set(itens.map((item) => item.produto)).size !== itens.length) return 'Não repita sabores. Reúna a quantidade na mesma linha.'
  if (itens.some((item) => !sabores.some((sabor) => sabor.id === item.produto))) return 'Selecione um dos seis bolos caseiros em cada linha.'
  if (itens.some((item) => !Number.isSafeInteger(item.quantidade) || item.quantidade < 1) || !Number.isSafeInteger(totalBolos(itens))) return 'Cada sabor precisa de uma quantidade inteira, a partir de um bolo.'
  if (limite !== undefined && totalBolos(itens) > limite) return `O total ultrapassa os ${limite} bolo(s) disponíveis. Ajuste os itens ou escolha outra data.`
}

export function itensConfirmados(valor: unknown): valor is ItemEncomenda[] {
  return Array.isArray(valor) && valor.every((item) => item && typeof item === 'object' && typeof item.produto === 'string' && typeof item.quantidade === 'number') && !validarItens(valor)
}
