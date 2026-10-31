import { Router } from 'express'
import type { RepositorioEncomendas } from '../database/encomendas.ts'
import { validarData } from '../encomenda.ts'

export function rotasDisponibilidade(repo: RepositorioEncomendas, agora: () => Date) {
  const rotas = Router()
  rotas.get('/', (req, res) => {
    const data = req.query.data
    validarData(data, agora())
    // Somente agregados públicos: nenhuma linha de encomenda ou dado pessoal é retornado.
    res.json(repo.disponibilidade(data))
  })
  return rotas
}
