# Café, café com leite e detalhes de casa de vó

Etapa na branch `feature/refinamento-visual`, sobre o commit `988ff35`. A referência original do Café do Bairro orientou a identidade; a captura atual e o próprio código foram a base para preservar componentes, conteúdo, fotografia, madeira e grades existentes.

## O que mudou

- **Paleta pública:** novos tokens de caramelo (`#A87956`), café com leite (`#D2B08B`) e creme quente (`#F3E4CE`). Chocolate e café continuam os mesmos. Os tokens compartilhados com o painel não tiveram seus valores substituídos; as superfícies mais quentes são aplicadas no escopo das seções públicas.
- **Cabeçalho e hero:** cabeçalho café com leite, filete marrom, título chocolate, overlay creme mais quente e botões café com maior contraste. A fotografia e seu enquadramento continuam os mesmos. Um ramo pequeno ocupa a margem livre sobre o xadrez, abaixo do conteúdo.
- **Cardápio:** madeira preservada; fundo intermediário café com leite, cabeçalhos de categorias mais quentes, molduras café e cartões claros. A folhagem existente foi reposicionada no celular; um ramo florido discreto ocupa o canto livre do título. Produtos, preços e ilustrações continuam iguais.
- **Encomendas:** toalha mais quente, folha com moldura marrom e linha de caderno no recuo lateral. Batedor existente redimensionado no celular e coração no canto inferior. Campos e áreas de leitura permanecem claros. A decoração fica nas margens externas ao formulário.
- **Informações:** ícones com contorno café, fundo café com leite e vaso de cerâmica com margaridas mais definido. No celular e tablet há uma faixa livre abaixo dos recados para o vaso; no desktop ele continua na extremidade direita. Esse espaço decorativo não altera os blocos de informação.
- **Rodapé:** fundo chocolate preservado; ramo claro sob a assinatura, em fluxo normal, sem sobreposição aos links.

As grades e a ordem dos componentes são as mesmas. A única ampliação de espaço é o recuo decorativo nas informações em telas menores e a altura do ramo sob a assinatura do rodapé. Nenhum componente React, dado comercial, serviço, endpoint, banco, autenticação, filtro administrativo ou lógica de encomenda/rolagem foi alterado.

## Assets e desempenho

Reutilizados: `raminho.svg`, `batedor.svg`, `coracao.svg`, texturas de papel e xadrez. `vaso.svg` foi aprimorado mantendo o mesmo `viewBox`, com pétalas claras, centro caramelo, folhas e coração na cerâmica.

Somente um novo SVG foi adicionado: `frontend/public/images/decor/ramo-florido.svg` (**695 bytes**). O vaso atualizado tem **1.363 bytes**. Os ornamentos usam linhas entre 1,5 e 1,7 unidades e a mesma família de cores. Não há novos bitmaps, fontes, bibliotecas ou chamadas externas.

Os novos ornamentos são fundos CSS ou máscaras, sem foco ou conteúdo verbal para leitores de tela, com `pointer-events: none`. O ramo do rodapé segue o fluxo do texto; os demais usam os recuos livres das seções. A inspeção visual verificou as margens e o formulário nas quatro larguras.

## Comparação por seção

Cada célula contém **antes / depois**. As capturas são JPEG em qualidade 88 para manter as evidências leves.

| Seção | 360 px | 390 px | 768 px | 1280 px |
| --- | --- | --- | --- | --- |
| Hero | [Antes](antes/1-hero-360.jpg) / [Depois](depois/1-hero-360.jpg) | [Antes](antes/1-hero-390.jpg) / [Depois](depois/1-hero-390.jpg) | [Antes](antes/1-hero-768.jpg) / [Depois](depois/1-hero-768.jpg) | [Antes](antes/1-hero-1280.jpg) / [Depois](depois/1-hero-1280.jpg) |
| Cardápio | [Antes](antes/2-cardapio-360.jpg) / [Depois](depois/2-cardapio-360.jpg) | [Antes](antes/2-cardapio-390.jpg) / [Depois](depois/2-cardapio-390.jpg) | [Antes](antes/2-cardapio-768.jpg) / [Depois](depois/2-cardapio-768.jpg) | [Antes](antes/2-cardapio-1280.jpg) / [Depois](depois/2-cardapio-1280.jpg) |
| Encomendas | [Antes](antes/3-encomendas-360.jpg) / [Depois](depois/3-encomendas-360.jpg) | [Antes](antes/3-encomendas-390.jpg) / [Depois](depois/3-encomendas-390.jpg) | [Antes](antes/3-encomendas-768.jpg) / [Depois](depois/3-encomendas-768.jpg) | [Antes](antes/3-encomendas-1280.jpg) / [Depois](depois/3-encomendas-1280.jpg) |
| Informações | [Antes](antes/4-contato-360.jpg) / [Depois](depois/4-contato-360.jpg) | [Antes](antes/4-contato-390.jpg) / [Depois](depois/4-contato-390.jpg) | [Antes](antes/4-contato-768.jpg) / [Depois](depois/4-contato-768.jpg) | [Antes](antes/4-contato-1280.jpg) / [Depois](depois/4-contato-1280.jpg) |
| Rodapé | [Antes](antes/5-site-footer-360.jpg) / [Depois](depois/5-site-footer-360.jpg) | [Antes](antes/5-site-footer-390.jpg) / [Depois](depois/5-site-footer-390.jpg) | [Antes](antes/5-site-footer-768.jpg) / [Depois](depois/5-site-footer-768.jpg) | [Antes](antes/5-site-footer-1280.jpg) / [Depois](depois/5-site-footer-1280.jpg) |
| Formulário aberto | [Antes](antes/6-formulario-360.jpg) / [Depois](depois/6-formulario-360.jpg) | [Antes](antes/6-formulario-390.jpg) / [Depois](depois/6-formulario-390.jpg) | [Antes](antes/6-formulario-768.jpg) / [Depois](depois/6-formulario-768.jpg) | [Antes](antes/6-formulario-1280.jpg) / [Depois](depois/6-formulario-1280.jpg) |

## Validação

- **64 testes frontend e 38 backend aprovados**, incluindo múltiplos sabores, edição, filtros e autenticação.
- Lint do frontend, TypeScript via build do frontend, typecheck do backend e builds dos dois projetos aprovados. O backend não oferece script de lint.
- Antes/depois em **360, 390, 768 e 1280 px**, sem rolagem horizontal e sem preços cortados. Os títulos, textos dos cartões, imagem do hero e quantidade de colunas são comparados automaticamente com o estado anterior.
- **Zero violações axe WCAG A/AA** na landing e no formulário aberto nas quatro larguras. Nenhum erro JavaScript nos cenários visuais. Resultados em [antes/resultado.json](antes/resultado.json) e [depois/resultado.json](depois/resultado.json).
- Rolagem suave aprovada em execução isolada, com foco, histórico, movimento reduzido e interrupção pela roda. A execução em paralelo às suítes falhou no limite mínimo de quadros capturados; nenhum código mudou entre as tentativas. Medições em [rolagem.json](rolagem.json).

## Arquivos alterados

- `frontend/src/styles/global.css`: tokens, cabeçalho, hero, botões públicos e xadrez.
- `frontend/src/styles/cardapio.css`: tons e molduras, com madeira preservada.
- `frontend/src/styles/encomendas.css`: folha, margens e controles claros.
- `frontend/src/styles/contato.css`: ícones, vaso responsivo e ornamento do rodapé.
- `frontend/public/images/decor/vaso.svg` e `ramo-florido.svg`.
- `scripts/testar-tons-terrosos.mjs`: comparação e capturas desta etapa.
- `scripts/testar-rolagem.mjs`: opção `--terrosos` para salvar o relatório desta etapa sem substituir os anteriores.
- `README.md` e evidências nesta pasta.

Para repetir a validação visual após implementar:

```powershell
node scripts/testar-tons-terrosos.mjs
node scripts/testar-rolagem.mjs --terrosos
```

As ferramentas Playwright e axe já instaladas em `.audit-tools` são usadas apenas na auditoria. `--antes` captura o estado atual como base e só deve ser usado antes de uma implementação, pois substitui as evidências anteriores.

Não foi realizado merge na Main.
