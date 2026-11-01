import { CATALOGO } from '../../../backend/src/catalogo.ts'
import { precificarItens, resumirValores } from '../../../backend/src/precificacao.ts'
import { unidadesItens, unidadesProducao } from '../../../backend/src/produtos.ts'
export const comPrecos = (pedido) => ({ ...pedido, quantidadeProducao: unidadesProducao(pedido.itens), quantidadeItens: unidadesItens(pedido.itens) + Number(Boolean(pedido.incluirPaoDeQueijo)), ...resumirValores(precificarItens(pedido.itens, CATALOGO), pedido.incluirPaoDeQueijo ? CATALOGO.paoDeQueijoCentavos : 0) })
