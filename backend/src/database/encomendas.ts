import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { LIMITE_DIARIO, PRODUTOS_ENCOMENDAVEIS } from '../config.ts'
import { ApiError } from '../errors.ts'
import { totalBolos, validarData, validarItens } from '../encomenda.ts'
import type { AlteracaoEncomenda, DadosEncomenda, Encomenda } from '../encomenda.ts'
import { CATALOGO } from '../catalogo.ts'
import type { CatalogoPrecos } from '../catalogo.ts'
import { centavosValidos, precificarItens, resumirValores } from '../precificacao.ts'
import type { ItemPrecificado } from '../precificacao.ts'

export function abrirEncomendas(caminho: string, catalogo: CatalogoPrecos = CATALOGO) {
  // Congela a referência desta instância; mudanças de catálogo exigem novo deploy.
  catalogo = { produtos: { ...catalogo.produtos }, paoDeQueijoCentavos: catalogo.paoDeQueijoCentavos }
  if (![...PRODUTOS_ENCOMENDAVEIS.map((id) => catalogo.produtos[id]), catalogo.paoDeQueijoCentavos].every((valor) => centavosValidos(valor) && valor > 0)) throw new Error('Catálogo de preços inválido.')
  if (caminho !== ':memory:') mkdirSync(dirname(resolve(caminho)), { recursive: true })
  const db = new DatabaseSync(caminho)
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;')
  db.exec('BEGIN IMMEDIATE')
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS encomendas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nomeCliente TEXT NOT NULL,
        telefone TEXT NOT NULL,
        dataEntrega TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'recebida' CHECK(status IN ('recebida', 'em preparo', 'entregue')),
        incluirPaoDeQueijo INTEGER NOT NULL DEFAULT 0 CHECK(incluirPaoDeQueijo IN (0, 1))
      ) STRICT;
      CREATE INDEX IF NOT EXISTS idx_encomendas_data ON encomendas(dataEntrega);
      CREATE TABLE IF NOT EXISTS encomenda_itens (
        encomendaId INTEGER NOT NULL REFERENCES encomendas(id) ON DELETE CASCADE,
        produto TEXT NOT NULL CHECK(produto IN (${PRODUTOS_ENCOMENDAVEIS.map((id) => "'" + id + "'").join(',')})),
        quantidade INTEGER NOT NULL CHECK(quantidade > 0),
        ordem INTEGER NOT NULL CHECK(ordem >= 0),
        PRIMARY KEY(encomendaId, produto),
        UNIQUE(encomendaId, ordem)
      ) STRICT;
    `)
    const colunas = db.prepare('PRAGMA table_info(encomendas)').all() as { name: string }[]
    if (colunas.some((coluna) => coluna.name === 'produto')) {
      const quantidade = colunas.some((coluna) => coluna.name === 'quantidadeBolos') ? 'quantidadeBolos' : '1'
      // Copia e remove somente as colunas antigas: IDs, sequência e metadados permanecem.
      // Tudo ocorre sob o mesmo bloqueio; uma falha reverte inclusive o esquema.
      db.exec('INSERT INTO encomenda_itens(encomendaId, produto, quantidade, ordem) SELECT id, produto, ' + quantidade + ', 0 FROM encomendas')
      db.exec('ALTER TABLE encomendas DROP COLUMN produto')
      if (quantidade !== '1') db.exec('ALTER TABLE encomendas DROP COLUMN quantidadeBolos')
    }
    const colunasItens = db.prepare('PRAGMA table_info(encomenda_itens)').all() as { name: string }[]
    if (!colunasItens.some((coluna) => coluna.name === 'precoUnitarioCentavos')) {
      // Reconstrói somente a tabela filha, dentro da migração já transacional.
      // Preços legados são uma inicialização pelo catálogo atual, não prova do acordo original.
      db.exec(`ALTER TABLE encomenda_itens RENAME TO encomenda_itens_sem_precos;
        CREATE TABLE encomenda_itens (
          encomendaId INTEGER NOT NULL REFERENCES encomendas(id) ON DELETE CASCADE,
          produto TEXT NOT NULL CHECK(produto IN (${PRODUTOS_ENCOMENDAVEIS.map((id) => "'" + id + "'").join(',')})),
          quantidade INTEGER NOT NULL CHECK(quantidade > 0),
          ordem INTEGER NOT NULL CHECK(ordem >= 0),
          precoUnitarioCentavos INTEGER NOT NULL CHECK(precoUnitarioCentavos > 0),
          PRIMARY KEY(encomendaId, produto), UNIQUE(encomendaId, ordem)
        ) STRICT;
        ALTER TABLE encomendas ADD COLUMN valorPaoDeQueijoCentavos INTEGER NOT NULL DEFAULT 0 CHECK(valorPaoDeQueijoCentavos >= 0);
        ALTER TABLE encomendas ADD COLUMN precosInicializados INTEGER NOT NULL DEFAULT 0 CHECK(precosInicializados IN (0, 1));`)
      const antigos = db.prepare('SELECT * FROM encomenda_itens_sem_precos').all() as { encomendaId: number; produto: string; quantidade: number; ordem: number }[]
      const inserir = db.prepare('INSERT INTO encomenda_itens VALUES (?, ?, ?, ?, ?)')
      for (const item of antigos) inserir.run(item.encomendaId, item.produto, item.quantidade, item.ordem, catalogo.produtos[item.produto])
      db.prepare('UPDATE encomendas SET valorPaoDeQueijoCentavos = CASE WHEN incluirPaoDeQueijo = 1 THEN ? ELSE 0 END, precosInicializados = 1').run(catalogo.paoDeQueijoCentavos)
      db.exec('DROP TABLE encomenda_itens_sem_precos')
    }
    db.exec('COMMIT')
  } catch (erro) {
    db.exec('ROLLBACK')
    db.close()
    throw erro
  }

  type Linha = Omit<Encomenda, 'itens' | 'totalBolos' | 'incluirPaoDeQueijo' | 'precosInicializados'> & { incluirPaoDeQueijo: number; precosInicializados: number; produto: string | null; quantidade: number | null; precoUnitarioCentavos: number }
  function ler(id?: number): Encomenda[] {
    // Um SELECT fornece um snapshot consistente de metadados e itens, inclusive entre processos.
    const sql = 'SELECT e.*, i.produto, i.quantidade, i.precoUnitarioCentavos FROM encomendas e LEFT JOIN encomenda_itens i ON i.encomendaId = e.id'
      + (id === undefined ? '' : ' WHERE e.id = ?') + ' ORDER BY e.dataEntrega, e.id, i.ordem'
    const linhas = (id === undefined ? db.prepare(sql).all() : db.prepare(sql).all(id)) as Linha[]
    const pedidos = new Map<number, Encomenda>()
    for (const linha of linhas) {
      let pedido = pedidos.get(linha.id)
      if (!pedido) {
        pedido = { id: linha.id, nomeCliente: linha.nomeCliente, telefone: linha.telefone, dataEntrega: linha.dataEntrega,
          status: linha.status, incluirPaoDeQueijo: linha.incluirPaoDeQueijo === 1, totalBolos: 0,
          ...resumirValores([], linha.valorPaoDeQueijoCentavos, linha.precosInicializados === 1) }
        pedidos.set(linha.id, pedido)
      }
      if (linha.produto !== null && linha.quantidade !== null) {
        pedido.itens.push({ produto: linha.produto, quantidade: linha.quantidade, precoUnitarioCentavos: linha.precoUnitarioCentavos, subtotalCentavos: linha.quantidade * linha.precoUnitarioCentavos })
        pedido.totalBolos += linha.quantidade
        Object.assign(pedido, resumirValores(pedido.itens, pedido.valorPaoDeQueijoCentavos, pedido.precosInicializados))
      }
    }
    return [...pedidos.values()]
  }
  function buscar(id: number) {
    const pedido = ler(id)[0]
    if (!pedido) throw new ApiError(404, 'Encomenda não encontrada.')
    return pedido
  }
  function quantidadeReservada(data: string, ignorarId = 0) {
    const { total } = db.prepare('SELECT COALESCE(SUM(i.quantidade), 0) AS total FROM encomenda_itens i JOIN encomendas e ON e.id = i.encomendaId WHERE e.dataEntrega = ? AND e.id <> ?').get(data, ignorarId) as { total: number }
    return total
  }
  function exigirVaga(data: string, quantidade: number, ignorarId = 0) {
    if (quantidadeReservada(data, ignorarId) + quantidade > LIMITE_DIARIO) {
      throw new ApiError(409, 'A quantidade de bolos solicitada ultrapassa a disponibilidade dessa data. Consulte o saldo e ajuste os itens ou escolha outro dia.')
    }
  }
  function gravarItens(id: number, itens: ItemPrecificado[]) {
    db.prepare('DELETE FROM encomenda_itens WHERE encomendaId = ?').run(id)
    const inserir = db.prepare('INSERT INTO encomenda_itens(encomendaId, produto, quantidade, ordem, precoUnitarioCentavos) VALUES (?, ?, ?, ?, ?)')
    itens.forEach((item, ordem) => inserir.run(id, item.produto, item.quantidade, ordem, item.precoUnitarioCentavos))
  }
  function transacao<T>(acao: () => T): T {
    db.exec('BEGIN IMMEDIATE')
    try { const resultado = acao(); db.exec('COMMIT'); return resultado }
    catch (erro) { db.exec('ROLLBACK'); throw erro }
  }
  return {
    fechar: () => db.close(),
    buscar,
    disponibilidade(data: string) {
      const reservada = quantidadeReservada(data)
      return { data, limiteDiario: LIMITE_DIARIO, quantidadeReservada: reservada, quantidadeDisponivel: Math.max(0, LIMITE_DIARIO - reservada) }
    },
    listar: () => ler(),
    criar(dados: DadosEncomenda, agora: () => Date) {
      return transacao(() => {
        const itens = validarItens(dados.itens)
        validarData(dados.dataEntrega, agora())
        exigirVaga(dados.dataEntrega, totalBolos(itens))
        const registro = db.prepare('INSERT INTO encomendas(nomeCliente, telefone, dataEntrega, incluirPaoDeQueijo, valorPaoDeQueijoCentavos) VALUES (?, ?, ?, ?, ?)')
          .run(dados.nomeCliente, dados.telefone, dados.dataEntrega, Number(dados.incluirPaoDeQueijo), dados.incluirPaoDeQueijo ? catalogo.paoDeQueijoCentavos : 0)
        const id = Number(registro.lastInsertRowid)
        gravarItens(id, precificarItens(itens, catalogo))
        return buscar(id)
      })
    },
    atualizar(id: number, alteracoes: AlteracaoEncomenda, agora: () => Date) {
      return transacao(() => {
        const anterior = buscar(id)
        const atual = { ...anterior, ...alteracoes }
        const itens = alteracoes.itens === undefined ? anterior.itens.map(({ produto, quantidade }) => ({ produto, quantidade })) : validarItens(alteracoes.itens)
        const valorPaoDeQueijoCentavos = atual.incluirPaoDeQueijo ? (anterior.incluirPaoDeQueijo ? anterior.valorPaoDeQueijoCentavos : catalogo.paoDeQueijoCentavos) : 0
        // Trocar composição sem mudar o total continua permitido em datas antigas.
        if (atual.dataEntrega !== anterior.dataEntrega || totalBolos(itens) !== anterior.totalBolos) {
          validarData(atual.dataEntrega, agora())
          exigirVaga(atual.dataEntrega, totalBolos(itens), id)
        }
        db.prepare('UPDATE encomendas SET nomeCliente = ?, telefone = ?, dataEntrega = ?, status = ?, incluirPaoDeQueijo = ?, valorPaoDeQueijoCentavos = ? WHERE id = ?')
          .run(atual.nomeCliente, atual.telefone, atual.dataEntrega, atual.status, Number(atual.incluirPaoDeQueijo), valorPaoDeQueijoCentavos, id)
        if (alteracoes.itens !== undefined) gravarItens(id, precificarItens(itens, catalogo, anterior.itens))
        return buscar(id)
      })
    },
    remover(id: number) {
      const resultado = db.prepare('DELETE FROM encomendas WHERE id = ?').run(id)
      if (!resultado.changes) throw new ApiError(404, 'Encomenda não encontrada.')
    },
  }
}
export type RepositorioEncomendas = ReturnType<typeof abrirEncomendas>
