import { criarApp } from './app.ts'
import { abrirEncomendas } from './database/encomendas.ts'

const porta = Number(process.env.PORT ?? 3001)
const token = process.env.ADMIN_TOKEN
if (!Number.isInteger(porta) || porta < 1 || porta > 65535) throw new Error('PORT deve estar entre 1 e 65535.')
if (token !== undefined && token.length < 32) throw new Error('ADMIN_TOKEN deve ter ao menos 32 caracteres.')
if (process.env.NODE_ENV === 'production' && !token) throw new Error('Configure ADMIN_TOKEN antes de iniciar em produção.')
const repo = abrirEncomendas(process.env.DATABASE_PATH ?? './data/cafe.sqlite')
const app = criarApp(repo, { adminToken: token })
const servidor = app.listen(porta, '127.0.0.1', () => {
  console.log(`API local: http://127.0.0.1:${porta}/api/encomendas`)
  if (!token) console.log('Rotas administrativas bloqueadas: configure ADMIN_TOKEN para testar o CRUD completo.')
})
function encerrar() {
  servidor.close(() => { repo.fechar(); process.exit(0) })
}
process.on('SIGINT', encerrar)
process.on('SIGTERM', encerrar)
servidor.on('error', () => { repo.fechar(); console.error('Não foi possível iniciar a API. Verifique a porta.'); process.exit(1) })
