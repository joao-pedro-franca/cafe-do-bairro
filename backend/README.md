# API do Café do Bairro

API REST local em Node.js, Express, TypeScript e SQLite. O front-end continua em demonstração e **ainda não chama esta API**. Esta etapa usa TypeScript por solicitação do projeto, no lugar da recomendação inicial de JavaScript no brief.

## Instalar e iniciar

Requer **Node.js 24.11 ou posterior**. O SQLite é acessado pelo módulo `node:sqlite`, incluído no Node, sem ORM nem driver adicional. No Node 24.11 é esperado o aviso `ExperimentalWarning: SQLite`; ele não indica falha do programa.

Na raiz do repositório, em um terminal PowerShell:

```powershell
cd backend
npm.cmd install
$env:ADMIN_TOKEN = [guid]::NewGuid().ToString('N')
Write-Host "Token temporário de desenvolvimento: $env:ADMIN_TOKEN"
npm.cmd run dev
```

O token acima é gerado apenas na sua máquina. Copie-o para os exemplos do segundo terminal. Não o coloque no Git ou no front-end. Ele muda se você executar novamente a geração. Não há credencial padrão no código.

A API inicia em `http://127.0.0.1:3001/api/encomendas`. Ctrl+C encerra o servidor. O modo `dev` observa mudanças e executa TypeScript pelo suporte nativo do Node. Ele **não verifica tipos**; use os comandos abaixo para isso:

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd start
```

`typecheck` verifica os tipos da aplicação e dos testes. `build` compila `src/` em `dist/`; `start` executa o JavaScript compilado. Não é necessário manter `dev` e `start` ligados ao mesmo tempo. Como só há Express e ferramentas de tipos, não foi instalado um linter adicional no back-end.

Variáveis de ambiente opcionais:

| Variável | Comportamento |
| --- | --- |
| `PORT` | Porta local; padrão `3001`. |
| `DATABASE_PATH` | Arquivo SQLite; padrão `./data/cafe.sqlite`, relativo à pasta de execução. A pasta é criada automaticamente. |
| `ADMIN_TOKEN` | Token de pelo menos 32 caracteres. Sem ele, operações administrativas respondem `503`, mesmo localmente. |
| `NODE_ENV=production` | Impede iniciar sem token administrativo. |

Não há carregamento automático de `.env`. Defina as variáveis no terminal ou no ambiente do serviço. Se houver erro de certificado na instalação, no Node 24 use `$env:NODE_USE_SYSTEM_CA='1'` e tente novamente, sem desativar a validação HTTPS.

## Contrato HTTP

| Método | Rota | Acesso | Resultado |
| --- | --- | --- | --- |
| `POST` | `/api/encomendas` | Público | `201`, encomenda registrada com status `recebida`. |
| `GET` | `/api/encomendas` | Administrativo | `200`, lista ordenada por data e ID. |
| `GET` | `/api/encomendas/:id` | Administrativo | `200`, encomenda por ID. |
| `PATCH` | `/api/encomendas/:id` | Administrativo | `200`, encomenda atualizada. |
| `DELETE` | `/api/encomendas/:id` | Administrativo | `204`, sem corpo. |

As requisições administrativas exigem `Authorization: Bearer SEU_TOKEN`. POST e PATCH exigem `Content-Type: application/json` e corpo de até 16 KB.

Exemplo de corpo do POST (a data precisa ser futura ao executar):

```json
{
  "nomeCliente": "Cliente de Teste",
  "telefone": "(73) 99999-9999",
  "produto": "bolo-cenoura",
  "dataEntrega": "2099-12-25",
  "incluirPaoDeQueijo": true
}
```

São os mesmos campos do estado do formulário atual. `produto` recebe um **ID**, conforme o `<select>` do front-end, em vez do nome ilustrativo usado no exemplo original do brief. IDs permitidos: `bolo-cenoura`, `bolo-chocolate`, `bolo-milho`, `bolo-fuba`, `bolo-laranja`, `bolo-coco`. Cafés, Natal e pão de queijo como produto independente são recusados.

`incluirPaoDeQueijo` é booleano; omitido no POST, vira `false`. `true` significa **uma dúzia junto com o bolo**, no mesmo registro e ocupando **uma única vaga**. Não há carrinho ou quantidade. Essa regra mantém a revisão da entrevista já documentada no README principal.

O POST define `id` e `status` no servidor e rejeita esses campos na entrada. A resposta contém os dados registrados, `id`, `status: "recebida"` e o adicional como booleano. O telefone é normalizado para dígitos (mantendo o `55` se informado como `+55`). O cabeçalho `Location` aponta para a consulta administrativa do novo ID.

PATCH aceita qualquer combinação dos mesmos campos e `status`: `recebida`, `em preparo` ou `entregue`. Campos omitidos são preservados; corpo vazio, campos desconhecidos e valores de tipo incorreto são recusados. Uma mudança somente de status/contato pode ser feita em pedido antigo, sem alterar sua data. Se enviar `dataEntrega`, ela precisa ser amanhã ou depois; trocar a data também exige vaga no destino.

Erros têm formato `{ "erro": "Mensagem compreensível." }`:

- `400`: campos, JSON, data, status ou ID inválidos.
- `401`: token administrativo ausente/incorreto quando o acesso está configurado.
- `404`: encomenda ou rota inexistente.
- `409`: data esgotada; nada é gravado.
- `413` / `415`: corpo grande demais / conteúdo diferente de JSON.
- `503`: administração não configurada ou banco temporariamente ocupado.
- `500`: erro inesperado, sem SQL ou stack trace na resposta.

## Testar manualmente no PowerShell

Com a API executando no primeiro terminal, abra outro terminal na raiz do repositório:

```powershell
$base = 'http://127.0.0.1:3001/api/encomendas'
$tokenLocal = Read-Host 'Cole o token temporário mostrado pelo servidor'
$headers = @{ Authorization = "Bearer $tokenLocal" }
$corpo = @{
  nomeCliente = 'Cliente de Teste'
  telefone = '(73) 99999-9999'
  produto = 'bolo-cenoura'
  dataEntrega = (Get-Date).AddDays(2).ToString('yyyy-MM-dd')
  incluirPaoDeQueijo = $true
} | ConvertTo-Json

# Criar: não precisa de token; a data acima deixa margem de dois dias no exemplo.
$pedido = Invoke-RestMethod -Method Post -Uri $base -ContentType 'application/json; charset=utf-8' -Body $corpo
$pedido

# Listar e consultar: exigem token.
Invoke-RestMethod -Uri $base -Headers $headers
Invoke-RestMethod -Uri "$base/$($pedido.id)" -Headers $headers

# Atualizar o status e retirar o acompanhamento.
$alteracao = @{ status = 'em preparo'; incluirPaoDeQueijo = $false } | ConvertTo-Json
Invoke-RestMethod -Method Patch -Uri "$base/$($pedido.id)" -Headers $headers -ContentType 'application/json' -Body $alteracao

# Remover: resposta 204, sem conteúdo.
Invoke-RestMethod -Method Delete -Uri "$base/$($pedido.id)" -Headers $headers
```

Use somente dados fictícios nesta fase. Uma encomenda criada pela API já fica registrada e ocupa vaga; não há aprovação manual. O pagamento é na retirada. Conversas no WhatsApp não são sincronizadas.

## Persistência, capacidade e concorrência

`src/database/encomendas.ts` cria a tabela e o índice por data na primeira abertura. Os dados persistem em arquivo ao reiniciar; os testes usam bancos isolados e temporários. Arquivos SQLite e `backend/data/` ficam fora do Git.

Uma **transação** agrupa operações: tudo é concluído com `COMMIT`, ou é desfeito com `ROLLBACK`. `BEGIN IMMEDIATE` obtém o direito de escrita antes da contagem de vagas. Outro processo que usa o mesmo arquivo precisa esperar; quando consegue escrever, conta novamente. Assim, contar e inserir/mover não ficam separados por uma janela em que dois pedidos possam pegar a mesma vaga. Isso acompanha o modelo de escrita única por vez do [SQLite](https://www.sqlite.org/lang_transaction.html).

Todos os status entram na contagem de cinco por data. Alterar status não cria registro adicional. Ao mover uma encomenda, a nova data é verificada dentro da transação; falhar preserva todos os dados anteriores. Excluir libera uma vaga. WAL permite leituras durante escritas; `busy_timeout` aguarda até cinco segundos por bloqueios. Banco ainda ocupado responde `503`, sem simular reserva.

As datas são strings `YYYY-MM-DD`, dias do calendário da Bahia. `Intl.DateTimeFormat` identifica o dia atual em `America/Bahia`, sem depender do fuso do servidor. Amanhã ou depois é válido; não é necessário esperar 24 horas exatas. A data é validada novamente dentro da transação depois de obter o bloqueio.

SQL usa parâmetros `?` para valores do cliente, em vez de montar consultas com esses valores. Isso impede que uma entrada seja interpretada como comando SQL. O adicional é armazenado como `0/1` no SQLite e devolvido como `false/true` no JSON.

Para começar novamente **apenas com dados fictícios descartáveis**, pare todos os processos que usam o banco e remova os arquivos `backend/data/cafe.sqlite`, `cafe.sqlite-wal` e `cafe.sqlite-shm`, se existirem. Isso apaga os pedidos de teste; na próxima execução o banco será recriado vazio. Para preservar uma base, mantenha esses arquivos e use outro `DATABASE_PATH`.

## Estrutura e testes

- `src/server.ts`: configuração do processo, porta e encerramento.
- `src/app.ts`: Express, JSON, cabeçalhos e respostas de erro.
- `src/routes/encomendas.ts`: métodos e códigos HTTP.
- `src/encomenda.ts`: tipos e validação das entradas.
- `src/database/encomendas.ts`: SQL, persistência e transações.
- `src/middleware/admin.ts`: verificação do token das operações administrativas.
- `src/config.ts`: fuso, limite, status e IDs permitidos pelo servidor.
- `tests/`: testes HTTP reais, persistência, validações, acesso administrativo e concorrência entre dois processos.

```powershell
cd backend
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

Os 13 testes passaram com Node 24.11: CRUD, adicional, status inicial, cinco vagas incluindo todos os status, mudança de data com rollback, exclusão liberando vaga, persistência, campos inválidos, SQL parametrizado, proteção administrativa, JSON/erros e fuso. Dois cenários iniciam processos independentes no mesmo arquivo SQLite e disputam a quinta vaga por POST e por PATCH. Um teste compara IDs e fuso com `frontend/src/data/cafeConfig.ts` para detectar divergências; o servidor não importa o front-end em execução.

## Limites desta etapa

O servidor escuta só em loopback (`127.0.0.1`), não libera CORS e bloqueia operações administrativas sem token. A criação é pública por projeto; sua resposta pertence a quem acabou de enviar o pedido. Token nunca deve ir no cliente público. O mecanismo administrativo é mínimo para testar a API: não há login, usuários, sessões ou painel.

Antes de publicar, configure um segredo administrativo forte no ambiente, HTTPS e acesso administrativo restrito; substitua o token mínimo por autenticação adequada ao painel quando essa etapa chegar. CORS não substitui autenticação. Não publique o arquivo SQLite como arquivo estático. Nesta etapa não foi feita implantação, e nomes e telefones não têm endpoint público de listagem/consulta.

O acesso SQLite síncrono simplifica este protótipo pequeno, mas bloqueia o processo durante operações; não é uma decisão de arquitetura para alto volume. Referência do módulo usado: [SQLite no Node 24](https://nodejs.org/docs/latest-v24.x/api/sqlite.html).
