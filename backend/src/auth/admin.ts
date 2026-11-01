import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import type { Request, RequestHandler, Response } from 'express'
import { ApiError } from '../errors.ts'
import { comparar, hashValido, verificarSenha } from './senha.ts'

export interface ConfigAdmin {
  usuario: string
  senhaHash: string
  origem: string
  producao?: boolean
}
const DURACAO = 8 * 60 * 60 * 1000
const JANELA = 15 * 60 * 1000
interface Sessao { csrf: string; expira: number }

export function criarAutenticacao(config?: ConfigAdmin, bearer?: string, agora = () => new Date()) {
  if (config && (!config.usuario.trim() || config.usuario.length > 100 || !hashValido(config.senhaHash)
    || new URL(config.origem).origin !== config.origem || (config.producao && !config.origem.startsWith('https://')))) {
    throw new Error('Configuração administrativa inválida. Confira usuário, hash e origem do site.')
  }
  // Uma instância da API: reiniciar encerra as sessões, sem apagar encomendas.
  const sessoes = new Map<string, Sessao>()
  const tentativas = new Map<string, { total: number; ate: number }>()
  let global = { total: 0, ate: 0 }
  let verificacoesAtivas = 0
  const cookieNome = config?.producao ? '__Host-cafe_admin' : 'cafe_admin'
  const cookieOpcoes = { httpOnly: true, secure: Boolean(config?.producao), sameSite: 'strict' as const, path: '/' }
  function idCookie(req: Request) {
    return req.headers.cookie?.split(';').map((parte) => parte.trim()).find((parte) => parte.startsWith(`${cookieNome}=`))?.slice(cookieNome.length + 1) ?? ''
  }
  function limparExpiradas() {
    const tempo = agora().getTime()
    for (const [id, sessao] of sessoes) if (sessao.expira <= tempo) sessoes.delete(id)
    for (const [ip, tentativa] of tentativas) if (tentativa.ate <= tempo) tentativas.delete(ip)
  }
  function sessaoAtual(req: Request) {
    limparExpiradas()
    const sessao = sessoes.get(idCookie(req))
    if (!sessao) throw new ApiError(401, 'Sua sessão terminou. Entre novamente para continuar.')
    return sessao
  }
  function exigirOrigem(req: Request) {
    // Origem explícita; não confiar em Host ou X-Forwarded-Host fornecidos pelo cliente.
    if (!config || req.get('origin') !== config.origem || req.get('sec-fetch-site') === 'cross-site') {
      throw new ApiError(403, 'Origem da solicitação não autorizada.')
    }
  }
  function exigirCsrf(req: Request, sessao: Sessao) {
    exigirOrigem(req)
    if (!comparar(req.get('x-csrf-token') ?? '', sessao.csrf)) throw new ApiError(403, 'Proteção de segurança inválida. Recarregue o painel e tente novamente.')
  }
  function responderSessao(res: Response, sessao: Sessao) {
    res.json({ csrfToken: sessao.csrf, expiraEm: new Date(sessao.expira).toISOString() })
  }
  const proteger: RequestHandler = (req, _res, next) => {
    if (!config && !bearer) throw new ApiError(503, 'Operações administrativas indisponíveis até configurar o acesso.')
    const authorization = req.get('authorization')
    if (authorization !== undefined) {
      if (!bearer || !comparar(authorization, `Bearer ${bearer}`)) throw new ApiError(401, 'Acesso administrativo não autorizado.')
    } else {
      const sessao = sessaoAtual(req)
      if (!['GET', 'HEAD'].includes(req.method)) exigirCsrf(req, sessao)
    }
    next()
  }
  const rotas = Router()
  rotas.get('/sessao', (req, res) => responderSessao(res, sessaoAtual(req)))
  rotas.post('/login', async (req, res) => {
    if (!config) throw new ApiError(503, 'O acesso ao painel ainda não foi configurado. Configure as credenciais no servidor.')
    exigirOrigem(req)
    limparExpiradas()
    const tempo = agora().getTime()
    const ip = req.ip ?? 'local'
    if (global.ate <= tempo) global = { total: 0, ate: tempo + JANELA }
    const tentativa = tentativas.get(ip) ?? { total: 0, ate: tempo + JANELA }
    if (tentativa.total >= 5 || global.total >= 30 || tentativas.size >= 1000 || verificacoesAtivas >= 2) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((tentativa.ate - tempo) / 1000))))
      throw new ApiError(429, 'Muitas tentativas de entrada. Aguarde 15 minutos e tente novamente.')
    }
    tentativa.total++
    global.total++
    tentativas.set(ip, tentativa)
    const { usuario, senha } = req.body ?? {}
    if (typeof usuario !== 'string' || typeof senha !== 'string' || usuario.length > 100 || senha.length > 128 || !senha) {
      throw new ApiError(400, 'Informe usuário e senha válidos.')
    }
    verificacoesAtivas++
    let senhaCorreta: boolean
    try { senhaCorreta = await verificarSenha(senha, config.senhaHash) } finally { verificacoesAtivas-- }
    if (!senhaCorreta || !comparar(usuario, config.usuario)) throw new ApiError(401, 'Usuário ou senha incorretos.')
    sessoes.delete(idCookie(req))
    if (sessoes.size >= 100) sessoes.delete(sessoes.keys().next().value!)
    const id = randomBytes(32).toString('hex')
    const sessao = { csrf: randomBytes(32).toString('hex'), expira: agora().getTime() + DURACAO }
    sessoes.set(id, sessao)
    res.cookie(cookieNome, id, { ...cookieOpcoes, maxAge: DURACAO })
    responderSessao(res, sessao)
  })
  rotas.post('/logout', (req, res) => {
    exigirCsrf(req, sessaoAtual(req))
    sessoes.delete(idCookie(req))
    res.clearCookie(cookieNome, cookieOpcoes).status(204).end()
  })
  return { rotas, proteger }
}
