# Nosso cardápio — mesa de madeira e cartões de receitas

Refinamento exclusivo do cardápio na branch `feature/refinamento-visual`, inspirado nas três referências fornecidas nesta etapa.

## Tradução das referências

- A mesa da primeira referência virou uma superfície fotográfica de madeira clara sob os produtos de cada categoria. O veio é natural, com iluminação uniforme e sem repetição em mosaico. Uma camada creme discreta reduz a competição com os cartões.
- O título e os cabeçalhos das categorias permanecem sobre papel creme. A superfície do título ganhou contorno e sombra suaves, separando-a da mesa.
- O acabamento artesanal das referências aparece nos cartões com contorno tracejado, sombras mais definidas contra a madeira, fitas em xadrez creme/terracota e etiquetas claras para os preços.
- A renda foi desenhada em SVG leve e aplicada nas bordas das mesas. O xadrez também aparece nos pequenos cantos e na transição final do cardápio. Folhagem, corações e bilhete existentes foram reaproveitados.

Os 11 produtos, preços, três categorias, descrições, tamanhos, imagens/ilustrações e mensagens de disponibilidade continuam os mesmos. A grade mantém uma coluna no celular, duas a partir de 600 px e três a partir de 1000 px. Não foram adicionados controles ou funcionalidades das imagens conceituais.

## Arquivos

- `frontend/src/styles/cardapio.css`: única alteração no código de apresentação existente. Os tokens de madeira, sombra e xadrez desta etapa ficam no escopo de `.menu-section`.
- `frontend/public/images/madeira-cardapio.webp`: textura 1536 × 1024, 163.598 bytes.
- `frontend/public/images/madeira-cardapio-768.webp`: textura 768 × 512, 34.372 bytes, usada abaixo de 768 px.
- `frontend/public/images/decor/renda-cardapio.svg`: acabamento decorativo vetorial.
- `scripts/testar-cardapio-visual.mjs`: auditoria do conteúdo, preços, geometria e acessibilidade nas quatro larguras.
- Esta pasta: prompt, capturas de antes/depois e resultados da auditoria.

A madeira foi criada com a ferramenta integrada **ImageGen**, em modo de geração. O [prompt final completo](prompt-madeira.txt) registra as instruções usadas. As versões WebP foram otimizadas localmente. Cada versão é reutilizada pelo cache do navegador nas categorias, sem fontes ou serviços externos. A textura fotográfica usa `background-repeat: no-repeat`; somente os padrões decorativos de tecido e renda se repetem intencionalmente.

## Capturas

| Largura | Antes | Resultado | Cartões completos | Transição para encomenda |
| --- | --- | --- | --- | --- |
| 360 px | [Antes](antes/cardapio-360.png) | [Depois](depois/cardapio-360.png) | [Bolos](depois/bolos-360.png) | [Transição](depois/transicao-360.png) |
| 390 px | [Antes](antes/cardapio-390.png) | [Depois](depois/cardapio-390.png) | [Bolos](depois/bolos-390.png) | [Transição](depois/transicao-390.png) |
| 768 px | [Antes](antes/cardapio-768.png) | [Depois](depois/cardapio-768.png) | [Bolos](depois/bolos-768.png) | [Transição](depois/transicao-768.png) |
| 1280 px | [Antes](antes/cardapio-1280.png) | [Depois](depois/cardapio-1280.png) | [Bolos](depois/bolos-1280.png) | [Transição](depois/transicao-1280.png) |

As capturas foram inspecionadas em desktop e mobile, verificando contraste da madeira com o papel, legibilidade dos valores e integração com as divisões em xadrez da página.

## Validação

- **64 testes frontend e 38 testes backend aprovados.**
- Lint do frontend, TypeScript via build do frontend, typecheck do backend e builds dos dois projetos aprovados. Não há script de lint no backend.
- Auditoria de navegador aprovada em **360, 390, 768 e 1280 px**: sem rolagem horizontal, zero violações axe WCAG A/AA e nenhum erro JavaScript.
- Em cada largura, o teste compara nomes, categorias e preços renderizados com a configuração do projeto e verifica se todos os preços cabem dentro dos cartões.
- Resultados em [depois/resultado.json](depois/resultado.json). A execução anterior à mudança está em [antes/resultado.json](antes/resultado.json).

Para reproduzir a auditoria final, com as ferramentas Playwright e axe já existentes em `.audit-tools`:

```powershell
node --experimental-strip-types scripts/testar-cardapio-visual.mjs
```

`--antes` salva capturas do estado atual na pasta `antes/`; não deve ser usado para comparar novamente depois da implementação, pois substituiria a evidência anterior.

Hero, encomendas, painel administrativo, serviços, API, autenticação e banco de dados não foram modificados. Não foi realizado merge na Main.
