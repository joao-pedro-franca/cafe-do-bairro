import { useEffect, useMemo, useState } from 'react'
import { consultarProdutos } from '../services/produtos'
import type { ProdutoDisponivel } from '../services/produtos'

export function useProdutos(chave = '') {
  const [consulta, setConsulta] = useState<{ requisicao: object; produtos: ProdutoDisponivel[]; falhou: boolean } | null>(null)
  const [tentativa, setTentativa] = useState(0)
  const requisicao = useMemo(() => ({ chave, tentativa }), [chave, tentativa])
  const atualizar = () => setTentativa((n) => n + 1)
  useEffect(() => {
    const controle = new AbortController()
    consultarProdutos(controle.signal).then((produtos) => { if (!controle.signal.aborted) setConsulta({ requisicao, produtos, falhou: false }) }).catch(() => { if (!controle.signal.aborted) setConsulta((anterior) => ({ requisicao, produtos: anterior?.produtos ?? [], falhou: true })) })
    return () => controle.abort()
  }, [requisicao])
  useEffect(() => {
    const intervalo = window.setInterval(atualizar, 30_000)
    window.addEventListener('focus', atualizar)
    return () => { window.clearInterval(intervalo); window.removeEventListener('focus', atualizar) }
  }, [])
  return { produtos: consulta?.produtos ?? [], carregando: consulta?.requisicao !== requisicao, falhou: consulta?.requisicao === requisicao && consulta.falhou, atualizar }
}
