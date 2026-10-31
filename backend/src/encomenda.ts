import { FUSO_HORARIO, PRODUTOS_ENCOMENDAVEIS, STATUS } from './config.ts'
import { ApiError } from './errors.ts'

export interface DadosEncomenda {
  nomeCliente: string
  telefone: string
  produto: string
  dataEntrega: string
  incluirPaoDeQueijo: boolean
  quantidadeBolos: number
}
export interface Encomenda extends DadosEncomenda {
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

export function validarData(valor: unknown, agora: Date): asserts valor is string {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new ApiError(400, 'Informe a data de entrega no formato YYYY-MM-DD.')
  }
  const data = new Date(`${valor}T12:00:00Z`)
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor) {
    throw new ApiError(400, 'Informe uma data de entrega válida.')
  }
  if (valor < dataMinima(agora)) {
    throw new ApiError(400, 'A encomenda precisa ser para amanhã ou depois, no horário da Bahia.')
  }
}

export function validarEntrada(entrada: unknown, parcial: boolean, agora: Date): AlteracaoEncomenda {
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) {
    throw new ApiError(400, 'Envie um objeto JSON com os dados da encomenda.')
  }
  const corpo = entrada as Record<string, unknown>
  const campos = ['nomeCliente', 'telefone', 'produto', 'dataEntrega', 'incluirPaoDeQueijo', 'quantidadeBolos', ...(parcial ? ['status'] : [])]
  if (!Object.keys(corpo).length || Object.keys(corpo).some((campo) => !campos.includes(campo))) {
    throw new ApiError(400, 'Envie apenas os campos permitidos. O status inicial é definido pelo servidor.')
  }
  const resultado: AlteracaoEncomenda = {}
  if (!parcial || Object.hasOwn(corpo, 'quantidadeBolos')) {
    if (typeof corpo.quantidadeBolos !== 'number' || !Number.isSafeInteger(corpo.quantidadeBolos) || corpo.quantidadeBolos < 1) {
      throw new ApiError(400, 'quantidadeBolos deve ser um número inteiro positivo.')
    }
    resultado.quantidadeBolos = corpo.quantidadeBolos
  }
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
  if (!parcial || Object.hasOwn(corpo, 'produto')) {
    if (typeof corpo.produto !== 'string' || !PRODUTOS_ENCOMENDAVEIS.some((id) => id === corpo.produto)) {
      throw new ApiError(400, 'Selecione o ID de um bolo caseiro disponível para encomenda.')
    }
    resultado.produto = corpo.produto
  }
  if (!parcial || Object.hasOwn(corpo, 'dataEntrega')) {
    validarData(corpo.dataEntrega, agora)
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
