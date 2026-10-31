# Café do Bairro

Projeto para o desafio técnico da TecnoJr. Os requisitos estão em [BRIEF.md](BRIEF.md).

## Etapa atual

Base React + TypeScript + Vite, com CSS tradicional, cabeçalho e hero responsivos. As áreas de cardápio, encomendas e contato são apenas destinos de navegação: não há formulário, API, banco ou painel nesta etapa.

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
- `src/data/cafeConfig.ts`: fonte única dos dados comerciais ilustrativos.
- `src/styles/`: tokens visuais e CSS mobile-first, sem bibliotecas de UI.
- `public/images/`: ilustração provisória, sem dependência de imagem externa.

A navegação fica visível no celular, sem menu expansível nesta etapa. HTML semântico, foco visível, link para pular ao conteúdo e respeito a movimento reduzido dão uma base acessível. Os contatos usam detalhes expansíveis nativos enquanto os dados não forem confirmados; não simulam envio ou reserva.

## Verificação manual

Teste em 360, 390, 768 e 1280 px: ausência de rolagem horizontal, leitura e botões confortáveis. Use Tab/Enter para navegar, abrir os contatos e seguir os dois CTAs. Confira os destinos `#cardapio` e `#encomendas` e a preferência por movimento reduzido.

Verificações executadas nesta etapa: instalação concluída (auditoria sem vulnerabilidades reportadas), lint aprovado, TypeScript em modo estrito e build aprovados, servidor Vite iniciado e respostas HTTP 200 para HTML e SVG. A revisão visual nas quatro larguras e a navegação por teclado ainda precisam ser feitas manualmente: o controle de navegador estava indisponível nesta sessão.

## Próxima etapa

Construir o cardápio a partir da configuração, depois a área de encomendas expansível e as informações/rodapé. Formulário, regras de reserva, integração, CRUD e autenticação serão implementados e testados em etapas próprias. Não existem comandos ou rotas de back-end ainda.
