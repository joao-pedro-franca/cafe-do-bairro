import { criarApp } from '../../src/app.ts'
import { abrirEncomendas } from '../../src/database/encomendas.ts'
import { TOKEN_TESTE } from '../helpers.ts'

const repo = abrirEncomendas(process.env.TEST_DATABASE_PATH!)
const servidor = criarApp(repo, { agora: () => new Date('2026-10-31T12:00:00Z'), adminToken: TOKEN_TESTE }).listen(0, '127.0.0.1', () => {
  const endereco = servidor.address()
  if (endereco && typeof endereco !== 'string') process.send?.({ porta: endereco.port })
})
process.on('message', (mensagem) => {
  if (mensagem === 'fechar') servidor.close(() => { repo.fechar(); process.exit(0) })
})
