import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { cafeConfig } from '../data/cafeConfig'
import { useDisponibilidade } from '../hooks/useDisponibilidade'
import { criarEncomenda, ErroEncomenda } from '../services/encomendas'
import { dataMinimaEncomenda, erroDataEntrega, formatarTelefone, validarEncomenda } from '../utils/encomenda'
import { ItensPedido } from '../components/ItensPedido'
import { ResumoFinanceiro } from '../components/ResumoFinanceiro'
import { totalBolos } from '../utils/itens'
import type { PedidoConfirmado } from '../services/encomendas'
import type { CampoEncomenda, DadosEncomenda, ErrosEncomenda } from '../utils/encomenda'
import '../styles/encomendas.css'

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dadosIniciais: DadosEncomenda = { nomeCliente: '', telefone: '', itens: [{ produto: '', quantidade: 1 }], dataEntrega: '', incluirPaoDeQueijo: false }
const rotulos: Record<CampoEncomenda, string> = {
  dataEntrega: 'Data desejada', itens: 'Sabores e quantidades', nomeCliente: 'Nome completo', telefone: 'Telefone/WhatsApp',
}

export function Encomendas() {
  const [aberto, setAberto] = useState(false)
  const [dados, setDados] = useState<DadosEncomenda>(dadosIniciais)
  const [erros, setErros] = useState<ErrosEncomenda>({})
  const [erroApi, setErroApi] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [pedidoConfirmado, setPedidoConfirmado] = useState<PedidoConfirmado | null>(null)
  const bloqueioEnvio = useRef(false)
  const [dataMinima, setDataMinima] = useState(() => dataMinimaEncomenda(cafeConfig.fusoHorario))
  const botaoRef = useRef<HTMLButtonElement>(null)
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const errosRef = useRef<HTMLDivElement>(null)
  const erroData = dados.dataEntrega ? erroDataEntrega(dados.dataEntrega, dataMinima) : undefined
  const consulta = useDisponibilidade(dados.dataEntrega && !erroData ? dados.dataEntrega : null)
  const { saldo } = consulta
  const podePreencher = Boolean(saldo && saldo.quantidadeDisponivel > 0) || pedidoConfirmado !== null
  const total = totalBolos(dados.itens)
  const erroItens = erros.itens || (saldo && total > saldo.quantidadeDisponivel && pedidoConfirmado === null
    ? `Restam ${saldo.quantidadeDisponivel} bolo(s). Ajuste os itens ou escolha outra data.` : undefined)
  const adicional = cafeConfig.produtos.find((produto) => produto.encomenda.tipo === 'acompanhamento' && !produto.sazonalidade)
  const acompanhamento = adicional?.encomenda.tipo === 'acompanhamento' ? adicional.encomenda : null
  const camposComErro = (Object.keys(rotulos) as CampoEncomenda[]).filter((campo) => erros[campo])

  useEffect(() => {
    if (!aberto) return
    const atualizarData = () => setDataMinima(dataMinimaEncomenda(cafeConfig.fusoHorario))
    const intervalo = window.setInterval(atualizarData, 60_000)
    window.addEventListener('focus', atualizarData)
    const quadro = requestAnimationFrame(() => {
      tituloRef.current?.focus({ preventScroll: true })
      tituloRef.current?.scrollIntoView({ block: 'start' })
    })
    return () => {
      window.clearInterval(intervalo)
      window.removeEventListener('focus', atualizarData)
      cancelAnimationFrame(quadro)
    }
  }, [aberto])

  function fechar() { botaoRef.current?.focus(); setAberto(false) }
  function alternar() {
    if (aberto) return fechar()
    setDataMinima(dataMinimaEncomenda(cafeConfig.fusoHorario))
    setAberto(true)
  }
  function atualizar(campo: Exclude<CampoEncomenda, 'itens'>, valor: string) {
    setDados((atual) => ({ ...atual, [campo]: valor }))
    setErros((atuais) => campo === 'dataEntrega' ? {} : { ...atuais, [campo]: undefined })
    setErroApi('')
  }
  async function confirmar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (bloqueioEnvio.current) return
    const minimaAtual = dataMinimaEncomenda(cafeConfig.fusoHorario)
    setDataMinima(minimaAtual)
    const dataInvalida = erroDataEntrega(dados.dataEntrega, minimaAtual)
    if (dataInvalida) {
      setErros({ dataEntrega: dataInvalida })
      requestAnimationFrame(() => errosRef.current?.focus())
      return
    }
    if (!saldo || saldo.quantidadeDisponivel === 0) {
      setErroApi('Consulte uma data com bolos disponíveis antes de confirmar a encomenda.')
      return
    }
    const novosErros = validarEncomenda(dados, cafeConfig.produtos, minimaAtual, saldo.quantidadeDisponivel)
    setErros(novosErros)
    if (Object.keys(novosErros).length) {
      setErroApi('')
      requestAnimationFrame(() => errosRef.current?.focus())
      return
    }
    // A trava imediata evita dois POSTs antes da atualização visual do React.
    bloqueioEnvio.current = true
    setEnviando(true)
    setErroApi('')
    let confirmado = false
    try {
      const pedido = await criarEncomenda(dados)
      confirmado = true
      setPedidoConfirmado(pedido)
      consulta.atualizar()
    } catch (erro) {
      setErroApi(erro instanceof ErroEncomenda ? erro.message : 'Não foi possível obter a confirmação. Confira com o café antes de reenviar.')
      if (erro instanceof ErroEncomenda && erro.status === 409) consulta.atualizar()
    } finally {
      setEnviando(false)
      if (!confirmado) bloqueioEnvio.current = false
    }
  }
  function novaEncomenda() {
    bloqueioEnvio.current = false
    setPedidoConfirmado(null)
    setErroApi('')
    setErros({})
    setDados(dadosIniciais)
    setDataMinima(dataMinimaEncomenda(cafeConfig.fusoHorario))
    tituloRef.current?.focus()
  }

  return (
    <section className="orders-section" id="encomendas" aria-labelledby="encomendas-title" tabIndex={-1}>
      <div className="container orders-paper">
        <header className="orders-heading">
          <h2 id="encomendas-title">Faça sua encomenda <span aria-hidden="true">♡</span></h2>
          <p>Escolha o dia. A gente cuida do carinho em forma de bolo.</p>
        </header>
        <p className="recipe-note">Do nosso forno para os seus momentos especiais. <span aria-hidden="true">♡</span></p>
        <ul className="order-rules">
          <li><span aria-hidden="true">◷</span><p>Peça com pelo menos <strong>um dia de antecedência</strong>.</p></li>
          <li><span aria-hidden="true">♡</span><p>Preparamos até <strong>cinco bolos por dia</strong>.</p></li>
          <li><span aria-hidden="true">⌂</span><p>Pagamento <strong>na retirada</strong>.</p></li>
        </ul>
        <p className="orders-demo" id="orders-demo">Protótipo com dados comerciais fictícios. A consulta não reserva bolos: a reserva acontece somente após a confirmação do pedido.</p>
        <button ref={botaoRef} className="button button-primary orders-toggle" type="button" aria-expanded={aberto} aria-controls="gaveta-encomenda" onClick={alternar}>
          {aberto ? 'Fechar formulário' : 'Quero encomendar'} <span aria-hidden="true">{aberto ? '−' : '+'}</span>
        </button>
        {/* Manter a gaveta montada preserva o rascunho; inert impede foco quando fechada. */}
        <div id="gaveta-encomenda" className={`order-drawer${aberto ? ' is-open' : ''}`} inert={!aberto} aria-hidden={!aberto}>
          <div className="order-drawer-inner">
            <form className="order-form" noValidate onSubmit={confirmar} aria-labelledby="form-title" aria-describedby="orders-demo">
              <h3 id="form-title" ref={tituloRef} tabIndex={-1}>Vamos começar pela data?</h3>
              <p className="form-intro">Escolha o dia para consultar os bolos disponíveis. Use dados fictícios para testar.</p>
              {camposComErro.length > 0 && <div className="form-errors" ref={errosRef} tabIndex={-1} role="alert">
                <p><strong>Vamos conferir alguns campos?</strong></p>
                <ul>{camposComErro.map((campo) => <li key={campo}><a href={`#pedido-${campo}`}>{rotulos[campo]}: {erros[campo]}</a></li>)}</ul>
              </div>}
              <fieldset className="order-form-fields" disabled={enviando || pedidoConfirmado !== null}>
                <legend className="visually-hidden">Data da encomenda</legend>
                <div className="order-field order-date">
                  <label htmlFor="pedido-dataEntrega">Data desejada <span aria-hidden="true">*</span></label>
                  <input id="pedido-dataEntrega" name="dataEntrega" type="date" required min={dataMinima} max="9999-12-31" value={dados.dataEntrega}
                    onFocus={() => setDataMinima(dataMinimaEncomenda(cafeConfig.fusoHorario))} onChange={(e) => atualizar('dataEntrega', e.target.value)}
                    aria-invalid={Boolean(erros.dataEntrega || erroData)} aria-describedby={`data-ajuda${erros.dataEntrega || erroData ? ' erro-dataEntrega' : ''}`} />
                  <p className="field-hint" id="data-ajuda">A partir de amanhã, no horário do café.</p>
                  {(erros.dataEntrega || erroData) && <p className="field-error" id="erro-dataEntrega">{erros.dataEntrega || erroData}</p>}
                </div>
              </fieldset>
              <div className="availability" aria-live="polite" aria-busy={consulta.carregando}>
                {consulta.carregando && <p role="status">Conferindo os bolos disponíveis para esse dia…</p>}
                {consulta.falhou && <div>
                  <p role="alert">Não conseguimos consultar a disponibilidade agora.{pedidoConfirmado !== null ? ' Seu pedido já está confirmado; apenas a atualização do saldo falhou.' : ' Tente novamente antes de continuar.'}</p>
                  <button className="button button-secondary" type="button" onClick={consulta.atualizar}>Tentar consultar novamente</button>
                </div>}
                {saldo && <>
                  <dl className="availability-summary">
                    <div><dt>Capacidade total</dt><dd>{saldo.limiteDiario} bolos</dd></div>
                    <div><dt>Já reservados</dt><dd>{saldo.quantidadeReservada}</dd></div>
                    <div><dt>Ainda disponíveis</dt><dd>{saldo.quantidadeDisponivel}</dd></div>
                  </dl>
                  <p className="field-hint">Disponibilidade consultada agora; os bolos só ficam reservados quando sua encomenda é confirmada.</p>
                  {saldo.quantidadeDisponivel === 0 && pedidoConfirmado === null && <p className="availability-full">Nosso forno já está cheio de carinho nesse dia. Escolha outra data para prepararmos seus bolos.</p>}
                </>}
              </div>
              <div className="order-details" hidden={!podePreencher}>
                <fieldset className="order-form-fields" disabled={enviando || pedidoConfirmado !== null} aria-busy={enviando}>
                  <legend className="visually-hidden">Bolos e contato</legend>
                  <ItensPedido prefixo="pedido-itens" itens={dados.itens} limite={pedidoConfirmado?.totalBolos ?? saldo?.quantidadeDisponivel ?? 5} erro={erroItens} alterar={(itens) => {
                    setDados((atual) => ({ ...atual, itens }))
                    setErros((atuais) => ({ ...atuais, itens: undefined }))
                    setErroApi('')
                  }} />
                  <div className="order-fields">
                    <div className="order-field">
                      <label htmlFor="pedido-nomeCliente">Nome completo <span aria-hidden="true">*</span></label>
                      <input id="pedido-nomeCliente" name="nomeCliente" autoComplete="name" required maxLength={100} value={dados.nomeCliente} onChange={(e) => atualizar('nomeCliente', e.target.value)} aria-invalid={Boolean(erros.nomeCliente)} aria-describedby={erros.nomeCliente ? 'erro-nomeCliente' : undefined} />
                      {erros.nomeCliente && <p className="field-error" id="erro-nomeCliente">{erros.nomeCliente}</p>}
                    </div>
                    <div className="order-field">
                      <label htmlFor="pedido-telefone">Telefone/WhatsApp <span aria-hidden="true">*</span></label>
                      <input id="pedido-telefone" name="telefone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={25} value={dados.telefone}
                        onChange={(e) => atualizar('telefone', e.target.value)} onBlur={() => setDados((atual) => ({ ...atual, telefone: formatarTelefone(atual.telefone) }))}
                        aria-invalid={Boolean(erros.telefone)} aria-describedby={`telefone-ajuda${erros.telefone ? ' erro-telefone' : ''}`} />
                      <p className="field-hint" id="telefone-ajuda">Com DDD: (73) 99999-9999. Aceita fixo ou celular, com +55 opcional.</p>
                      {erros.telefone && <p className="field-error" id="erro-telefone">{erros.telefone}</p>}
                    </div>
                  </div>
                  {acompanhamento && adicional && <label className="order-extra">
                    <input type="checkbox" name="incluirPaoDeQueijo" checked={dados.incluirPaoDeQueijo} onChange={(e) => { setDados((atual) => ({ ...atual, incluirPaoDeQueijo: e.target.checked })); setErroApi('') }} />
                    <span>Adicionar {adicional.nome.toLowerCase()} <small>{acompanhamento.tamanho} · + {moeda.format(acompanhamento.preco)} (uma dúzia por pedido, opcional, sem ocupar a capacidade de bolos)</small></span>
                  </label>}
                </fieldset>
              </div>
              <div className="form-actions">
                {pedidoConfirmado !== null
                  ? <button className="button button-primary" type="button" onClick={novaEncomenda}>Fazer outra encomenda</button>
                  : podePreencher && <button className="button button-primary" type="submit" disabled={enviando || !Number.isFinite(total) || total < 1 || Boolean(erroItens)}>{enviando ? 'Enviando encomenda…' : 'Confirmar encomenda'}</button>}
                <button className="button button-secondary" type="button" onClick={fechar}>Fechar e manter os dados</button>
              </div>
              <div className="form-result" role="status" aria-live="polite">
                {enviando && <p>Enviando sua encomenda. Aguarde a confirmação.</p>}
                {pedidoConfirmado !== null && <div><p><strong>Encomenda nº {pedidoConfirmado.id} confirmada!</strong> Reservamos {pedidoConfirmado.totalBolos} bolo(s) para a data escolhida. O pagamento será realizado na retirada.</p><ResumoFinanceiro resumo={pedidoConfirmado} /></div>}
              </div>
              {erroApi && <p className="form-api-error" role="alert">{erroApi}</p>}
              <p className="field-hint">Fechar mantém seu preenchimento. Recarregar apaga o rascunho, mas não cancela encomendas já confirmadas.</p>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
