import { useEffect, useMemo, useState } from 'react'
import { consultarDisponibilidade } from '../services/encomendas'
import type { Disponibilidade } from '../services/encomendas'

type Consulta = { requisicao: object; saldo?: Disponibilidade; falhou: boolean }

export function useDisponibilidade(data: string | null) {
  const [consulta, setConsulta] = useState<Consulta | null>(null)
  const [tentativa, setTentativa] = useState(0)
  // A identidade também muda ao voltar para uma data já consultada, impedindo saldo antigo.
  const requisicao = useMemo(() => ({ data, tentativa }), [data, tentativa])
  useEffect(() => {
    if (!data) return
    const controle = new AbortController()
    consultarDisponibilidade(data, controle.signal).then((saldo) => {
      if (!controle.signal.aborted) setConsulta({ requisicao, saldo, falhou: false })
    }).catch(() => {
      if (!controle.signal.aborted) setConsulta({ requisicao, falhou: true })
    })
    return () => controle.abort()
  }, [data, requisicao])
  const corresponde = data !== null && consulta?.requisicao === requisicao
  return {
    saldo: corresponde ? consulta.saldo : undefined,
    carregando: data !== null && !corresponde,
    falhou: corresponde && consulta.falhou,
    atualizar: () => setTentativa((valor) => valor + 1),
  }
}
