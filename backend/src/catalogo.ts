// Fonte única de preços. Módulo puro, também consumido pelo bundle público.
export const PRECOS_CENTAVOS = Object.freeze({
  'bolo-cenoura': 3500, 'bolo-chocolate': 4000, 'bolo-milho': 3500,
  'bolo-fuba': 3000, 'bolo-laranja': 3500, 'bolo-coco': 3800,
  'cafe-coado': 500, 'cafe-leite': 700, 'pao-queijo': 300,
  panetone: 4500, 'bolo-natal': 5500,
})
export interface CatalogoPrecos {
  produtos: Readonly<Record<string, number>>
  paoDeQueijoCentavos: number
}
export const CATALOGO: CatalogoPrecos = Object.freeze({ produtos: PRECOS_CENTAVOS, paoDeQueijoCentavos: 2500 })
