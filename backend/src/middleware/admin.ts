import { createHash, timingSafeEqual } from 'node:crypto'
import type { RequestHandler } from 'express'
import { ApiError } from '../errors.ts'

export function protegerAdmin(token?: string): RequestHandler {
  return (req, _res, next) => {
    if (!token) throw new ApiError(503, 'Operações administrativas indisponíveis até configurar o acesso.')
    const recebido = req.get('authorization') ?? ''
    const hash = (texto: string) => createHash('sha256').update(texto).digest()
    if (!timingSafeEqual(hash(recebido), hash(`Bearer ${token}`))) {
      throw new ApiError(401, 'Acesso administrativo não autorizado.')
    }
    next()
  }
}
