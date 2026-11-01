import { FUSO_HORARIO, PRODUTOS_ENCOMENDAVEIS, STATUS } from './config.ts'
import { ApiError } from './errors.ts'

export interface ItemEncomenda { produto: string; quantidade: number }
export const totalBolos = (itens: readonly ItemEncomenda[]) => itens.reduce((total, item) => total + item.quantidade, 0)

export function validarItens(valor: unknown): ItemEncomenda[] {
  if (!Array.isArray(valor) || valor.length < 1 || valor.length > PRODUTOS_ENCOMENDAVEIS.length) {
    throw new ApiError(400, 'Inclua de um a seis sabores de bolo, sem repetições.')
  }
  const sabores = new Set<string>()
  const itens = valor.map((item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new ApiError(400, 'Cada item deve conter produto e quantidade.')
    const { produto, quantidade } = item as Record<string, unknown>
    if (Object.keys(item).some((campo) => !['produto', 'quantidade'].includes(campo))
      || typeof produto !== 'string' || !PRODUTOS_ENCOMENDAVEIS.some((id) => id === produto)) throw new ApiError(400, 'Selecione o ID de um bolo caseiro disponível para encomenda.')
    if (sabores.has(produto)) throw new ApiError(400, 'Não repita sabores: reúna a quantidade na mesma linha.')
    if (typeof quantidade !== 'number' || !Number.isSafeInteger(quantidade) || quantidade < 1) throw new ApiError(400, 'A quantidade de cada sabor deve ser um número inteiro positivo.')
    sabores.add(produto)
    return { produto, quantidade }
  })
  if (!Number.isSafeInteger(totalBolos(itens))) throw new ApiError(400, 'O total de bolos é inválido.')
  return itens
}

export interface DadosEncomenda {
  nomeCliente: string
  telefone: string
  itens: ItemEncomenda[]
  dataEntrega: string
  incluirPaoDeQueijo: boolean
}
export interface Encomenda extends DadosEncomenda {
  totalBolos: number
  id: number
  status: typeof STATUS[number]
}
export type AlteracaoEncomenda = Partial<DadosEncomenda & Pick<Encomenda, 'status'>>

export function dataMinima(agora: Date) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSO_HORARIO, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(agora)
  const parte = (tipo: string) => Number(partes.find((item) => item.type === tipo)?.value)
  // Primeiro encontramos o dia na Bahia; UTC serve apenas para somar um dia de calendário.
  return new Date(Date.UTC(parte('year'), parte('month') - 1, parte('day') + 1)).toISOString().slice(0, 10)
}

export function validarData(valor: unknown, agora: Date, exigirFuturo = true): asserts valor is string {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new ApiError(400, 'Informe a data de entrega no formato YYYY-MM-DD.')
  }
  const data = new Date(`${valor}T12:00:00Z`)
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor) {
    throw new ApiError(400, 'Informe uma data de entrega válida.')
  }
  if (exigirFuturo && valor < dataMinima(agora)) {
    throw new ApiError(400, 'A encomenda precisa ser para amanhã ou depois, no horário da Bahia.')
  }
}

export function validarEntrada(entrada: unknown, parcial: boolean, agora: Date): AlteracaoEncomenda {
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) {
    throw new ApiError(400, 'Envie um objeto JSON com os dados da encomenda.')
  }
  const corpo = entrada as Record<string, unknown>
  const campos = ['nomeCliente', 'telefone', 'itens', 'dataEntrega', 'incluirPaoDeQueijo', ...(parcial ? ['status'] : [])]
  if (!Object.keys(corpo).length || Object.keys(corpo).some((campo) => !campos.includes(campo))) {
    throw new ApiError(400, 'Envie apenas os campos permitidos. O status inicial é definido pelo servidor.')
  }
  const resultado: AlteracaoEncomenda = {}
  if (!parcial || Object.hasOwn(corpo, 'itens')) resultado.itens = validarItens(corpo.itens)
  if (!parcial || Object.hasOwn(corpo, 'nomeCliente')) {
    if (typeof corpo.nomeCliente !== 'string' || corpo.nomeCliente.trim().length > 100 || corpo.nomeCliente.trim().split(/\s+/).length < 2) {
      throw new ApiError(400, 'Informe nome e sobrenome, com até 100 caracteres.')
    }
    resultado.nomeCliente = corpo.nomeCliente.trim().replace(/\s+/g, ' ')
  }
  if (!parcial || Object.hasOwn(corpo, 'telefone')) {
    if (typeof corpo.telefone !== 'string' || corpo.telefone.length > 25 || !/^(?:\+?55)?[1-9]{2}(?:[2-5]\d{7}|9\d{8})$/.test(corpo.telefone.trim().replace(/[\s().-]/g, ''))) {
      throw new ApiError(400, 'Informe um telefone brasileiro com DDD (fixo ou celular); +55 é opcional.')
    }
    // Persistimos só os dígitos; o prefixo 55 é preservado quando informado.
    resultado.telefone = corpo.telefone.replace(/\D/g, '')
  }
  if (!parcial || Object.hasOwn(corpo, 'dataEntrega')) {
    // No PATCH, a transação compara com a reserva anterior antes de exigir data futura.
    validarData(corpo.dataEntrega, agora, !parcial)
    resultado.dataEntrega = corpo.dataEntrega
  }
  if (Object.hasOwn(corpo, 'incluirPaoDeQueijo')) {
    if (typeof corpo.incluirPaoDeQueijo !== 'boolean') throw new ApiError(400, 'incluirPaoDeQueijo deve ser true ou false.')
    resultado.incluirPaoDeQueijo = corpo.incluirPaoDeQueijo
  } else if (!parcial) resultado.incluirPaoDeQueijo = false
  if (Object.hasOwn(corpo, 'status')) {
    if (!STATUS.some((status) => status === corpo.status)) throw new ApiError(400, 'Status permitido: recebida, em preparo ou entregue.')
    resultado.status = corpo.status as Encomenda['status']
  }
  return resultado
}
