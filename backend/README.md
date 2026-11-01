# API do Café do Bairro

API REST local em Node.js, Express, TypeScript e SQLite. O formulário público já envia pedidos por `POST /api/encomendas` usando o proxy de desenvolvimento do Vite; a confirmação aparece somente após `201`. A API usa TypeScript por solicitação do projeto, no lugar da recomendação inicial de JavaScript no brief.

**Mudança confirmada nesta etapa:** a produção diária é de **cinco bolos**, não cinco registros. A soma de `quantidadeBolos` em todos os pedidos de uma data determina a capacidade ocupada. Essa orientação substitui a contagem original do brief, preservado como histórico.

Para rodar site e API juntos e configurar o login por sessão, veja o [README principal](../README.md#habilitar-o-painel-administrativo). O envio público não precisa de credenciais. O painel usa usuário/hash de senha no ambiente e cookie de sessão; os exemplos Bearer abaixo continuam disponíveis para testar o CRUD pelo PowerShell. O token nunca vai para o front-end.

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
| `ADMIN_TOKEN` | Opcional, mínimo de 32 caracteres; mantém o CRUD via Bearer no PowerShell, independente do login. |
| `ADMIN_USER` | Usuário administrativo definido pelo responsável, sem valor padrão. Configurar junto com o hash. |
| `ADMIN_PASSWORD_HASH` | Hash scrypt gerado por `src/gerar-senha.ts`, nunca a senha em texto puro. |
| `ADMIN_ORIGIN` | Origem exata autorizada do site; em desenvolvimento assume `http://127.0.0.1:5173`. Não aceita caminho/barra final nem lista de origens. |
| `NODE_ENV=production` | Exige usuário/hash e `ADMIN_ORIGIN` HTTPS; cookie Secure. Bearer sozinho não habilita modo produção. |

Não há carregamento automático de `.env`. Defina as variáveis no terminal ou no ambiente do serviço. Se houver erro de certificado na instalação, no Node 24 use `$env:NODE_USE_SYSTEM_CA='1'` e tente novamente, sem desativar a validação HTTPS.

## Contrato HTTP

| Método | Rota | Acesso | Resultado |
| --- | --- | --- | --- |
| `POST` | `/api/encomendas` | Público | `201`, encomenda registrada com status `recebida`. |
| `GET` | `/api/disponibilidade?data=YYYY-MM-DD` | Público | `200`, apenas data e quantidades agregadas, sem dados pessoais. |
| `GET` | `/api/encomendas` | Administrativo | `200`, lista ordenada por data e ID. |
| `GET` | `/api/encomendas/:id` | Administrativo | `200`, encomenda por ID. |
| `PATCH` | `/api/encomendas/:id` | Administrativo | `200`, encomenda atualizada. |
| `DELETE` | `/api/encomendas/:id` | Administrativo | `204`, sem corpo. |

As requisições administrativas aceitam **sessão válida** ou `Authorization: Bearer SEU_TOKEN`. POST e PATCH exigem `Content-Type: application/json` e corpo de até 16 KB. Sem nenhuma modalidade configurada, o CRUD administrativo responde `503`; com acesso configurado, requisições anônimas recebem `401`.

### Login, sessão e CSRF

| Método | Rota | Comportamento |
| --- | --- | --- |
| `POST` | `/api/admin/login` | JSON `{ "usuario": "…", "senha": "…" }`, origem autorizada obrigatória. Verifica hash; sucesso `200` e cookie HttpOnly. |
| `GET` | `/api/admin/sessao` | Exige cookie válido. `200` com `{ csrfToken, expiraEm }`, ou `401`. Não aceita Bearer como login no painel. |
| `POST` | `/api/admin/logout` | Exige cookie, origem autorizada e `X-CSRF-Token`; invalida sessão no servidor, limpa cookie e responde `204`. Envie JSON `{}`. |

O login não usa uma senha ou um ADMIN_TOKEN embutidos no React. A senha é verificada com `node:crypto.scrypt` assíncrono (`N=65536, r=8, p=2`, salt aleatório de 16 bytes e chave de 64 bytes), com comparação em tempo constante. Gere o hash pela entrada padrão usando `npm.cmd run --silent admin:hash` ou o comando direto documentado no README principal. Não passe a senha como argumento de shell. O script exige entre 12 e 128 caracteres. O formato `scrypt$salt$hash` usa esses parâmetros fixos, sem aceitar custos controlados por entradas de login.

A sessão usa identificador aleatório de 32 bytes no cookie e registro em memória **do servidor** com prazo absoluto de oito horas. Um novo login substitui a sessão do cookie anterior; logout e expiração a invalidam no servidor. Há no máximo 100 sessões; as expiradas são removidas e, ao exceder o limite, a mais antiga é encerrada. Reiniciar a API encerra todas as sessões. Encomendas permanecem no SQLite, sem alteração de esquema nesta etapa. Para múltiplas instâncias, seria necessário compartilhar sessões e limite de tentativas; esta versão atende uma única instância.

Em desenvolvimento HTTP local, o cookie `cafe_admin` usa `HttpOnly; SameSite=Strict; Path=/`. Em produção ele é `__Host-cafe_admin`, com `Secure`, sem Domain e com `Path=/`, exigindo HTTPS. Sirva frontend e `/api` na mesma origem, preservando `Origin` no proxy. Não há CORS liberado, `trust proxy` ou desativação de validação TLS. A origem é comparada com configuração explícita, não com Host ou X-Forwarded-Host enviados pelo cliente.

PATCH e DELETE autenticados por cookie exigem **origem exata e token CSRF da sessão** no cabeçalho `X-CSRF-Token`. Esse token é retornado somente pelo login/consulta autenticada, não é credencial Bearer e fica apenas na memória do React. Login também valida origem e rejeita `Sec-Fetch-Site: cross-site`, prevenindo login forçado. SameSite acrescenta uma camada, sem substituir CSRF. Bearer válido dispensa CSRF porque não é enviado automaticamente pelo navegador; enviar Authorization inválido não faz fallback para cookie.

Login permite cinco tentativas por IP em 15 minutos, mais limite global de 30 por janela e duas verificações de senha simultâneas. Excesso recebe `429`, `Retry-After` e mensagem de espera. Usuário desconhecido e senha errada retornam a mesma mensagem e passam pela verificação de hash. Os contadores ficam em memória, contam também sucessos e não confiam em X-Forwarded-For. Não faça logs de corpos de login, cookies ou cabeçalhos de autenticação no proxy. Na implantação, restrinja os arquivos do banco e segredos do ambiente.

Referências técnicas: [armazenamento de senhas OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) e [proteção CSRF OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

Exemplo de corpo do POST (a data precisa ser futura ao executar):

```json
{
  "nomeCliente": "Cliente de Teste",
  "telefone": "(73) 99999-9999",
  "produto": "bolo-cenoura",
  "dataEntrega": "2099-12-25",
  "incluirPaoDeQueijo": true,
  "quantidadeBolos": 2
}
```

São os mesmos campos do estado do formulário atual. `produto` recebe um **ID**, conforme o `<select>` do front-end, em vez do nome ilustrativo usado no exemplo original do brief. IDs permitidos: `bolo-cenoura`, `bolo-chocolate`, `bolo-milho`, `bolo-fuba`, `bolo-laranja`, `bolo-coco`. Cafés, Natal e pão de queijo como produto independente são recusados.

`quantidadeBolos` é obrigatório no POST e deve ser um número inteiro positivo seguro, sem conversão de strings. Zero, negativos e frações retornam `400`; uma quantidade positiva que ultrapassa o saldo retorna `409`. A quantidade corresponde ao mesmo sabor selecionado em `produto`. Clientes anteriores precisam passar a enviar esse campo; o valor padrão de um bolo é destinado à migração dos registros existentes.

`incluirPaoDeQueijo` é booleano; omitido no POST, vira `false`. `true` significa **uma dúzia junto com os bolos**, independentemente da quantidade de bolos. O acompanhamento não ocupa nenhuma parte da capacidade de bolos. Não há quantidade de dúzias, pedido independente do acompanhamento ou carrinho.

O POST define `id` e `status` no servidor e rejeita esses campos na entrada. A resposta contém os dados registrados, `id`, `status: "recebida"` e o adicional como booleano. O telefone é normalizado para dígitos (mantendo o DDI `55` quando informado, com ou sem `+`). Esse valor normalizado também é aceito em atualizações. O cabeçalho `Location` aponta para a consulta administrativa do novo ID.

PATCH aceita qualquer combinação dos mesmos campos e `status`: `recebida`, `em preparo` ou `entregue`. Campos omitidos são preservados; corpo vazio, campos desconhecidos e valores de tipo incorreto são recusados. Uma mudança somente de status/contato pode ser feita em pedido antigo, sem alterar sua data. Se enviar `dataEntrega`, ela precisa ser amanhã ou depois. Trocar a data ou a quantidade revalida a data futura e o saldo dentro da transação, excluindo a quantidade anterior desse mesmo ID da soma. Assim, aumentar não conta o próprio pedido duas vezes; reduzir libera a diferença. Falhar preserva todo o registro anterior.

### Consulta pública de disponibilidade

```http
GET /api/disponibilidade?data=2099-12-25
```

Exemplo de resposta, quando há três bolos reservados:

```json
{
  "data": "2099-12-25",
  "limiteDiario": 5,
  "quantidadeReservada": 3,
  "quantidadeDisponivel": 2
}
```

Não exige token e nunca retorna ID de pedido, nome ou telefone. Valida data existente e a mesma antecedência do POST em `America/Bahia`; ausência, parâmetros de data repetidos, hoje e passado retornam `400`. Responde com `Cache-Control: no-store`. Consultar não grava nem garante reserva: o saldo pode mudar antes do POST. Dia lotado responde `200` com disponível `0`, não erro.

Erros têm formato `{ "erro": "Mensagem compreensível." }`:

- `400`: campos, JSON, data, status ou ID inválidos.
- `401`: credenciais incorretas, sessão ausente/expirada ou Bearer inválido.
- `403`: origem ou token CSRF inválido; operação não executada.
- `429`: limite de tentativas de login; aguarde a janela indicada.
- `404`: encomenda ou rota inexistente.
- `409`: quantidade solicitada ultrapassa o saldo da data; nada é gravado.
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
  quantidadeBolos = 2
} | ConvertTo-Json

# Consultar antes de criar: não exige token e não reserva capacidade.
$data = (Get-Date).AddDays(2).ToString('yyyy-MM-dd')
Invoke-RestMethod -Uri "http://127.0.0.1:3001/api/disponibilidade?data=$data"

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

Use somente dados fictícios nesta fase. Uma encomenda criada pela API já fica registrada e ocupa sua quantidade de bolos na data; não há aprovação manual. O pagamento é na retirada. Conversas no WhatsApp não são sincronizadas.

## Persistência, capacidade e concorrência

`src/database/encomendas.ts` cria a tabela e o índice por data na primeira abertura. Os dados persistem em arquivo ao reiniciar; os testes usam bancos isolados e temporários. Arquivos SQLite e `backend/data/` ficam fora do Git.

Na próxima inicialização, a migração verifica as colunas sob `BEGIN IMMEDIATE`. Se `quantidadeBolos` ainda não existir, executa `ALTER TABLE ... ADD COLUMN quantidadeBolos INTEGER NOT NULL DEFAULT 1 CHECK(quantidadeBolos > 0)`. Cada registro antigo passa a representar um bolo, mantendo ID, nome, telefone, sabor, data, status e acompanhamento. Não é necessário apagar nem recriar o banco. Reabrir uma base já migrada não muda as quantidades existentes. Pare versões antigas da API antes de iniciar a versão nova, para que todos os escritores usem a regra atualizada.

Uma **transação** agrupa operações: tudo é concluído com `COMMIT`, ou é desfeito com `ROLLBACK`. `BEGIN IMMEDIATE` obtém o direito de escrita antes da contagem de vagas. Outro processo que usa o mesmo arquivo precisa esperar; quando consegue escrever, conta novamente. Assim, contar e inserir/mover não ficam separados por uma janela em que dois pedidos possam pegar a mesma vaga. Isso acompanha o modelo de escrita única por vez do [SQLite](https://www.sqlite.org/lang_transaction.html).

Todos os status entram em `SUM(quantidadeBolos)` por data, inclusive `entregue`. A soma é consultada dentro de `BEGIN IMMEDIATE` antes de inserir ou alterar data/quantidade; o resultado mais a quantidade solicitada deve ser no máximo 5. Alterar status não aumenta o consumo. Excluir libera todos os bolos do registro. WAL permite leituras durante escritas; `busy_timeout` aguarda até cinco segundos por bloqueios. Banco ainda ocupado responde `503`, sem simular reserva.

As datas são strings `YYYY-MM-DD`, dias do calendário da Bahia. `Intl.DateTimeFormat` identifica o dia atual em `America/Bahia`, sem depender do fuso do servidor. Amanhã ou depois é válido; não é necessário esperar 24 horas exatas. A data é validada novamente dentro da transação depois de obter o bloqueio.

SQL usa parâmetros `?` para valores do cliente, em vez de montar consultas com esses valores. Isso impede que uma entrada seja interpretada como comando SQL. O adicional é armazenado como `0/1` no SQLite e devolvido como `false/true` no JSON.

Para começar novamente **apenas com dados fictícios descartáveis**, pare todos os processos que usam o banco e remova os arquivos `backend/data/cafe.sqlite`, `cafe.sqlite-wal` e `cafe.sqlite-shm`, se existirem. Isso apaga os pedidos de teste; na próxima execução o banco será recriado vazio. Para preservar uma base, mantenha esses arquivos e use outro `DATABASE_PATH`.

## Estrutura e testes

- `src/server.ts`: configuração do processo, porta e encerramento.
- `src/app.ts`: Express, JSON, cabeçalhos e respostas de erro.
- `src/routes/encomendas.ts`: métodos e códigos HTTP.
- `src/routes/disponibilidade.ts`: consulta pública de agregados por data, sem dados pessoais.
- `src/encomenda.ts`: tipos e validação das entradas.
- `src/database/encomendas.ts`: SQL, persistência e transações.
- `src/auth/admin.ts`: login, sessões, cookies, CSRF, limite de tentativas e compatibilidade Bearer.
- `src/auth/senha.ts`: geração e verificação do hash scrypt.
- `src/gerar-senha.ts`: utilitário de configuração, recebendo senha pela entrada padrão.
- `src/config.ts`: fuso, limite, status e IDs permitidos pelo servidor.
- `tests/`: testes HTTP reais, persistência, validações, acesso administrativo e concorrência entre dois processos.

```powershell
cd backend
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

Os testes cobrem CRUD, adicional, status inicial, soma das quantidades em todos os status, disponibilidade pública sem dados pessoais, dia lotado, mudanças combinadas de data/quantidade com rollback, redução/exclusão liberando bolos, persistência, migração de base antiga e reabertura, campos inválidos, SQL parametrizado, proteção administrativa, JSON/erros, fuso e reutilização do telefone normalizado em PATCH. Quatro cenários usam processos independentes no mesmo SQLite: última vaga por POST/PATCH, dois pedidos de três bolos e aumentos simultâneos de quantidade. Um teste compara IDs e fuso com `frontend/src/data/cafeConfig.ts`; o servidor não importa o front-end em execução. `tests/admin.test.ts` acrescenta hash, login, cookie HttpOnly/Secure, sessão e renovação, expiração, logout, negação anônima, CSRF/origens, alteração/exclusão autenticadas, limite de tentativas e manutenção do Bearer.

## Limites desta etapa

O servidor escuta só em loopback (`127.0.0.1`), não libera CORS e protege operações administrativas com sessão ou Bearer. A criação é pública por projeto; sua resposta pertence a quem acabou de enviar o pedido. Segredos nunca vão no cliente público. Não há cadastro público, recuperação automática de senha, múltiplos perfis ou notificações. Na V1.1, o painel também edita todos os campos modificáveis por meio do PATCH existente, além de listagem, filtros, status e exclusão. O ID permanece somente de leitura.

A edição do painel envia apenas as diferenças: uma alteração de telefone/status não reenvia data antiga. Alterar quantidade em pedido antigo exige uma data futura. O servidor continua responsável pela validação definitiva e pela transação: o próprio ID é excluído da soma antes de testar a nova quantidade, e `409` preserva o registro inteiro. Não houve alteração no esquema SQLite nem nas rotas de autenticação. Um teste adicional por sessão verifica edição completa, transferência de capacidade, exclusão da própria reserva na soma e rollback de todos os campos no conflito. Consulte o [relatório V1.1](../docs/v1.1/README.md).

Antes de publicar, configure usuário/hash fortes no ambiente, origem HTTPS exata e proxy `/api` na mesma origem; mantenha acesso administrativo restrito e backup do banco. CORS não substitui autenticação. Não publique o arquivo SQLite como arquivo estático. Nesta etapa não foi feita implantação, e nomes e telefones não têm endpoint público de listagem/consulta.

O acesso SQLite síncrono simplifica este protótipo pequeno, mas bloqueia o processo durante operações; não é uma decisão de arquitetura para alto volume. Referência do módulo usado: [SQLite no Node 24](https://nodejs.org/docs/latest-v24.x/api/sqlite.html).
