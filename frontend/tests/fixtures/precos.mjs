import { CATALOGO } from '../../../backend/src/catalogo.ts'
import { precificarItens, resumirValores } from '../../../backend/src/precificacao.ts'
export const comPrecos = (pedido) => ({ ...pedido, ...resumirValores(precificarItens(pedido.itens, CATALOGO), pedido.incluirPaoDeQueijo ? CATALOGO.paoDeQueijoCentavos : 0) })
