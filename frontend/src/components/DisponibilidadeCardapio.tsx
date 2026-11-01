import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { listarProdutosAdmin, salvarProduto, MESES } from '../services/produtos'
import type { ProdutoDisponivel } from '../services/produtos'
import { reais } from '../utils/precificacao'
import { ErroAdmin } from '../services/admin'
import '../styles/disponibilidade-cardapio.css'

function ProdutoConfiguravel({ produto, csrf, bloqueado, mudou, erroSessao }: { produto: ProdutoDisponivel; csrf: string; bloqueado: boolean; mudou: (p: ProdutoDisponivel) => void; erroSessao: (e: unknown) => void }) {
  const [habilitado, setHabilitado] = useState(produto.aceitaEncomendas)
  const [modo, setModo] = useState(produto.mesesPermitidos.length ? 'meses' : 'ano')
  const [meses, setMeses] = useState(produto.mesesPermitidos)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const trava = useRef(false)
  const periodo = modo === 'ano' ? [] : [...meses].sort((a, b) => a - b)
  const alterado = habilitado !== produto.aceitaEncomendas || JSON.stringify(periodo) !== JSON.stringify(produto.mesesPermitidos)
  async function salvar(event: FormEvent) {
    event.preventDefault()
    if (trava.current || bloqueado) return
    setErro(''); setSucesso('')
    if (modo === 'meses' && !meses.length) { setErro('Selecione ao menos um mês ou escolha o ano todo.'); return }
    trava.current = true; setSalvando(true)
    try {
      const confirmado = await salvarProduto({ id: produto.id, aceitaEncomendas: habilitado, mesesPermitidos: periodo }, csrf)
      mudou(confirmado); setSucesso(`Disponibilidade de ${produto.nome} salva com sucesso.`)
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível salvar. Confira antes de repetir.'); if (e instanceof ErroAdmin && e.status === 401) erroSessao(e) }
    finally { trava.current = false; setSalvando(false) }
  }
  return <li className="product-settings-card">
    <h3>{produto.nome}</h3><p>{produto.categoriaNome}</p><p><strong>{reais(produto.precoCentavos)}</strong> · {produto.unidade}</p>
    <p className="product-current">Estado confirmado: <strong>{produto.aceitaEncomendas ? 'Aceita encomendas' : 'Não aceita encomendas'}</strong><br />Retirada: {produto.mesesPermitidos.length ? produto.mesesPermitidos.map((m) => MESES[m - 1]).join(', ') : 'O ano todo'}.</p>
    <form onSubmit={salvar} aria-busy={salvando}>
      <fieldset disabled={salvando || bloqueado}>
        <legend className="visually-hidden">Configurar {produto.nome}</legend>
        <label className="product-check"><input type="checkbox" checked={habilitado} onChange={(e) => { setHabilitado(e.target.checked); setSucesso('') }} />Aceita encomendas de {produto.nome}</label>
        <label htmlFor={`periodo-${produto.id}`}>Meses de retirada de {produto.nome}</label>
        <select id={`periodo-${produto.id}`} value={modo} onChange={(e) => { setModo(e.target.value); setSucesso('') }}><option value="ano">O ano todo</option><option value="meses">Apenas meses selecionados</option></select>
        {modo === 'meses' && <fieldset className="months-grid"><legend>Escolha os meses para {produto.nome}</legend>{MESES.map((nome, i) => <label className="product-check" key={nome}><input type="checkbox" checked={meses.includes(i + 1)} onChange={(e) => { setMeses((atuais) => e.target.checked ? [...atuais, i + 1] : atuais.filter((m) => m !== i + 1)); setSucesso('') }} />{nome}</label>)}</fieldset>}
        {alterado && <p className="product-draft">Alterações ainda não salvas.</p>}
        <button className="button button-primary" disabled={!alterado}>{salvando ? 'Salvando disponibilidade…' : `Salvar ${produto.nome}`}</button>
      </fieldset>
      {erro && <p role="alert" className="admin-error admin-feedback">{erro}</p>}
      {sucesso && <p role="status" className="admin-feedback">{sucesso}</p>}
    </form>
  </li>
}
export function DisponibilidadeCardapio({ csrf, bloqueado, erroSessao }: { csrf: string; bloqueado: boolean; erroSessao: (e: unknown) => void }) {
  const [produtos, setProdutos] = useState<ProdutoDisponivel[]>([])
  const [erro, setErro] = useState('')
  const [tentativa, setTentativa] = useState(0)
  useEffect(() => {
    let ativo = true
    listarProdutosAdmin().then((lista) => { if (ativo) setProdutos(lista) }).catch((e) => { if (ativo) { setErro(e.message); if (e instanceof ErroAdmin && e.status === 401) erroSessao(e) } })
    return () => { ativo = false }
  }, [csrf, tentativa, erroSessao])
  return <section className="admin-products" aria-labelledby="disponibilidade-cardapio-titulo">
    <h2 id="disponibilidade-cardapio-titulo">Disponibilidade do cardápio</h2>
    <p>Escolha o que aceita encomendas e os meses da <strong>retirada</strong>. Isso não esconde produtos do cardápio nem altera pedidos confirmados. Preços e cadastro de produtos não são editados aqui.</p>
    {erro && <div role="alert" className="admin-feedback admin-error"><p>{erro}</p><button className="button button-secondary" type="button" disabled={bloqueado} onClick={() => { setErro(''); setTentativa((n) => n + 1) }}>Tentar consultar cardápio novamente</button></div>}
    {!produtos.length && !erro && <p role="status">Consultando os produtos…</p>}
    <ul className="product-settings-list">{produtos.map((produto) => <ProdutoConfiguravel key={produto.id} produto={produto} csrf={csrf} bloqueado={bloqueado} erroSessao={erroSessao} mudou={(confirmado) => setProdutos((lista) => lista.map((p) => p.id === confirmado.id ? confirmado : p))} />)}</ul>
  </section>
}
