# Apresentação comercial do Café do Bairro

Implementação na branch `feature/apresentacao-comercial`, criada a partir de `feature/produtos-sazonais`. Sem merge na Main. A estrutura da landing, madeira, papel creme, rendas, flores, cores terrosas e navegação suave foram preservadas.

**Atualização dos dados comerciais:** o endereço e o horário fictícios fornecidos para o desafio estão publicados no hero e no contato. O WhatsApp `5573988255560` foi autorizado pelo seu proprietário e o perfil `https://www.instagram.com/tecnojr/` está identificado como **Instagram da TecnoJr**, sem atribuí-lo ao café ou declarar parceria. A mensagem inicial é “Olá! Gostaria de fazer uma encomenda no Café do Bairro.”, codificada na URL. Nenhuma mensagem é enviada automaticamente; conversas não registram pedidos no SQLite. O aviso de pedidos demonstrativos permanece no formulário. Veja o [registro e as capturas desta atualização](contatos-autorizados/README.md).

## O que mudou

| Área | Acabamento |
| --- | --- |
| Hero | Removida a nota repetitiva de dados fictícios. Contatos com ícones de marca; endereço e horário fictícios autorizados para apresentação. Mantidos foto, overlay, CTAs e identificação de IA. |
| Cardápio | Onze fotografias reais licenciadas no lugar dos SVGs principais. Recortes 4:3 valorizam os alimentos; cartões, categorias, preços e disponibilidade foram preservados. Removida a nota acadêmica repetitiva do cabeçalho. |
| Formulário | Texto introdutório natural. Uma identificação clara e discreta de demonstração aparece junto dos campos, explicando que os pedidos não serão preparados por um estabelecimento. Registro, disponibilidade, preços e pagamento na retirada permanecem iguais. |
| Informações | Endereço e horário fictícios definidos para o desafio; WhatsApp autorizado e Instagram identificado como da TecnoJr, sem estados pendentes. |
| Rodapé | Assinatura comercial, contatos com ícones e acesso discreto aos créditos das fotografias e à administração. |
| Metadados | Título e descrição sem texto acadêmico, gerados a partir de `cafeConfig.ts` no desenvolvimento e no build. |

Os nomes de classes internas como `orders-demo` não são textos da interface. A identificação de demonstração foi mantida no fluxo que coleta nome/telefone, conforme solicitado, e não espalhada pelas áreas comerciais. As informações não confirmadas permanecem registradas no brief, README e histórico do projeto.

## Configurar dados autorizados

Edite somente `frontend/src/data/cafeConfig.ts` para identidade e dados comerciais:

| Informação | Campos |
| --- | --- |
| Nome | `nomeCafe` — alimenta a marca, o título padrão e a mensagem inicial padrão. |
| Apresentação e convite | `apresentacao`, `convite`, `tituloPagina`. A apresentação também preenche a descrição do HTML. |
| Horários | `horario.dias`, `horario.horas`, `horario.confirmado`. Ambos os textos precisam estar preenchidos e confirmados para publicação. |
| Endereço | `endereco.rua`, `endereco.localidade`, `endereco.confirmado`. Não há localização inventada ou mapa externo. |
| Ausência de dados de visita | `horario.pendente`, `endereco.pendente`. |
| WhatsApp | `contato.whatsapp.numero`, incluindo DDI `55`, DDD e número brasileiro autorizado; `contato.whatsapp.mensagem`; `contato.whatsapp.confirmado: true` somente após autorização. |
| Instagram | `contato.instagram.url`, URL HTTPS do perfil autorizado em `instagram.com` ou `www.instagram.com`; `contato.instagram.confirmado: true` somente após confirmação. |
| Hero | `hero.imagem`, `hero.imagemPequena`, `hero.descricaoImagem`, `hero.legenda`. A legenda atual identifica corretamente a imagem criada com IA. |
| Ambiente de demonstração | `demonstracao` e `avisoEncomendas`. Manter ativo enquanto os registros não representarem uma empresa operacional. Essa configuração muda somente a apresentação, não o registro de encomendas. |

**Estado atual:** endereço Rua Mariano Gonçalves, 128, Bairro das Acácias, Vila Aurora – BA e horário segunda a sábado, das 8h às 18h são fictícios e autorizados para a apresentação. WhatsApp e Instagram estão habilitados com os destinos expressamente fornecidos. `confirmado` indica autorização para exibir a configuração; não verifica uma empresa real. O Instagram pertence à TecnoJr, não ao café fictício.

Os mesmos `ContactLinks` atendem hero, informações e rodapé. Quando habilitados, geram `wa.me` com mensagem codificada e perfil Instagram validado, em nova aba com `noopener noreferrer`. Sem autorização, são disclosures nativos acessíveis por teclado, sem destino externo. Portas alternativas, credenciais em URL, parâmetros/fragmentos e rotas reservadas de Instagram são recusados. Os ícones são dois SVGs locais do Simple Icons, CC0, sem nova biblioteca ou dependência de rede.

## Fotografias e manutenção

Todos os 11 produtos receberam fotografias: cenoura, chocolate, milho, fubá, laranja, coco, café coado, café com leite, pão de queijo, panetone e bolo de Natal. São nove arquivos do Wikimedia Commons, um do Unsplash e um do Pexels, escolhidos por pertinência ao alimento e licenciamento individual verificável. Não houve geração por IA. São **fotografias de referência**, não imagens dos produtos reais de um estabelecimento.

As fontes, autores, licenças e data de obtenção estão em [Créditos das imagens](../creditos-imagens.md). O [manifesto](fontes-fotografias.json) inclui URLs originais/cópias obtidas, dimensões, recortes e SHA-256 dos arquivos finais. As licenças de cada foto, inclusive CC BY-SA das respectivas adaptações, são mantidas nos créditos públicos e nos metadados XMP. A [página de créditos](../../frontend/public/creditos-imagens.html) fica acessível pelo rodapé e informa claramente o caráter de referência das fotos.

- Arquivos principais: `frontend/public/images/produtos/<id>.webp`, 960 × 720.
- Arquivos menores: `<id>-480.webp`, 480 × 360.
- Caminhos e descrição alternativa: `imagem`, `imagemPequena`, `imagemAlt` em `backend/src/produtos.ts`, fonte compartilhada atual.
- Exibição: `ProductPhoto.tsx`, com `srcset`, `sizes`, largura/altura explícitas, `loading="lazy"`, decodificação assíncrona e `object-fit: cover`.
- Falha de carregamento: desenho anterior como fallback, com rótulo acessível; os demais dados e ações do cartão continuam disponíveis.

As onze versões principais somam **879.140 bytes**; as onze versões menores, **296.158 bytes**. Não há hotlinks no cardápio. O hero mantém prioridade alta e suas versões existentes. O layout reserva o espaço 4:3 antes de carregar os produtos.

Para trocar uma fotografia mantendo os caminhos, substitua **as duas resoluções** e atualize autoria/licença e `imagemAlt`. Para outra organização de arquivos, altere os caminhos no produto; remova `imagemPequena` se houver somente uma resolução, evitando exibir uma versão antiga no celular. Confirme a licença antes de incluir uma nova imagem e inspecione o recorte.

O script opcional abaixo usa Pillow e cópias locais previamente autorizadas chamadas `<id>-original.jpg`. Ele gera os WebPs, os créditos Markdown/HTML e atualiza os hashes no manifesto; não faz downloads nem determina a autorização das imagens:

```powershell
python scripts/preparar-fotografias.py CAMINHO_DAS_COPIAS
```

O hero anterior, a madeira e os ornamentos existentes não foram recriados. A identificação de IA do hero permanece visível.

## Funcionalidades preservadas

Não foram alterados rotas REST, banco, migrações, autenticação, cookies, sessão, CSRF, preços, capacidade de produção ou regras de encomenda. `backend/src/produtos.ts` recebeu somente campos de apresentação das imagens. `backend/src/catalogo.ts` continua como fonte de preços; disponibilidade continua no SQLite.

A seleção de múltiplos produtos, meses de retirada, status, edição, exclusão, filtros, navegação e pagamento na retirada foram exercitados pelos roteiros existentes. Os roteiros visuais que antes podiam consultar a porta padrão agora usam uma API isolada com SQLite em memória. O roteiro de prazos conserva suas fixtures de calendário e recebeu as contagens atuais e a lista de produtos do banco temporário.

## Validação

- **87 testes frontend** aprovados; **57 testes backend** aprovados. O teste de formulário foi conferido novamente após tornar explícita a espera pelas duas consultas independentes (saldo e catálogo), sem remover as verificações existentes.
- Lint frontend sem avisos, TypeScript frontend/backend (incluindo testes backend) e builds aprovados. O backend não tem script de lint.
- [Auditoria comercial](resultado.json): quatro larguras (360, 390, 768, 1280), 44 verificações de fotografias decodificadas, preços sem corte, sem transbordamento, teclado, aviso junto dos campos, créditos e fallback. Onze análises axe sem violações detectadas.
- WhatsApp e Instagram habilitados foram testados com valores controlados em uma fixture apenas em memória. As novas abas tiveram as requisições **interceptadas antes da rede**, verificando destino e mensagem sem acessar contas de terceiros. Esses contatos não foram colocados na configuração pública.
- [Painel/precificação](regressao-painel/resultado.json): 28 análises axe, CRUD, preços, edição, conflito, autenticação, persistência e filtros.
- [Produtos sazonais](regressao-sazonais/resultado.json): 16 análises axe, configuração, meses, pedido misto, histórico e reinício do SQLite.
- [Fluxo público](regressao-publico/resultado.json): seis análises axe, formulário, confirmação, capacidade e contato.
- [Cardápio](regressao-cardapio/resultado.json): quatro análises axe, nomes/categorias/preços e leitura dos cartões.
- [Visual entre seções](regressao-visual/resultado.json): oito análises axe da landing/formulário. O snapshot textual da etapa anterior não se aplica a esta troca solicitada de textos e fotografias; geometria, preços e acessibilidade foram mantidos como verificações.
- [Prazos](regressao-prazos/navegador.json): quatro análises axe, calendário da Bahia com dispositivo em Tóquio, edição e filtros.
- [Rolagem](rolagem.json): âncoras, teclado, foco, histórico, interrupção e movimento reduzido preservados.

São **77 análises axe sem violações detectadas**, além da inspeção visual das capturas. Os roteiros finais usam bancos em memória ou arquivos em pastas temporárias e não gravaram na base local real. GETs cancelados por troca de data/navegação e erros HTTP intencionais são identificados nos relatórios. Axe não substitui uso com leitor de tela; Safari/iOS e Firefox não foram auditados nesta etapa.

Comandos para repetir os roteiros na raiz, com `.audit-tools` disponível:

```powershell
node --experimental-strip-types scripts/testar-apresentacao-comercial.mjs
node --experimental-strip-types scripts/testar-painel.mjs --precos --comercial --sem-capturas
node --experimental-strip-types scripts/testar-sazonais.mjs --comercial --sem-capturas
node --experimental-strip-types scripts/auditar-preentrega.mjs --comercial --sem-capturas
node --experimental-strip-types scripts/testar-cardapio-visual.mjs --comercial --sem-capturas
node --experimental-strip-types scripts/testar-tons-terrosos.mjs --comercial --sem-capturas
node --experimental-strip-types scripts/testar-prazos.mjs --comercial --sem-capturas
node --experimental-strip-types scripts/testar-rolagem.mjs --comercial
```

`--comercial` direciona os resultados para esta pasta e preserva capturas históricas. Os comandos de testes/lint/tipos/build continuam nos scripts npm documentados no README principal.

## Capturas

| Tela | 360 px | 390 px | 768 px | 1280 px |
| --- | --- | --- | --- | --- |
| Landing completa | [Abrir](landing-360.jpg) | [Abrir](landing-390.jpg) | [Abrir](landing-768.jpg) | [Abrir](landing-1280.jpg) |
| Cardápio | [Abrir](cardapio-360.jpg) | [Abrir](cardapio-390.jpg) | [Abrir](cardapio-768.jpg) | [Abrir](cardapio-1280.jpg) |
| Formulário e identificação honesta | [Abrir](formulario-360.jpg) | [Abrir](formulario-390.jpg) | [Abrir](formulario-768.jpg) | [Abrir](formulario-1280.jpg) |

[As onze fotografias](fotografias.jpg) · [Contatos habilitados na fixture de teste](contatos-autorizados-teste-390.jpg) · [Fallback](fallback-foto-390.jpg) · [Créditos públicos](creditos-390.jpg).

## Arquivos criados e alterados

- Configuração/metadados: `frontend/src/data/cafeConfig.ts`, `frontend/index.html`, `frontend/vite.config.ts`.
- Componentes/seções: `frontend/src/components/ContactLinks.tsx`, `Footer.tsx`, novo `ProductPhoto.tsx`; `frontend/src/sections/Hero.tsx`, `Cardapio.tsx`, `Encomendas.tsx`, `InformacoesContato.tsx`.
- Estilos: `frontend/src/styles/global.css`, `contato.css`, `cardapio.css`, `encomendas.css`.
- Dados compartilhados: `backend/src/produtos.ts` (caminhos/alt de fotos, sem regras de negócio).
- Contatos/testes: `frontend/src/utils/contato.ts`, `frontend/tests/contato.test.mjs`, novo `apresentacao.test.mjs`, sincronização de carregamento em `encomendas-integracao.test.mjs`.
- Assets: 22 WebPs em `frontend/public/images/produtos/`, dois SVGs em `frontend/public/images/icons/`, `frontend/public/creditos-imagens.html`.
- Preparação/auditorias: novos `scripts/preparar-fotografias.py` e `scripts/testar-apresentacao-comercial.mjs`; ajustes de saídas/fixtures/isolamento em `auditar-preentrega.mjs`, `testar-painel.mjs`, `testar-sazonais.mjs`, `testar-rolagem.mjs`, `testar-cardapio-visual.mjs`, `testar-tons-terrosos.mjs`, `testar-prazos.mjs`.
- Documentação: `README.md`, `docs/creditos-imagens.md` e esta pasta, com manifesto, capturas e resultados.

## Pendências comerciais

Não há pendência para apresentar a cafeteria fictícia com os dados autorizados. O projeto continua sem representar uma empresa operacional: endereço, horários, produtos, preços e tamanhos são referências do desafio. Um uso comercial real exigiria revisar esses dados com o responsável. O Instagram da TecnoJr não é um perfil próprio do café nem declara parceria. Não foram adicionados depoimentos, avaliações, prêmios, pagamentos ou outra funcionalidade de negócio.
