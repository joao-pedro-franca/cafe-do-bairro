import { CATEGORIAS, PRODUTOS, produtoEncomendavel, produtoPorId, unidadeEncomenda } from './produtos.ts'
import { CATALOGO } from './catalogo.ts'
import type { CatalogoPrecos } from './catalogo.ts'
import { ApiError } from './errors.ts'

export interface ConfiguracaoProduto { id: string; aceitaEncomendas: boolean; mesesPermitidos: number[] }
export interface ProdutoDisponivel extends ConfiguracaoProduto {
  nome: string; categoria: string; categoriaNome: string; precoCentavos: number; unidade: string; consomeCapacidade: boolean
}
export const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
export const precoEncomenda = (id: string, catalogo: CatalogoPrecos = CATALOGO) => id === 'pao-queijo' ? catalogo.paoDeQueijoCentavos : catalogo.produtos[id]
export const configuracaoPadrao = (id: string): ConfiguracaoProduto => {
  const p = produtoPorId(id)
  if (!p) throw new ApiError(404, 'Produto não encontrado.')
  return { id, aceitaEncomendas: produtoEncomendavel(id) && p.encomenda.tipo !== 'indisponivel', mesesPermitidos: p.sazonalidade?.meses ?? [] }
}
export function produtoDisponivel(config: ConfiguracaoProduto, catalogo = CATALOGO): ProdutoDisponivel {
  const p = produtoPorId(config.id)!
  return { ...config, aceitaEncomendas: produtoEncomendavel(p.id) && config.aceitaEncomendas, nome: p.nome, categoria: p.categoria, categoriaNome: CATEGORIAS.find((c) => c.id === p.categoria)!.nome,
    precoCentavos: precoEncomenda(p.id, catalogo), unidade: unidadeEncomenda(p.id), consomeCapacidade: p.consomeCapacidade }
}
export function permitidoNaData(config: ConfiguracaoProduto, data: string) {
  return produtoEncomendavel(config.id) && config.aceitaEncomendas && /^\d{4}-\d{2}-\d{2}$/.test(data) && (config.mesesPermitidos.length === 0 || config.mesesPermitidos.includes(Number(data.slice(5, 7))))
}
export function validarConfiguracao(valor: unknown): Omit<ConfiguracaoProduto, 'id'> {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new ApiError(400, 'Informe disponibilidade e meses de retirada.')
  const corpo = valor as Record<string, unknown>
  const meses = corpo.mesesPermitidos
  if (Object.keys(corpo).length !== 2 || Object.keys(corpo).some((k) => !['aceitaEncomendas', 'mesesPermitidos'].includes(k)) || typeof corpo.aceitaEncomendas !== 'boolean'
    || !Array.isArray(meses) || meses.length > 12 || meses.some((m) => !Number.isInteger(m) || m < 1 || m > 12) || new Set(meses).size !== meses.length) throw new ApiError(400, 'Use aceita encomendas (sim ou não) e meses distintos de 1 a 12. Lista vazia significa o ano todo.')
  return { aceitaEncomendas: corpo.aceitaEncomendas, mesesPermitidos: [...meses].sort((a, b) => a - b) }
}
export const IDS_PRODUTOS = PRODUTOS.map((p) => p.id)
