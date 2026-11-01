export const statusEncomenda = ['recebida', 'em preparo', 'entregue'] as const
export type StatusEncomenda = typeof statusEncomenda[number]
export interface PedidoAdmin {
  id: number
  nomeCliente: string
  telefone: string
  itens: ItemEncomenda[]
  totalBolos: number
  dataEntrega: string
  incluirPaoDeQueijo: boolean
  status: StatusEncomenda
}
export interface SessaoAdmin { csrfToken: string; expiraEm: string }
export type AlteracoesPedido = Partial<Omit<PedidoAdmin, 'id' | 'totalBolos'>>
export class ErroAdmin extends Error {
  status: number | undefined
  constructor(mensagem: string, status?: number) { super(mensagem); this.status = status }
}
async function solicitar<T>(caminho: string, metodo = 'GET', corpo?: unknown, csrf?: string): Promise<T> {
  let resposta: Response
  try {
    resposta = await fetch(`/api${caminho}`, {
      method: metodo, credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      signal: AbortSignal.timeout(15_000),
      headers: { ...(metodo !== 'GET' ? { 'Content-Type': 'application/json' } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
      ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
    })
  } catch { throw new ErroAdmin(metodo === 'PATCH'
    ? 'Não foi possível confirmar a alteração. Ela pode ter sido salva. Confira o pedido em outra aba antes de tentar novamente; o envio não será repetido automaticamente.'
    : 'Não foi possível falar com o café. Confira a conexão e atualize a lista antes de repetir uma alteração.') }
  const dados = resposta.status === 204 ? null : await resposta.json().catch(() => null)
  if (!resposta.ok) {
    if (metodo === 'PATCH' && resposta.status === 409) throw new ErroAdmin('A quantidade de bolos ultrapassa a disponibilidade dessa data. Diminua a quantidade ou escolha outra data. Nenhuma alteração foi salva.', 409)
    throw new ErroAdmin(typeof dados?.erro === 'string' ? dados.erro : 'Não foi possível concluir a operação.', resposta.status)
  }
  return dados as T
}
function respostaInvalida() {
  return new ErroAdmin('A resposta do servidor está incompleta ou inválida. Atualize a página ou a lista antes de repetir uma alteração.')
}
function validarSessao(valor: unknown): SessaoAdmin {
  const sessao = valor as SessaoAdmin | null
  if (!sessao || typeof sessao.csrfToken !== 'string' || !/^[a-f0-9]{64}$/.test(sessao.csrfToken)
    || typeof sessao.expiraEm !== 'string' || !Number.isFinite(Date.parse(sessao.expiraEm))) throw respostaInvalida()
  return sessao
}
function pedidoValido(valor: unknown): valor is PedidoAdmin {
  const pedido = valor as PedidoAdmin | null
  return Boolean(pedido && Number.isSafeInteger(pedido.id) && pedido.id > 0
    && typeof pedido.nomeCliente === 'string' && typeof pedido.telefone === 'string' && itensConfirmados(pedido.itens)
    && typeof pedido.dataEntrega === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(pedido.dataEntrega)
    && pedido.totalBolos === totalBolos(pedido.itens)
    && typeof pedido.incluirPaoDeQueijo === 'boolean' && statusEncomenda.some((status) => status === pedido.status))
}
// O navegador envia o cookie HttpOnly; apenas o token CSRF fica na memória da página.
export const consultarSessao = () => solicitar<unknown>('/admin/sessao').then(validarSessao)
export const entrarAdmin = (usuario: string, senha: string) => solicitar<unknown>('/admin/login', 'POST', { usuario, senha }).then(validarSessao)
export const sairAdmin = (csrf: string) => solicitar<void>('/admin/logout', 'POST', {}, csrf)
export const listarPedidos = async () => {
  const lista = await solicitar<unknown>('/encomendas')
  if (!Array.isArray(lista) || !lista.every(pedidoValido)) throw respostaInvalida()
  return lista
}
export const atualizarPedido = async (id: number, alteracoes: AlteracoesPedido, csrf: string) => {
  const pedido = await solicitar<unknown>(`/encomendas/${id}`, 'PATCH', alteracoes, csrf)
  if (!pedidoValido(pedido) || pedido.id !== id || (alteracoes.status !== undefined && pedido.status !== alteracoes.status)) throw respostaInvalida()
  return pedido
}
export const alterarStatus = (id: number, status: StatusEncomenda, csrf: string) => atualizarPedido(id, { status }, csrf)
export const excluirPedido = (id: number, csrf: string) => solicitar<void>(`/encomendas/${id}`, 'DELETE', undefined, csrf)
import { itensConfirmados, totalBolos } from '../utils/itens.ts'
import type { ItemEncomenda } from '../utils/itens.ts'
