# Precificação completa de encomendas

Implementada na branch `feature/precificacao-encomendas`, a partir de `feature/refinamento-visual`. Capacidade, sabores/quantidades, filtros, edição, sessão, CSRF e pagamento na retirada foram preservados. Não há campos para editar preço, desconto, taxa ou pagamento online.

## Fonte única e cálculos

`backend/src/catalogo.ts` é a única tabela de preços da aplicação: todos os valores são **centavos inteiros**. Inclui os preços públicos dos produtos e o valor separado da dúzia opcional de pão de queijo. O frontend importa esse módulo puro, sem código de servidor ou segredos. `cafeConfig.ts` mantém nomes, tamanhos e descrições; seu campo `preco` em reais é apenas uma representação derivada para as telas existentes, sem tabela monetária independente.

`backend/src/precificacao.ts` contém tipos e cálculos puros reutilizados pela prévia do frontend. Subtotal de um sabor = quantidade × preço unitário registrado. Subtotal de bolos = soma dos subtotais. Total = subtotal de bolos + acompanhamento (uma dúzia ou zero). Todos os cálculos e verificações usam inteiros seguros; a divisão por 100 ocorre somente na formatação para reais, com `Intl.NumberFormat('pt-BR')`.

O backend calcula o valor efetivo dentro da transação. A prévia nunca é enviada como preço confiável nem grava dados. O frontend e a API devem ser publicados juntos; uma aba aberta com bundle antigo pode ter prévia de catálogo desatualizada para novos sabores, mas o valor confirmado pelo servidor prevalece. O texto da prévia explicita essa confirmação.

## Persistência e histórico

| Situação | Regra |
| --- | --- |
| Novo pedido | Registra os preços vigentes de cada sabor e da dúzia, se incluída. |
| Alterar quantidade de sabor existente | Mantém o preço unitário registrado, identificando o produto pelo ID. |
| Adicionar sabor ou substituir por outro | Usa o preço vigente do produto adicionado. |
| Manter acompanhamento incluído | Preserva o valor registrado, mesmo com novo catálogo. |
| Remover acompanhamento | Grava zero; o valor deixa de entrar no total. |
| Adicionar acompanhamento a pedido sem ele | Registra o preço vigente da dúzia. |
| Alterar nome, telefone, data ou status | Não altera preços. |
| Cancelar ou falhar antes de salvar | O registro e seu total permanecem iguais. |

Se um sabor for removido e recolocado no mesmo rascunho, antes de salvar, ele ainda pertence ao pedido original e mantém seu preço. Depois de salvar uma composição sem esse sabor, uma adição posterior usa o catálogo vigente. Isso mantém a decisão reproduzível pelo servidor apenas com o estado persistido e os campos permitidos.

`encomenda_itens.precoUnitarioCentavos` é `INTEGER NOT NULL CHECK > 0`. Acompanhamento e indicador de inicialização ficam em `encomendas.valorPaoDeQueijoCentavos` e `encomendas.precosInicializados`. Subtotais e total não são duplicados em colunas: a leitura usa um único SELECT consistente com itens, quantidades e valores armazenados. Mudar o catálogo não muda pedidos existentes.

## Migração segura

Antes de iniciar esta versão com uma base que precise ser preservada, pare os processos escritores e faça uma cópia consistente conforme o [roteiro de backup](../../backend/README.md#persistência-capacidade-e-concorrência). Não inicie escritores de uma versão antiga sobre o esquema novo.

Na abertura, sob `BEGIN IMMEDIATE`, a aplicação primeiro aplica a migração de múltiplos sabores já existente, quando necessária. Em seguida, se a coluna de preço ainda não existe:

1. Renomeia a tabela filha temporariamente e cria a nova tabela estrita com preço, chave estrangeira e restrições.
2. Copia cada item, preservando ID do pedido, sabor, quantidade e ordem, e atribui o preço do catálogo atual.
3. Acrescenta e inicializa o valor da dúzia e o indicador de origem nas encomendas.
4. Remove somente a cópia temporária da tabela filha e confirma a transação.

IDs, sequência de IDs, nomes, telefones, datas, status e inclusão do acompanhamento permanecem. Qualquer falha reverte também o esquema, sem descartar pedidos. A presença da coluna financeira torna a migração idempotente: reabrir ou reiniciar a API não reaplica preços. Os testes cobrem tanto bases antigas de produto único quanto a base relacional anterior sem preços.

**Pedidos antigos não tinham preços armazenados.** A inicialização pelo catálogo disponível na implantação não comprova o valor combinado originalmente. `precosInicializados = true` identifica essa origem no resumo administrativo. O indicador permanece no pedido ao editá-lo. Novos pedidos têm `false`. A migração foi validada em bancos temporários; esta tarefa não iniciou a API sobre a base local real nem executou migração em produção.

## Contrato da API

Rotas e autenticação permanecem iguais. POST e PATCH aceitam somente os campos anteriores: contato, data, `itens: [{ produto, quantidade }]`, acompanhamento e, no PATCH, status. Campos monetários no topo ou dentro dos itens retornam **400**, inclusive se enviados junto de alterações válidas. Não envie de volta um objeto de resposta inteiro como PATCH.

Exemplo de resposta para dois bolos de cenoura, um de chocolate e uma dúzia:

```json
{
  "id": 1,
  "nomeCliente": "Cliente de Demonstração",
  "telefone": "73999999999",
  "dataEntrega": "2099-12-25",
  "status": "recebida",
  "incluirPaoDeQueijo": true,
  "itens": [
    { "produto": "bolo-cenoura", "quantidade": 2, "precoUnitarioCentavos": 3500, "subtotalCentavos": 7000 },
    { "produto": "bolo-chocolate", "quantidade": 1, "precoUnitarioCentavos": 4000, "subtotalCentavos": 4000 }
  ],
  "totalBolos": 3,
  "subtotalBolosCentavos": 11000,
  "valorPaoDeQueijoCentavos": 2500,
  "totalCentavos": 13500,
  "precosInicializados": false
}
```

`totalBolos` continua sendo quantidade física; não é valor monetário. `valorPaoDeQueijoCentavos` é zero quando ausente. A quantidade do acompanhamento continua sendo uma única dúzia opcional, sem consumir bolos da capacidade diária.

As respostas de criação, consulta, listagem e edição incluem os campos financeiros. O frontend valida inteiros, subtotais, soma geral e consistência do acompanhamento antes de aceitar uma resposta. Alterações só aparecem no cartão definitivo depois da resposta válida. Erro HTTP, conflito ou resposta inválida mantêm rascunho e valor anterior; não há repetição automática.

## Interface

`ResumoFinanceiro.tsx` é compartilhado pelo cartão administrativo, pela prévia e pela confirmação pública. Exibe quantidade/nome, unitário, subtotal por sabor, subtotal dos bolos, acompanhamento quando incluído e total em destaque. O pagamento continua na retirada.

A edição apresenta “Prévia da edição”, “Novo total” e o total anterior riscado quando o valor muda. Campos inválidos exibem orientação para completar os itens, sem total parcial ou NaN. A descrição do sabor existente mostra o preço registrado, evitando confusão com o catálogo atual. O PATCH contém apenas diferenças permitidas, sem valores calculados. A confirmação pública só mostra os valores retornados após `201` válido.

## Testes e evidências

- **70 testes frontend e 46 backend aprovados**, incluindo preço único, mistura, quantidades, adição/remoção da dúzia, substituição, contato/status/data, cancelamento, rede/409, histórico após mudança de catálogo, reinício da API, migração idempotente e rollback, manipulação de POST/PATCH e rejeição de respostas financeiras incoerentes.
- Lint frontend, TypeScript via build do frontend, typecheck do backend e builds dos dois projetos aprovados. Não existe script de lint no backend.
- Auditoria integrada com navegador, API real e SQLite temporário aprovada: sessão, cookie, CSRF, CRUD, capacidade, persistência e resumos financeiros.
- Cartões, prévia e confirmação pública verificados em **360, 390, 768 e 1280 px**, sem rolagem horizontal e com **zero violações axe WCAG A/AA** nos estados auditados. Resumo confirmado de R$ 100,00 e prévia de R$ 38,00 → R$ 130,00 verificados no navegador antes da gravação. Resultados em [resultado.json](resultado.json).
- Regressão de prazos com os novos campos aprovada nas quatro larguras, incluindo fuso do dispositivo em Tóquio e virada na Bahia: [prazos/navegador.json](prazos/navegador.json). A primeira tentativa teve timeout ao aguardar os cartões; a reexecução passou sem alteração de código da aplicação entre as tentativas.

| Largura | Cartões | Prévia | Confirmação pública |
| --- | --- | --- | --- |
| 360 px | [Ver](pedidos-360.jpg) | [Ver](06-editar-pedido-360.jpg) | [Ver](financeiro-publico-360.jpg) |
| 390 px | [Ver](pedidos-390.jpg) | [Ver](06-editar-pedido-390.jpg) | [Ver](financeiro-publico-390.jpg) |
| 768 px | [Ver](pedidos-768.jpg) | [Ver](06-editar-pedido-768.jpg) | [Ver](financeiro-publico-768.jpg) |
| 1280 px | [Ver](pedidos-1280.jpg) | [Ver](06-editar-pedido-1280.jpg) | [Ver](financeiro-publico-1280.jpg) |

Para repetir, com as dependências já instaladas:

```powershell
cd frontend
npm.cmd test
npm.cmd run lint
npm.cmd run build
cd ../backend
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
cd ..
node --experimental-strip-types scripts/testar-painel.mjs --precos
```

A auditoria de navegador usa as ferramentas Playwright/axe existentes em `.audit-tools` e grava as evidências nesta pasta, preservando os relatórios anteriores.

## Arquivos alterados

- Backend: novos `src/catalogo.ts` e `src/precificacao.ts`; `src/encomenda.ts`; `src/database/encomendas.ts`; testes `precificacao.test.ts`, `api.test.ts`, `admin.test.ts`, `itens.test.ts`, `quantidade.test.ts` e `helpers.ts`; `README.md`.
- Frontend: `data/cafeConfig.ts`; novos `utils/precificacao.ts`, `components/ResumoFinanceiro.tsx` e `styles/financeiro.css`; `components/EditarPedido.tsx` e `ItensPedido.tsx`; `pages/Admin.tsx`; `sections/Encomendas.tsx`; serviços `admin.ts` e `encomendas.ts`; `utils/edicaoEncomenda.ts`.
- Testes frontend: novo `precificacao.test.mjs` e fixture `fixtures/precos.mjs`; integração administrativa/pública e testes dos dois serviços atualizados para o contrato ampliado.
- Roteiros: `scripts/testar-painel.mjs` (modo `--precos`) e `scripts/testar-prazos.mjs` (fixtures financeiras e saída separada).
- Documentação: `README.md` principal e esta pasta.

Não foi realizado merge na Main.
