import type { DadosEncomenda } from '../utils/encomenda'
import { itensConfirmados, totalBolos } from '../utils/itens.ts'
import { financeiroValido } from '../utils/precificacao.ts'
import type { Financeiro } from '../utils/precificacao.ts'
export interface PedidoConfirmado extends Financeiro { id: number; status: 'recebida'; totalBolos: number; incluirPaoDeQueijo: boolean }

export class ErroEncomenda extends Error {
  status: number | undefined
  constructor(mensagem: string, status?: number) {
    super(mensagem)
    this.status = status
  }
}

const resultadoIncerto = 'Não foi possível obter a confirmação. O pedido pode ter sido recebido; confira com o café antes de enviar novamente.'

export async function criarEncomenda(dados: DadosEncomenda): Promise<PedidoConfirmado> {
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
        itens: dados.itens.map(({ produto, quantidade }) => ({ produto, quantidade })), dataEntrega: dados.dataEntrega,
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
    throw new ErroEncomenda('A disponibilidade mudou e não há bolos suficientes para essa quantidade. Confira o saldo atualizado e ajuste a quantidade ou escolha outra data.', 409)
  }
  if (resposta.status === 400) {
    const mensagem = corpo && typeof corpo === 'object' && 'erro' in corpo ? corpo.erro : null
    throw new ErroEncomenda(typeof mensagem === 'string' && mensagem.length <= 300 ? mensagem : 'Confira os dados da encomenda e tente novamente.', 400)
  }
  if (resposta.status !== 201 || !corpo || typeof corpo !== 'object' || !('id' in corpo)
    || typeof corpo.id !== 'number' || !Number.isSafeInteger(corpo.id) || corpo.id < 1
    || !('status' in corpo) || corpo.status !== 'recebida'
    || !('itens' in corpo) || !itensConfirmados(corpo.itens) || !('totalBolos' in corpo) || corpo.totalBolos !== totalBolos(corpo.itens)
    || !('incluirPaoDeQueijo' in corpo) || corpo.incluirPaoDeQueijo !== dados.incluirPaoDeQueijo || !financeiroValido(corpo)) {
    throw new ErroEncomenda(resultadoIncerto, resposta.status)
  }
  return { id: corpo.id, status: 'recebida', itens: corpo.itens, totalBolos: corpo.totalBolos as number, incluirPaoDeQueijo: corpo.incluirPaoDeQueijo as boolean,
    subtotalBolosCentavos: corpo.subtotalBolosCentavos, valorPaoDeQueijoCentavos: corpo.valorPaoDeQueijoCentavos, totalCentavos: corpo.totalCentavos, precosInicializados: corpo.precosInicializados }
}

export interface Disponibilidade {
  data: string
  limiteDiario: number
  quantidadeReservada: number
  quantidadeDisponivel: number
}

export async function consultarDisponibilidade(data: string, signal?: AbortSignal): Promise<Disponibilidade> {
  const resposta = await fetch(`/api/disponibilidade?data=${encodeURIComponent(data)}`, {
    credentials: 'omit', cache: 'no-store', redirect: 'error',
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000),
  })
  const corpo: unknown = await resposta.json()
  if (resposta.status !== 200 || !corpo || typeof corpo !== 'object') throw new Error('Disponibilidade indisponível.')
  const valor = corpo as Disponibilidade
  if (valor.data !== data || !Number.isSafeInteger(valor.limiteDiario) || valor.limiteDiario < 1
    || !Number.isSafeInteger(valor.quantidadeReservada) || valor.quantidadeReservada < 0
    || valor.quantidadeReservada > valor.limiteDiario
    || valor.quantidadeDisponivel !== valor.limiteDiario - valor.quantidadeReservada) throw new Error('Resposta de disponibilidade inválida.')
  return { data: valor.data, limiteDiario: valor.limiteDiario, quantidadeReservada: valor.quantidadeReservada, quantidadeDisponivel: valor.quantidadeDisponivel }
}
