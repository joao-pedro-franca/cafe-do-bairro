# Café do Bairro — V1.1

Etapa de 01/11/2026, sobre a V1.0. Duas melhorias, em commits separados: rolagem e edição administrativa. Não houve reconstrução do projeto, biblioteca nova, migração SQLite ou novo endpoint.

## Rolagem entre seções

O CSS já solicitava suavização, mas a implementação anterior deixava a âncora nativa agir antes de decidir se usaria um fallback de 450 ms. Isso não impedia o salto inicial em navegadores que ignoravam a suavização. Além disso, o percurso terminava cedo demais: a nova medição da versão anterior chegou a 6.835 px aos 304 ms e ao destino de 7.211 px antes dos 603 ms. Não foi identificada a configuração interna específica do navegador que motivou o relato do usuário.

`frontend/src/utils/rolagem.ts` agora intercepta os quatro destinos entre seções com `preventDefault`, atualiza o hash/histórico com `pushState` e anima o percurso inteiro com `requestAnimationFrame` por **1.200 ms**, usando a curva cúbica `1 - (1 - progresso)³`. Cada quadro usa rolagem instantânea para a posição calculada, sem depender da suavização nativa. O foco vai ao destino com `preventScroll`, sem antecipar o deslocamento. A margem CSS da seção é respeitada. Voltar/avançar usa a restauração do próprio navegador e ajusta o foco sem rolar de novo. Skip link, âncoras de erros, cliques modificados e links externos não são interceptados.

Interação com roda, toque, ponteiro ou teclado cancela os próximos quadros. Movimento reduzido navega diretamente; se a preferência for ativada durante o percurso, a página conclui o deslocamento sem continuar animando. A animação não altera o formulário de encomendas, painel ou API.

As medições atuais [antes, 450 ms](rolagem-450ms.json) e [depois, 1.200 ms](rolagem-1200ms.json) guardam todos os quadros e amostras próximas de 100, 300, 600, 900 e 1.200 ms. Os arquivos anteriores `rolagem-antes.json` e `rolagem.json` permanecem apenas como histórico. O teste usa cliques reais do Playwright e Enter no Edge, além de histórico, continuação por Tab, interrupção com roda real e mudança de movimento reduzido durante a animação. Cabeçalho, ambos os CTAs do Hero, cardápio e rodapé foram verificados. As larguras são 360, 390, 768 e 1280 px. A curva segue progressivamente em uma única direção, com mais de 30 posições distintas por percurso; em movimento reduzido, todos os quadros posteriores ao clique já estão no destino.

Amostra da execução concluída, clicando em Encomendas no cabeçalho em 390 px, partindo de 0 e com destino em aproximadamente 7.211 px:

| Tempo registrado | Posição vertical |
| --- | --- |
| 101 ms | 1.212 px |
| 307 ms | 4.045 px |
| 607 ms | 6.255 px |
| 907 ms | 7.084 px |
| 1.207 ms | 7.211 px |

As posições intermediárias demonstram que não houve teletransporte ao destino nem salto para trás antes da animação. O registro segue por cerca de 1.450 ms para confirmar que a página permanece parada após o término. Foram repetidos os 50 testes frontend, os 31 testes backend, lint, typecheck e builds disponíveis. A correção está restrita à branch `melhorias-v1.1`, sem merge na `Main`.

## Editar pedidos

1. Inicie frontend e backend conforme o [README principal](../../README.md#habilitar-o-painel-administrativo) e entre em `/admin` com suas credenciais.
2. Clique em **Editar pedido**. Confira os sete campos preenchidos: nome, telefone, sabor, quantidade, data, dúzia opcional e status. O ID aparece no título e não tem campo de edição.
3. Modifique os dados e use **Salvar alterações**. Somente diferenças normalizadas são enviadas ao `PATCH /api/encomendas/:id`. Campos inalterados, incluindo a data, são omitidos.
4. **Cancelar** descarta o rascunho sem requisição. Salvar sem diferenças informa que nada mudou, sem enviar PATCH.
5. Nome/sobrenome, telefone brasileiro, um dos seis bolos, quantidade inteira de 1 a 5, status e nova data são validados antes de enviar. Contato, sabor, adicional e status podem mudar em pedido antigo sem alterar a data. Ao mudar quantidade ou data, a retirada precisa ser amanhã ou depois, em `America/Bahia`.
6. O servidor valida definitivamente dentro da transação existente. Alterar data libera a reserva antiga e ocupa a nova; alterar quantidade usa a nova soma, sem contar o mesmo pedido duas vezes. O acompanhamento não consome capacidade de bolos.
7. Se receber `409`, nenhum campo é gravado. A mensagem fica dentro do formulário, recebe foco e o rascunho é preservado para corrigir quantidade/data. O cartão continua exibindo a versão confirmada pelo servidor.
8. Durante envio os controles ficam bloqueados e uma trava impede duplo PATCH. Falha de conexão não gera confirmação nem repetição automática; a alteração pode ter sido salva, então confira o pedido em outra aba antes de reenviar. Recarregar, cancelar ou sair descarta o rascunho local.

Filtros e atualização da lista ficam pausados durante edição, evitando desmontar um formulário preenchido. Ao abrir, o foco vai ao título da edição; ao cancelar/salvar, volta ao botão do pedido. Se o novo status/data deixar de corresponder ao filtro, o foco vai ao título da lista. A edição rápida de status, exclusão confirmada, logout e fluxo público continuam disponíveis.

## Verificações

- **50 testes frontend aprovados**, incluindo edição de todos os campos, PATCH mínimo, data antiga omitida, cancelamento, validação local, foco, filtro, duplicidade, conflito sem gravação parcial e resposta perdida após gravação, sem retry.
- **31 testes backend aprovados**, incluindo edição completa por sessão, capacidades por data, rollback, migração e concorrência já existentes.
- Lint frontend sem avisos; build frontend com `tsc -b`; typecheck da aplicação/testes backend e build backend aprovados. Não há lint separado no backend.
- Playwright/Edge: edição em **360, 390, 768 e 1280 px**, sem rolagem horizontal, além de conflito em 390 px. O mesmo roteiro retesta encomenda pública, disponibilidade, login, status, exclusão, logout e negação anônima.
- Persistência do PATCH conferida por outro leitor do arquivo SQLite e após recarregar o painel. Os testes usam banco temporário, sem alterar pedidos locais ou credenciais reais.
- Axe não detectou violações nas 20 combinações de estado/largura do roteiro administrativo integrado. Não houve exceção JavaScript. Os erros HTTP esperados são `401` sem sessão e `409` no conflito proposital.

Resultados estruturados: [painel/resultado.json](painel/resultado.json). Capturas: [360 px](painel/06-editar-pedido-360.png), [390 px](painel/06-editar-pedido-390.png), [768 px](painel/06-editar-pedido-768.png), [1280 px](painel/06-editar-pedido-1280.png) e [conflito preservando rascunho](painel/07-edicao-conflito-390.png).

## Arquivos principais

- `frontend/src/utils/rolagem.ts` e `App.tsx`: aprimoramento das âncoras.
- `frontend/src/components/EditarPedido.tsx`: formulário de edição dentro do cartão.
- `frontend/src/utils/edicaoEncomenda.ts`: diferenças e validação, sem incluir ID.
- `frontend/src/pages/Admin.tsx`: abertura, fechamento, confirmação, foco e atualização dos cartões.
- `frontend/src/services/admin.ts`: PATCH completo/parcial, CSRF existente e mensagens de conflito/resultado incerto.
- `frontend/src/styles/admin.css`: campos e mensagens mobile-first; cartões vizinhos mantêm altura natural.
- Testes em `frontend/tests/admin-integracao.test.mjs`, `edicao-encomenda.test.mjs` e `backend/tests/admin.test.ts`.
- `scripts/testar-rolagem.mjs` e `scripts/testar-painel.mjs --edicao`: verificação no navegador.

## Repetir os testes

Com Node 24.11+ e dependências de frontend/backend instaladas, execute em cada pasta:

```powershell
# frontend
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

```powershell
# backend
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

Para a verificação em navegador, na raiz, com Edge instalado no Windows:

```powershell
npm.cmd install --prefix .audit-tools --no-save --package-lock=false playwright @axe-core/playwright
node scripts/testar-rolagem.mjs
node --experimental-strip-types scripts/testar-painel.mjs --edicao
```

As ferramentas ficam na pasta ignorada `.audit-tools`. Os servidores e bancos temporários são criados e encerrados pelos scripts; não é necessário deixá-los abertos. Para uso manual, mantenha `npm.cmd run dev` em cada pasta, abra `http://127.0.0.1:5173` e `/admin` e configure a origem exata no backend. Não há novas credenciais ou mudanças na configuração de sessão.

## Limites

Os tamanhos móveis foram simulados no Edge de desktop; aparelho físico, Safari/Firefox e leitor de tela continuam como verificações complementares. Axe e inspeção visual não garantem conformidade completa. Sessões e limitação de tentativas continuam em memória de uma única instância. Não houve implantação. Em caso de edição simultânea do mesmo pedido em duas sessões, o backend aplica os campos enviados pela última operação válida; não há controle de versões nesta etapa. A capacidade continua protegida por transação.

Uma execução visual intermediária foi interrompida por `ERR_NO_BUFFER_SPACE` no carregamento de um módulo pelo Edge. A repetição completa passou sem falhas de rede, sem exigir alteração na aplicação. Os resultados estruturados desta pasta correspondem à execução concluída.
