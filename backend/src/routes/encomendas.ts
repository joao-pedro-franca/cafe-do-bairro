import { Router } from 'express'
import type { RequestHandler } from 'express'
import { validarEntrada } from '../encomenda.ts'
import type { DadosEncomenda } from '../encomenda.ts'
import type { RepositorioEncomendas } from '../database/encomendas.ts'
import { ApiError } from '../errors.ts'

export function rotasEncomendas(repo: RepositorioEncomendas, agora: () => Date, proteger: RequestHandler) {
  const rotas = Router()
  function idValido(valor: string | string[] | undefined) {
    if (typeof valor !== 'string' || !/^[1-9]\d*$/.test(valor) || !Number.isSafeInteger(Number(valor))) {
      throw new ApiError(400, 'Informe um ID inteiro positivo.')
    }
    return Number(valor)
  }
  rotas.post('/', (req, res) => {
    const dados = validarEntrada(req.body, false, agora()) as DadosEncomenda
    const encomenda = repo.criar(dados, agora)
    res.status(201).location(`/api/encomendas/${encomenda.id}`).json(encomenda)
  })
  rotas.use(proteger)
  rotas.get('/', (_req, res) => res.json(repo.listar()))
  rotas.get('/:id', (req, res) => res.json(repo.buscar(idValido(req.params.id))))
  rotas.patch('/:id', (req, res) => {
    const id = idValido(req.params.id)
    // Uma data reenviada também é validada. O cliente pode omiti-la para editar só o status.
    const alteracoes = validarEntrada(req.body, true, agora())
    res.json(repo.atualizar(id, alteracoes, agora))
  })
  rotas.delete('/:id', (req, res) => {
    repo.remover(idValido(req.params.id))
    res.status(204).end()
  })
  return rotas
}
