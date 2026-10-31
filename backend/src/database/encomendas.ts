import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { LIMITE_DIARIO } from '../config.ts'
import { ApiError } from '../errors.ts'
import { validarData } from '../encomenda.ts'
import type { AlteracaoEncomenda, DadosEncomenda, Encomenda } from '../encomenda.ts'

interface Registro extends Omit<Encomenda, 'incluirPaoDeQueijo'> { incluirPaoDeQueijo: number }

export function abrirEncomendas(caminho: string) {
  if (caminho !== ':memory:') mkdirSync(dirname(resolve(caminho)), { recursive: true })
  const db = new DatabaseSync(caminho)
  db.exec(`
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS encomendas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nomeCliente TEXT NOT NULL,
      telefone TEXT NOT NULL,
      produto TEXT NOT NULL,
      dataEntrega TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'recebida' CHECK(status IN ('recebida', 'em preparo', 'entregue')),
      incluirPaoDeQueijo INTEGER NOT NULL DEFAULT 0 CHECK(incluirPaoDeQueijo IN (0, 1))
    ) STRICT;
    CREATE INDEX IF NOT EXISTS idx_encomendas_data ON encomendas(dataEntrega);
  `)

  function converter(registro: unknown): Encomenda {
    const linha = registro as Registro
    return { ...linha, incluirPaoDeQueijo: linha.incluirPaoDeQueijo === 1 }
  }
  function buscar(id: number) {
    const linha = db.prepare('SELECT * FROM encomendas WHERE id = ?').get(id)
    if (!linha) throw new ApiError(404, 'Encomenda não encontrada.')
    return converter(linha)
  }
  function exigirVaga(data: string, ignorarId = 0) {
    const { total } = db.prepare('SELECT COUNT(*) AS total FROM encomendas WHERE dataEntrega = ? AND id <> ?').get(data, ignorarId) as { total: number }
    if (total >= LIMITE_DIARIO) throw new ApiError(409, 'Essa data já tem cinco encomendas. Escolha outra data.')
  }
  function transacao<T>(acao: () => T): T {
    // Reserva o direito de escrita ANTES de contar. Outro processo precisa esperar o COMMIT.
    db.exec('BEGIN IMMEDIATE')
    try {
      const resultado = acao()
      db.exec('COMMIT')
      return resultado
    } catch (erro) {
      db.exec('ROLLBACK')
      throw erro
    }
  }
  return {
    fechar: () => db.close(),
    buscar,
    listar: () => db.prepare('SELECT * FROM encomendas ORDER BY dataEntrega, id').all().map(converter),
    criar(dados: DadosEncomenda, agora: () => Date) {
      return transacao(() => {
        validarData(dados.dataEntrega, agora())
        exigirVaga(dados.dataEntrega)
        const registro = db.prepare(`INSERT INTO encomendas
          (nomeCliente, telefone, produto, dataEntrega, incluirPaoDeQueijo) VALUES (?, ?, ?, ?, ?)`)
          .run(dados.nomeCliente, dados.telefone, dados.produto, dados.dataEntrega, Number(dados.incluirPaoDeQueijo))
        return buscar(Number(registro.lastInsertRowid))
      })
    },
    atualizar(id: number, alteracoes: AlteracaoEncomenda, agora: () => Date) {
      return transacao(() => {
        const anterior = buscar(id)
        const atual = { ...anterior, ...alteracoes }
        // Status e contato podem ser corrigidos até em pedidos antigos; só trocar a data exige nova antecedência.
        if (atual.dataEntrega !== anterior.dataEntrega) {
          validarData(atual.dataEntrega, agora())
          exigirVaga(atual.dataEntrega, id)
        }
        db.prepare(`UPDATE encomendas SET nomeCliente = ?, telefone = ?, produto = ?, dataEntrega = ?,
          status = ?, incluirPaoDeQueijo = ? WHERE id = ?`)
          .run(atual.nomeCliente, atual.telefone, atual.produto, atual.dataEntrega, atual.status, Number(atual.incluirPaoDeQueijo), id)
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
