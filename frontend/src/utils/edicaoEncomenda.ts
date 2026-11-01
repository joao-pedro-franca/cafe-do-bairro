import { cafeConfig } from '../data/cafeConfig.ts'
import { dataMinimaEncomenda, validarEncomenda } from './encomenda.ts'
import { statusEncomenda } from '../services/admin.ts'
import type { AlteracoesPedido, PedidoAdmin } from '../services/admin.ts'
import { totalBolos } from './itens.ts'

export type CamposPedido = Required<AlteracoesPedido>

export function alteracoesPedido(anterior: PedidoAdmin, campos: CamposPedido): AlteracoesPedido {
  const normalizados: CamposPedido = {
    itens: campos.itens.map((item) => ({ produto: item.produto, quantidade: item.quantidade })),
    dataEntrega: campos.dataEntrega, incluirPaoDeQueijo: campos.incluirPaoDeQueijo, status: campos.status,
    nomeCliente: campos.nomeCliente.trim().replace(/\s+/g, ' '),
    telefone: campos.telefone.replace(/\D/g, ''),
  }
  const assinatura = (itens: CamposPedido['itens']) => JSON.stringify(itens.map(({ produto, quantidade }) => ({ produto, quantidade })).sort((a, b) => a.produto.localeCompare(b.produto)))
  return Object.fromEntries(Object.entries(normalizados).filter(([campo, valor]) => campo === 'itens'
    ? assinatura(normalizados.itens) !== assinatura(anterior.itens)
    : valor !== anterior[campo as keyof CamposPedido])) as AlteracoesPedido
}

export function validarEdicao(anterior: PedidoAdmin, campos: CamposPedido, agora = new Date()) {
  const mudaProducao = campos.dataEntrega !== anterior.dataEntrega || totalBolos(campos.itens) !== anterior.totalBolos
  // Contato, sabor, adicional e status de pedidos antigos não exigem mudar sua data.
  const minima = mudaProducao ? dataMinimaEncomenda(cafeConfig.fusoHorario, agora) : anterior.dataEntrega
  const erros: Partial<Record<keyof CamposPedido, string>> = validarEncomenda(campos, cafeConfig.produtos, minima, 5)
  if (!campos.nomeCliente.trim() || campos.nomeCliente.trim().length > 100) erros.nomeCliente = 'Informe nome e sobrenome, com até 100 caracteres.'
  if (!statusEncomenda.some((status) => status === campos.status)) erros.status = 'Escolha um dos status disponíveis.'
  return erros
}
