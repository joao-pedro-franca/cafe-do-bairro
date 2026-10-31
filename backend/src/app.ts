import express from 'express'
import type { ErrorRequestHandler } from 'express'
import type { RepositorioEncomendas } from './database/encomendas.ts'
import { ApiError } from './errors.ts'
import { rotasEncomendas } from './routes/encomendas.ts'

export function criarApp(repo: RepositorioEncomendas, opcoes: { agora?: () => Date; adminToken?: string } = {}) {
  const app = express()
  app.disable('x-powered-by')
  app.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    res.set('X-Content-Type-Options', 'nosniff')
    next()
  })
  app.use((req, _res, next) => {
    if (['POST', 'PATCH'].includes(req.method) && !req.is('application/json')) {
      throw new ApiError(415, 'Envie os dados como application/json.')
    }
    next()
  })
  app.use(express.json({ limit: '16kb' }))
  app.use('/api/encomendas', rotasEncomendas(repo, opcoes.agora ?? (() => new Date()), opcoes.adminToken))
  app.use((_req, _res) => { throw new ApiError(404, 'Rota não encontrada.') })
  const tratarErro: ErrorRequestHandler = (erro: unknown, _req, res, _next) => {
    if (erro instanceof ApiError) {
      res.status(erro.status).json({ erro: erro.message })
      return
    }
    const tipo = (erro as { type?: string })?.type
    if (tipo === 'entity.parse.failed' || tipo === 'entity.too.large') {
      res.status(tipo === 'entity.too.large' ? 413 : 400).json({ erro: tipo === 'entity.too.large' ? 'O corpo da requisição é muito grande.' : 'O JSON enviado é inválido.' })
      return
    }
    const codigo = ((erro as { errcode?: number })?.errcode ?? 0) & 255
    if (codigo === 5 || codigo === 6) {
      res.status(503).set('Retry-After', '1').json({ erro: 'O banco está ocupado. Tente novamente em instantes.' })
      return
    }
    // Não enviar SQL, stack trace, token ou dados do pedido na resposta/log.
    res.status(500).json({ erro: 'Não foi possível concluir a operação.' })
  }
  app.use(tratarErro)
  return app
}
