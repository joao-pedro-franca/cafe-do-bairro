# Verificação do painel administrativo

> Histórico da primeira versão. Consulte a [auditoria final integrada](../auditoria-final/README.md) para os resultados atuais. O script de repetição foi ampliado e agora também exercita o formulário público e usa um arquivo SQLite temporário.

Etapa de 01/11/2026. O brief original foi preservado. A implementação substitui o aviso de `/admin` por login e painel, mantendo a regra atual de cinco **bolos** por dia e a API pública.

- **37 testes front-end**: inclui cinco testes novos do painel, com React, proxy Vite, API e SQLite reais, além dos testes públicos existentes.
- **30 testes back-end**: inclui nove testes novos de hash, login, sessão, expiração, logout, CSRF, cookies, acesso negado, operações e limitação de tentativas; CRUD, migração e concorrência existentes permanecem cobertos.
- Lint do frontend sem avisos, verificação TypeScript dos dois lados (frontend pelo build), typecheck dos testes do backend e builds aprovados. O backend não possui comando de lint separado.
- Edge/Chromium via Playwright: login e pedidos em **360, 390, 768 e 1280 px**, sem rolagem horizontal; confirmação de exclusão também conferida em 390 px.
- Cookie HttpOnly real, sessão restaurada após recarregar, filtros, alteração persistida no SQLite, cancelamento/confirmação de exclusão e logout com listagem negada foram exercitados no navegador.
- Axe-core não detectou violações nos nove estados examinados. Nenhuma exceção JavaScript foi capturada. Isso não substitui testes manuais com leitor de tela ou outros navegadores.

As capturas usam exclusivamente dados fictícios e banco em memória. O teste não usa as credenciais configuradas no terminal nem altera o SQLite local. A senha de teste do navegador é gerada em memória, não aparece nas capturas e não é registrada na saída.

Exemplos: [login no celular](login-390.png), [pedidos em 360 px](pedidos-360.png), [pedidos no desktop](pedidos-1280.png), [confirmação de exclusão](confirmacao-exclusao-390.png). Os resultados estruturados estão em [resultado.json](resultado.json).

Para repetir o teste visual, a partir da raiz, depois de instalar as dependências de frontend e backend:

```powershell
npm.cmd install --prefix .audit-tools --no-save --package-lock=false playwright @axe-core/playwright
node --experimental-strip-types scripts/testar-painel.mjs
```

As ferramentas de auditoria ficam na pasta ignorada `.audit-tools`, sem dependências novas na aplicação. No Windows, o script usa o Edge instalado; em outros sistemas, é necessário disponibilizar o Chromium para Playwright. Os servidores e o navegador são encerrados ao terminar.

Para configurar e testar manualmente, siga o [README principal](../../README.md#habilitar-o-painel-administrativo). O ambiente produtivo ainda precisa de HTTPS, origem explícita, proxy na mesma origem e proteção dos arquivos/segredos. Sessões e limitação de tentativas atendem uma instância e são reiniciadas com a API. Safari/iOS, Firefox e leitor de tela continuam como verificações complementares.
