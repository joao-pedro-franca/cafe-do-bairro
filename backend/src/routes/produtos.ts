import { Router } from 'express'
import type { RequestHandler } from 'express'
import type { RepositorioEncomendas } from '../database/encomendas.ts'

export function rotasProdutos(repo: RepositorioEncomendas, proteger?: RequestHandler) {
  const rotas = Router()
  if (proteger) rotas.use(proteger)
  rotas.get('/', (_req, res) => res.json(repo.listarProdutos()))
  if (proteger) rotas.patch('/:id', (req, res) => res.json(repo.configurarProduto(String(req.params.id), req.body)))
  return rotas
}
