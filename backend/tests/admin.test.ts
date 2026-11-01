import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { once } from 'node:events'
import { criarApp } from '../src/app.ts'
import { abrirEncomendas } from '../src/database/encomendas.ts'
import { gerarHash, verificarSenha } from '../src/auth/senha.ts'
import { pedido, TOKEN_TESTE } from './helpers.ts'

const senha = 'senha-ficticia-apenas-testes'
const senhaHash = await gerarHash(senha)
const origem = 'http://127.0.0.1:5173'
async function ambiente(t: TestContext, producao = false) {
  let agora = new Date('2026-10-31T12:00:00Z')
  const repo = abrirEncomendas(':memory:')
  const origin = producao ? 'https://cafe.example' : origem
  const server = criarApp(repo, { agora: () => agora, adminToken: TOKEN_TESTE, admin: { usuario: 'marta-teste', senhaHash, origem: origin, producao } }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  const endereco = server.address() as { port: number }
  const url = `http://127.0.0.1:${endereco.port}/api`
  t.after(async () => { await new Promise<void>((resolve) => server.close(() => resolve())); repo.fechar() })
  async function request(path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) {
    return fetch(url + path, { method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })
  }
  async function login(headers: Record<string, string> = {}) {
    const res = await request('/admin/login', 'POST', { usuario: 'marta-teste', senha }, { Origin: origin, ...headers })
    assert.equal(res.status, 200)
    const dados = await res.json() as { csrfToken: string }
    const setCookie = res.headers.get('set-cookie')!
    return { cookie: setCookie.split(';')[0]!, csrf: dados.csrfToken, setCookie }
  }
  return { repo, request, login, origin, mudarRelogio: (tempo: string) => { agora = new Date(tempo) } }
}

test('hash scrypt tem salt individual, verifica a senha e recusa senha incorreta', async () => {
  assert.match(senhaHash, /^scrypt\$/)
  assert.equal(await verificarSenha(senha, senhaHash), true)
  assert.equal(await verificarSenha('errada', senhaHash), false)
  assert.notEqual(await gerarHash(senha), senhaHash)
  await assert.rejects(gerarHash('curta'))
})

test('login cria cookie HttpOnly e sessão; listagem não expõe dados sem acesso', async (t) => {
  const a = await ambiente(t)
  a.repo.criar(pedido, () => new Date('2026-10-31T12:00:00Z'))
  assert.equal((await a.request('/encomendas')).status, 401)
  assert.equal((await a.request('/encomendas/1')).status, 401)
  assert.equal((await a.request('/admin/sessao')).status, 401)
  const s = await a.login()
  assert.match(s.setCookie, /HttpOnly/)
  assert.match(s.setCookie, /SameSite=Strict/)
  assert.match(s.setCookie, /Path=\//)
  assert.doesNotMatch(s.setCookie, /Secure/)
  const sessao = await a.request('/admin/sessao', 'GET', undefined, { Cookie: s.cookie })
  assert.equal(sessao.status, 200)
  assert.equal((await sessao.json() as { csrfToken: string }).csrfToken, s.csrf)
  const lista = await a.request('/encomendas', 'GET', undefined, { Cookie: s.cookie })
  assert.equal(lista.status, 200)
  assert.equal((await lista.json() as unknown[]).length, 1)
  assert.equal(lista.headers.get('cache-control'), 'no-store')
})

test('credenciais inválidas, origem maliciosa e login sem origem são rejeitados', async (t) => {
  const a = await ambiente(t)
  for (const body of [{ usuario: 'errado', senha }, { usuario: 'marta-teste', senha: 'errada' }]) {
    const res = await a.request('/admin/login', 'POST', body, { Origin: origem })
    assert.equal(res.status, 401)
    assert.equal(res.headers.get('set-cookie'), null)
    assert.deepEqual(await res.json(), { erro: 'Usuário ou senha incorretos.' })
  }
  const origensInvalidas: Record<string, string>[] = [{}, { Origin: 'https://invasor.example' }, { Origin: origem, 'Sec-Fetch-Site': 'cross-site' }]
  for (const headers of origensInvalidas) {
    assert.equal((await a.request('/admin/login', 'POST', { usuario: 'marta-teste', senha }, headers)).status, 403)
  }
})

test('sessão altera status e exclui; ausência/erro de CSRF e acesso anônimo não modificam SQLite', async (t) => {
  const a = await ambiente(t)
  const id = a.repo.criar(pedido, () => new Date('2026-10-31T12:00:00Z')).id
  const s = await a.login()
  for (const method of ['PATCH', 'DELETE']) {
    const body = method === 'PATCH' ? { status: 'em preparo' } : undefined
    assert.equal((await a.request(`/encomendas/${id}`, method, body)).status, 401)
    const csrfInvalido: Record<string, string>[] = [{ Cookie: s.cookie, Origin: origem }, { Cookie: s.cookie, Origin: origem, 'X-CSRF-Token': 'errado' }, { Cookie: s.cookie, Origin: 'https://invasor.example', 'X-CSRF-Token': s.csrf }]
    for (const headers of csrfInvalido) {
      assert.equal((await a.request(`/encomendas/${id}`, method, body, headers)).status, 403)
    }
  }
  assert.equal(a.repo.buscar(id).status, 'recebida')
  const headers = { Cookie: s.cookie, Origin: origem, 'X-CSRF-Token': s.csrf }
  for (const status of ['em preparo', 'entregue', 'recebida']) {
    const res = await a.request(`/encomendas/${id}`, 'PATCH', { status }, headers)
    assert.equal(res.status, 200)
    assert.equal(a.repo.buscar(id).status, status)
    assert.equal(a.repo.disponibilidade(pedido.dataEntrega).quantidadeReservada, 1)
  }
  assert.equal((await a.request(`/encomendas/${id}`, 'DELETE', undefined, headers)).status, 204)
  assert.equal(a.repo.disponibilidade(pedido.dataEntrega).quantidadeReservada, 0)
})

test('logout exige CSRF, invalida sessão no servidor e limpa cookie', async (t) => {
  const a = await ambiente(t)
  const s = await a.login()
  assert.equal((await a.request('/admin/logout', 'POST', {}, { Cookie: s.cookie, Origin: origem })).status, 403)
  const res = await a.request('/admin/logout', 'POST', {}, { Cookie: s.cookie, Origin: origem, 'X-CSRF-Token': s.csrf })
  assert.equal(res.status, 204)
  assert.match(res.headers.get('set-cookie')!, /Expires=Thu, 01 Jan 1970/)
  assert.equal((await a.request('/encomendas', 'GET', undefined, { Cookie: s.cookie })).status, 401)
})

test('sessão expira após oito horas e novo login renova identificador e CSRF', async (t) => {
  const a = await ambiente(t)
  const anterior = await a.login()
  const atual = await a.login({ Cookie: anterior.cookie })
  assert.notEqual(anterior.cookie, atual.cookie)
  assert.notEqual(anterior.csrf, atual.csrf)
  assert.equal((await a.request('/encomendas', 'GET', undefined, { Cookie: anterior.cookie })).status, 401)
  a.mudarRelogio('2026-10-31T20:00:00Z')
  assert.equal((await a.request('/encomendas', 'GET', undefined, { Cookie: atual.cookie })).status, 401)
})

test('login limita tentativas por IP, ignora X-Forwarded-For e volta após a janela', async (t) => {
  const a = await ambiente(t)
  for (let i = 0; i < 5; i++) {
    assert.equal((await a.request('/admin/login', 'POST', { usuario: 'qualquer', senha: 'errada' }, { Origin: origem, 'X-Forwarded-For': `10.0.0.${i}` })).status, 401)
  }
  const res = await a.request('/admin/login', 'POST', { usuario: 'marta-teste', senha }, { Origin: origem })
  assert.equal(res.status, 429)
  assert.equal(res.headers.get('retry-after'), '900')
  a.mudarRelogio('2026-10-31T12:15:01Z')
  await a.login()
})

test('produção usa cookie Secure __Host; Bearer continua independente da sessão e de CSRF', async (t) => {
  const a = await ambiente(t, true)
  const s = await a.login()
  assert.match(s.setCookie, /^__Host-cafe_admin=/)
  assert.match(s.setCookie, /; Secure/)
  const id = a.repo.criar(pedido, () => new Date('2026-10-31T12:00:00Z')).id
  const bearer = { Authorization: `Bearer ${TOKEN_TESTE}` }
  assert.equal((await a.request('/encomendas', 'GET', undefined, bearer)).status, 200)
  assert.equal((await a.request(`/encomendas/${id}`, 'PATCH', { status: 'entregue' }, bearer)).status, 200)
  assert.equal((await a.request(`/encomendas/${id}`, 'DELETE', undefined, bearer)).status, 204)
})

test('não há conta padrão; configuração inválida falha e login não configurado retorna 503', async (t) => {
  const repo = abrirEncomendas(':memory:')
  t.after(() => repo.fechar())
  assert.throws(() => criarApp(repo, { admin: { usuario: 'marta', senhaHash: 'invalido', origem } }))
  assert.throws(() => criarApp(repo, { admin: { usuario: 'marta', senhaHash, origem, producao: true } }))
  const server = criarApp(repo).listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())))
  const res = await fetch(`http://127.0.0.1:${(server.address() as { port: number }).port}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origem }, body: JSON.stringify({ usuario: 'marta', senha }) })
  assert.equal(res.status, 503)
})

test('edição completa por sessão move bolos sem dupla contagem e conflito não salva nenhum campo', async (t) => {
  const a = await ambiente(t)
  const agora = () => new Date('2026-10-31T12:00:00Z')
  const original = a.repo.criar({ ...pedido, itens: [{ produto: 'bolo-cenoura', quantidade: 2 }] }, agora)
  a.repo.criar({ ...pedido, dataEntrega: '2026-11-03', itens: [{ produto: 'bolo-cenoura', quantidade: 3 }] }, agora)
  const s = await a.login()
  const headers = { Cookie: s.cookie, Origin: origem, 'X-CSRF-Token': s.csrf }
  const alteracoes = { nomeCliente: 'Cliente Revisado', telefone: '73988888888', dataEntrega: '2026-11-03', incluirPaoDeQueijo: false, status: 'em preparo', itens: [{ produto: 'bolo-coco', quantidade: 2 }] }
  assert.equal((await a.request(`/encomendas/${original.id}`, 'PATCH', alteracoes, headers)).status, 200)
  assert.deepEqual(a.repo.buscar(original.id), { id: original.id, ...alteracoes, totalBolos: 2 })
  assert.equal(a.repo.disponibilidade(pedido.dataEntrega).quantidadeDisponivel, 5)
  assert.equal(a.repo.disponibilidade('2026-11-03').quantidadeDisponivel, 0)
  const antes = a.repo.buscar(original.id)
  assert.equal((await a.request(`/encomendas/${original.id}`, 'PATCH', { nomeCliente: 'Não Pode Salvar', status: 'entregue', itens: [{ produto: 'bolo-cenoura', quantidade: 3 }] }, headers)).status, 409)
  assert.deepEqual(a.repo.buscar(original.id), antes)
  assert.equal((await a.request(`/encomendas/${original.id}`, 'PATCH', { itens: [{ produto: 'bolo-cenoura', quantidade: 1 }] }, headers)).status, 200)
  assert.equal(a.repo.disponibilidade('2026-11-03').quantidadeDisponivel, 1)
})
