import { useEffect, useRef } from 'react'
import { sabores, totalBolos } from '../utils/itens'
import type { ItemEncomenda } from '../utils/itens'
import type { ItemPrecificado } from '../utils/precificacao'
import { reais } from '../utils/precificacao'
import '../styles/itens.css'

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
function descricaoSabor(produto: string) {
  const sabor = sabores.find((item) => item.id === produto)
  return sabor ? `${moeda.format(sabor.preco)} por bolo · ${sabor.tamanho}` : 'Selecione um sabor para ver preço e tamanho.'
}

export function ResumoItens({ itens }: { itens: readonly ItemEncomenda[] }) {
  return <ul className="items-summary">{itens.map((item) => <li key={item.produto}>{item.quantidade} × {sabores.find((sabor) => sabor.id === item.produto)?.nome ?? item.produto}</li>)}</ul>
}

export function ItensPedido({ itens, alterar, limite, prefixo, erro, administrativo = false, registrados }: {
  itens: ItemEncomenda[]; alterar: (itens: ItemEncomenda[]) => void; limite: number; prefixo: string; erro?: string; administrativo?: boolean; registrados?: readonly ItemPrecificado[]
}) {
  const total = totalBolos(itens)
  const aviso = erro || (itens.some((item) => !Number.isSafeInteger(item.quantidade) || item.quantidade < 1) ? 'Cada sabor precisa de uma quantidade inteira, a partir de um bolo.' : undefined)
  const adicionar = useRef<HTMLButtonElement>(null)
  const foco = useRef<number | null>(null)
  useEffect(() => {
    if (foco.current !== null) {
      if (foco.current >= 0) document.getElementById(`${prefixo}-sabor-${foco.current}`)?.focus()
      else if (adicionar.current && !adicionar.current.disabled) adicionar.current.focus()
      else document.getElementById(prefixo)?.focus()
      foco.current = null
    }
  }, [itens, prefixo])
  function mudar(indice: number, campo: keyof ItemEncomenda, valor: string | number) {
    alterar(itens.map((item, i) => i === indice ? { ...item, [campo]: valor } : item))
  }
  return <div className="order-items" id={prefixo} tabIndex={-1} role="group" aria-labelledby={`${prefixo}-titulo`} aria-describedby={aviso ? `${prefixo}-erro` : undefined}>
    <h4 id={`${prefixo}-titulo`}>Sabores e quantidades</h4>
    {itens.map((item, indice) => <div className="order-item" key={indice}>
      <div><label htmlFor={`${prefixo}-sabor-${indice}`}>Sabor {indice + 1}</label>
        <select id={`${prefixo}-sabor-${indice}`} name={`itens[${indice}].produto`} value={item.produto} required onChange={(event) => mudar(indice, 'produto', event.target.value)}>
          <option value="">Selecione um bolo</option>
          {sabores.map((sabor) => <option key={sabor.id} value={sabor.id} disabled={itens.some((outro, i) => i !== indice && outro.produto === sabor.id)}>{sabor.nome}</option>)}
        </select>
        <p className="field-hint">{registrados?.some((anterior) => anterior.produto === item.produto) ? `${reais(registrados.find((anterior) => anterior.produto === item.produto)!.precoUnitarioCentavos)} por bolo · preço registrado` : descricaoSabor(item.produto)}</p>
      </div>
      <div><label htmlFor={`${prefixo}-quantidade-${indice}`}>Quantidade do sabor {indice + 1}</label>
        <div className="quantity-stepper">
          <button type="button" aria-label={`Diminuir quantidade do sabor ${indice + 1}`} disabled={item.quantidade <= 1} onClick={() => mudar(indice, 'quantidade', item.quantidade - 1)}>−</button>
          <input id={`${prefixo}-quantidade-${indice}`} name={`itens[${indice}].quantidade`} type="number" inputMode="numeric" min={1} max={Math.max(1, Number.isFinite(total) ? limite - total + item.quantidade : limite)} step={1} required value={Number.isNaN(item.quantidade) ? '' : item.quantidade} aria-invalid={!Number.isSafeInteger(item.quantidade) || item.quantidade < 1 || total > limite} aria-describedby={aviso ? `${prefixo}-erro` : undefined} onChange={(event) => mudar(indice, 'quantidade', event.target.valueAsNumber)} />
          <button type="button" aria-label={`Aumentar quantidade do sabor ${indice + 1}`} disabled={!Number.isFinite(total) || total >= limite} onClick={() => mudar(indice, 'quantidade', item.quantidade + 1)}>+</button>
        </div>
      </div>
      <button className="button button-secondary item-remove" type="button" aria-label={`Remover sabor ${indice + 1}`} onClick={() => { foco.current = -1; alterar(itens.filter((_, i) => i !== indice)) }}>Remover sabor</button>
    </div>)}
    <button ref={adicionar} className="button button-secondary item-add" type="button" disabled={itens.length >= sabores.length || !Number.isFinite(total) || total >= limite} onClick={() => {
      const proximo = sabores.find((sabor) => !itens.some((item) => item.produto === sabor.id))
      if (proximo) { foco.current = itens.length; alterar([...itens, { produto: proximo.id, quantidade: 1 }]) }
    }}>Adicionar sabor</button>
    <p className="items-total" role="status">Total selecionado: <strong>{Number.isFinite(total) ? total : '—'} bolo(s)</strong>. {administrativo ? 'Limite diário: cinco bolos, contando também os outros pedidos. O servidor confere ao salvar.' : `Ainda pode selecionar ${Number.isFinite(total) ? Math.max(0, limite - total) : 0} bolo(s) do saldo consultado.`}</p>
    {aviso && <p className="field-error admin-field-error" id={`${prefixo}-erro`} role="alert">{aviso}</p>}
  </div>
}
