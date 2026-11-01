# Disponibilidade do cardápio

Implementada na branch `feature/produtos-sazonais`, a partir de `feature/precificacao-encomendas`. Sem merge na Main. A landing mantém sua estrutura, identidade e navegação; as mudanças públicas necessárias estão na disponibilidade e nas unidades dos produtos.

## Uso por Dona Marta

1. Entre em `/admin` com as credenciais já configuradas.
2. Abaixo dos pedidos, encontre **Disponibilidade do cardápio**.
3. Em cada produto, marque/desmarque **Aceita encomendas** e escolha **O ano todo** ou **Apenas meses selecionados**. Nesse segundo modo, marque pelo menos um mês.
4. Clique em **Salvar [produto]** e aguarde a confirmação. O estado confirmado permanece separado do rascunho. Durante o envio, os controles ficam bloqueados; erros mantêm os valores digitados e não anunciam sucesso.

Não há edição de preços, cadastro ou exclusão de produtos. A configuração controla encomendas, sem esconder o produto no cardápio. Reiniciar a API mantém as decisões. Durante a edição de um pedido, os controles de produtos ficam bloqueados para manter o foco no rascunho.

## Catálogo, unidades e preços

`backend/src/produtos.ts` é a fonte compartilhada de nomes, categorias, descrições, unidades e classificação de produção. `backend/src/catalogo.ts` continua sendo a fonte única dos preços, em centavos. As configurações SQLite armazenam somente ID, habilitação e meses; não duplicam nomes ou preços.

| Produto | Padrão inicial | Unidade de encomenda | Produção |
| --- | --- | --- | --- |
| Seis bolos caseiros | Habilitado, ano todo | Bolo inteiro | Uma unidade por bolo |
| Panetone | Desabilitado, dezembro | Unidade de 500 g | Uma unidade por panetone |
| Bolo de Natal | Desabilitado, dezembro | Bolo inteiro | Uma unidade por bolo |
| Café coado / com leite | Desabilitado, ano todo | Xícara de 150 / 200 ml | Zero |
| Pão de queijo | Habilitado, ano todo | Dúzia de 12 unidades | Zero |

A quantidade de pão de queijo nos itens significa **dúzias**, pelo preço `CATALOGO.paoDeQueijoCentavos` (atualmente 2500). O preço unitário de balcão continua em `CATALOGO.produtos['pao-queijo']` (300). O adicional legado continua representando uma única dúzia; a API rejeita item de pão de queijo junto com esse adicional para evitar duplicação.

Para mudar preços, altere `catalogo.ts` e publique frontend/backend juntos. Leituras usam os valores registrados no pedido; edições mantêm o preço unitário dos produtos que já estavam nele. Produtos novos na composição usam o preço vigente. A disponibilidade não reprecifica pedidos.

## Elegibilidade, histórico e contagens

A regra pura `permitidoNaData` exige produto habilitado e mês da **retirada** incluído na configuração. `[]` significa ano todo. Por exemplo: um pedido feito em novembro pode conter panetone para dezembro. As datas continuam validadas como dias de calendário no fuso `America/Bahia`, a partir de amanhã, sem depender do fuso do computador.

O formulário consulta novamente ao trocar a data, a cada 30 segundos e ao retomar o foco da janela. Respostas antigas são canceladas/ignoradas. Não há remoção silenciosa: produtos escolhidos permanecem no rascunho e uma mensagem indica o conflito. Se o estado mudar depois da consulta, o POST autoritativo devolve `409`; a tela atualiza saldo e produtos e orienta a correção sem perder contatos ou itens. Falha de consulta bloqueia nova confirmação e permite tentar novamente.

Pedidos sem bolos são aceitos. Dia cheio bloqueia novos bolos/panetones, mantendo cafés e dúzias habilitados. A API separa:

- `totalBolos`: somente bolos, incluindo bolo de Natal.
- `quantidadeProducao`: bolos + panetones que ocupam o grupo diário.
- `quantidadeItens`: soma das unidades de venda, mais uma se houver o adicional legado. Uma dúzia vale uma unidade de venda, não 12.
- Valores em centavos: independentes dessas contagens. O nome de contrato legado `subtotalBolosCentavos` foi preservado por compatibilidade; representa a soma monetária de **todos os itens**. A interface o chama **Subtotal dos produtos**.

**Regra confirmada:** limite de cinco bolos por dia, considerando todos os status. **Interpretação provisória solicitada para este protótipo:** panetones usam o mesmo grupo de cinco; cafés e dúzias não possuem quota diária definida. O backend valida a soma em `BEGIN IMMEDIATE`, descontando a própria reserva ao editar. Não é uma definição comercial definitiva sobre a produção dos demais produtos.

Desativar não cancela nem modifica valores de pedidos existentes. Contato/status podem mudar; produtos mantidos e reduções não exigem reativação. Adicionar ou aumentar um produto exige elegibilidade atual; trocar a retirada verifica todos os itens e o adicional. Remover um produto desabilitado é permitido. As regras anteriores de data futura ao mudar data/quantidade permanecem, inclusive em registros antigos.

## API e migração

| Método/rota | Acesso e contrato |
| --- | --- |
| `GET /api/produtos` | Público, sem credenciais; preço e unidade de encomenda, estado e meses. Sem dados de clientes. |
| `GET /api/admin/produtos` | Autenticação administrativa existente. |
| `PATCH /api/admin/produtos/:id` | Autenticação existente; por cookie, exige origem exata e CSRF da sessão. |

PATCH aceita exclusivamente `{ "aceitaEncomendas": true, "mesesPermitidos": [12] }`: booleano estrito, meses inteiros distintos de 1 a 12, `[]` para o ano todo. Campos extras, preço ou meses inválidos recebem `400`; ID desconhecido recebe `404`; não há PATCH público. Nenhuma habilitação enviada junto de uma encomenda substitui as configurações do servidor.

A migração roda na transação inicial existente. Cria `produto_disponibilidade`, insere padrões ausentes com `INSERT OR IGNORE` e substitui a antiga restrição de seis IDs na tabela filha por FK para as configurações do catálogo. Copia ID do pedido, produto, quantidade, ordem e preço unitário sem recalcular os valores. Preserva também datas, status, contatos, adicional, sequência de IDs e marca de inicialização dos preços. Falha reverte esquema e dados. Reabrir não duplica itens nem sobrescreve configurações.

As migrações anteriores continuam atendendo bases ainda sem itens ou sem preços. Antes de atualizar uma base real, pare escritores antigos e faça o [backup documentado](../../backend/README.md#persistência-capacidade-e-concorrência). Publique as duas aplicações juntas devido aos novos campos de contagem.

## Validação

- **Frontend:** 81 testes aprovados, incluindo serviços, formulário público, edição, filtros existentes, disponibilidade por mês, alteração durante o preenchimento, pedido sem bolos, estado confirmado/rascunho, erro e duplo envio do painel.
- **Backend:** 57 testes aprovados, incluindo todos os produtos, reinício, autenticação, CSRF/origem, meses/IDs inválidos, retirada em dezembro solicitada em novembro, preços/limites monetários seguros, histórico, migrações/rollback e concorrência em processos independentes.
- Lint do frontend sem avisos; TypeScript do frontend e backend (incluindo testes) e builds aprovados. Não há script de lint no backend.
- Edge/Chromium real, API e Vite em portas temporárias, SQLite temporário: **16 combinações de estado/largura** (360, 390, 768, 1280), sem rolagem horizontal e sem violações axe nos critérios WCAG A/AA selecionados. Nenhuma exceção JavaScript. Ver [resultado](resultado.json).

A auditoria confirma um pedido misto de panetone + duas xícaras + duas dúzias por **R$ 105,00**, com produção 1, unidades de venda 5 e adicional 0; valida alteração de mês sem remoção, desativação, preservação da edição de contato/status, negação anônima/CSRF e persistência ao reabrir o SQLite.

As regressões anteriores também passaram: [painel/precificação](regressao-painel/resultado.json), com 28 verificações axe, e [fluxo público](regressao-publico/resultado.json), com seis. Junto das 16 novas verificações, são **50 análises axe sem violações detectadas**, sem exceções JavaScript ou falhas de rede inesperadas. Os GETs cancelados ao mudar a data ou fechar o editor estão registrados separadamente; os conflitos `409` e bloqueios de autenticação intencionais permanecem nos relatórios. As capturas foram inspecionadas visualmente para conferir preços, unidades, campos e meses, além das verificações automáticas de geometria.

Comandos na raiz, com as dependências das duas aplicações e `.audit-tools` instaladas:

```powershell
Push-Location frontend
npm.cmd test
npm.cmd run lint
npm.cmd exec tsc -- -b
npm.cmd run build
Pop-Location
Push-Location backend
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
Pop-Location
node --experimental-strip-types scripts/testar-sazonais.mjs
node --experimental-strip-types scripts/testar-painel.mjs --precos --sazonais --sem-capturas
node --experimental-strip-types scripts/auditar-preentrega.mjs --sazonais --sem-capturas
```

Todos criam bancos em memória ou em pastas temporárias; nenhum teste usa o SQLite local real. `--sazonais` direciona as regressões para esta pasta; `--sem-capturas` preserva as capturas históricas. Cancelamentos de GET por navegação/troca de data são identificados separadamente das falhas de rede.

## Capturas

| Tela | 360 px | 390 px | 768 px | 1280 px |
| --- | --- | --- | --- | --- |
| Disponibilidade administrativa | [Abrir](admin-disponibilidade-360.jpg) | [Abrir](admin-disponibilidade-390.jpg) | [Abrir](admin-disponibilidade-768.jpg) | [Abrir](admin-disponibilidade-1280.jpg) |
| Formulário misto | [Abrir](formulario-misto-360.jpg) | [Abrir](formulario-misto-390.jpg) | [Abrir](formulario-misto-768.jpg) | [Abrir](formulario-misto-1280.jpg) |
| Confirmação financeira | [Abrir](confirmacao-mista-360.jpg) | [Abrir](confirmacao-mista-390.jpg) | [Abrir](confirmacao-mista-768.jpg) | [Abrir](confirmacao-mista-1280.jpg) |
| Pedido preservado e editado | [Abrir](pedido-preservado-360.jpg) | [Abrir](pedido-preservado-390.jpg) | [Abrir](pedido-preservado-768.jpg) | [Abrir](pedido-preservado-1280.jpg) |

## Arquivos da implementação

- Backend: `src/produtos.ts`, `src/disponibilidadeProdutos.ts`, `src/routes/produtos.ts`, `src/database/encomendas.ts`, `src/encomenda.ts`, `src/precificacao.ts`, `src/config.ts`, `src/errors.ts`, `src/app.ts`.
- Frontend: `src/components/DisponibilidadeCardapio.tsx`, `src/styles/disponibilidade-cardapio.css`, `src/hooks/useProdutos.ts`, `src/services/produtos.ts`, `src/services/admin.ts`, `src/services/encomendas.ts`, `src/pages/Admin.tsx`, `src/sections/Cardapio.tsx`, `src/sections/Encomendas.tsx`, `src/components/ItensPedido.tsx`, `src/components/EditarPedido.tsx`, `src/components/ResumoFinanceiro.tsx`, `src/data/cafeConfig.ts`, `src/utils/itens.ts`, `src/utils/encomenda.ts`, `src/utils/edicaoEncomenda.ts`, `src/utils/precificacao.ts`.
- Testes backend: `tests/produtos.test.ts`, `tests/admin.test.ts`, `tests/concorrencia.test.ts`, `tests/api.test.ts`, `tests/itens.test.ts`, `tests/helpers.ts`.
- Testes frontend: `tests/produtos-service.test.mjs`, `tests/admin-integracao.test.mjs`, `tests/encomendas-integracao.test.mjs`, `tests/encomenda.test.mjs`, `tests/fixtures/precos.mjs`.
- Auditorias/documentação: `scripts/testar-sazonais.mjs`, ajustes nos seletores/expectativas e saídas de `scripts/testar-painel.mjs` e `scripts/auditar-preentrega.mjs`, `README.md`, `backend/README.md` e esta pasta com capturas/JSON.

## Limites

Adicionar produtos ou alterar preços ainda exige catálogo em código e deploy; apenas disponibilidade/meses são administráveis. Configurações usam o último salvamento confirmado, sem edição simultânea com resolução de conflitos entre administradores. A atualização pública é por consulta periódica/foco/data, sem push; o servidor permanece autoritativo. Os dados comerciais e a regra de produção do panetone continuam provisórios. Axe não substitui testes com leitor de tela; Safari/iOS e Firefox não foram conferidos nesta etapa. As seis imagens previamente alteradas em `docs/precificacao/` foram preservadas.
