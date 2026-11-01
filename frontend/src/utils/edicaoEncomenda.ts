import { cafeConfig } from '../data/cafeConfig.ts'
import { dataMinimaEncomenda, validarEncomenda } from './encomenda.ts'
import { statusEncomenda } from '../services/admin.ts'
import type { AlteracoesPedido, PedidoAdmin } from '../services/admin.ts'

export type CamposPedido = Omit<PedidoAdmin, 'id'>

export function alteracoesPedido(anterior: PedidoAdmin, campos: CamposPedido): AlteracoesPedido {
  const normalizados: CamposPedido = {
    ...campos,
    nomeCliente: campos.nomeCliente.trim().replace(/\s+/g, ' '),
    telefone: campos.telefone.replace(/\D/g, ''),
  }
  return Object.fromEntries(Object.entries(normalizados).filter(([campo, valor]) => valor !== anterior[campo as keyof CamposPedido])) as AlteracoesPedido
}

export function validarEdicao(anterior: PedidoAdmin, campos: CamposPedido, agora = new Date()) {
  const mudaProducao = campos.dataEntrega !== anterior.dataEntrega || campos.quantidadeBolos !== anterior.quantidadeBolos
  // Contato, sabor, adicional e status de pedidos antigos não exigem mudar sua data.
  const minima = mudaProducao ? dataMinimaEncomenda(cafeConfig.fusoHorario, agora) : anterior.dataEntrega
  const erros: Partial<Record<keyof CamposPedido, string>> = validarEncomenda(campos, cafeConfig.produtos, minima, 5)
  if (!campos.nomeCliente.trim() || campos.nomeCliente.trim().length > 100) erros.nomeCliente = 'Informe nome e sobrenome, com até 100 caracteres.'
  if (!statusEncomenda.some((status) => status === campos.status)) erros.status = 'Escolha um dos status disponíveis.'
  return erros
}
