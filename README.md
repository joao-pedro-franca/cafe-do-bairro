# Café do Bairro

Projeto para o desafio técnico da TecnoJr. Os requisitos estão em [BRIEF.md](BRIEF.md).

## Etapa atual

Base React + TypeScript + Vite, com CSS tradicional, cabeçalho, hero, cardápio, formulário expansível, informações/contato e rodapé. O formulário é integrado à API REST em `backend/`: a confirmação com número do pedido aparece somente após `201 Created`, com a data reservada e pagamento na retirada. A API implementa CRUD e regras de capacidade com SQLite. `/admin` agora tem login e painel de encomendas com sessão validada no servidor, filtros, alteração de status e exclusão confirmada.

**Regra atual de capacidade:** por orientação desta etapa, são **cinco bolos por dia**, calculados pela soma de `quantidadeBolos`, em vez de cinco registros de encomenda. Essa decisão substitui a contagem descrita no brief original, que foi preservado como histórico. Pedidos antigos passam a representar um bolo cada, sem apagar ou recriar a base.

Veja [como iniciar e testar a API](backend/README.md), incluindo contrato, exemplos PowerShell, persistência e proteção administrativa. O back-end usa TypeScript por solicitação desta etapa, atualizando a recomendação inicial de JavaScript do brief; o brief original foi preservado.

**Todos os dados comerciais são fictícios**, incluindo endereço, horários, produtos, preços e tamanhos. Edite `frontend/src/data/cafeConfig.ts` para substituí-los. WhatsApp e Instagram aparecem em modo de demonstração, sem links para terceiros. A ilustração SVG do hero é um placeholder local; substituir por fotografia autorizada e otimizada numa etapa futura.

## Executar

Requer **Node.js 24.11 ou posterior** e npm para executar os dois lados e os testes de integração. Abra **dois terminais**, cada um inicialmente na raiz do repositório.

No terminal 1, inicie a API:

```powershell
cd backend
npm.cmd install
npm.cmd run dev
```

No terminal 2, inicie o site:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Abra o endereço informado pelo Vite, normalmente **http://127.0.0.1:5173**. A API escuta em `127.0.0.1:3001`; o proxy de desenvolvimento encaminha `/api` para essa porta. Mantenha os dois terminais abertos e use Ctrl+C em cada um para parar.

O POST é público e **não exige credenciais administrativas**. Sem configurar acesso no servidor, o fluxo público continua funcionando e o login informa que o painel está indisponível. Para habilitar o painel, siga a configuração abaixo. O Bearer token continua opcional para testar o CRUD pelo PowerShell; nunca coloque segredos em variáveis `VITE_*` ou no código React.

### Habilitar o painel administrativo

Na pasta `backend/`, antes de iniciar a API, escolha seu próprio usuário e senha. Não há conta nem senha padrão. Este exemplo solicita a senha sem mostrá-la e guarda no ambiente **somente seu hash**:

```powershell
$env:ADMIN_USER = Read-Host 'Escolha o usuário administrativo'
$senhaSegura = Read-Host 'Escolha uma senha de 12 a 128 caracteres' -AsSecureString
$senhaTexto = [System.Net.NetworkCredential]::new('', $senhaSegura).Password
$env:ADMIN_PASSWORD_HASH = $senhaTexto | node --experimental-strip-types src/gerar-senha.ts
Remove-Variable senhaTexto, senhaSegura
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível gerar o hash da senha.' }
$env:ADMIN_ORIGIN = 'http://127.0.0.1:5173'
npm.cmd run dev
```

No outro terminal, inicie o Vite como descrito acima e abra **http://127.0.0.1:5173/admin**, ou use o link no rodapé. Use o usuário e a senha que você escolheu. Mantenha a origem exatamente igual a `ADMIN_ORIGIN` (protocolo, host e porta); se o Vite informar outra porta, ajuste a variável e reinicie a API. `localhost` e `127.0.0.1` são origens diferentes. Não é necessário configurar `ADMIN_TOKEN` para o painel.

O servidor verifica a senha com `scrypt` e cria uma sessão de até oito horas. O cookie é `HttpOnly` e `SameSite=Strict`; o React não lê o cookie e não armazena credenciais no localStorage ou sessionStorage. O token CSRF fica só na memória da página e protege alterações junto à verificação da origem. Em produção, HTTPS é obrigatório e o cookie usa `Secure` e o prefixo `__Host-`. As sessões e o limite de tentativas ficam na memória de uma única instância: reiniciar a API exige entrar novamente, mas mantém as encomendas no SQLite. Esta versão não oferece infraestrutura de múltiplas instâncias.

O login permite até cinco tentativas por IP a cada 15 minutos, com teto global de 30 e limite de verificações simultâneas. O servidor não confia em `X-Forwarded-For`; atrás de um proxy, os acessos compartilham o IP do proxy. Não habilite `trust proxy` indiscriminadamente. Os limites também contam logins bem-sucedidos, e reiniciar o servidor os reinicia.

As variáveis duram enquanto o terminal estiver aberto. Para manter configuração entre execuções, configure o ambiente do serviço ou um `.env` local ignorado e carregue explicitamente com `node --env-file=.env --watch --experimental-strip-types src/server.ts` dentro de `backend/`. Nunca versione o arquivo nem cole credenciais no README. O hash também é informação sensível. Trocar credenciais requer reiniciar a API, encerrando as sessões anteriores.

### Demonstrar o painel

1. Faça uma encomenda com dados fictícios pelo formulário público. Entre em `/admin` e confira nome, telefone, sabor, quantidade, data, dúzia opcional e status `recebida`.
2. Use os filtros por data e status, isolados ou juntos. **Limpar filtros** restaura a listagem; **Atualizar lista** busca encomendas novas e alterações feitas em outra aba.
3. Escolha **em preparo** e clique em **Salvar status**; depois teste **entregue**. A alteração deve persistir após atualizar a página e não liberar capacidade.
4. Clique em **Excluir pedido**. **Manter pedido** cancela; somente **Sim, excluir pedido nº …** apaga o registro e libera sua quantidade de bolos na data. A exclusão é irreversível.
5. Use **Sair**, atualize a página e confira que o login é exigido. Acessar `/api/encomendas` sem sessão ou Bearer válido não retorna dados pessoais.
6. Confira em 360, 390, 768 e 1280 px, com teclado e no celular. O painel usa cartões, sem tabela horizontal. Não compartilhe uma sessão autenticada em um dispositivo público.

Mais detalhes do contrato e da configuração estão no [README da API](backend/README.md). Não há edição dos demais campos pelo painel nesta versão; o PATCH completo continua disponível por Bearer. Também não há cadastro público, pagamentos, notificações ou contas adicionais.

Auditoria atual: **40 testes do frontend e 30 do backend**, lint, typecheck e builds aprovados. O painel foi conferido no Edge em 360, 390, 768 e 1280 px, com cookie real e sem rolagem horizontal. Veja o [relatório final integrado, capturas e roteiro de execução](docs/auditoria-final/README.md).

`npm.cmd` evita o bloqueio de `npm.ps1` pela política de scripts do Windows; em outros terminais pode usar `npm`.

Para verificar o front-end, dentro de `frontend/`:

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd test
npm.cmd run preview
```

O build verifica TypeScript e gera `frontend/dist/`. O preview serve esse build localmente. **O proxy configurado em `server.proxy` vale para desenvolvimento**, não é uma configuração de implantação. Para publicar o build, será necessário encaminhar `/api` no servidor da implantação, preservando HTTPS e a autenticação das rotas administrativas.

Para verificar o back-end, dentro de `backend/`:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

Instale as dependências **das duas pastas** antes de executar os testes de integração do front-end. Eles iniciam API e Vite em portas temporárias, usam banco em memória e encerram tudo ao terminar; não precisam dos servidores de desenvolvimento ativos e não gravam pedidos na base local.

Se a instalação informar `UNABLE_TO_VERIFY_LEAF_SIGNATURE` no Node 24, tente usar os certificados do sistema, sem desabilitar HTTPS:

```powershell
$env:NODE_USE_SYSTEM_CA='1'
npm.cmd install
```

## Organização e decisões

- `src/components/`: cabeçalho, marca e acessos de contato reutilizáveis.
- `src/sections/Hero.tsx`: apresentação e dois CTAs com âncoras nativas.
- `src/sections/Cardapio.tsx`: categorias e cartões do cardápio; `components/ProductIllustration.tsx` fornece desenhos provisórios enquanto não há fotos autorizadas.
- `src/sections/Encomendas.tsx`: abertura/fechamento, campos controlados, foco e mensagens de validação.
- `src/sections/InformacoesContato.tsx`: endereço semântico, horário e canais lidos da configuração central.
- `src/components/Footer.tsx`: marca, navegação, contatos e link discreto para a área administrativa.
- `src/pages/Admin.tsx`: login, cartões, filtros, mensagens, status, confirmação de exclusão e saída.
- `src/services/admin.ts`: requisições administrativas com cookie de sessão e token CSRF em memória.
- `src/styles/admin.css`: painel mobile-first com a identidade visual do café.
- `tests/admin-integracao.test.mjs`: login e operações reais através do proxy até o SQLite, incluindo acesso negado e saída.
- `tests/admin-service.test.mjs`: rejeição de respostas administrativas inválidas antes de atualizar a tela.
- `src/utils/contato.ts`: formação dos links externos somente quando confirmados e válidos.
- `src/styles/contato.css`: seção em papel creme e rodapé chocolate, com disposição adaptada ao celular.
- `src/services/encomendas.ts`: consulta pública de disponibilidade e POST, verificação das respostas e mensagens de erro; sem token e sem repetição automática de POST.
- `src/hooks/useDisponibilidade.ts`: consulta ao mudar a data, cancelamento de consultas antigas e atualização após sucesso ou conflito.
- `src/utils/encomenda.ts`: calendário no fuso do café, formato de telefone e validações iniciais, sem chamadas de rede.
- `src/styles/encomendas.css`: gaveta animada e formulário em uma coluna no celular e duas em telas maiores.
- `tests/encomenda.test.mjs`: testes das validações com o executor nativo do Node, sem dependências extras.
- `tests/encomendas-service.test.mjs`: contrato HTTP, erros de rede, respostas inválidas e códigos de status.
- `tests/encomendas-integracao.test.mjs`: formulário React com DOM simulado (`happy-dom`, apenas em desenvolvimento), proxy Vite, API e SQLite reais.
- `vite.config.ts`: proxy local `/api` → `http://127.0.0.1:3001`, sem alterar CORS, hosts permitidos ou validação TLS.
- `src/data/cafeConfig.ts`: fonte única dos dados comerciais ilustrativos.
- `src/styles/`: tokens visuais e CSS mobile-first, sem bibliotecas de UI.
- `public/images/`: ilustração provisória, sem dependência de imagem externa.

A navegação fica visível no celular, sem menu expansível nesta etapa. HTML semântico, foco visível, link para pular ao conteúdo e respeito a movimento reduzido dão uma base acessível. Os contatos usam detalhes expansíveis nativos enquanto os dados não forem confirmados; não simulam envio ou reserva.

### Informações, contato e rodapé

A seção `#contato` substitui o placeholder e apresenta horário, endereço e canais. Usa `<address>`, títulos e listas descritivas, com ícones decorativos e aviso de dados fictícios. No celular os blocos ficam empilhados; telas maiores passam a duas ou três colunas. O rodapé mantém a marca com xícara, navegação pelas âncoras e os mesmos acessos de contato. Foco visível e alvos de pelo menos 44 px são mantidos nos controles.

`ContactLinks` é compartilhado pelo hero, contato e rodapé. Para liberar canais oficiais, edite **somente `frontend/src/data/cafeConfig.ts`**:

- WhatsApp: preencha `contato.whatsapp.numero` com o número autorizado incluindo DDI `55`, DDD e número; atualize `exibicao` e `mensagem`, e só então marque `confirmado: true`. O destino usa `https://wa.me/` com mensagem codificada. Número ausente, formato inválido ou `confirmado: false` mantém a interface de demonstração, sem link telefônico externo.
- Instagram: preencha `contato.instagram.url` com a URL HTTPS do perfil oficial em `instagram.com` ou `www.instagram.com`, atualize `exibicao` e marque `confirmado: true`. Sem esses dados, permanece em demonstração, sem inventar um perfil.
- Atualize também `endereco` e `horario` com os dados reais antes de um uso público; os avisos de protótipo devem ser revistos quando todo o conteúdo estiver confirmado.

Links oficiais abrem em nova aba, com indicação no texto e `rel="noopener noreferrer"`, preservando a página do café. Abrir uma conversa não registra nem sincroniza encomendas: a seção orienta reservar pelo formulário. Nenhum dado de formulário é incluído na mensagem de WhatsApp.

O link **Área administrativa** leva ao login em `/admin`. A API só retorna nomes e telefones depois da autenticação. O painel permite acompanhar e gerenciar status e exclusões; o link **Voltar para o café** mantém o retorno à landing page.

### Revisão do cardápio

As três categorias e os 11 produtos ficam em `cafeConfig.ts`. `exibirNoCardapio` controla a exibição; `encomenda.tipo` diferencia produtos principais, acompanhamentos e itens indisponíveis para encomenda. Um produto aparecer no cardápio não o torna automaticamente selecionável para encomenda.

- Os seis bolos caseiros são produtos principais encomendáveis.
- Café coado e café com leite não aceitam encomenda.
- Pão de queijo é apresentado por unidade (R$ 3,00); a dúzia (R$ 25,00) está configurada como acompanhamento opcional de bolos caseiros, sem pedido independente.
- Panetone e bolo de Natal são sazonais de dezembro (`meses: [12]`) e têm encomenda indisponível até confirmação. Permanecem visíveis para revisão, sem liberação automática por data.

Essa revisão foi solicitada após releitura da entrevista e substitui a simplificação anterior do brief, na qual a dúzia era um produto independente em uma encomenda de produto único. O brief original foi preservado; o formulário e a API já consideram o acompanhamento opcional. As descrições, tamanhos e preços continuam ilustrativos. Ainda não há seleção ou registro de encomenda no cardápio.

A apresentação usa listas de cartões, papel claro, bordas discretas e tipografia serifada inspirados no mockup. No celular, os produtos ficam empilhados para permitir leitura sem controles de carrossel. As imagens são desenhos SVG provisórios, não fotografias dos produtos.

### Formulário de encomendas integrado

Os links do Hero, da navegação e o novo CTA do cardápio levam a `#encomendas`. O botão **Quero encomendar** abre a gaveta dentro da página. Ela permanece montada, e os campos controlados pelo React preservam os valores ao fechar e reabrir. Campos fechados ficam fora da navegação e da árvore de acessibilidade com `inert` e `aria-hidden`. Ao abrir, o foco e a rolagem levam ao título do formulário; ao fechar, o foco retorna ao botão. A preferência por movimento reduzido desativa a animação.

O formulário exige nome e sobrenome, telefone brasileiro com DDD (fixo ou celular, +55 opcional), um dos seis bolos principais e uma data a partir de amanhã no fuso configurado em `cafeConfig.ts`. O telefone válido ganha formatação ao sair do campo. A data mínima é atualizada ao abrir, ao focar a data, periodicamente enquanto a gaveta está aberta e novamente ao confirmar, para evitar aceitar hoje depois da virada do dia. Não depende do fuso do dispositivo nem interpreta o dia digitado como instante UTC.

Depois de selecionar um bolo, aparece a opção de adicionar uma dúzia de pão de queijo, com preço vindo da configuração. Não há quantidade, carrinho ou pedido independente desse acompanhamento. Cafés e itens natalinos não aparecem no seletor.

O formulário começa **somente pela data**. Uma data válida dispara `GET /api/disponibilidade?data=YYYY-MM-DD`. A tela apresenta capacidade total, bolos já reservados e bolos disponíveis. Enquanto consulta, mostra carregamento; se falhar, permite tentar novamente. Dia lotado mostra uma mensagem para escolher outra data. A consulta não ocupa capacidade nem garante reserva.

Com saldo, aparecem bolo, quantidade, nome e telefone. Os botões de aumentar/diminuir e o campo numérico permitem escolher de 1 até o saldo consultado. Um registro contém **um sabor e sua quantidade de bolos**, sem carrinho de sabores. O adicional continua sendo uma única dúzia por pedido, independentemente da quantidade de bolos, sem consumir capacidade de produção de bolos.

**Confirmar encomenda** valida os campos localmente e envia `nomeCliente`, `telefone`, `produto`, `dataEntrega`, `quantidadeBolos` e `incluirPaoDeQueijo` ao `POST /api/encomendas`, sem `id`, `status` ou credenciais administrativas. Campos e envio ficam bloqueados enquanto aparece **Enviando encomenda…**. Uma trava imediata com `useRef` impede dois envios antes de a atualização visual do React terminar; a gaveta pode ser fechada/reaberta durante a espera.

Somente uma resposta `201`, com ID positivo e status `recebida`, permite mostrar **Encomenda nº … confirmada**, reserva da data e pagamento na retirada. Depois disso, o mesmo formulário não reenvia o pedido. **Fazer outra encomenda** limpa os campos e libera explicitamente uma nova solicitação. Fechar e reabrir preserva os dados e o resultado.

O servidor soma novamente os bolos dentro da transação ao confirmar. Se o saldo cair durante o preenchimento e faltar capacidade, responde `409`. A tela consulta o saldo de novo, mantendo sabor, quantidade, contato e adicional. Se a quantidade escolhida ficou maior que o saldo, ela é indicada como inválida, sem redução silenciosa; o cliente pode diminuí-la ou escolher outro dia. Dia lotado oculta os demais campos, mas preserva seus valores para quando outra data for selecionada. Depois de um `201`, uma nova consulta atualiza o saldo exibido; se essa consulta falhar, o pedido continua confirmado.

Um `400` mostra a validação do servidor. Falhas de rede, timeout de 20 segundos, respostas inesperadas e erros do servidor não viram confirmação. Como a conexão pode falhar depois da gravação, a interface avisa que o pedido pode ter sido recebido e pede conferir com o café antes de reenviar. Não há retry automático de POST nem idempotência entre recarregamentos/dispositivos nesta etapa. Consultas GET são canceladas ao trocar de data, e respostas antigas não substituem o saldo atual.

O rascunho fica apenas na memória da página; recarregar apaga o preenchimento. Pedidos confirmados persistem no SQLite e não são cancelados ao recarregar. A landing page usa somente os endpoints públicos; consultas administrativas ocorrem exclusivamente no painel autenticado. Não há integração com WhatsApp.

## Auditoria final integrada

A [auditoria final de 01/11/2026](docs/auditoria-final/README.md) acompanhou o mesmo pedido do formulário público até o painel. Criação com `201`, redução de disponibilidade, login, persistência dos status após reiniciar a API e reabrir o SQLite, exclusão liberando a quantidade correta, logout e bloqueio de acessos anônimos foram aprovados. O fluxo público continua funcionando sem autenticação.

Foram corrigidos somente dois problemas: perda de foco ao salvar status e aceitação de respostas administrativas inválidas. O painel agora devolve o foco ao pedido alterado e mostra erro sem quebrar a tela ou apagar a lista quando o servidor/proxy responde com conteúdo inválido. Não houve mudança de esquema do banco, regra de capacidade, credenciais ou funcionalidades extras.

Os dois roteiros de navegador verificaram a landing, o formulário e o painel nas quatro larguras. Axe-core não encontrou violações nas 21 combinações examinadas; os erros HTTP esperados foram `401` sem sessão e `409` no conflito intencional. Veja no relatório os limites de acessibilidade, a configuração segura do login, os comandos para repetir tudo e o roteiro de demonstração.

## Revisão pré-entrega anterior

A [revisão técnica e visual completa](docs/REVISAO-PRE-ENTREGA.md) contém requisitos verificados, correções, pendências, capturas e roteiro de demonstração.

- A revisão anterior contou **32 testes do front-end e 21 do back-end**. A etapa administrativa acrescenta testes de sessão e operações do painel; execute os mesmos comandos acima para conferir a suíte atual.
- Layout conferido em navegador Edge/Chromium real nas larguras **360, 390, 768 e 1280 px**, sem rolagem horizontal na página e no formulário.
- Fluxo real pelo proxy: disponibilidade, POST único com `201`, SQLite persistente, dia lotado e recuperação de `409`.
- Axe-core não detectou violações nos seis estados examinados. Não houve exceção JavaScript; o único erro HTTP final foi o `409` intencional do teste de capacidade.
- Corrigidos contadores comprimidos no celular, preço cortado no seletor, quebra do ornamento no hero, favicon ausente e telefone normalizado com DDI recusado em atualização.
- Capturas e resultados estão em `docs/auditoria/`. Safari/iOS, Firefox e leitor de tela continuam como conferências complementares.

O proxy segue a opção oficial [`server.proxy` do Vite](https://vite.dev/config/server-options#server-proxy), mantendo o caminho `/api/encomendas` sem reescrita e sem adicionar credenciais administrativas.

### Testar a gaveta e as validações

1. Execute `npm.cmd run dev` dentro de `frontend/`. Siga os CTAs do Hero e do cardápio e confira se ambos chegam a **Faça sua encomenda**.
2. Clique em **Quero encomendar**. Inicialmente apenas a data deve aparecer. Escolha uma data futura, confira os três contadores e, com saldo, selecione sabor/quantidade e preencha os contatos. Feche e reabra para conferir a preservação dos valores.
3. Com data válida e saldo consultado, clique em **Confirmar encomenda** com os demais campos vazios. Confira os erros; nenhum POST deve ser enviado. A consulta GET não grava pedidos.
4. Teste um nome sem sobrenome, telefone curto/sem DDD e datas de hoje ou anteriores. O calendário deve bloquear os dias anteriores a amanhã; a validação também rejeita uma data anterior digitada manualmente quando o navegador permitir.
5. Com os dois servidores ativos, use dados fictícios completos, por exemplo `Cliente de Teste`, `(73) 99999-9999`, um bolo e amanhã. Confira o estado de envio e a confirmação com número do pedido e pagamento na retirada. Esta ação grava um pedido de teste.
6. Navegue por Tab/Shift+Tab e Enter/Espaço. A gaveta fechada não deve receber foco; ao fechar, o foco deve retornar ao botão de abertura. Confira em 360, 390, 768 e 1280 px e com a preferência de movimento reduzido ativada no dispositivo.
7. Reserve três bolos de teste: a consulta deve mostrar limite 5, reservados 3 e disponíveis 2. Para testar concorrência manual, deixe um formulário com quantidade 3 aberto em uma data livre, reserve três bolos nessa mesma data por outra aba e envie o primeiro: ele recebe `409`, atualiza o saldo para 2 e permite diminuir a quantidade sem apagar os demais dados. Os testes automatizados cobrem isso sem modificar a base local.
8. Pare a API antes de enviar um novo pedido para verificar o erro de conexão, sem confirmação automática. Reinicie a API para continuar. Não reenvie às cegas se a conexão caiu durante um pedido que já estava em andamento.

### Conferir contato e rodapé

1. Siga o link **Contato** do cabeçalho ou rodapé e confira o destino `#contato`, o endereço e o horário da configuração.
2. Com a configuração fictícia atual, abra os controles **WhatsApp · demo** e **Instagram · demo**: devem explicar a demonstração, sem abrir site externo. Confira usando Tab e Enter/Espaço.
3. No rodapé, confira os links de navegação e **Área administrativa**. Em `/admin`, sem sessão, deve aparecer o login e **Voltar para o café**; nenhum pedido deve ser exibido.
4. Revise em 360, 390, 768 e 1280 px, sem rolagem horizontal e com leitura confortável. Os testes de contato não enviam requisições a WhatsApp ou Instagram.

## Próxima etapa

Consultar as pendências da auditoria final: outros motores/dispositivos e leitor de tela, materiais visuais autorizados quando fornecidos e conferência do repositório. Antes de implantar, configurar HTTPS, origem exata do site, ambiente protegido, proxy `/api` na mesma origem e backup/acesso restrito ao SQLite. A revisão pré-entrega anterior permanece como histórico.
