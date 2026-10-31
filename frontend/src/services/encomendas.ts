import type { DadosEncomenda } from '../utils/encomenda'

export class ErroEncomenda extends Error {
  status: number | undefined
  constructor(mensagem: string, status?: number) {
    super(mensagem)
    this.status = status
  }
}

const resultadoIncerto = 'Não foi possível obter a confirmação. O pedido pode ter sido recebido; confira com o café antes de enviar novamente.'

export async function criarEncomenda(dados: DadosEncomenda): Promise<{ id: number; status: 'recebida' }> {
  let resposta: Response
  try {
    resposta = await fetch('/api/encomendas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      redirect: 'error',
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        nomeCliente: dados.nomeCliente.trim(), telefone: dados.telefone,
        produto: dados.produto, dataEntrega: dados.dataEntrega,
        incluirPaoDeQueijo: dados.incluirPaoDeQueijo,
      }),
    })
  } catch {
    // Sem resposta, não sabemos se houve gravação. Não repetir POST automaticamente.
    throw new ErroEncomenda(resultadoIncerto)
  }
  let corpo: unknown
  try { corpo = await resposta.json() } catch { corpo = null }
  if (resposta.status === 409) {
    throw new ErroEncomenda('Essa data já tem cinco encomendas. Escolha outra data e tente novamente.', 409)
  }
  if (resposta.status === 400) {
    const mensagem = corpo && typeof corpo === 'object' && 'erro' in corpo ? corpo.erro : null
    throw new ErroEncomenda(typeof mensagem === 'string' && mensagem.length <= 300 ? mensagem : 'Confira os dados da encomenda e tente novamente.', 400)
  }
  if (resposta.status !== 201 || !corpo || typeof corpo !== 'object' || !('id' in corpo)
    || typeof corpo.id !== 'number' || !Number.isSafeInteger(corpo.id) || corpo.id < 1
    || !('status' in corpo) || corpo.status !== 'recebida') {
    throw new ErroEncomenda(resultadoIncerto, resposta.status)
  }
  return { id: corpo.id, status: 'recebida' }
}
