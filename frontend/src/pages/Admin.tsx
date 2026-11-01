import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { EditarPedido } from '../components/EditarPedido'
import { ResumoFinanceiro } from '../components/ResumoFinanceiro'
import { CupIcon } from '../components/CupIcon'
import { cafeConfig } from '../data/cafeConfig'
import { formatarTelefone } from '../utils/encomenda'
import { dentroDoPrazo, hojeNoFuso } from '../utils/prazoEncomenda'
import { alterarStatus, atualizarPedido, consultarSessao, entrarAdmin, ErroAdmin, excluirPedido, listarPedidos, sairAdmin, statusEncomenda } from '../services/admin'
import type { PedidoAdmin, SessaoAdmin, StatusEncomenda } from '../services/admin'
import '../styles/admin.css'

function dataLegivel(data: string) { return data.split('-').reverse().join('/') }

function CartaoPedido({ pedido, ocupado, salvar, excluir, editar, editor }: {
  pedido: PedidoAdmin; ocupado: boolean
  salvar: (id: number, status: StatusEncomenda) => void
  excluir: (pedido: PedidoAdmin) => void
  editar: () => void; editor?: ReactNode
}) {
  const [status, setStatus] = useState(pedido.status)
  return <li className="admin-card">
    <div className="admin-card-heading"><h3>Pedido nº {pedido.id}</h3><span className="admin-status">{pedido.status}</span></div>
    <p className="admin-customer">{pedido.nomeCliente}</p>
    <dl>
      <div><dt>Telefone</dt><dd>{formatarTelefone(pedido.telefone)}</dd></div>
      <div><dt>Retirada</dt><dd><time dateTime={pedido.dataEntrega}>{dataLegivel(pedido.dataEntrega)}</time></dd></div>
      <div><dt>Quantidade total</dt><dd>{pedido.totalBolos} {pedido.totalBolos === 1 ? 'bolo' : 'bolos'}</dd></div>
      <div><dt>Pão de queijo</dt><dd>{pedido.incluirPaoDeQueijo ? 'Sim, uma dúzia' : 'Sem acompanhamento'}</dd></div>
    </dl>
    <ResumoFinanceiro resumo={pedido} />
    {editor || <><form onSubmit={(event) => { event.preventDefault(); salvar(pedido.id, status) }}>
      <label htmlFor={`status-${pedido.id}`}>Status do pedido nº {pedido.id}</label>
      <select id={`status-${pedido.id}`} value={status} disabled={ocupado} onChange={(event) => setStatus(event.target.value as StatusEncomenda)}>
        {statusEncomenda.map((valor) => <option key={valor} value={valor}>{valor}</option>)}
      </select>
      <button className="button button-primary" disabled={ocupado || status === pedido.status}>Salvar status</button>
    </form>
    <button id={`editar-botao-${pedido.id}`} className="button admin-edit-button" disabled={ocupado} onClick={editar} aria-label={`Editar pedido nº ${pedido.id}`}>Editar pedido</button>
    <button className="button admin-danger" disabled={ocupado} onClick={() => excluir(pedido)} aria-label={`Excluir pedido nº ${pedido.id}`}>Excluir pedido</button></>}
  </li>
}

export function Admin() {
  const [sessao, setSessao] = useState<SessaoAdmin | null>(null)
  const [verificando, setVerificando] = useState(true)
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [pedidos, setPedidos] = useState<PedidoAdmin[]>([])
  const [data, setData] = useState('')
  const [prazo, setPrazo] = useState('')
  const [hoje, setHoje] = useState(() => hojeNoFuso(cafeConfig.fusoHorario))
  const [status, setStatus] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [exclusao, setExclusao] = useState<PedidoAdmin | null>(null)
  const [edicao, setEdicao] = useState<PedidoAdmin | null>(null)
  const origemEdicao = useRef<number | null>(null)
  const trava = useRef(false)
  const cancelar = useRef<HTMLButtonElement>(null)
  const origemExclusao = useRef<HTMLButtonElement | null>(null)
  const focoStatus = useRef<number | null>(null)

  useEffect(() => {
    // Mantém o cartão e seu rascunho visíveis mesmo na virada do dia.
    if (edicao) return
    const atualizarHoje = () => setHoje(hojeNoFuso(cafeConfig.fusoHorario))
    atualizarHoje()
    const timer = window.setInterval(atualizarHoje, 30_000)
    window.addEventListener('focus', atualizarHoje)
    document.addEventListener('visibilitychange', atualizarHoje)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', atualizarHoje)
      document.removeEventListener('visibilitychange', atualizarHoje)
    }
  }, [edicao])

  function encerrarSessao() {
    setSessao(null); setPedidos([]); setExclusao(null); setEdicao(null); setSenha(''); setMensagem('')
  }
  function tratarErro(falha: unknown) {
    if (falha instanceof ErroAdmin && falha.status === 401) encerrarSessao()
    setErro(falha instanceof Error ? falha.message : 'Não foi possível concluir a operação.')
  }
  useEffect(() => {
    let ativo = true
    consultarSessao().then((valor) => { if (ativo) setSessao(valor) }).catch((falha) => {
      if (ativo && (!(falha instanceof ErroAdmin) || falha.status !== 401)) setErro(falha.message)
    }).finally(() => { if (ativo) setVerificando(false) })
    return () => { ativo = false }
  }, [])
  useEffect(() => {
    if (!sessao) return
    const timer = setTimeout(() => { encerrarSessao(); setErro('Sua sessão terminou. Entre novamente para continuar.') }, Math.max(0, Date.parse(sessao.expiraEm) - Date.now()))
    return () => clearTimeout(timer)
  }, [sessao])
  useEffect(() => {
    if (!sessao) return
    let ativo = true
    listarPedidos().then((lista) => { if (ativo) setPedidos(lista) }).catch((falha) => { if (ativo) tratarErro(falha) }).finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [sessao])
  useEffect(() => {
    if (exclusao) cancelar.current?.focus()
    else if (origemExclusao.current) {
      if (origemExclusao.current.isConnected) origemExclusao.current.focus()
      else document.getElementById('pedidos-titulo')?.focus()
      origemExclusao.current = null
    }
  }, [exclusao])
  useEffect(() => {
    // O cartão é remontado após salvar; devolve o foco ao pedido que foi alterado.
    if (!ocupado && focoStatus.current !== null) {
      document.getElementById(`status-${focoStatus.current}`)?.focus()
      focoStatus.current = null
    }
  }, [pedidos, ocupado])
  useEffect(() => {
    if (!edicao && origemEdicao.current !== null) {
      // Aguarda a atualização do calendário antes de restaurar o foco.
      if (hoje !== hojeNoFuso(cafeConfig.fusoHorario)) return
      const botao = document.getElementById(`editar-botao-${origemEdicao.current}`)
      ;(botao ?? document.getElementById('pedidos-titulo'))?.focus()
      origemEdicao.current = null
    }
  }, [edicao, hoje])

  async function executar(acao: () => Promise<void>) {
    if (trava.current) return
    trava.current = true; setOcupado(true); setErro(''); setMensagem('')
    try { await acao() } catch (falha) { tratarErro(falha) } finally { trava.current = false; setOcupado(false) }
  }
  function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void executar(async () => {
      try { const valor = await entrarAdmin(usuario, senha); setCarregando(true); setSessao(valor) } finally { setSenha('') }
    })
  }
  function fecharExclusao() { setExclusao(null) }
  async function atualizarLista() {
    setCarregando(true)
    try { setPedidos(await listarPedidos()) } finally { setCarregando(false) }
  }
  const visiveis = pedidos.filter((pedido) => (!data || pedido.dataEntrega === data) && dentroDoPrazo(pedido.dataEntrega, prazo, hoje) && (!status || pedido.status === status))
  return <div className="admin-page">
    <a className="skip-link" href="#admin-conteudo">Pular para o conteúdo</a>
    <header className="container admin-header">
      <a className="brand" href="/"><CupIcon /><span>{cafeConfig.nome}</span></a>
      <a href="/">Voltar para o café</a>
    </header>
    <main id="admin-conteudo" className="container admin-main" tabIndex={-1}>
      <p className="eyebrow">O caderno da Dona Marta</p>
      <h1>Encomendas do café</h1>
      <p>Acompanhe cada pedido com carinho. O pagamento é na retirada.</p>
      {erro && !edicao && <p className="admin-feedback admin-error" role="alert">{erro}</p>}
      {mensagem && <p className="admin-feedback" role="status">{mensagem}</p>}
      {verificando ? <p role="status">Verificando seu acesso…</p> : !sessao ? <section className="admin-login" aria-labelledby="login-titulo">
        <h2 id="login-titulo">Entre no seu caderno</h2>
        <p>Acesso exclusivo da administradora.</p>
        <form onSubmit={login} aria-busy={ocupado}>
          <label htmlFor="admin-usuario">Usuário</label>
          <input id="admin-usuario" name="usuario" autoComplete="username" required maxLength={100} value={usuario} disabled={ocupado} onChange={(event) => setUsuario(event.target.value)} />
          <label htmlFor="admin-senha">Senha</label>
          <input id="admin-senha" name="senha" type="password" autoComplete="current-password" required maxLength={128} value={senha} disabled={ocupado} onChange={(event) => setSenha(event.target.value)} />
          <button className="button button-primary" disabled={ocupado}>{ocupado ? 'Entrando…' : 'Entrar'}</button>
        </form>
      </section> : <section aria-labelledby="pedidos-titulo" aria-busy={ocupado || carregando}>
        <div className="admin-toolbar"><h2 id="pedidos-titulo" tabIndex={-1}>Seu caderno de pedidos</h2>
          <button className="button" disabled={ocupado || carregando || Boolean(edicao)} onClick={() => void executar(atualizarLista)}>Atualizar lista</button>
          <button className="button" disabled={ocupado} onClick={() => void executar(async () => { await sairAdmin(sessao.csrfToken); encerrarSessao(); setMensagem('Você saiu com segurança.') })}>Sair</button>
        </div>
        <div className="admin-filters">
          <div><label htmlFor="filtro-prazo">Ver pedidos dentro dos próximos:</label><select id="filtro-prazo" value={prazo} disabled={Boolean(edicao)} aria-describedby="filtro-prazo-ajuda" onChange={(event) => { setPrazo(event.target.value); setData('') }}>
            <option value="">Todos os prazos</option>
            {Array.from({ length: 30 }, (_, i) => i + 1).map((dias) => <option key={dias} value={dias}>{dias} {dias === 1 ? 'dia' : 'dias'}</option>)}
            <option value="30+">30+ (mais de 30 dias)</option>
          </select></div>
          <div><label htmlFor="filtro-data">Filtrar por data</label><input id="filtro-data" type="date" value={data} disabled={Boolean(edicao)} onChange={(event) => { setData(event.target.value); setPrazo('') }} /></div>
          <div><label htmlFor="filtro-status">Filtrar por status</label><select id="filtro-status" value={status} disabled={Boolean(edicao)} onChange={(event) => setStatus(event.target.value)}><option value="">Todos os status</option>{statusEncomenda.map((valor) => <option key={valor} value={valor}>{valor}</option>)}</select></div>
          <button className="button" disabled={Boolean(edicao)} onClick={() => { setData(''); setPrazo(''); setStatus('') }}>Limpar filtros</button>
        </div>
        <p id="filtro-prazo-ajuda" className="admin-filter-hint">O prazo conta a partir de amanhã, no horário da Bahia.</p>
        {carregando ? <p role="status">Buscando as encomendas…</p> : <>
          <p className="admin-count" role="status">{visiveis.length} {visiveis.length === 1 ? 'pedido encontrado' : 'pedidos encontrados'}.</p>
          {!visiveis.length && <p className="admin-empty">{prazo ? 'Nenhuma encomenda no prazo selecionado com esses filtros.' : 'Nenhuma encomenda por aqui com esses filtros.'}</p>}
          <ul className="admin-orders">{visiveis.map((pedido) => <CartaoPedido key={`${pedido.id}-${pedido.status}`} pedido={pedido} ocupado={ocupado || Boolean(exclusao) || Boolean(edicao)} editar={() => { setErro(''); setMensagem(''); origemEdicao.current = pedido.id; setEdicao(pedido) }} editor={edicao?.id === pedido.id && <EditarPedido pedido={edicao} ocupado={ocupado} erroApi={erro} cancelar={() => { setEdicao(null); setErro('') }} salvar={(alteracoes) => executar(async () => {
            const atualizado = await atualizarPedido(pedido.id, alteracoes, sessao.csrfToken)
            setPedidos((lista) => lista.map((item) => item.id === pedido.id ? atualizado : item))
            setEdicao(null); setMensagem(`Pedido nº ${pedido.id} atualizado com sucesso.`)
          })} />} salvar={(id, novoStatus) => void executar(async () => {
            const atualizado = await alterarStatus(id, novoStatus, sessao.csrfToken)
            focoStatus.current = id
            setPedidos((lista) => lista.map((item) => item.id === id ? atualizado : item)); setMensagem(`Status do pedido nº ${id} atualizado para ${novoStatus}.`)
          })} excluir={(item) => { origemExclusao.current = document.activeElement as HTMLButtonElement; setExclusao(item) }} />)}</ul>
        </>}
        {ocupado && <p role="status">Aguarde, concluindo a operação…</p>}
        {exclusao && <section className="admin-confirm" role="alertdialog" aria-labelledby="excluir-titulo" aria-describedby="excluir-descricao">
          <h2 id="excluir-titulo">Excluir pedido nº {exclusao.id}?</h2>
          <p id="excluir-descricao">O pedido de {exclusao.nomeCliente} para {dataLegivel(exclusao.dataEntrega)} será apagado e liberará {exclusao.totalBolos} {exclusao.totalBolos === 1 ? 'bolo' : 'bolos'} na data. Esta ação não pode ser desfeita.</p>
          <button ref={cancelar} className="button" disabled={ocupado} onClick={fecharExclusao}>Manter pedido</button>
          <button className="button admin-danger" disabled={ocupado} onClick={() => void executar(async () => {
            await excluirPedido(exclusao.id, sessao.csrfToken)
            setPedidos((lista) => lista.filter((item) => item.id !== exclusao.id)); setMensagem(`Pedido nº ${exclusao.id} excluído.`); setExclusao(null)
          })}>Sim, excluir pedido nº {exclusao.id}</button>
        </section>}
      </section>}
    </main>
  </div>
}
