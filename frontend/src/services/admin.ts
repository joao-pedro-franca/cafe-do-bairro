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
// O navegador envia o cookie HttpOnly; apenas o token CSRF fica na memória da página.
export const consultarSessao = () => solicitar<SessaoAdmin>('/admin/sessao')
export const entrarAdmin = (usuario: string, senha: string) => solicitar<SessaoAdmin>('/admin/login', 'POST', { usuario, senha })
export const sairAdmin = (csrf: string) => solicitar<void>('/admin/logout', 'POST', {}, csrf)
export const listarPedidos = () => solicitar<PedidoAdmin[]>('/encomendas')
export const alterarStatus = (id: number, status: StatusEncomenda, csrf: string) => solicitar<PedidoAdmin>(`/encomendas/${id}`, 'PATCH', { status }, csrf)
export const excluirPedido = (id: number, csrf: string) => solicitar<void>(`/encomendas/${id}`, 'DELETE', undefined, csrf)
