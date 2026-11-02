import { erroComposicao } from '../../../backend/src/produtos.ts'
import type { Produto } from '../data/cafeConfig'
import { validarItens } from './itens.ts'
import type { ItemEncomenda } from './itens.ts'

export interface DadosEncomenda {
  nomeCliente: string
  telefone: string
  itens: ItemEncomenda[]
  dataEntrega: string
  incluirPaoDeQueijo: boolean
}

export type CampoEncomenda = 'nomeCliente' | 'telefone' | 'itens' | 'dataEntrega'
export type ErrosEncomenda = Partial<Record<CampoEncomenda, string>>

export function dataMinimaEncomenda(fusoHorario: string, agora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: fusoHorario, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(agora)
  const parte = (tipo: string) => Number(partes.find((item) => item.type === tipo)?.value)
  // UTC é usado apenas para somar um dia de calendário, depois de identificar o dia no café.
  const amanha = new Date(Date.UTC(parte('year'), parte('month') - 1, parte('day') + 1))
  return amanha.toISOString().slice(0, 10)
}

export function telefoneValido(telefone: string) {
  const compacto = telefone.trim().replace(/[\s().-]/g, '')
  return /^(?:\+?55)?[1-9]{2}(?:[2-5]\d{7}|9\d{8})$/.test(compacto)
}

export function formatarTelefone(telefone: string) {
  if (!telefoneValido(telefone)) return telefone
  const todosDigitos = telefone.replace(/\D/g, '')
  const prefixo = todosDigitos.length > 11 ? '+55 ' : ''
  const digitos = todosDigitos.slice(prefixo ? 2 : 0)
  return `${prefixo}(${digitos.slice(0, 2)}) ${digitos.slice(2, -4)}-${digitos.slice(-4)}`
}

export function erroDataEntrega(dataEntrega: string, dataMinima: string): string | undefined {
  const data = new Date(`${dataEntrega}T12:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataEntrega) || Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== dataEntrega) {
    return 'Escolha uma data válida para a encomenda.'
  }
  if (dataEntrega < dataMinima) return 'Escolha amanhã ou uma data posterior, considerando o horário do café.'
}

export function validarEncomenda(dados: DadosEncomenda, _produtos: readonly Produto[], dataMinima: string, disponiveis?: number, preservarHistorico = false): ErrosEncomenda {
  const erros: ErrosEncomenda = {}
  if (dados.nomeCliente.trim().split(/\s+/).length < 2) {
    erros.nomeCliente = 'Informe seu nome e sobrenome.'
  }
  if (!telefoneValido(dados.telefone)) {
    erros.telefone = 'Informe um telefone com DDD: (73) 99999-9999 ou (73) 3333-3333. O prefixo +55 é opcional.'
  }
  const erroItens = validarItens(dados.itens, disponiveis) || (!preservarHistorico ? erroComposicao(dados.itens, dados.incluirPaoDeQueijo) : undefined)
  if (erroItens) erros.itens = erroItens
  const erroData = erroDataEntrega(dados.dataEntrega, dataMinima)
  if (erroData) erros.dataEntrega = erroData
  return erros
}
