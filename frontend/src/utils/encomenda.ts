import type { Produto } from '../data/cafeConfig'

export interface DadosEncomenda {
  nomeCliente: string
  telefone: string
  produto: string
  dataEntrega: string
  incluirPaoDeQueijo: boolean
}

export type CampoEncomenda = 'nomeCliente' | 'telefone' | 'produto' | 'dataEntrega'
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
  return /^(?:\+55)?[1-9]{2}(?:[2-5]\d{7}|9\d{8})$/.test(compacto)
}

export function formatarTelefone(telefone: string) {
  if (!telefoneValido(telefone)) return telefone
  const prefixo = telefone.trim().startsWith('+55') ? '+55 ' : ''
  const digitos = telefone.replace(/\D/g, '').slice(prefixo ? 2 : 0)
  return `${prefixo}(${digitos.slice(0, 2)}) ${digitos.slice(2, -4)}-${digitos.slice(-4)}`
}

export function produtoEncomendavel(produto: Produto) {
  return produto.encomenda.tipo === 'principal' && produto.sazonalidade === null
}

export function validarEncomenda(dados: DadosEncomenda, produtos: readonly Produto[], dataMinima: string): ErrosEncomenda {
  const erros: ErrosEncomenda = {}
  if (dados.nomeCliente.trim().split(/\s+/).length < 2) {
    erros.nomeCliente = 'Informe seu nome e sobrenome.'
  }
  if (!telefoneValido(dados.telefone)) {
    erros.telefone = 'Informe um telefone com DDD: (73) 99999-9999 ou (73) 3333-3333. O prefixo +55 é opcional.'
  }
  if (!produtos.some((produto) => produto.id === dados.produto && produtoEncomendavel(produto))) {
    erros.produto = 'Selecione um dos bolos disponíveis para encomenda.'
  }
  // A comparação textual só é segura após validar o calendário e o formato ISO.
  const data = new Date(`${dados.dataEntrega}T12:00:00Z`)
  const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(dados.dataEntrega)
    && !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === dados.dataEntrega
  if (!dataValida) {
    erros.dataEntrega = 'Escolha uma data válida para a encomenda.'
  } else if (dados.dataEntrega < dataMinima) {
    erros.dataEntrega = 'Escolha amanhã ou uma data posterior, considerando o horário do café.'
  }
  return erros
}
