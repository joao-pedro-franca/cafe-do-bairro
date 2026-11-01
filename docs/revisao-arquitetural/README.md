# Revisão arquitetural controlada

## Escopo e ponto de partida

Trabalho realizado na branch `refactor/revisao-arquitetural`, partindo de
`10fc20fc9c2acdee91f7c1aeed3151f485f83c14`, com Git inicialmente limpo.

A auditoria concluiu que a aplicação tem arquitetura proporcional ao desafio e
está adequada para entrega. Reserva transacional, preços históricos, validação
no servidor, autenticação administrativa e testes de migração/concorrência devem
ser preservados. Não há justificativa para reescrever o sistema.

Foram selecionados somente REV-002, REV-003 e REV-006. Não houve mudança em
componentes ou hooks de produção do frontend, regras comerciais, contratos HTTP,
autenticação, esquema, migrações, preços, imagens ou informações comerciais.
Não foram adicionadas dependências. Não houve commit, merge, push ou alteração
da tag `v2.0` nesta execução.

## REV-002 — Sincronização dos testes de integração

### Antes

Depois de um `409`, o formulário consulta novamente duas fontes independentes:
saldo da data e catálogo de produtos. O teste podia encontrar o saldo atualizado
e tentar reenviar enquanto o catálogo ainda estava carregando. Nesse momento,
o formulário corretamente impede a confirmação. O teste confundia uma consulta
parcialmente concluída com uma interface pronta.

A linha de base desta execução passou, mas reproduziu o aviso do React sobre
atualização fora de `act(...)`, durante a leitura administrativa pelo proxy.
A auditoria anterior já havia observado uma falha intermitente na recuperação
do conflito; ela não reapareceu espontaneamente nesta linha de base.

### Depois

- Uma espera compartilhada observa saldo presente, `aria-busy="false"`, ausência
  da mensagem de carregamento do catálogo e campos de produtos/contato visíveis.
- O preparo de cada cenário aguarda a consulta inicial do catálogo dentro das
  esperas com `act(...)`, antes de trocar interceptores ou executar outras ações.
- O cenário de `409` segura deliberadamente a resposta do catálogo. Mesmo com
  saldo atualizado e quantidade corrigida, verifica que o botão permanece
  desabilitado. Só libera a resposta e reenvia depois das duas consultas.
- As recuperações de conflito com vários sabores e de produto desabilitado,
  além do segundo pedido sem bolos, também aguardam as consultas completas.
- A leitura administrativa pelo proxy fica dentro de `act(...)`, incluindo o
  consumo da resposta. Atualizações React que ocorram durante essa leitura
  pertencem ao mesmo ciclo observado pelo teste.

Foram preservadas as verificações de `201`, conflito real, ausência de gravação
parcial, quantidade final, contato, acompanhamento e bloqueio de envio. Não
houve aumento de timeout, supressão de avisos ou repetição automática de testes
com falha. As rodadas de estabilidade são execuções completas independentes;
qualquer falha interrompe a sequência.

**Benefício:** a condição de prontidão passa a representar o estado que a pessoa
realmente pode usar. O atraso que expunha a corrida é exercitado deliberadamente.

## REV-003 — Diagnóstico de erros inesperados

### Antes

O middleware protegia o cliente com uma mensagem genérica para erros inesperados,
mas não emitia registro operacional para investigar essas ocorrências.

### Depois

O middleware gera um UUID por requisição, usando `node:crypto.randomUUID`, e
emite uma linha JSON por erro inesperado com `console.error`, na saída de erro
do processo. Não é necessário instalar biblioteca ou serviço de observabilidade.

O registro contém somente:

| Campo | Conteúdo |
| --- | --- |
| `evento` | Valor fixo `erro_inesperado` |
| `idRequisicao` | UUID gerado pelo servidor, sem aproveitar cabeçalho recebido |
| `metodo` | Método HTTP de uma lista permitida ou `OUTRO` |
| `rota` | Caminho fixo conhecido, modelo `/:id` ou `rota-desconhecida` |
| `categoria` | Categoria limitada, como `Error`, `TypeError` ou `SQLiteError` |

A rota é escolhida por comparação com caminhos conhecidos; não é uma cópia da
URL recebida. Queries e valores de IDs não entram no registro. Nome personalizado,
mensagem e stack do erro também não são registrados: podem conter SQL ou dados
privados. Corpos, cookies e cabeçalhos de autenticação não são consultados pelo
logger. O UUID permanece interno, sem novos campos ou cabeçalhos na resposta.

A resposta continua exatamente `500` com
`{"erro":"Não foi possível concluir a operação."}`. Os caminhos existentes de
`ApiError`, JSON inválido, corpo excessivo e SQLite ocupado continuam antes do
registro de erro inesperado, preservando status, corpo e `Retry-After`.

Os três testes novos provocam falhas em uma API real com banco em memória:
verificam a lista exata de campos do log, IDs diferentes, normalização de rota,
resposta genérica e ausência de dados de contato, segredos, SQL e valores
recebidos nas URLs. Também verificam que erros conhecidos não são classificados
como inesperados. A captura de logs começa após a emissão do aviso experimental
do SQLite, para separar mensagens do runtime das mensagens produzidas pela API.

**Benefício:** ocorrências inesperadas passam a ser identificáveis por rota,
método e categoria, com informação limitada deliberadamente para proteger dados.

## REV-006 — Reutilização local das configurações

### Antes

`listarProdutos()` chamava `configuracoes()` dentro do `map` dos 11 produtos:
11 SELECTs da mesma tabela por resposta. A validação de vários itens também
repetia a leitura para cada produto e para o acompanhamento.

### Depois

- A listagem carrega as configurações uma vez e usa o mesmo resultado para
  montar os 11 produtos.
- A criação carrega uma vez, depois de `BEGIN IMMEDIATE`, e confere os itens e
  o acompanhamento com esse resultado.
- A atualização carrega no primeiro produto que precisa ser revalidado e
  reutiliza nas outras verificações da mesma transação. Uma edição somente de
  status/contato continua sem consultar disponibilidade desnecessariamente.
- Os dados são variáveis locais à operação. A próxima operação consulta o banco
  novamente; não existe cache global nem reaproveitamento entre transações.

Dois testes novos observam as chamadas reais a `prepare` e `exec` do SQLite,
com restauração automática dos mocks. Comprovam:

1. Um SELECT por listagem, mantendo os 11 produtos e observando uma configuração
   alterada na listagem seguinte.
2. Sequência `BEGIN IMMEDIATE → SELECT → COMMIT` na criação e mudança de data
   com vários produtos e acompanhamento, preservando itens e preços.
3. Uma configuração recém-desabilitada é rejeitada na próxima operação, com
   `BEGIN IMMEDIATE → SELECT → ROLLBACK` e pedido anterior intacto.
4. Uma edição somente de status não faz esse SELECT e mantém itens históricos.

**Benefício observado:** 11 consultas de disponibilidade passam a uma por
listagem. No cenário de três produtos mais acompanhamento, quatro leituras
passam a uma por validação transacional. Isso reduz trabalho repetido; não foi
medido ganho de latência nem alegado um novo limite de capacidade do sistema.

## Arquivos modificados e criados

| Arquivo | Finalidade |
| --- | --- |
| `frontend/tests/encomendas-integracao.test.mjs` | Esperas completas, atraso controlado do catálogo e `act(...)` |
| `backend/src/app.ts` | Registro sanitizado de erros inesperados |
| `backend/tests/diagnostico.test.ts` | Privacidade dos logs e preservação dos erros conhecidos |
| `backend/src/database/encomendas.ts` | Uma leitura das configurações por operação necessária |
| `backend/tests/consultas-produtos.test.ts` | Quantidade de consultas, leitura transacional e atualização das configurações |
| `docs/revisao-arquitetural/README.md` | Este relatório |

## Validação

Ambiente: Node.js 24.11.0, Windows, npm e dependências já instaladas. Antes de
editar arquivos, foram conferidos branch e Git limpo e executadas as duas suítes.

| Verificação | Antes desta implementação | Depois |
| --- | --- | --- |
| Frontend: `npm.cmd test` | 87 aprovados, com aviso de `act(...)` | 87 aprovados, sem esse aviso |
| Backend: `npm.cmd test` | 57 aprovados | 62 aprovados |
| Frontend: `npm.cmd run lint` | Não repetido antes das edições | Aprovado |
| Frontend: `npm.cmd exec -- tsc -b` | Não repetido antes das edições | Aprovado |
| Frontend: `npm.cmd run build` | Não repetido antes das edições | Aprovado |
| Backend: `npm.cmd run typecheck` | Não repetido antes das edições | Aprovado |
| Backend: `npm.cmd run build` | Não repetido antes das edições | Aprovado |

Após REV-002, os 18 testes de integração pública passaram e foram executadas
três rodadas adicionais completas, todas aprovadas e sem aviso de `act(...)`.
Depois de estender a espera aos outros cenários com consultas independentes,
a suíte frontend foi repetida e foram feitas três rodadas finais de estabilidade.
Os testes de diagnóstico passaram após REV-003; os testes de consultas e a suíte
de produtos passaram após REV-006. As suítes completas também passaram com as
verificações de compilação em execução concorrente.

O aviso experimental de `node:sqlite` permanece esperado e não foi suprimido.
O frontend não tem script separado de typecheck; foi usado `tsc -b` explicitamente,
além do build. O backend não tem script de lint.

### Integração em navegador

Esta seção preserva os resultados da primeira etapa. As duas falhas abaixo foram
investigadas e resolvidas no encerramento descrito em **Conclusão das auditorias
de navegador**, ao final deste documento.

Os roteiros existentes são executados em cópia temporária do projeto, usando
`--sem-capturas` quando suportado. Ela exclui `.git`, arquivos `.env`, bases SQLite, diretório de
dados de desenvolvimento e builds. Cada roteiro usa API/Vite próprios, portas e
bancos temporários; relatórios gerados ficam na cópia. As evidências históricas
e imagens do repositório original são preservadas.

| Roteiro | Resultado |
| --- | --- |
| `node --experimental-strip-types scripts/testar-sazonais.mjs --sem-capturas` | Aprovado: 16 estados/larguras, 16 análises axe, zero violações e zero erros de página |
| `node --experimental-strip-types scripts/testar-painel.mjs --precos --sazonais --sem-capturas` | Aprovado: 28 estados/larguras e análises axe, zero violações, zero erros de página e falhas de rede inesperadas |
| `node --experimental-strip-types scripts/auditar-preentrega.mjs --sazonais --sem-capturas` | Não concluiu: timeout ao procurar contato desabilitado, ausente na apresentação atual |
| `node --experimental-strip-types scripts/auditar-preentrega.mjs --comercial --sem-capturas` | Mesma incompatibilidade: a opção muda a saída, mas não a expectativa antiga sobre contatos |
| `node --experimental-strip-types scripts/testar-apresentacao-comercial.mjs --contatos` | Parcial: quatro larguras e oito análises axe sem violações; depois timeout em `:focus` após recarregar a landing |

Os roteiros verificam, entre outros pontos, pedido público até o SQLite,
capacidade, autenticação, logout, edição, conflito preservando rascunho,
persistência após reabrir a base e disponibilidade pelo mês da retirada.
Os HTTP `401` e `409` intencionais e cancelamentos de GET são separados das
falhas inesperadas. Verificações axe não substituem testes com leitor de tela.

O roteiro público antigo chegou à confirmação e recuperação do `409`, mas parou
na busca por `#contato .contact-pending summary`: ele ainda exige ausência de
links WhatsApp. A apresentação atual usa contatos autorizados e não tem esse
elemento. Isso não foi corrigido nesta etapa para preservar o escopo aprovado;
o frontend de produção permaneceu inalterado. A tentativa com `--comercial`
confirmou que essa opção só muda a pasta do relatório. O roteiro específico
`testar-apresentacao-comercial.mjs --contatos` é preparado para os canais atuais,
mas também não concluiu: verificou as quatro larguras, fotos, formulário e oito
análises axe sem violações ou erros de página, e então aguardou `:focus` após
uma recarga até o timeout. A causa dessa falha de foco não foi estabelecida nesta
etapa; não foi corrigido o roteiro nem alterada a navegação. Seus cenários
posteriores de interceptação dos contatos não foram concluídos. Capturas e
relatórios parciais ficam somente na cópia temporária. Nenhuma dessas execuções
parciais é contabilizada como aprovação integral.

## Itens adiados e riscos restantes

| Item | Motivo do adiamento |
| --- | --- |
| REV-001 — Controle de edição simultânea | Exigiria evolução coordenada de banco, contrato e interface; permanece a última substituição válida |
| REV-004 — Módulos compartilhados | A estrutura atual funciona; reorganização não foi autorizada nesta etapa |
| REV-005 — Extração de migrações | Não é necessária às três melhorias e envolve código sensível de preservação de dados |
| REV-007 — Proteção operacional do POST público | Depende do ambiente de publicação e ficou expressamente fora do escopo |

As duas instâncias de consulta pública do catálogo continuam independentes; não
foi introduzido estado global no React. Sessões e limites de login continuam em
memória de uma única instância. Reenvio manual após resultado de rede incerto
ainda exige conferência com o café. Os logs novos não incluem detalhes privados
do erro; operação real deve definir captura, acesso e retenção da saída de erro.
Rotas futuras precisam ser acrescentadas à lista de modelos se forem necessárias
ao diagnóstico; caminhos desconhecidos continuam ocultos por padrão.

Não houve teste de carga, implantação HTTPS, teste em aparelho físico ou validação
adicional em Safari/Firefox nesta etapa. A base real de desenvolvimento não foi
aberta pelos testes. Mudanças futuras nas migrações e regras continuam exigindo
os testes de rollback, histórico e concorrência já existentes.

## Conclusão das auditorias de navegador

Esta continuação parte do commit `2c8462b`, com Git limpo, na mesma branch
`refactor/revisao-arquitetural`. Seu escopo é corrigir os dois roteiros que ficaram
parciais; não envolve nova refatoração ou mudança na aplicação.

### Contatos comerciais: expectativa antiga do teste

`auditar-preentrega.mjs` procurava um `<summary>` de canal indisponível e exigia
zero links WhatsApp. Essas condições pertenciam à apresentação anterior, enquanto
o requisito atual publica WhatsApp autorizado e Instagram identificado como da
TecnoJr. A opção `--comercial` apenas escolhia a saída do relatório, sem atualizar
essas verificações.

A correção substitui a expectativa antiga por verificações dos controles reais:

- São seis links, dois em cada local: hero, contato e rodapé, sem canais pendentes.
- O WhatsApp tem domínio, número autorizado e mensagem codificada esperados.
- O Instagram aponta ao perfil correto e está identificado como da TecnoJr.
- Os links indicam nova aba e usam `target="_blank"` e `rel="noopener noreferrer"`.
- Os dois controles da seção de contato são acionados e abrem novas abas com os
  destinos corretos. As requisições são interceptadas pelo Playwright antes da
  rede e recebem uma página de teste; não há acesso às contas nem envio de mensagem.
- A seção de contatos também recebe análise axe. Toda análise axe do roteiro
  agora exige zero violações, inclusive fora do modo `--visual`.

As verificações de encomenda, conflito, rascunho, limite, login, redução de movimento
e persistência continuam presentes. Os testes frontend também preservam os casos
em que contatos não autorizados ou inválidos não podem produzir links externos.

### Foco: corrida entre o teste e a montagem do React

A investigação usou uma cópia temporária e instrumentou o `keydown` de Tab,
registrando o estado da árvore DOM no próprio evento, sem antes inserir uma espera
que alterasse a reprodução. Em 12 navegações com a sequência antiga, uma entregou
a tecla antes da primeira renderização do React:

```json
{"rootChildren":0,"skip":false,"active":"BODY"}
```

Depois da tecla, o DOM já podia conter os quatro filhos da landing e o documento
estar em `readyState="complete"`, mas o foco permanecia no corpo. Isso explica o
timeout posterior em `:focus`: o link não existia quando o navegador processou Tab.
O retorno de `page.goto`, que aguarda `load` por padrão, não garante o primeiro
commit de `createRoot`.

Com o DOM montado, a navegação nativa funciona: o primeiro Tab alcança o link
**Pular para o conteúdo**, e Enter foca `main#conteudo`. Não foi demonstrado defeito
na navegação da aplicação nem falha do mecanismo de foco do Edge. O problema
reproduzido pertence à sincronização do teste.

Os roteiros agora aguardam o link visível antes da tecla e verificam que o foco
inicial continua no `body`. O teste não chama `focus()` para colocar o usuário no
link de pular conteúdo: Tab ainda precisa alcançá-lo pela ordem real do documento.
Após Enter, uma espera observa o foco em `#conteudo`, mantendo a verificação do
destino. Não foram ampliados timeouts ou adicionadas tentativas automáticas.

O roteiro comercial também passou a exercitar os links já publicados na seção
de contato, em vez de injetar outra instância React de `ContactLinks` apenas para
o teste. Abertura por Enter, destino, nova aba, segurança dos links e análise axe
continuam verificados nos controles efetivamente usados na página.

### Preservação e arquivos

Somente `scripts/auditar-preentrega.mjs`,
`scripts/testar-apresentacao-comercial.mjs` e esta documentação foram alterados,
além dos novos relatórios desta conclusão. Nenhum arquivo de `frontend/src` ou
`backend/src` precisou mudar.

Ambos os roteiros aceitam `--saida=CAMINHO`, relativo à pasta de execução ou
absoluto, para separar novas evidências das históricas. O comercial também aceita
`--sem-capturas`; essa opção dispensa somente PNGs/JPEGs, mantendo fotos decodificadas,
verificações de geometria, teclado, rede e axe. Os comandos sem essas opções mantêm
as convenções anteriores de saída; para repetir, use uma pasta nova em `--saida`.

Os navegadores foram executados em cópia temporária, com SQLite temporário ou
em memória e sem copiar a base real de desenvolvimento, credenciais `.env` ou
`.git`. Os roteiros de rolagem e sazonalidade não foram alterados e geraram suas
saídas antigas apenas nessa cópia. Nenhuma imagem ou evidência histórica do
repositório original foi sobrescrita.

### Verificações desta conclusão

| Verificação | Resultado observado |
| --- | --- |
| Frontend: `npm.cmd test` | 87 aprovados, zero falhas |
| Backend: `npm.cmd test` | 62 aprovados, zero falhas |
| Frontend: `npm.cmd run lint` | Aprovado |
| Sintaxe dos dois roteiros: `node --check` | Aprovada |
| Comercial: `--contatos --sem-capturas --saida=.../comercial` | Aprovado: quatro larguras, 11 análises axe sem violações, zero erros de página e dois destinos interceptados |
| Público: `--comercial --sem-capturas --saida=.../publico` | Aprovado: oito medições de largura/estado, sete análises axe sem violações, zero erros de página e falhas de rede inesperadas |
| Rolagem: `node --experimental-strip-types scripts/testar-rolagem.mjs --comercial` | Aprovado: 12 cenários, incluindo teclado, hash/foco, histórico, interrupção por roda e movimento reduzido |
| Sazonalidade: `node --experimental-strip-types scripts/testar-sazonais.mjs --sem-capturas` | Aprovado: 16 estados/larguras, 16 análises axe sem violações e zero erros de página |
| Comercial com capturas: `--contatos --saida=.../comercial-com-capturas` | Segunda execução completa aprovada: quatro larguras, 11 análises axe sem violações, zero erros de página e dois destinos interceptados |

Os roteiros de navegador foram executados sequencialmente para não disputarem
recursos entre si. As suítes frontend/backend também foram efetivamente repetidas,
sem alteração em seus testes nesta continuação. O aviso experimental de SQLite
continuou esperado. Os erros HTTP `401`/`409` do roteiro público são intencionais;
cancelamentos de GET são registrados separadamente. A reprodução diagnóstica da
corrida não é contabilizada como execução aprovada da auditoria.

Relatórios novos, copiados das execuções concluídas na pasta temporária:

- [Fluxo público](navegador-final/publico.json).
- [Comercial sem capturas](navegador-final/comercial.json).
- [Comercial com capturas](navegador-final/comercial-com-capturas.json).
- [Sazonalidade](navegador-final/sazonais.json).
- [Rolagem e navegação](navegador-final/rolagem.json).

Somente os JSONs foram copiados para a pasta nova `navegador-final/`, depois de
verificar que ela ainda não existia. As 15 capturas da segunda execução comercial
permanecem na cópia temporária; nenhuma foto ou captura histórica foi substituída.
Os relatórios preservam portas locais efêmeras, próprias das execuções isoladas.

Para repetir os dois roteiros corrigidos a partir da raiz, escolha uma pasta de
saída ainda não usada. Por exemplo, substitua `NOVA-RODADA` nos comandos abaixo:

```powershell
node --experimental-strip-types scripts/auditar-preentrega.mjs --comercial --sem-capturas --saida=docs/revisao-arquitetural/NOVA-RODADA/publico
node --experimental-strip-types scripts/testar-apresentacao-comercial.mjs --contatos --sem-capturas --saida=docs/revisao-arquitetural/NOVA-RODADA/comercial
```

Não foram repetidos builds/typechecks
nesta continuação, pois não houve mudança no código TypeScript da aplicação;
os resultados de build da etapa anterior permanecem registrados acima.
Não houve merge, push ou alteração da tag `v2.0`, que continua apontando para
`7abec6e180df6e3cb1e6bc70a91a7fa2e97874a6`.
