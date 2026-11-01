import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { alterarStatus, consultarSessao, entrarAdmin, ErroAdmin, listarPedidos } from '../src/services/admin.ts'
import { comPrecos } from './fixtures/precos.mjs'

const fetchOriginal = globalThis.fetch
afterEach(() => { globalThis.fetch = fetchOriginal })

test('painel recusa resposta 200 inválida antes que vire sessão ou lista e quebre a tela', async () => {
  for (const corpo of ['<html>Conexão interrompida</html>', 'null', '{}']) {
    globalThis.fetch = async () => new Response(corpo, { status: 200 })
    await assert.rejects(consultarSessao(), /resposta|Resposta/)
    await assert.rejects(entrarAdmin('teste', 'senha-ficticia'), /resposta|Resposta/)
    await assert.rejects(listarPedidos(), /resposta|Resposta/)
  }
})

const pedido = comPrecos({ id: 1, totalBolos: 2, nomeCliente: 'Cliente Fictício', telefone: '73999999999', dataEntrega: '2099-12-25', incluirPaoDeQueijo: true, status: 'em preparo', itens: [{ produto: 'bolo-cenoura', quantidade: 2 }] })
test('painel valida registros e confirmação de status antes de atualizar a interface', async () => {
  for (const corpo of [[null], [{}], [{ ...pedido, itens: [{ produto: 'bolo-cenoura', quantidade: null }] }]]) {
    globalThis.fetch = async () => Response.json(corpo)
    await assert.rejects(listarPedidos(), ErroAdmin)
  }
  for (const corpo of [null, { ...pedido, id: 2 }, { ...pedido, status: 'recebida' }]) {
    globalThis.fetch = async () => Response.json(corpo)
    await assert.rejects(alterarStatus(1, 'em preparo', 'csrf-ficticio'), ErroAdmin)
  }
  globalThis.fetch = async () => Response.json([pedido])
  assert.deepEqual(await listarPedidos(), [pedido])
  globalThis.fetch = async () => Response.json(pedido)
  assert.deepEqual(await alterarStatus(1, 'em preparo', 'csrf-ficticio'), pedido)
})
