# Dados comerciais e contatos autorizados

Atualização pontual na branch `feature/apresentacao-comercial`, sem merge na Main.

## Configuração aplicada

- Nome: **Café do Bairro**.
- Endereço fictício: **Rua Mariano Gonçalves, 128 — Bairro das Acácias — Vila Aurora – BA**.
- Funcionamento fictício: **segunda a sábado, das 8h às 18h**.
- WhatsApp autorizado expressamente pelo proprietário: **5573988255560**, com mensagem inicial **Olá! Gostaria de fazer uma encomenda no Café do Bairro.**
- Instagram: **https://www.instagram.com/tecnojr/**, apresentado como **Instagram da TecnoJr**. O perfil não pertence ao café fictício e não indica parceria comercial.

Os valores ficam em `frontend/src/data/cafeConfig.ts`. O campo `confirmado` habilita a apresentação autorizada; não certifica endereço ou horário de uma empresa real. A indicação de pedidos demonstrativos permanece junto dos campos do formulário. O WhatsApp abre uma conversa com texto preenchido e não envia mensagens automaticamente. Conversas não criam pedidos no SQLite; o formulário continua sendo o fluxo de registro.

O componente compartilhado `ContactLinks` recebeu um rótulo opcional de Instagram. Hero, informações e rodapé usam a mesma configuração, validação, ícones e atributos de nova aba (`noopener noreferrer`). O fallback continua disponível para futuras configurações inválidas ou desabilitadas, mas não aparece nos contatos atuais.

## Validação

- **87 testes frontend aprovados**, incluindo os seis links das três seções, número exato, mensagem decodificada, URL e identificação da TecnoJr, endereço/horário consistentes, ícones e ausência de estados pendentes. O teste de contatos ausentes permanece com uma fixture explícita.
- Lint sem avisos, typecheck frontend e build aprovados.
- Navegador Edge/Chromium em **360, 390, 768 e 1280 px**: sem rolagem horizontal, preços sem corte, botões com pelo menos 44 px de altura e navegação por teclado.
- **11 análises axe sem violações detectadas** nesta atualização. Não houve exceções JavaScript.
- Os destinos reais autorizados foram exercitados com requisições interceptadas antes da rede: nova aba, número `5573988255560`, mensagem codificada e perfil da TecnoJr confirmados. Nenhuma conta externa foi acessada e nenhuma mensagem foi enviada.
- O roteiro usa API isolada e SQLite temporário. Backend, banco, administração, disponibilidade, preços, autenticação, fotografias e navegação não foram alterados.

Resultado verificável: [resultado.json](resultado.json).

```powershell
cd frontend
npm.cmd test
npm.cmd run lint
npm.cmd exec tsc -- -b
npm.cmd run build
cd ..
node --experimental-strip-types scripts/testar-apresentacao-comercial.mjs --contatos
```

## Capturas

Landing completa: [360 px](landing-360.jpg), [390 px](landing-390.jpg), [768 px](landing-768.jpg), [1280 px](landing-1280.jpg).

[Botões autorizados em teste](contatos-autorizados-teste-390.jpg) · [Aviso demonstrativo junto ao formulário](formulario-390.jpg).

## Arquivos modificados

- `frontend/src/data/cafeConfig.ts`: dados de apresentação fictícios, contatos autorizados e mensagem inicial.
- `frontend/src/components/ContactLinks.tsx`: identificação configurável do Instagram da TecnoJr.
- `frontend/tests/apresentacao.test.mjs`: expectativas atuais e preservação da validação de canais ausentes.
- `scripts/testar-apresentacao-comercial.mjs`: validação dos contatos habilitados e saída isolada `--contatos`, preservando os registros da etapa anterior.
- `README.md`, `docs/apresentacao-comercial/README.md` e esta pasta: documentação e evidências.
