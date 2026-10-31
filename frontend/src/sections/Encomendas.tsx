import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { cafeConfig } from '../data/cafeConfig'
import { dataMinimaEncomenda, formatarTelefone, produtoEncomendavel, validarEncomenda } from '../utils/encomenda'
import type { CampoEncomenda, DadosEncomenda, ErrosEncomenda } from '../utils/encomenda'
import { criarEncomenda, ErroEncomenda } from '../services/encomendas'
import '../styles/encomendas.css'

const produtosPrincipais = cafeConfig.produtos.filter(produtoEncomendavel)
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const rotulos: Record<CampoEncomenda, string> = {
  nomeCliente: 'Nome completo', telefone: 'Telefone/WhatsApp', produto: 'Produto', dataEntrega: 'Data desejada',
}

export function Encomendas() {
  const [aberto, setAberto] = useState(false)
  const [dados, setDados] = useState<DadosEncomenda>({
    nomeCliente: '', telefone: '', produto: '', dataEntrega: '', incluirPaoDeQueijo: false,
  })
  const [erros, setErros] = useState<ErrosEncomenda>({})
  const [erroApi, setErroApi] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [pedidoConfirmado, setPedidoConfirmado] = useState<number | null>(null)
  const bloqueioEnvio = useRef(false)
  const [dataMinima, setDataMinima] = useState(() => dataMinimaEncomenda(cafeConfig.fusoHorario))
  const botaoRef = useRef<HTMLButtonElement>(null)
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const errosRef = useRef<HTMLDivElement>(null)
  const selecionado = produtosPrincipais.find((produto) => produto.id === dados.produto)
  const adicional = cafeConfig.produtos.find((produto) => produto.encomenda.tipo === 'acompanhamento'
    && !produto.sazonalidade && produto.encomenda.categoriaPrincipal === selecionado?.categoria)
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

  function fechar() {
    botaoRef.current?.focus()
    setAberto(false)
  }

  function alternar() {
    if (aberto) return fechar()
    setDataMinima(dataMinimaEncomenda(cafeConfig.fusoHorario))
    setAberto(true)
  }

  function atualizar(campo: CampoEncomenda, valor: string) {
    setDados((atual) => ({ ...atual, [campo]: valor }))
    setErros((atuais) => ({ ...atuais, [campo]: undefined }))
    setErroApi('')
  }

  async function confirmar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (bloqueioEnvio.current) return
    const minimaAtual = dataMinimaEncomenda(cafeConfig.fusoHorario)
    setDataMinima(minimaAtual)
    const novosErros = validarEncomenda(dados, cafeConfig.produtos, minimaAtual)
    setErros(novosErros)
    if (Object.keys(novosErros).length) {
      setErroApi('')
      requestAnimationFrame(() => errosRef.current?.focus())
      return
    }
    // O ref bloqueia cliques no mesmo instante, antes de o React atualizar o botão.
    bloqueioEnvio.current = true
    setEnviando(true)
    setErroApi('')
    let confirmado = false
    try {
      const pedido = await criarEncomenda(dados)
      confirmado = true
      setPedidoConfirmado(pedido.id)
    } catch (erro) {
      setErroApi(erro instanceof ErroEncomenda ? erro.message : 'Não foi possível obter a confirmação. Confira com o café antes de reenviar.')
      if (erro instanceof ErroEncomenda && erro.status === 409) {
        setErros({ dataEntrega: 'Data esgotada. Escolha outra data para a encomenda.' })
        requestAnimationFrame(() => {
          if (errosRef.current && !errosRef.current.closest('[inert]')) errosRef.current.focus()
        })
      }
    } finally {
      setEnviando(false)
      // Após sucesso, só uma ação explícita de novo pedido libera outro envio.
      if (!confirmado) bloqueioEnvio.current = false
    }
  }

  function novaEncomenda() {
    bloqueioEnvio.current = false
    setPedidoConfirmado(null)
    setErroApi('')
    setErros({})
    setDados({ nomeCliente: '', telefone: '', produto: '', dataEntrega: '', incluirPaoDeQueijo: false })
    setDataMinima(dataMinimaEncomenda(cafeConfig.fusoHorario))
    tituloRef.current?.focus()
  }

  return (
    <section className="orders-section" id="encomendas" aria-labelledby="encomendas-title" tabIndex={-1}>
      <div className="container orders-paper">
        <header className="orders-heading">
          <h2 id="encomendas-title">Faça sua encomenda <span aria-hidden="true">♡</span></h2>
          <p>Um bolo caseiro para deixar o seu dia mais gostoso.</p>
        </header>
        <ul className="order-rules">
          <li><span aria-hidden="true">◷</span><p>Peça com pelo menos <strong>um dia de antecedência</strong>.</p></li>
          <li><span aria-hidden="true">♡</span><p>Limite de <strong>cinco encomendas por dia</strong>.</p></li>
          <li><span aria-hidden="true">⌂</span><p>Pagamento <strong>na retirada</strong>.</p></li>
        </ul>
        <p className="orders-demo" id="orders-demo">Protótipo com dados comerciais fictícios. Ao confirmar, seu pedido será registrado se houver vaga na data escolhida.</p>
        <button ref={botaoRef} className="button button-primary orders-toggle" type="button" aria-expanded={aberto} aria-controls="gaveta-encomenda" onClick={alternar}>
          {aberto ? 'Fechar formulário' : 'Quero encomendar'} <span aria-hidden="true">{aberto ? '−' : '+'}</span>
        </button>
        {/* A gaveta permanece montada; inert impede foco nos campos enquanto está fechada. */}
        <div id="gaveta-encomenda" className={`order-drawer${aberto ? ' is-open' : ''}`} inert={!aberto} aria-hidden={!aberto}>
          <div className="order-drawer-inner">
            <form className="order-form" noValidate onSubmit={confirmar} aria-labelledby="form-title" aria-describedby="orders-demo">
              <h3 id="form-title" ref={tituloRef} tabIndex={-1}>Preencha os dados da sua encomenda</h3>
              <p className="form-intro">Os quatro campos abaixo são obrigatórios. Use dados fictícios para testar.</p>
              {camposComErro.length > 0 && <div className="form-errors" ref={errosRef} tabIndex={-1} role="alert">
                <p><strong>Vamos conferir alguns campos?</strong></p>
                <ul>{camposComErro.map((campo) => <li key={campo}><a href={`#pedido-${campo}`}>{rotulos[campo]}: {erros[campo]}</a></li>)}</ul>
              </div>}
              <fieldset className="order-form-fields" disabled={enviando || pedidoConfirmado !== null} aria-busy={enviando}>
                <legend className="visually-hidden">Dados da encomenda</legend>
                <div className="order-fields">
                  <div className="order-field">
                    <label htmlFor="pedido-nomeCliente">Nome completo <span aria-hidden="true">*</span></label>
                    <input id="pedido-nomeCliente" name="nomeCliente" autoComplete="name" required maxLength={100} value={dados.nomeCliente} onChange={(e) => atualizar('nomeCliente', e.target.value)} aria-invalid={Boolean(erros.nomeCliente)} aria-describedby={erros.nomeCliente ? 'erro-nomeCliente' : undefined} />
                    {erros.nomeCliente && <p className="field-error" id="erro-nomeCliente">{erros.nomeCliente}</p>}
                  </div>
                  <div className="order-field">
                    <label htmlFor="pedido-telefone">Telefone/WhatsApp <span aria-hidden="true">*</span></label>
                    <input id="pedido-telefone" name="telefone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={25} value={dados.telefone} onChange={(e) => atualizar('telefone', e.target.value)} onBlur={() => setDados((atual) => ({ ...atual, telefone: formatarTelefone(atual.telefone) }))} aria-invalid={Boolean(erros.telefone)} aria-describedby={`telefone-ajuda${erros.telefone ? ' erro-telefone' : ''}`} />
                    <p className="field-hint" id="telefone-ajuda">Com DDD: (73) 99999-9999. Aceita fixo ou celular, com +55 opcional.</p>
                    {erros.telefone && <p className="field-error" id="erro-telefone">{erros.telefone}</p>}
                  </div>
                  <div className="order-field">
                    <label htmlFor="pedido-produto">Produto escolhido <span aria-hidden="true">*</span></label>
                    <select id="pedido-produto" name="produto" required value={dados.produto} onChange={(e) => atualizar('produto', e.target.value)} aria-invalid={Boolean(erros.produto)} aria-describedby={erros.produto ? 'erro-produto' : undefined}>
                      <option value="">Selecione um bolo</option>
                      {produtosPrincipais.map((produto) => <option key={produto.id} value={produto.id}>{produto.nome} · {moeda.format(produto.preco)}</option>)}
                    </select>
                    {erros.produto && <p className="field-error" id="erro-produto">{erros.produto}</p>}
                  </div>
                  <div className="order-field">
                    <label htmlFor="pedido-dataEntrega">Data desejada <span aria-hidden="true">*</span></label>
                    <input id="pedido-dataEntrega" name="dataEntrega" type="date" required min={dataMinima} max="9999-12-31" value={dados.dataEntrega} onFocus={() => setDataMinima(dataMinimaEncomenda(cafeConfig.fusoHorario))} onChange={(e) => atualizar('dataEntrega', e.target.value)} aria-invalid={Boolean(erros.dataEntrega)} aria-describedby={`data-ajuda${erros.dataEntrega ? ' erro-dataEntrega' : ''}`} />
                    <p className="field-hint" id="data-ajuda">A partir de amanhã, no horário do café. A disponibilidade será verificada ao confirmar.</p>
                    {erros.dataEntrega && <p className="field-error" id="erro-dataEntrega">{erros.dataEntrega}</p>}
                  </div>
                </div>
                {acompanhamento && adicional && <label className="order-extra">
                  <input type="checkbox" name="incluirPaoDeQueijo" checked={dados.incluirPaoDeQueijo} onChange={(e) => { setDados((atual) => ({ ...atual, incluirPaoDeQueijo: e.target.checked })); setErroApi('') }} />
                  <span>Adicionar {adicional.nome.toLowerCase()} <small>{acompanhamento.tamanho} · + {moeda.format(acompanhamento.preco)} (opcional, junto com o bolo)</small></span>
                </label>}
              </fieldset>
              <div className="form-actions">
                {pedidoConfirmado === null
                  ? <button className="button button-primary" type="submit" disabled={enviando}>{enviando ? 'Enviando encomenda…' : 'Confirmar encomenda'}</button>
                  : <button className="button button-primary" type="button" onClick={novaEncomenda}>Fazer outra encomenda</button>}
                <button className="button button-secondary" type="button" onClick={fechar}>Fechar e manter os dados</button>
              </div>
              <div className="form-result" role="status" aria-live="polite">
                {enviando && <p>Enviando sua encomenda. Aguarde a confirmação.</p>}
                {pedidoConfirmado !== null && <p><strong>Encomenda nº {pedidoConfirmado} confirmada!</strong> Sua data está reservada. O pagamento será realizado na retirada.</p>}
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
