import { sabores } from '../utils/itens'
import { reais } from '../utils/precificacao'
import type { Financeiro } from '../utils/precificacao'
import '../styles/financeiro.css'

export function ResumoFinanceiro({ resumo, anterior, previa = false }: { resumo: Financeiro; anterior?: number; previa?: boolean }) {
  const mudou = anterior !== undefined && anterior !== resumo.totalCentavos
  return <section className={`financial-summary${mudou ? ' financial-changed' : ''}`} aria-label={previa ? 'Prévia financeira' : 'Resumo financeiro'}>
    <h4>{previa ? 'Prévia da edição' : 'Resumo financeiro'}</h4>
    <ul className="financial-items">{resumo.itens.map((item) => <li key={item.produto}>
      <strong>{item.quantidade} × {sabores.find((sabor) => sabor.id === item.produto)?.nome ?? item.produto}</strong>
      <span>Unitário: {reais(item.precoUnitarioCentavos)}</span>
      <span>Subtotal: <b>{reais(item.subtotalCentavos)}</b></span>
    </li>)}</ul>
    <dl>
      <div><dt>Subtotal dos bolos</dt><dd>{reais(resumo.subtotalBolosCentavos)}</dd></div>
      {resumo.valorPaoDeQueijoCentavos > 0 && <div><dt>Pão de queijo · uma dúzia</dt><dd>{reais(resumo.valorPaoDeQueijoCentavos)}</dd></div>}
      {mudou && <div className="financial-previous"><dt>Total anterior</dt><dd><s>{reais(anterior)}</s></dd></div>}
      <div className="financial-total"><dt>{previa ? 'Novo total' : 'Total do pedido'}</dt><dd>{reais(resumo.totalCentavos)}</dd></div>
    </dl>
    <p>Pagamento na retirada.</p>
    {previa && <p className="financial-hint">Prévia sem gravação. Itens existentes mantêm o preço registrado; novos sabores usam o catálogo atual. O servidor confirma os valores ao salvar.</p>}
    {resumo.precosInicializados && <p className="financial-hint">Pedido antigo: os preços iniciais foram atribuídos pelo catálogo na implantação da precificação. Podem diferir do valor originalmente combinado.</p>}
  </section>
}
