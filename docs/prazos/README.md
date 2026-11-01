# Filtro administrativo por prazo de retirada

Implementado em `feature/pedidos-multissabores`, sobre os filtros locais de data e status de `frontend/src/pages/Admin.tsx`. A listagem carregada é reutilizada, sem novos endpoints, alterações no SQLite ou mudanças em autenticação, capacidade e dados das encomendas.

## Uso

O campo **Ver pedidos dentro dos próximos:** começa em **Todos os prazos**. As opções de 1 a 30 dias incluem de amanhã até o N-ésimo dia, inclusive. **30+** inclui somente datas após o trigésimo dia, sem limite superior. Hoje e passado ficam excluídos quando há prazo; **Todos os prazos** remove essa restrição.

Prazo e status funcionam juntos. Escolher prazo limpa a data específica; escolher data limpa o prazo. **Limpar filtros** limpa os três controles. A quantidade encontrada acompanha a lista, e uma busca vazia com prazo informa: “Nenhuma encomenda no prazo selecionado com esses filtros.”

`src/utils/prazoEncomenda.ts` encontra hoje usando `Intl.DateTimeFormat` e o fuso configurado em `cafeConfig.fusoHorario` (`America/Bahia`). A diferença entre datas ISO é calculada como dias de calendário usando UTC apenas como ordinal, sem interpretar a retirada no fuso do dispositivo. Isso inclui mudanças de mês, ano e anos bissextos.

O calendário é reavaliado a cada 30 segundos, ao recuperar o foco e ao mudar a visibilidade da aba. Assim, a virada do dia não exige recarga manual. Navegadores podem suspender timers em segundo plano; o retorno à aba atualiza a referência. Durante uma edição, filtros, atualização da lista e atualização do calendário ficam pausados para preservar o rascunho. Ao salvar ou cancelar, o calendário é atualizado e o foco retorna ao botão de editar, ou ao título caso o pedido deixe de corresponder ao filtro.

O layout mantém uma coluna no celular, duas a partir de 768 px e quatro controles em linha a partir de 1100 px. O seletor tem rótulo associado, descrição acessível e foco visível; a contagem usa `role="status"`.

## Validação

- Frontend: **64 testes aprovados**, incluindo cinco testes unitários de calendário/prazo e dois cenários de integração adicionais. Cobrem 1, 2, 7, 30 e 30+ dias, exatamente o trigésimo dia, hoje/passado, mudanças de mês/ano, ano bissexto, status, alternância com data, limpeza, estado vazio e virada do dia durante edição.
- Backend: **38 testes aprovados**, preservando autenticação, capacidade e itens relacionais.
- Lint do frontend, TypeScript do frontend (via build), typecheck do backend e builds dos dois projetos aprovados. Não há script de lint no backend.
- Navegador: dispositivo em **Asia/Tokyo**, dados fictícios e API simulada; confirma limites, virada da Bahia sem recarga, edição e estado vazio. Layout sem rolagem horizontal e **zero violações axe WCAG A/AA** em 360, 390, 768 e 1280 px. Evidências em [navegador.json](navegador.json) e nas capturas `filtros-*.png`.
- Regressão da rolagem: `node scripts/testar-rolagem.mjs` aprovado na reexecução, incluindo animação, teclado, histórico, movimento reduzido e interrupção pela roda. A primeira execução teve timeout na espera de restauração do histórico ao voltar; nenhum código foi alterado entre as tentativas. Medições atuais em [rolagem.json](rolagem.json); os relatórios históricos foram preservados.

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
node scripts/testar-prazos.mjs
```

O teste de navegador requer as ferramentas Playwright e axe existentes em `.audit-tools`, seguindo os demais scripts de auditoria do projeto. Não acessa a base real nem envia alterações a servidores externos. Os testes de integração usam a API real com SQLite em memória.
