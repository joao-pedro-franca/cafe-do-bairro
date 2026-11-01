export const statusEncomenda = ['recebida', 'em preparo', 'entregue'] as const
export type StatusEncomenda = typeof statusEncomenda[number]
export interface PedidoAdmin {
  id: number
  nomeCliente: string
  telefone: string
  produto: string
  quantidadeBolos: number
  dataEntrega: string
  incluirPaoDeQueijo: boolean
  status: StatusEncomenda
}
export interface SessaoAdmin { csrfToken: string; expiraEm: string }
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
  } catch { throw new ErroAdmin('Não foi possível falar com o café. Confira a conexão e atualize a lista antes de repetir uma alteração.') }
  const dados = resposta.status === 204 ? null : await resposta.json().catch(() => null)
  if (!resposta.ok) {
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
    && typeof pedido.nomeCliente === 'string' && typeof pedido.telefone === 'string' && typeof pedido.produto === 'string'
    && typeof pedido.dataEntrega === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(pedido.dataEntrega)
    && Number.isSafeInteger(pedido.quantidadeBolos) && pedido.quantidadeBolos > 0
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
export const alterarStatus = async (id: number, status: StatusEncomenda, csrf: string) => {
  const pedido = await solicitar<unknown>(`/encomendas/${id}`, 'PATCH', { status }, csrf)
  if (!pedidoValido(pedido) || pedido.id !== id || pedido.status !== status) throw respostaInvalida()
  return pedido
}
export const excluirPedido = (id: number, csrf: string) => solicitar<void>(`/encomendas/${id}`, 'DELETE', undefined, csrf)
