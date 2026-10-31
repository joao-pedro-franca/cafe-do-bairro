export const FUSO_HORARIO = 'America/Bahia'
export const LIMITE_DIARIO = 5
export const STATUS = ['recebida', 'em preparo', 'entregue'] as const

// IDs aceitos pelo servidor. Um teste compara esta lista com o catálogo do front-end.
export const PRODUTOS_ENCOMENDAVEIS = [
  'bolo-cenoura', 'bolo-chocolate', 'bolo-milho', 'bolo-fuba', 'bolo-laranja', 'bolo-coco',
] as const
