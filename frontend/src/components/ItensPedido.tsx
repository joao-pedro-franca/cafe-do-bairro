import { useEffect, useRef } from 'react'
import { sabores, unidadesProducao, unidadesItens } from '../utils/itens'
import type { ItemEncomenda } from '../utils/itens'
import type { ItemPrecificado } from '../utils/precificacao'
import { reais } from '../utils/precificacao'
import { unidadeEncomenda, produtoPorId } from '../../../backend/src/produtos.ts'
import { precoEncomenda } from '../../../backend/src/disponibilidadeProdutos.ts'
import '../styles/itens.css'

function descricaoSabor(produto: string) {
  const sabor = sabores.find((item) => item.id === produto)
  return sabor ? `${reais(precoEncomenda(produto))} · ${unidadeEncomenda(produto)}` : 'Selecione um produto para ver preço e unidade de venda.'
}

export function ResumoItens({ itens }: { itens: readonly ItemEncomenda[] }) {
  return <ul className="items-summary">{itens.map((item) => <li key={item.produto}>{item.quantidade} × {sabores.find((sabor) => sabor.id === item.produto)?.nome ?? item.produto}</li>)}</ul>
}

export function ItensPedido({ itens, alterar, limite, prefixo, erro, administrativo = false, registrados, disponiveis }: {
  itens: ItemEncomenda[]; alterar: (itens: ItemEncomenda[]) => void; limite: number; prefixo: string; erro?: string; administrativo?: boolean; registrados?: readonly ItemPrecificado[]; disponiveis?: readonly string[]
}) {
  const total = unidadesProducao(itens)
  const proximo = sabores.find((p) => (!disponiveis || disponiveis.includes(p.id)) && !itens.some((i) => i.produto === p.id) && (!p.consomeCapacidade || total < limite))
  const aviso = erro || (itens.some((item) => !Number.isSafeInteger(item.quantidade) || item.quantidade < 1) ? 'Cada produto precisa de uma quantidade inteira, a partir de uma unidade de venda.' : undefined)
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
    <h4 id={`${prefixo}-titulo`}>Produtos e quantidades</h4>
    {itens.map((item, indice) => <div className="order-item" key={indice}>
      <div><label htmlFor={`${prefixo}-sabor-${indice}`}>Produto {indice + 1}</label>
        <select id={`${prefixo}-sabor-${indice}`} name={`itens[${indice}].produto`} value={item.produto} required onChange={(event) => mudar(indice, 'produto', event.target.value)}>
          <option value="">Selecione um produto</option>
          {sabores.map((sabor) => <option key={sabor.id} value={sabor.id} disabled={itens.some((outro, i) => i !== indice && outro.produto === sabor.id) || (item.produto !== sabor.id && ((disponiveis !== undefined && !disponiveis.includes(sabor.id)) || (sabor.consomeCapacidade && total - (produtoPorId(item.produto)?.consomeCapacidade ? item.quantidade : 0) + item.quantidade > limite)))}>{sabor.nome} · {unidadeEncomenda(sabor.id)}</option>)}
        </select>
        <p className="field-hint">{registrados?.some((anterior) => anterior.produto === item.produto) ? `${reais(registrados.find((anterior) => anterior.produto === item.produto)!.precoUnitarioCentavos)} · ${unidadeEncomenda(item.produto)} · preço registrado` : descricaoSabor(item.produto)}</p>
      </div>
      <div><label htmlFor={`${prefixo}-quantidade-${indice}`}>Quantidade do produto {indice + 1}</label>
        <div className="quantity-stepper">
          <button type="button" aria-label={`Diminuir quantidade do produto ${indice + 1}`} disabled={item.quantidade <= 1} onClick={() => mudar(indice, 'quantidade', item.quantidade - 1)}>−</button>
          <input id={`${prefixo}-quantidade-${indice}`} name={`itens[${indice}].quantidade`} type="number" inputMode="numeric" min={1} max={produtoPorId(item.produto)?.consomeCapacidade ? Math.max(1, Number.isFinite(total) ? limite - total + item.quantidade : limite) : undefined} step={1} required value={Number.isNaN(item.quantidade) ? '' : item.quantidade} aria-invalid={!Number.isSafeInteger(item.quantidade) || item.quantidade < 1 || total > limite} aria-describedby={aviso ? `${prefixo}-erro` : undefined} onChange={(event) => mudar(indice, 'quantidade', event.target.valueAsNumber)} />
          <button type="button" aria-label={`Aumentar quantidade do produto ${indice + 1}`} disabled={!Number.isSafeInteger(item.quantidade + 1) || (produtoPorId(item.produto)?.consomeCapacidade && total >= limite)} onClick={() => mudar(indice, 'quantidade', item.quantidade + 1)}>+</button>
        </div>
      </div>
      <button className="button button-secondary item-remove" type="button" aria-label={`Remover produto ${indice + 1}`} onClick={() => { foco.current = -1; alterar(itens.filter((_, i) => i !== indice)) }}>Remover produto</button>
    </div>)}
    <button ref={adicionar} className="button button-secondary item-add" type="button" disabled={!proximo || !Number.isFinite(total)} onClick={() => {
      if (proximo) { foco.current = itens.length; alterar([...itens, { produto: proximo.id, quantidade: 1 }]) }
    }}>Adicionar produto</button>
    <p className="items-total" role="status">Total selecionado: <strong>{Number.isFinite(unidadesItens(itens)) ? unidadesItens(itens) : '—'} unidade(s) de venda</strong>. Produção: {Number.isFinite(total) ? total : '—'} unidade(s) de bolos/panetones. {administrativo ? 'O servidor confere a capacidade ao salvar.' : `Saldo de produção restante: ${Number.isFinite(total) ? Math.max(0, limite - total) : 0}. Cafés e dúzias não consomem esse grupo.`}</p>
    {aviso && <p className="field-error admin-field-error" id={`${prefixo}-erro`} role="alert">{aviso}</p>}
  </div>
}
