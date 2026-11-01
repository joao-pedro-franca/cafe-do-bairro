import { criarApp } from './app.ts'
import { abrirEncomendas } from './database/encomendas.ts'
import type { ConfigAdmin } from './auth/admin.ts'

const porta = Number(process.env.PORT ?? 3001)
const token = process.env.ADMIN_TOKEN
if (!Number.isInteger(porta) || porta < 1 || porta > 65535) throw new Error('PORT deve estar entre 1 e 65535.')
if (token !== undefined && token.length < 32) throw new Error('ADMIN_TOKEN deve ter ao menos 32 caracteres.')
const usuario = process.env.ADMIN_USER
const senhaHash = process.env.ADMIN_PASSWORD_HASH
const producao = process.env.NODE_ENV === 'production'
if (Boolean(usuario) !== Boolean(senhaHash)) throw new Error('Configure ADMIN_USER e ADMIN_PASSWORD_HASH juntos.')
if (producao && !process.env.ADMIN_ORIGIN) throw new Error('Configure ADMIN_ORIGIN com a origem HTTPS do site.')
if (producao && !usuario) throw new Error('Configure as credenciais administrativas antes de iniciar em produção.')
const admin: ConfigAdmin | undefined = usuario && senhaHash ? {
  usuario, senhaHash, producao, origem: process.env.ADMIN_ORIGIN ?? 'http://127.0.0.1:5173',
} : undefined
const repo = abrirEncomendas(process.env.DATABASE_PATH ?? './data/cafe.sqlite')
const app = criarApp(repo, { adminToken: token, admin })
const servidor = app.listen(porta, '127.0.0.1', () => {
  console.log(`API local: http://127.0.0.1:${porta}/api/encomendas`)
  if (!admin) console.log('Login do painel indisponível: configure ADMIN_USER e ADMIN_PASSWORD_HASH no servidor.')
  if (!token && !admin) console.log('Rotas administrativas bloqueadas até configurar o acesso.')
})
function encerrar() {
  servidor.close(() => { repo.fechar(); process.exit(0) })
}
process.on('SIGINT', encerrar)
process.on('SIGTERM', encerrar)
servidor.on('error', () => { repo.fechar(); console.error('Não foi possível iniciar a API. Verifique a porta.'); process.exit(1) })
