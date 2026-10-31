# Café do Bairro

Projeto para o desafio técnico da TecnoJr. Os requisitos estão em [BRIEF.md](BRIEF.md).

## Etapa atual

Base React + TypeScript + Vite, com CSS tradicional, cabeçalho, hero, cardápio e seção de encomendas com formulário expansível e validações locais. Contato continua como área-placeholder. A API REST em `backend/` já implementa CRUD e regras de reserva com SQLite, mas **o formulário ainda não está integrado**: ele não envia nem reserva pedidos. Não há painel.

Veja [como iniciar e testar a API](backend/README.md), incluindo contrato, exemplos PowerShell, persistência e proteção administrativa. O back-end usa TypeScript por solicitação desta etapa, atualizando a recomendação inicial de JavaScript do brief; o brief original foi preservado.

**Todos os dados comerciais são fictícios**, incluindo endereço, horários, produtos, preços e tamanhos. Edite `frontend/src/data/cafeConfig.ts` para substituí-los. WhatsApp e Instagram aparecem em modo de demonstração, sem links para terceiros. A ilustração SVG do hero é um placeholder local; substituir por fotografia autorizada e otimizada numa etapa futura.

## Executar

Requer Node.js 22.12+ (ou 24 LTS) e npm. Na pasta raiz, no PowerShell:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Abra o endereço informado pelo Vite, normalmente `http://localhost:5173`. Use Ctrl+C para parar. `npm.cmd` evita o bloqueio de `npm.ps1` pela política de scripts do Windows; em outros terminais pode usar `npm`.

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd test
npm.cmd run preview
```

O build verifica TypeScript e gera `frontend/dist/`. O preview serve esse build localmente.

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
- `src/utils/encomenda.ts`: calendário no fuso do café, formato de telefone e validações iniciais, sem chamadas de rede.
- `src/styles/encomendas.css`: gaveta animada e formulário em uma coluna no celular e duas em telas maiores.
- `tests/encomenda.test.mjs`: testes das validações com o executor nativo do Node, sem dependências extras.
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

### Formulário de encomendas (demonstração)

Os links do Hero, da navegação e o novo CTA do cardápio levam a `#encomendas`. O botão **Quero encomendar** abre a gaveta dentro da página. Ela permanece montada, e os campos controlados pelo React preservam os valores ao fechar e reabrir. Campos fechados ficam fora da navegação e da árvore de acessibilidade com `inert` e `aria-hidden`. Ao abrir, o foco e a rolagem levam ao título do formulário; ao fechar, o foco retorna ao botão. A preferência por movimento reduzido desativa a animação.

O formulário exige nome e sobrenome, telefone brasileiro com DDD (fixo ou celular, +55 opcional), um dos seis bolos principais e uma data a partir de amanhã no fuso configurado em `cafeConfig.ts`. O telefone válido ganha formatação ao sair do campo. A data mínima é atualizada ao abrir, ao focar a data, periodicamente enquanto a gaveta está aberta e novamente ao verificar, para evitar aceitar hoje depois da virada do dia. Não depende do fuso do dispositivo nem interpreta o dia digitado como instante UTC.

Depois de selecionar um bolo, aparece a opção de adicionar uma dúzia de pão de queijo, com preço vindo da configuração. Não há quantidade, carrinho ou pedido independente desse acompanhamento. Cafés e itens natalinos não aparecem no seletor.

**Verificar preenchimento** executa somente validações locais, exibe erros junto aos campos e leva o foco a um resumo com links para corrigi-los. Com dados válidos, a mensagem deixa explícito que nada foi enviado ou reservado. O limite de cinco encomendas é informado, mas disponibilidade e capacidade só poderão ser verificadas com o servidor. As mesmas regras precisarão ser validadas novamente na futura API.

Os dados ficam apenas na memória da página; recarregar apaga o rascunho. Não há armazenamento local, envio de informações pessoais ou integração externa.

## Verificação manual

Teste em 360, 390, 768 e 1280 px: ausência de rolagem horizontal, leitura e botões confortáveis. Use Tab/Enter para navegar, abrir os contatos e seguir os dois CTAs. Confira os destinos `#cardapio` e `#encomendas` e a preferência por movimento reduzido.

Verificações executadas nesta etapa: instalação concluída (auditoria sem vulnerabilidades reportadas), lint aprovado, TypeScript em modo estrito e build aprovados, servidor Vite iniciado e respostas HTTP 200 para HTML e SVG. A revisão visual nas quatro larguras e a navegação por teclado ainda precisam ser feitas manualmente: o controle de navegador estava indisponível nesta sessão.

Na revisão do cardápio, build e lint passaram novamente. Também foram conferidos os 11 IDs únicos, a distribuição de 6/3/2 itens por categoria, os seis bolos encomendáveis, a indisponibilidade dos cafés e natalinos para encomenda e o vínculo da dúzia opcional com bolos caseiros. O controle de navegador permaneceu indisponível; a conferência visual continua pendente.

Na etapa do formulário, lint, build e os sete testes automatizados das validações passaram. Os testes cobrem campos obrigatórios, telefones, elegibilidade dos produtos, datas inválidas e viradas de dia/ano e ano bissexto. A revisão visual e de interação continua pendente porque o controle de navegador estava indisponível.

### Testar a gaveta e as validações

1. Execute `npm.cmd run dev` dentro de `frontend/`. Siga os CTAs do Hero e do cardápio e confira se ambos chegam a **Faça sua encomenda**.
2. Clique em **Quero encomendar**. Preencha parcialmente os campos, selecione um bolo e marque o adicional. Use **Fechar e manter os dados**, reabra e confira os mesmos valores. Repita com o botão de fechamento acima da gaveta.
3. Clique em **Verificar preenchimento** com campos vazios. Confira o resumo focado, os links e as mensagens abaixo de cada campo.
4. Teste um nome sem sobrenome, telefone curto/sem DDD e datas de hoje ou anteriores. O calendário deve bloquear os dias anteriores a amanhã; a validação também rejeita uma data anterior digitada manualmente quando o navegador permitir.
5. Use dados fictícios completos, por exemplo `Cliente de Teste`, `(73) 99999-9999`, um bolo e amanhã. Confira a mensagem **Nada foi enviado ou reservado**, sem confirmação de pedido. Não é necessário chamar o WhatsApp.
6. Navegue por Tab/Shift+Tab e Enter/Espaço. A gaveta fechada não deve receber foco; ao fechar, o foco deve retornar ao botão de abertura. Confira em 360, 390, 768 e 1280 px e com a preferência de movimento reduzido ativada no dispositivo.

## Próxima etapa

Revisar as interações e o layout no navegador; depois, integrar o formulário à API em uma etapa própria, mantendo confirmação somente após resposta bem-sucedida do servidor. Informações/rodapé e painel com autenticação adequada continuam pendentes. O design e a validação local do front-end não foram alterados na etapa da API.
