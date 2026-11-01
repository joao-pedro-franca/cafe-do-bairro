# Encomendas com múltiplos sabores

Implementação de 01/11/2026, partindo de `ff13ae4` da V1.1. A branch de trabalho existente é `feature/pedidos-multissabores`, criada no mesmo ponto de `melhorias-v1.1`. Não houve merge na Main, publicação ou uso da base local de desenvolvimento para testar migração.

## Modelo e migração

Uma encomenda guarda os dados do cliente, data, status e adicional. Cada sabor fica em `encomenda_itens`, relacionado ao ID da encomenda. A tabela de itens exige produto permitido, quantidade inteira positiva, produto único por encomenda e ordem única. A exclusão do pedido remove seus itens por cascata; cada conexão da aplicação ativa as chaves estrangeiras.

O total é sempre `SUM(itens.quantidade)`, calculado no servidor e devolvido como `totalBolos`. Não existe coluna independente de total. Todos os status contam para o limite diário de cinco bolos, sem limite por sabor. Uma dúzia opcional de pão de queijo continua sendo por pedido e não ocupa bolos.

A migração roda em uma transação `BEGIN IMMEDIATE`: copia cada produto e quantidade antigos para um item e remove apenas as colunas antigas. Não apaga/recria os pedidos. Preserva ID, sequência de IDs, nome, telefone, data, status, adicional e quantidade. Bases anteriores sem quantidade usam um bolo por registro. Ao reabrir, as colunas legadas já não existem e a cópia não se repete. Se a migração falhar, o esquema e os registros antigos são preservados por rollback.

**Antes de iniciar esta versão com uma base de desenvolvimento que precisa preservar, pare todos os processos da API e faça backup do arquivo SQLite.** O [README da API](../../backend/README.md#persistência-capacidade-e-concorrência) contém o comando e os cuidados. Os testes desta etapa migraram apenas arquivos temporários. Não é necessário apagar nem recriar a sua base. Mantenha a cópia anterior, pois versões antigas da API não podem escrever no novo esquema.

## Contrato HTTP

As rotas são as mesmas. Exemplo de criação pública:

```http
POST /api/encomendas
Content-Type: application/json
```

```json
{
  "nomeCliente": "Cliente de Teste",
  "telefone": "73999999999",
  "dataEntrega": "2099-12-25",
  "incluirPaoDeQueijo": true,
  "itens": [
    { "produto": "bolo-cenoura", "quantidade": 2 },
    { "produto": "bolo-chocolate", "quantidade": 1 }
  ]
}
```

Sucesso `201`: os mesmos dados normalizados, mais `id`, `status: "recebida"` e `totalBolos: 3`. A interface confirma somente depois de validar essa resposta e apresenta o resumo dos itens efetivamente retornados pelo servidor.

Cada item recebe apenas `produto` e `quantidade`. Os seis IDs continuam sendo `bolo-cenoura`, `bolo-chocolate`, `bolo-milho`, `bolo-fuba`, `bolo-laranja`, `bolo-coco`. Lista vazia, sabor repetido, produto inválido ou quantidade não inteira/positiva retornam `400`. Um total positivo que ultrapasse o saldo retorna `409`; seis bolos são recusados mesmo em data livre. `produto` e `quantidadeBolos` na raiz não são mais aceitos. `totalBolos` é somente leitura e também é recusado na entrada. Atualize frontend e backend juntos.

Para editar, envie somente as diferenças a `PATCH /api/encomendas/:id`. Exemplo de substituição completa da composição:

```json
{
  "itens": [
    { "produto": "bolo-cenoura", "quantidade": 3 }
  ]
}
```

Essa operação transforma `2 de cenoura + 1 de chocolate` em `3 de cenoura`, mantendo o ID. Enviar a lista original faz a transformação inversa. Metadados e itens são gravados na mesma transação: falta de capacidade ou falha em qualquer item reverte tudo. Na verificação de capacidade, o servidor exclui a reserva anterior do próprio pedido, sem contar seus bolos duas vezes.

Trocar sabores sem mudar o total e a data é permitido também para pedidos antigos. Mudar efetivamente a data ou o total exige amanhã ou depois em `America/Bahia`. A validação definitiva acontece dentro da transação, após obter o bloqueio de escrita. No PATCH, uma data inalterada reenviada passa pela validação de formato/calendário, mas não cria uma exigência artificial de mudar a retirada; o frontend normalmente a omite.

GET/listagem/consulta por ID continuam administrativos. A disponibilidade pública continua retornando apenas data, limite, reservados e disponíveis. Sessão, cookie HttpOnly, origem, CSRF, limitação de login e Bearer PowerShell permanecem protegendo as mesmas rotas. POST e PATCH não são repetidos automaticamente quando o resultado é incerto.

## Como usar e demonstrar

1. Faça o backup descrito acima antes de iniciar a API com uma base existente. Instale/inicie frontend e backend conforme o [README principal](../../README.md#executar), com Node 24.11+ e as credenciais administrativas configuradas no servidor. A configuração de login não mudou; não há credencial padrão.
2. Na landing page, abra **Quero encomendar** e escolha a data. Aguarde a consulta de disponibilidade real.
3. Escolha o **Sabor 1** e sua quantidade. Use **Adicionar sabor** para criar outra linha; sabores já usados ficam desabilitados nos outros seletores. **Remover sabor** exclui uma linha do rascunho. Os controles mostram preços/tamanhos fictícios do catálogo, total selecionado e o que ainda cabe no saldo consultado.
4. Preencha contato e, se desejar, uma dúzia de pão de queijo. Confirme e confira número, sabores e quantidades retornados pela API. Total zero ou acima do saldo impede confirmação.
5. Em `/admin`, encontre o pedido e clique em **Editar pedido**. Adicione, remova, substitua sabores ou altere quantidades, contato, data, adicional e status. **Cancelar** descarta o rascunho sem gravar. O cartão só muda depois da resposta válida do servidor.
6. Para o exemplo A, remova chocolate e aumente cenoura de 2 para 3. Para o exemplo B, reduza cenoura de 3 para 2 e adicione chocolate com 1. Ambas as composições ocupam três bolos.
7. Tente aumentar o total de uma data lotada: `409` mantém o rascunho e o banco inteiro fica como antes. No formulário público, o saldo é consultado novamente. Ajuste os itens ou escolha outra data. Nenhum saldo consultado garante reserva antes da confirmação.
8. No painel, mude a data e confira a transferência da capacidade; exclua um pedido apenas depois da confirmação explícita e confira a liberação de todas as unidades. Saia do painel e confirme que listagem e alterações exigem novo login.

Adicionar sabor move o foco ao novo seletor. Remover devolve o foco ao botão de adicionar. O editor mantém abertura/foco e retorno ao cartão já existentes. Gaveta, preservação do rascunho, tratamento de resultado incerto e rolagem de 1,2 segundo continuam funcionando.

## Testes e evidências

- **57 testes frontend**: validações de itens, duplicatas, soma, confirmação canônica, formulário público real pelo proxy, remoção até zero, cancelamento da composição, recomposições administrativas, conflitos preservando vários sabores e contatos, status, filtros, foco, sessão, logout e resposta perdida sem retry. Os testes anteriores foram adaptados ao contrato de itens.
- **38 testes backend**: CRUD, agregados públicos, autenticação, CSRF, produtos/quantidades inválidos, limite compartilhado, rollback completo, trocas de composição em pedidos antigos, transferência de data, persistência, migração com e sem quantidade, reabertura repetida, constraints/FK/cascata e rollback de uma migração inválida.
- Cinco cenários usam processos independentes no mesmo SQLite, incluindo dois clientes disputando a última vaga depois de uma reserva com sabores mistos. Só um recebe `201`; a soma fica cinco.
- Lint frontend, typecheck/backend (aplicação e testes), build backend e build frontend (`tsc -b` + Vite) aprovados. O backend não possui comando de lint separado.
- Edge/Chromium real: formulário e edição com múltiplos sabores em **360, 390, 768 e 1280 px**, sem rolagem horizontal. O roteiro integrado também testa criação pública, capacidade, persistência após reiniciar API, login, status, cancelamento, edição, exclusão e logout.
- Axe-core não detectou violações nas **30 combinações** examinadas (24 no roteiro de itens/painel e 6 no público). Nenhuma exceção JavaScript ou falha de rede foi capturada. Os erros HTTP esperados foram `401` sem sessão e `409` nos conflitos propositais.
- O roteiro de rolagem registra posições intermediárias aos 100/300/600/900 ms e confirma teclado, histórico, interrupção manual e movimento reduzido. O código da rolagem não foi alterado.

Resultados: [fluxo integrado](resultado.json), [fluxo público](publico/resultado.json), [rolagem](rolagem.json).

Capturas do formulário: [360 px](00-formulario-itens-360.png), [390 px](00-formulario-itens-390.png), [768 px](00-formulario-itens-768.png), [1280 px](00-formulario-itens-1280.png). Edição: [360 px](06-editar-pedido-360.png), [390 px](06-editar-pedido-390.png), [768 px](06-editar-pedido-768.png), [1280 px](06-editar-pedido-1280.png). [Conflito mantendo os itens](07-edicao-conflito-390.png).

## Arquivos e commits

1. `0235cf5`: modelo/migração/API — tipos e validação em `backend/src/encomenda.ts`, persistência relacional em `backend/src/database/encomendas.ts`, fixtures e testes de regras/migração/segurança adaptados.
2. `9cb90a2`: formulário público — `ItensPedido.tsx`, `utils/itens.ts`, `styles/itens.css`, `Encomendas.tsx`, serviços/tipos e testes públicos.
3. `cd955a4`: painel — resumo no cartão, edição da lista completa, comparação dos itens, PATCH mínimo e testes administrativos.
4. Commit final: testes adicionais, ajustes finais de validação de data e apresentação, scripts de navegador e documentação.

`frontend/src/data/cafeConfig.ts`, autenticação, rolagem e endpoints não foram substituídos. Nenhuma biblioteca foi adicionada à aplicação. O `BRIEF.md` original continua preservado; a nova lista de sabores substitui a simplificação anterior de um único sabor por pedido, por solicitação desta etapa.

## Repetir as verificações

```powershell
# Dentro de frontend/
npm.cmd test
npm.cmd run lint
npm.cmd run build

# Dentro de backend/
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

Para os roteiros isolados, a partir da raiz, com as ferramentas de auditoria já instaladas em `.audit-tools` e o Edge disponível:

```powershell
node --experimental-strip-types scripts/testar-painel.mjs --itens
node --experimental-strip-types scripts/auditar-preentrega.mjs --itens
node scripts/testar-rolagem.mjs --itens
```

Se precisar instalar somente as ferramentas opcionais de auditoria: `npm.cmd install --prefix .audit-tools --no-save --package-lock=false playwright @axe-core/playwright`. A pasta é ignorada pelo Git. Os scripts criam e encerram seus servidores, navegam com dados fictícios e apagam os bancos temporários ao terminar. Não precisam usar suas credenciais nem iniciar o servidor da base local.

## Riscos e limites

O contrato novo requer atualização coordenada do frontend e backend. A migração remove as colunas legadas, por isso mantenha o backup para qualquer retorno à versão anterior e pare todos os escritores antigos. A base local real ainda não foi migrada/testada nesta execução. Dados legados fora do catálogo bloqueiam a migração com rollback, exigindo análise em uma cópia.

Edições simultâneas da composição do mesmo pedido seguem a última substituição válida; não há controle de versão. A capacidade diária continua protegida por transação. Sessões e limitação de login permanecem em memória de uma instância. Falhas de transporte podem acontecer após uma gravação: confira o pedido antes de reenviar, sem retry automático.

Os tamanhos móveis foram simulados no Edge de desktop. Aparelho físico, Safari/Firefox e leitor de tela ainda precisam de conferência; Axe não prova conformidade completa. Não houve implantação. HTTPS, origem definitiva, proteção de segredos e acesso restrito/backup do SQLite continuam necessários para uso público real. Não foram adicionados pagamentos, notificações, contas ou integrações externas.

Uma execução de rolagem paralela aos testes detectou uma variação no link do cardápio. A repetição isolada completa passou sem modificar o código da rolagem; o resultado salvo corresponde a essa execução concluída. A causa exata da variação não foi determinada. Os roteiros podem disputar recursos quando executados simultaneamente; repita-os sequencialmente para uma conferência visual mais estável.
