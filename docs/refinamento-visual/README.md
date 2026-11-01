# Polimento visual — Café do Bairro

Trabalho na branch `feature/refinamento-visual`, a partir do estado mais recente encontrado no início da tarefa. Referência: [mockup aprovado](../referencia-visual.png). A estrutura de navegação, os conteúdos comerciais e os fluxos existentes foram mantidos.

## Como a referência virou interface

| Referência | Aplicação no projeto |
| --- | --- |
| Mesa com bolo, café, flores e luz quente | Nova imagem do hero, com bolo de chocolate, xícara com coração, margaridas, renda e xadrez. No desktop, ocupa o fundo da seção com gradiente creme atrás do texto; no celular, um recorte compacto aparece acima do título. |
| Papel creme e caderno de receitas | Textura SVG sutil e repetível em seções e cartões, bordas em tons de papel envelhecido, sombras suaves e divisórias tracejadas. Sem texturas fortes dentro dos campos. |
| Cartões artesanais do cardápio | Cantos discretamente assimétricos, imagens emolduradas, textura, preços em tom café e pequenos corações decorativos. As ilustrações de produtos existentes foram preservadas. |
| Bilhetes e escrita afetiva | Bilhete com fita no cardápio e uma frase manuscrita na encomenda. Tipografia de sistema, sem fontes externas ou requisições adicionais. |
| Toalha xadrez e utensílios | Mesmo padrão xadrez reutilizado nos separadores e no fundo da encomenda; batedor desenhado no canto da folha. |
| Folhas, flores e rodapé chocolate | Raminho no cardápio, vaso floral discreto no desktop, ícones com contornos orgânicos e rodapé com textura, tom chocolate e acabamento inspirado em renda. |

Os ornamentos são fundos CSS, não recebem foco nem interceptam cliques. Os corações dos títulos continuam ocultos das tecnologias assistivas. O hero tem descrição alternativa e legenda identificando a imagem ilustrativa criada com IA. Os controles e seus estados de foco, erro, carregamento e desabilitado foram preservados.

O mobile mantém os dois botões do hero visíveis nas capturas de 360 × 844 e 390 × 844. Horário e endereço ficam em duas colunas nessas larguras, com texto livre para quebrar. Não foram introduzidos carrosséis, menus novos ou mudanças na ordem das seções.

## Assets e organização

A imagem foi criada com a ferramenta integrada **ImageGen**, em modo de geração. O [prompt final completo](prompt-hero.txt) registra composição, objetos, luz, paleta e restrições. Arquivos finais consumidos pelo projeto:

- `frontend/public/images/mesa-caseira.webp`: 1536 × 1024, aproximadamente 145 kB.
- `frontend/public/images/mesa-caseira-768.webp`: 768 × 512, aproximadamente 51 kB.
- `frontend/public/images/decor/papel.svg`: granulação leve e repetível.
- `frontend/public/images/decor/raminho.svg`: folhagem e pequeno coração.
- `frontend/public/images/decor/batedor.svg`: utensílio de cozinha.
- `frontend/public/images/decor/vaso.svg`: vaso com flores.
- `frontend/public/images/decor/coracao.svg`: desenho decorativo dos cartões.

`global.css` centraliza os novos tokens de textura, papel dos cartões, borda, sombra, cantos, escrita e xadrez. As cores compartilhadas anteriormente com o painel administrativo continuam com os mesmos valores. Não foram adicionadas dependências.

## Arquivos alterados

- `frontend/src/data/cafeConfig.ts`: caminhos responsivos, descrição e legenda da imagem.
- `frontend/src/sections/Hero.tsx`: imagem com `srcSet`, `sizes`, dimensões e prioridade de carregamento.
- `frontend/src/sections/Cardapio.tsx`: bilhete decorativo.
- `frontend/src/sections/Encomendas.tsx`: recadinho afetivo, sem mudança de estado ou envio.
- `frontend/src/styles/global.css`: tokens, cabeçalho, hero, xadrez e bilhete.
- `frontend/src/styles/cardapio.css`: papel, molduras, corações e folhagem.
- `frontend/src/styles/encomendas.css`: toalha, folha, formulário e batedor.
- `frontend/src/styles/contato.css`: textura, ícones, vaso e rodapé.
- `scripts/auditar-preentrega.mjs`: opção `--visual` com pasta própria, capturas das cinco áreas nas quatro larguras e verificações axe da landing e do formulário.
- `scripts/testar-rolagem.mjs`: opção `--visual` para salvar medições nesta etapa sem substituir os relatórios históricos.
- `README.md`, este relatório, `prompt-hero.txt`, capturas e relatórios JSON desta pasta.
- Os sete novos assets listados acima.

## Validação

- **64 testes frontend e 38 backend aprovados**.
- Lint do frontend aprovado. O backend não oferece script de lint.
- TypeScript do frontend via `tsc -b`, typecheck do backend e builds dos dois projetos aprovados.
- Auditoria integrada com API real e SQLite temporário: reserva confirmada somente após `201`, dia lotado, conflito `409`, preservação do formulário, contatos em demonstração, acesso administrativo negado sem sessão e persistência aprovados.
- Capturas e geometria em **360, 390, 768 e 1280 px**, tanto na landing quanto no formulário aberto, sem rolagem horizontal.
- Axe WCAG A/AA sem violações nos estados auditados. A verificação automatizada complementa a inspeção visual das capturas.
- Regressão da rolagem suave aprovada, incluindo âncoras, foco, histórico, interrupção pela roda e movimento reduzido.

Evidências: [resultado.json](resultado.json), [rolagem.json](rolagem.json), [hero desktop](02-hero-1280.png), [hero mobile](02-hero-390.png), [cardápio](02b-cardapio-1280.png), [encomenda](02c-encomendas-1280.png), [formulário](05-formulario-390.png), [informações](09-contato-1280.png) e [rodapé](10-rodape-390.png). Cada área possui capturas nas quatro larguras. Para comparação, a etapa anterior está em [multissabores/publico](../multissabores/publico/).

Para reproduzir com as dependências do projeto e as ferramentas existentes em `.audit-tools`:

```powershell
cd frontend
npm.cmd test
npm.cmd run lint
npm.cmd run build
cd ../backend
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
cd ..
node --experimental-strip-types scripts/auditar-preentrega.mjs --visual
node scripts/testar-rolagem.mjs --visual
```

O código de negócio, os serviços, o banco, a autenticação, a edição administrativa, o filtro de prazo e a lógica de múltiplos sabores não foram alterados. Não foi realizado merge na Main.
