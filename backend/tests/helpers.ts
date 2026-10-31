import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { TestContext } from 'node:test'
import { criarApp } from '../src/app.ts'
import { abrirEncomendas } from '../src/database/encomendas.ts'

// Credencial fictícia e exclusiva dos testes; o servidor não tem token padrão.
export const TOKEN_TESTE = 'token-ficticio-exclusivo-dos-testes-12345'
export const pedido = { nomeCliente: 'Cliente de Teste', telefone: '(73) 99999-9999', produto: 'bolo-cenoura', dataEntrega: '2026-11-02', incluirPaoDeQueijo: true, quantidadeBolos: 1 }

const limpezas = new WeakMap<TestContext, (() => Promise<unknown>)[]>()
export function aoTerminar(t: TestContext, limpeza: () => Promise<unknown>) {
  if (!limpezas.has(t)) {
    const tarefas: (() => Promise<unknown>)[] = []
    limpezas.set(t, tarefas)
    t.after(async () => { for (const tarefa of tarefas.reverse()) await tarefa() })
  }
  limpezas.get(t)!.push(limpeza)
}

export async function pastaTemporaria(t: TestContext) {
  const pasta = await mkdtemp(join(tmpdir(), 'cafe-api-test-'))
  aoTerminar(t, () => rm(pasta, { recursive: true, force: true }))
  return pasta
}

export async function apiTeste(t: TestContext, opcoes: { arquivo?: string; adminToken?: string | null } = {}) {
  let agora = new Date('2026-10-31T12:00:00Z')
  const repo = abrirEncomendas(opcoes.arquivo ?? ':memory:')
  const app = criarApp(repo, { agora: () => agora, adminToken: opcoes.adminToken === null ? undefined : opcoes.adminToken ?? TOKEN_TESTE })
  const servidor = app.listen(0, '127.0.0.1')
  await once(servidor, 'listening')
  const endereco = servidor.address()
  if (!endereco || typeof endereco === 'string') throw new Error('Porta não encontrada')
  const base = `http://127.0.0.1:${endereco.port}/api/encomendas`
  async function fechar() {
    await new Promise<void>((resolver, rejeitar) => servidor.close((erro) => erro ? rejeitar(erro) : resolver()))
    repo.fechar()
  }
  let encerrado = false
  const encerrar = async () => { if (!encerrado) { encerrado = true; await fechar() } }
  aoTerminar(t, encerrar)
  return {
    base,
    request: (metodo: string, caminho = '', corpo?: unknown, autorizado = true) => requisicao(base, metodo, caminho, corpo, autorizado),
    mudarRelogio: (valor: string) => { agora = new Date(valor) },
    fechar: encerrar,
  }
}

export async function requisicao(base: string, metodo: string, caminho = '', corpo?: unknown, autorizado = true) {
  const resposta = await fetch(`${base}${caminho}`, {
    signal: AbortSignal.timeout(5000),
    method: metodo,
    headers: { ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(autorizado ? { Authorization: `Bearer ${TOKEN_TESTE}` } : {}) },
    ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
  })
  const dados = resposta.status === 204 ? null : await resposta.json()
  return { status: resposta.status, dados, headers: resposta.headers }
}
