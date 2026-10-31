# Café do Bairro

Projeto para o desafio técnico da TecnoJr. Os requisitos estão em [BRIEF.md](BRIEF.md).

## Etapa atual

Base React + TypeScript + Vite, com CSS tradicional, cabeçalho, hero, cardápio e formulário expansível integrado à API REST em `backend/`. A confirmação com número do pedido aparece somente após `201 Created`, com a data reservada e pagamento na retirada. A API implementa CRUD e regras de capacidade com SQLite. Contato continua como área-placeholder; não há painel.

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

O POST é público e **não exige `ADMIN_TOKEN`**. A mensagem do back-end sobre rotas administrativas bloqueadas é esperada quando não há token configurado e não impede encomendas. Não coloque token em variáveis `VITE_*`, no código do site nem em seus cabeçalhos HTTP. Para testar o CRUD administrativo separadamente, siga o [README da API](backend/README.md).

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
- `src/services/encomendas.ts`: POST público, verificação da resposta e mensagens de erro; sem token e sem repetição automática de requisições.
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

### Revisão do cardápio

As três categorias e os 11 produtos ficam em `cafeConfig.ts`. `exibirNoCardapio` controla a exibição; `encomenda.tipo` diferencia produtos principais, acompanhamentos e itens indisponíveis para encomenda. Um produto aparecer no cardápio não o torna automaticamente selecionável para encomenda.

- Os seis bolos caseiros são produtos principais encomendáveis.
- Café coado e café com leite não aceitam encomenda.
- Pão de queijo é apresentado por unidade (R$ 3,00); a dúzia (R$ 25,00) está configurada como acompanhamento opcional de bolos caseiros, sem pedido independente.
- Panetone e bolo de Natal são sazonais de dezembro (`meses: [12]`) e têm encomenda indisponível até confirmação. Permanecem visíveis para revisão, sem liberação automática por data.

Essa revisão foi solicitada após releitura da entrevista e substitui a simplificação anterior do brief, na qual a dúzia era um produto independente em uma encomenda de produto único. O brief original foi preservado; a futura implementação do formulário e da API deverá considerar o acompanhamento opcional. As descrições, tamanhos e preços continuam ilustrativos. Ainda não há seleção ou registro de encomenda no cardápio.

A apresentação usa listas de cartões, papel claro, bordas discretas e tipografia serifada inspirados no mockup. No celular, os produtos ficam empilhados para permitir leitura sem controles de carrossel. As imagens são desenhos SVG provisórios, não fotografias dos produtos.

### Formulário de encomendas integrado

Os links do Hero, da navegação e o novo CTA do cardápio levam a `#encomendas`. O botão **Quero encomendar** abre a gaveta dentro da página. Ela permanece montada, e os campos controlados pelo React preservam os valores ao fechar e reabrir. Campos fechados ficam fora da navegação e da árvore de acessibilidade com `inert` e `aria-hidden`. Ao abrir, o foco e a rolagem levam ao título do formulário; ao fechar, o foco retorna ao botão. A preferência por movimento reduzido desativa a animação.

O formulário exige nome e sobrenome, telefone brasileiro com DDD (fixo ou celular, +55 opcional), um dos seis bolos principais e uma data a partir de amanhã no fuso configurado em `cafeConfig.ts`. O telefone válido ganha formatação ao sair do campo. A data mínima é atualizada ao abrir, ao focar a data, periodicamente enquanto a gaveta está aberta e novamente ao confirmar, para evitar aceitar hoje depois da virada do dia. Não depende do fuso do dispositivo nem interpreta o dia digitado como instante UTC.

Depois de selecionar um bolo, aparece a opção de adicionar uma dúzia de pão de queijo, com preço vindo da configuração. Não há quantidade, carrinho ou pedido independente desse acompanhamento. Cafés e itens natalinos não aparecem no seletor.

**Confirmar encomenda** valida os campos localmente e envia os cinco campos do formulário ao `POST /api/encomendas`, sem `id`, `status` ou credenciais administrativas. Campos e envio ficam bloqueados enquanto aparece **Enviando encomenda…**. Uma trava imediata com `useRef` impede dois envios antes de a atualização visual do React terminar; a gaveta pode ser fechada/reaberta durante a espera.

Somente uma resposta `201`, com ID positivo e status `recebida`, permite mostrar **Encomenda nº … confirmada**, reserva da data e pagamento na retirada. Depois disso, o mesmo formulário não reenvia o pedido. **Fazer outra encomenda** limpa os campos e libera explicitamente uma nova solicitação. Fechar e reabrir preserva os dados e o resultado.

Um `409` exibe que a data tem cinco pedidos, destaca o campo de data e permite corrigi-lo sem apagar o resto. Um `400` mostra a validação do servidor. Falhas de rede, timeout de 20 segundos, respostas inesperadas e erros do servidor não viram confirmação. Como a conexão pode falhar depois da gravação, a interface avisa que o pedido pode ter sido recebido e pede conferir com o café antes de reenviar. Não há retry automático nem idempotência entre recarregamentos/dispositivos nesta etapa.

O rascunho fica apenas na memória da página; recarregar apaga o preenchimento. Pedidos confirmados persistem no SQLite e não são cancelados ao recarregar. Dados do cliente são enviados somente ao endpoint público de criação; não há consulta administrativa pelo site nem integração com WhatsApp.

## Verificação manual

Teste em 360, 390, 768 e 1280 px: ausência de rolagem horizontal, leitura e botões confortáveis. Use Tab/Enter para navegar, abrir os contatos e seguir os dois CTAs. Confira os destinos `#cardapio` e `#encomendas` e a preferência por movimento reduzido.

Verificações executadas nesta etapa: instalação concluída (auditoria sem vulnerabilidades reportadas), lint aprovado, TypeScript em modo estrito e build aprovados, servidor Vite iniciado e respostas HTTP 200 para HTML e SVG. A revisão visual nas quatro larguras e a navegação por teclado ainda precisam ser feitas manualmente: o controle de navegador estava indisponível nesta sessão.

Na revisão do cardápio, build e lint passaram novamente. Também foram conferidos os 11 IDs únicos, a distribuição de 6/3/2 itens por categoria, os seis bolos encomendáveis, a indisponibilidade dos cafés e natalinos para encomenda e o vínculo da dúzia opcional com bolos caseiros. O controle de navegador permaneceu indisponível; a conferência visual continua pendente.

Na etapa do formulário, lint, build e os sete testes automatizados das validações passaram. Os testes cobrem campos obrigatórios, telefones, elegibilidade dos produtos, datas inválidas e viradas de dia/ano e ano bissexto. A revisão visual e de interação continua pendente porque o controle de navegador estava indisponível.

Na integração, passaram os **19 testes do front-end** (incluindo seis cenários de interação com DOM simulado, proxy Vite, API e SQLite reais), os **13 testes do back-end**, lint e build do front-end e verificação de tipos/build do back-end. Foram conferidos sucesso somente após `201`, bloqueio de envio simultâneo, preservação da gaveta, `400`, `409`, falha de rede e bloqueio das rotas administrativas pelo proxy. A inspeção visual em navegador real permanece pendente porque o controle de navegador estava indisponível; DOM simulado não verifica o layout renderizado.

O proxy segue a opção oficial [`server.proxy` do Vite](https://vite.dev/config/server-options#server-proxy), mantendo o caminho `/api/encomendas` sem reescrita e sem adicionar credenciais administrativas.

### Testar a gaveta e as validações

1. Execute `npm.cmd run dev` dentro de `frontend/`. Siga os CTAs do Hero e do cardápio e confira se ambos chegam a **Faça sua encomenda**.
2. Clique em **Quero encomendar**. Preencha parcialmente os campos, selecione um bolo e marque o adicional. Use **Fechar e manter os dados**, reabra e confira os mesmos valores. Repita com o botão de fechamento acima da gaveta.
3. Clique em **Confirmar encomenda** com campos vazios. Confira o resumo focado, os links e as mensagens abaixo de cada campo; nenhuma requisição deve ser enviada.
4. Teste um nome sem sobrenome, telefone curto/sem DDD e datas de hoje ou anteriores. O calendário deve bloquear os dias anteriores a amanhã; a validação também rejeita uma data anterior digitada manualmente quando o navegador permitir.
5. Com os dois servidores ativos, use dados fictícios completos, por exemplo `Cliente de Teste`, `(73) 99999-9999`, um bolo e amanhã. Confira o estado de envio e a confirmação com número do pedido e pagamento na retirada. Esta ação grava um pedido de teste.
6. Navegue por Tab/Shift+Tab e Enter/Espaço. A gaveta fechada não deve receber foco; ao fechar, o foco deve retornar ao botão de abertura. Confira em 360, 390, 768 e 1280 px e com a preferência de movimento reduzido ativada no dispositivo.
7. Para conferir `409`, use uma data já preenchida por cinco pedidos de teste e tente o sexto: os campos devem permanecer preenchidos, sem confirmação, permitindo escolher outro dia. Os testes automatizados cobrem isso sem modificar a base local.
8. Pare a API antes de enviar um novo pedido para verificar o erro de conexão, sem confirmação automática. Reinicie a API para continuar. Não reenvie às cegas se a conexão caiu durante um pedido que já estava em andamento.

## Próxima etapa

Conferir a apresentação em navegador real e concluir informações/rodapé. Painel com autenticação adequada e implantação continuam para etapas futuras. A identidade visual e a gaveta foram preservadas na integração.
