# Regras definitivas de encomenda

Implementação na branch `fix/regras-encomendas-final`, a partir da Main estável `81456dc`. A árvore estava limpa antes das alterações. O stash da implementação interrompida não foi aplicado. Não houve merge, push nem alteração de tags.

## Comportamento

- Itens principais: seis bolos caseiros, bolo de Natal e panetone. São os únicos oito produtos com controles de disponibilidade e meses no painel.
- Pão de queijo: uma dúzia opcional por pedido, R$ 25,00, somente com pelo menos um bolo caseiro ou bolo de Natal. Não consome as cinco unidades diárias e independe de configurações antigas de disponibilidade e meses do pão.
- Cafés: mantidos no cardápio, com fotos e preços, sem encomenda.
- Backend: rejeita itens proibidos e acompanhamento sem bolo, também no PATCH administrativo. Novas inclusões/aumentos e mudanças de data respeitam disponibilidade e capacidade, dentro da transação existente.
- Interface: retirar o último bolo mantém o rascunho e explica como corrigir o acompanhamento. Desmarcar o adicional limpa o erro e libera confirmação. Conflitos HTTP 409 preservam os campos e atualizam a consulta.

## Persistência e compatibilidade

Não foi adicionada migração de esquema. Configurações antigas de cafés e pão permanecem armazenadas, mas não habilitam novas encomendas desses itens. As respostas da API apresentam esses três produtos como não encomendáveis individualmente.

Pedidos existentes não são apagados, convertidos ou reprecificados. Contato e status podem ser editados mesmo com café/pão individual ou acompanhamento sem bolo no histórico. Reenviar uma composição idêntica também preserva esse histórico. Mudanças de composição, data ou acompanhamento exigem uma composição atualmente válida; falhas não salvam parcialmente. Bolos/panetones desabilitados podem ser mantidos/reduzidos conforme a regra anterior.

## Verificações

| Verificação | Resultado |
| --- | --- |
| Backend: `npm.cmd --prefix backend test` | 62 testes aprovados |
| Backend: `npm.cmd --prefix backend run typecheck` | Aprovado, código e testes |
| Backend: `npm.cmd --prefix backend run build` | Aprovado |
| Backend: `frontend/node_modules/.bin/oxlint.cmd backend/src backend/tests` | Aprovado; a API não possui script próprio de lint |
| Frontend: `npm.cmd --prefix frontend test` | 89 testes aprovados |
| Frontend: `npm.cmd run lint`, `npm.cmd exec -- tsc -b`, `npm.cmd run build`, na pasta frontend | Aprovados |
| Auditoria pública em Edge/Chromium | Fluxo completo, conflitos, teclado, movimento reduzido e SQLite temporário; 7 análises axe sem violações |
| Auditoria de sazonalidade/admin em Edge/Chromium | 8 controles, pedido misto com bolo de Natal e acompanhamento, rejeições HTTP, sessão/CSRF, edição histórica e reabertura do SQLite; 20 análises axe sem violações |

Os testes incluem concorrência entre processos pela última vaga, preços históricos, migrações anteriores com rollback, autenticação e CSRF. A cobertura nova injeta pedidos históricos com café e pão individual em SQLite temporário e verifica preservação de itens, quantidades, preços e configurações após reabrir o banco. A auditoria de navegador também edita contato/status de um desses pedidos pela interface real.

Relatórios: [fluxo público](publico/resultado.json) e [sazonalidade e histórico](sazonais/resultado.json). Larguras verificadas: 360, 390, 768 e 1280 px, sem transbordamento horizontal. Os erros HTTP esperados de conflito/autenticação estão registrados no relatório público; não houve erro JavaScript de página.

Para reproduzir as auditorias com as ferramentas opcionais de `.audit-tools` já instaladas:

```powershell
node --experimental-strip-types scripts/auditar-preentrega.mjs --comercial --sem-capturas --saida=docs/regras-encomendas-final/NOVA-RODADA/publico
node --experimental-strip-types scripts/testar-sazonais.mjs --sem-capturas --saida=docs/regras-encomendas-final/NOVA-RODADA/sazonais
```

Os roteiros usam cache Vite e SQLite isolados em suas pastas temporárias. A primeira tentativa concorrente revelou disputa do cache de dependências do Vite; após isolar os caches, ambos os roteiros concluíram com código de saída zero. O aviso experimental de `node:sqlite` no Node 24.11 é esperado.

## Todos os arquivos alterados ou adicionados

Documentação:

- `README.md`
- `backend/README.md`
- `docs/regras-encomendas-final/README.md` (novo)
- `docs/regras-encomendas-final/publico/resultado.json` (novo)
- `docs/regras-encomendas-final/sazonais/resultado.json` (novo)

Backend:

- `backend/src/config.ts`
- `backend/src/database/encomendas.ts`
- `backend/src/disponibilidadeProdutos.ts`
- `backend/src/produtos.ts`
- `backend/tests/concorrencia.test.ts`
- `backend/tests/consultas-produtos.test.ts`
- `backend/tests/produtos.test.ts`
- `backend/tests/regras-encomendas.test.ts` (novo)

Frontend:

- `frontend/src/components/DisponibilidadeCardapio.tsx`
- `frontend/src/components/EditarPedido.tsx`
- `frontend/src/components/ItensPedido.tsx`
- `frontend/src/sections/Cardapio.tsx`
- `frontend/src/sections/Encomendas.tsx`
- `frontend/src/utils/edicaoEncomenda.ts`
- `frontend/src/utils/encomenda.ts`
- `frontend/tests/admin-integracao.test.mjs`
- `frontend/tests/edicao-encomenda.test.mjs`
- `frontend/tests/encomenda.test.mjs`
- `frontend/tests/encomendas-integracao.test.mjs`

Auditorias:

- `scripts/auditar-preentrega.mjs`
- `scripts/testar-sazonais.mjs`

## Limites e publicação

Publique frontend e backend juntos e encerre instâncias antigas da API: versões anteriores continuam aplicando as regras antigas. Não foi acessada nem alterada a base real de desenvolvimento/produção. A validação ocorreu localmente em Edge/Chromium, sem capturas nesta rodada; não substitui testes com leitor de tela, aparelhos físicos ou outros navegadores. Documentos e capturas de etapas anteriores em `docs/` são registros históricos e podem mostrar os antigos onze controles.
