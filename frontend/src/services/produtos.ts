import { solicitarAdmin } from './admin.ts'
import type { ConfiguracaoProduto, ProdutoDisponivel } from '../../../backend/src/disponibilidadeProdutos.ts'
export type { ConfiguracaoProduto, ProdutoDisponivel } from '../../../backend/src/disponibilidadeProdutos.ts'
export { permitidoNaData, MESES } from '../../../backend/src/disponibilidadeProdutos.ts'

function produtoValido(valor: unknown): valor is ProdutoDisponivel {
  const p = valor as ProdutoDisponivel | null
  return Boolean(p && typeof p.id === 'string' && typeof p.nome === 'string' && typeof p.categoriaNome === 'string' && typeof p.categoria === 'string' && typeof p.unidade === 'string'
    && typeof p.aceitaEncomendas === 'boolean' && typeof p.consomeCapacidade === 'boolean' && Number.isSafeInteger(p.precoCentavos) && p.precoCentavos > 0
    && Array.isArray(p.mesesPermitidos) && p.mesesPermitidos.length <= 12 && new Set(p.mesesPermitidos).size === p.mesesPermitidos.length && p.mesesPermitidos.every((m) => Number.isInteger(m) && m >= 1 && m <= 12))
}
function listaValida(valor: unknown): ProdutoDisponivel[] {
  if (!Array.isArray(valor) || !valor.length || !valor.every(produtoValido) || new Set(valor.map((p) => p.id)).size !== valor.length) throw new Error('Resposta de disponibilidade do cardápio inválida.')
  return valor
}
export async function consultarProdutos(signal?: AbortSignal) {
  const resposta = await fetch('/api/produtos', { credentials: 'omit', cache: 'no-store', redirect: 'error', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000) })
  if (!resposta.ok) throw new Error('Não foi possível consultar a disponibilidade do cardápio.')
  return listaValida(await resposta.json())
}
export const listarProdutosAdmin = () => solicitarAdmin<unknown>('/admin/produtos').then(listaValida)
export async function salvarProduto(config: ConfiguracaoProduto, csrf: string) {
  const p = await solicitarAdmin<unknown>(`/admin/produtos/${encodeURIComponent(config.id)}`, 'PATCH', { aceitaEncomendas: config.aceitaEncomendas, mesesPermitidos: config.mesesPermitidos }, csrf)
  if (!produtoValido(p) || p.id !== config.id || p.aceitaEncomendas !== config.aceitaEncomendas || JSON.stringify([...p.mesesPermitidos].sort((a, b) => a - b)) !== JSON.stringify([...config.mesesPermitidos].sort((a, b) => a - b))) throw new Error('O servidor não confirmou a disponibilidade do produto. Recarregue a página para conferir antes de repetir.')
  return p
}
