import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { formatarTelefone } from '../utils/encomenda'
import { ItensPedido } from './ItensPedido'
import { ResumoFinanceiro } from './ResumoFinanceiro'
import { previaFinanceira } from '../utils/precificacao'
import { alteracoesPedido, validarEdicao } from '../utils/edicaoEncomenda'
import type { CamposPedido } from '../utils/edicaoEncomenda'
import { statusEncomenda } from '../services/admin'
import type { AlteracoesPedido, PedidoAdmin } from '../services/admin'

export function EditarPedido({ pedido, ocupado, erroApi, salvar, cancelar }: {
  pedido: PedidoAdmin; ocupado: boolean; erroApi: string
  salvar: (alteracoes: AlteracoesPedido) => Promise<unknown>; cancelar: () => void
}) {
  const [campos, setCampos] = useState<CamposPedido>(() => ({
    nomeCliente: pedido.nomeCliente, telefone: formatarTelefone(pedido.telefone), itens: pedido.itens.map((item) => ({ ...item })),
    dataEntrega: pedido.dataEntrega,
    incluirPaoDeQueijo: pedido.incluirPaoDeQueijo, status: pedido.status,
  }))
  const [erros, setErros] = useState<Partial<Record<keyof CamposPedido, string>>>({})
  const [aviso, setAviso] = useState('')
  const titulo = useRef<HTMLHeadingElement>(null)
  const mensagem = useRef<HTMLDivElement>(null)
  const trava = useRef(false)
  const [tentativa, setTentativa] = useState(0)
  const previa = previaFinanceira(campos.itens, campos.incluirPaoDeQueijo, pedido)
  useEffect(() => { titulo.current?.focus() }, [])
  useEffect(() => { if (tentativa || erroApi) mensagem.current?.focus() }, [tentativa, erroApi])
  function mudar<K extends keyof CamposPedido>(campo: K, valor: CamposPedido[K]) {
    setCampos((atuais) => ({ ...atuais, [campo]: valor }))
    setErros((atuais) => ({ ...atuais, [campo]: undefined })); setAviso('')
  }
  const id = (campo: keyof CamposPedido) => `editar-${pedido.id}-${campo}`
  const acessibilidade = (campo: keyof CamposPedido) => ({ 'aria-invalid': Boolean(erros[campo]), 'aria-describedby': erros[campo] ? `${id(campo)}-erro` : undefined })
  function erroCampo(campo: keyof CamposPedido) {
    return erros[campo] && <p className="admin-field-error" id={`${id(campo)}-erro`}>{erros[campo]}</p>
  }
  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (ocupado || trava.current) return
    const falhas = validarEdicao(pedido, campos)
    setErros(falhas)
    if (Object.keys(falhas).length) { setAviso('Confira os campos indicados antes de salvar.'); setTentativa((valor) => valor + 1); return }
    const alteracoes = alteracoesPedido(pedido, campos)
    if (!Object.keys(alteracoes).length) { setAviso('Nenhuma informação foi alterada. Você pode cancelar para voltar ao cartão.'); setTentativa((valor) => valor + 1); return }
    trava.current = true
    setAviso('')
    try { await salvar(alteracoes) } finally { trava.current = false }
  }
  return <form className="admin-edit" onSubmit={enviar} noValidate aria-labelledby={`editar-titulo-${pedido.id}`} aria-busy={ocupado}>
    <h4 id={`editar-titulo-${pedido.id}`} ref={titulo} tabIndex={-1}>Editar pedido nº {pedido.id}</h4>
    <p>O número do pedido permanece o mesmo. As informações só mudam depois de salvar com sucesso.</p>
    {(aviso || erroApi) && <div className="admin-feedback admin-error" ref={mensagem} tabIndex={-1} role="alert">
      {erroApi || aviso}
      {Object.values(erros).some(Boolean) && <ul>{Object.entries(erros).filter(([, texto]) => texto).map(([campo, texto]) => <li key={campo}><a href={`#${id(campo as keyof CamposPedido)}`}>{texto}</a></li>)}</ul>}
    </div>}
    <fieldset disabled={ocupado}>
      <legend className="visually-hidden">Informações modificáveis do pedido</legend>
      <div><label htmlFor={id('nomeCliente')}>Nome completo</label><input id={id('nomeCliente')} value={campos.nomeCliente} autoComplete="name" required maxLength={100} onChange={(e) => mudar('nomeCliente', e.target.value)} {...acessibilidade('nomeCliente')} />{erroCampo('nomeCliente')}</div>
      <div><label htmlFor={id('telefone')}>Telefone/WhatsApp</label><input id={id('telefone')} type="tel" autoComplete="tel" inputMode="tel" required maxLength={25} value={campos.telefone} onChange={(e) => mudar('telefone', e.target.value)} onBlur={() => mudar('telefone', formatarTelefone(campos.telefone))} {...acessibilidade('telefone')} />{erroCampo('telefone')}</div>
      <ItensPedido prefixo={id('itens')} itens={campos.itens} limite={5} administrativo registrados={pedido.itens} alterar={(itens) => mudar('itens', itens)} erro={erros.itens} />
      <div><label htmlFor={id('dataEntrega')}>Data da retirada</label><input id={id('dataEntrega')} type="date" required value={campos.dataEntrega} onChange={(e) => mudar('dataEntrega', e.target.value)} {...acessibilidade('dataEntrega')} />{erroCampo('dataEntrega')}</div>
      <p className="admin-edit-hint">São até cinco bolos por dia, somando todos os pedidos. Ao mudar data ou quantidade, a retirada precisa ser a partir de amanhã, no horário da Bahia. O servidor confere a capacidade sem contar este pedido duas vezes.</p>
      <label className="admin-edit-check"><input id={id('incluirPaoDeQueijo')} type="checkbox" checked={campos.incluirPaoDeQueijo} onChange={(e) => mudar('incluirPaoDeQueijo', e.target.checked)} />Incluir uma dúzia de pão de queijo</label>
      <div><label htmlFor={id('status')}>Status</label><select id={id('status')} value={campos.status} onChange={(e) => mudar('status', e.target.value as CamposPedido['status'])} {...acessibilidade('status')}>{statusEncomenda.map((valor) => <option key={valor} value={valor}>{valor}</option>)}</select>{erroCampo('status')}</div>
      <div aria-live="polite" aria-atomic="true">{previa ? <ResumoFinanceiro resumo={previa} anterior={pedido.totalCentavos} previa /> : <p>Preencha sabores e quantidades válidos para calcular a prévia financeira.</p>}</div>
      <button className="button button-primary" type="submit">{ocupado ? 'Salvando alterações…' : 'Salvar alterações'}</button>
      <button className="button" type="button" onClick={cancelar}>Cancelar</button>
    </fieldset>
  </form>
}
