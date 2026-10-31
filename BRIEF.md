# Café do Bairro — Brief de Produto e Desenvolvimento

> Projeto Full Stack para o desafio da TecnoJr (PROSEL 2026.2).  
> **Referência visual:** `docs/referencia-visual.png` (mockup conceitual).  
> **Objetivo:** uma experiência acolhedora, simples e funcional, com prioridade para celular.

## 1. Contexto e problema

Dona Marta administra há seis anos o **Café do Bairro**, uma cafeteria frequentada por moradores, estudantes e trabalhadores do comércio local. Vende café, pão de queijo e bolos caseiros, principalmente por encomenda.

Hoje ela recebe pedidos pelo WhatsApp e anota em um caderno. Isso causa confusão, esquecimentos e risco de ultrapassar a capacidade de produção. O Instagram já divulga o café, mas o público pergunta repetidamente sobre produtos, horários e endereço.

A solução deve permitir que clientes **consultem informações do café e façam encomendas sem depender de conversa prévia com Dona Marta**. Os pedidos devem ser armazenados de forma organizada e, como melhoria, consultados por ela no celular.

## 2. Respostas confirmadas pela cliente

1. **Conteúdo do site:** a cliente autorizou dados **fictícios** para cardápio, sabores, tamanhos, preços, endereço, horários e WhatsApp. Precisam ficar centralizados e fáceis de substituir. Os **bolos caseiros** aceitam encomenda; **pão de queijo por dúzia** também pode ser encomendado. O fornecimento dos dados reais não é requisito obrigatório do desafio.
2. **Antecedência:** encomendas somente para **datas posteriores ao dia atual**, com **pelo menos um dia de antecedência**. Não aceitar pedidos para o mesmo dia.
3. **Confirmação:** o cliente faz a encomenda sozinho; caso ainda haja vaga, ela é **registrada automaticamente como `recebida` e a data já fica reservada**. Não existe fluxo de aprovação manual.
4. **Capacidade:** máximo de **5 encomendas para a mesma data**, de acordo com o bônus do desafio.
5. **Pagamento:** **na retirada**. Não implementar chave Pix, checkout, comprovante ou integração de pagamento.
6. **Uso:** Dona Marta quer uma solução simples, adequada a alguém com pouca familiaridade com tecnologia e acessível pelo celular.

## 3. Objetivos e critérios de sucesso

- Exibir claramente **cardápio, horários, endereço e contato**.
- Ter **botão de encomenda por WhatsApp** (exigência literal do front-end) e formulário integrado ao site como fluxo principal de registro automático.
- Aceitar encomendas válidas e informar o sucesso de modo claro.
- Recusar datas inválidas e a **6ª encomenda para um mesmo dia**.
- Disponibilizar uma API com operações **criar, listar, atualizar e remover** encomendas.
- Fazer o site funcionar bem em telas pequenas, sem exigir cadastro de clientes.
- Se houver tempo, incluir um painel administrativo simples para Dona Marta.

## 4. Prioridades do escopo

### P0 — Obrigatório para a entrega

**Front-end**
- Landing page responsiva com cardápio, horário, endereço e botão de encomenda via WhatsApp.
- Aparência acolhedora de **casa de vó**, em cores terrosas; evitar estética fria/corporativa.

**Back-end**
- API REST com `POST`, `GET`, `PATCH` (ou `PUT`) e `DELETE` de encomendas.
- Cada encomenda contém: **nome do cliente, telefone, produto, data de entrega e status**.
- Status contemplados: `recebida`, `em preparo`, `entregue`.
- **Bônus prioritário:** não permitir mais que 5 encomendas na mesma data.

### P1 — Diferenciais importantes

- Formulário real de encomenda na landing page, integrado à API.
- Validação do prazo mínimo de 1 dia, no formulário **e no servidor**.
- Confirmação visual da reserva, somente depois de resposta bem-sucedida do servidor.
- Painel administrativo mobile-first para listar, editar, atualizar status e excluir encomendas, com **autenticação real e proteção das rotas da API**.

### P2 — Somente depois do essencial

- Filtros por data/status, detalhes e pequenas animações.
- Melhorias de apresentação do projeto no GitHub; refinamentos gráficos extras.
- Possibilidade futura de configuração de pagamentos, sem desenvolver agora.

**Não implementar por padrão:** cadastro de clientes, carrinho complexo, pagamentos online, confirmação manual, lista de espera, notificações automáticas ou integração com a API oficial do WhatsApp.

## 5. Arquitetura de navegação e experiência

### Site público: `/`

Uma única landing page, com seções nesta ordem:

1. **Hero:** foto caseira de bolos/café; tratamento visual claro/escurecido para legibilidade, xícara como marca, nome do café, frase acolhedora, horário e localização resumidos, links de WhatsApp e Instagram e dois CTAs:
   - **Conheça nosso cardápio** → rolagem suave até `#cardapio`.
   - **Faça sua encomenda** → rolagem suave até `#encomendas`.
2. **Cardápio (`#cardapio`):** cartões com imagem, nome, descrição e preço ilustrativos; destacar o que aceita encomenda. Pode ter CTA adicional para `#encomendas`.
3. **Encomendas (`#encomendas`):** regras de antecedência, limite de 5 por dia, pagamento na retirada; botão **Quero encomendar** revela/oculta o formulário **expansível no corpo da página** (não modal e não tela separada). Preservar dados digitados ao fechar e abrir novamente. A rolagem deve ajudar o usuário a encontrar a área aberta.
4. **Informações e contato (`#contato`):** endereço, horário, WhatsApp, Instagram; contatos podem aparecer tanto no hero quanto no rodapé.
5. **Rodapé:** identidade do café, contatos e um link discreto **Área administrativa** → `/admin`.

### Painel da cliente: `/admin` (P1)

- Acesso pelo link no rodapé; não exige decorar URL ou manter atalho no celular.
- Tela de login e painel mobile-first.
- Lista de pedidos por data, com nome, telefone, produto, data e status.
- Ações de atualizar status, editar e remover encomendas.
- A API precisa proteger listagem, edição e exclusão de dados pessoais. **Não basta ocultar a página com CSS ou senha apenas no front-end**.
- Se não houver tempo para uma autenticação adequada, **não disponibilizar um painel público inseguro**; priorizar o CRUD testável da API e documentar a limitação.

### WhatsApp: requisito e limite

O desafio pede explicitamente um **botão de encomenda por WhatsApp**. Preparar o botão para abrir um link `https://wa.me/...` com mensagem pré-preenchida **quando houver um número autorizado e confirmado**. Enquanto o número for fictício, mostrar a interface de demonstração sem direcionar pessoas para um número que possa pertencer a terceiros. O formulário da landing page é o canal principal de registro automático.

**Atenção:** abrir o WhatsApp **não registra** encomenda na API. Não afirmar que as conversas são sincronizadas; pedidos combinados exclusivamente pelo WhatsApp exigiriam cadastro manual posterior (pode ser feito no painel, se implementado). Evitar duas confirmações contraditórias ou duplicar registros.

## 6. Formulário de encomenda

Campos mínimos obrigatórios:
- `nomeCliente` — texto, obrigatório.
- `telefone` — contato do cliente, obrigatório; máscara amigável, validação no servidor.
- `produto` — seleção entre os produtos encomendáveis.
- `dataEntrega` — data no formato `YYYY-MM-DD`, obrigatória; a data de hoje e anteriores não devem ser permitidas.

Campo opcional de `observacoes` pode ser considerado depois, mas **não deve atrasar o mínimo exigido**.

**Fluxo:** abrir formulário → preencher → validar → enviar ao `POST /encomendas` → API verifica disponibilidade e salva → mostrar número/id e mensagem de sucesso, deixando claro que o pagamento ocorre na retirada. Se não houver vaga, mostrar erro compreensível e permitir escolher outra data.

A cliente confirmou **5 encomendas por dia**. Para simplificar o protótipo, **cada envio cria um registro de encomenda de um produto**, inclusive quando o produto escolhido for `Pão de queijo (dúzia)`. Não implementar quantidade/carrinho na primeira versão. Essa é uma **decisão de projeto**, não uma regra adicional confirmada pela cliente; documentar no README.

## 7. Regras de negócio e validações

1. **Data:** somente amanhã ou depois, considerando a data do calendário no fuso do estabelecimento (no protótipo, fuso ajustável/configurável; não confundir `YYYY-MM-DD` com instante UTC). Interpretar "pelo menos um dia" como **dia seguinte ou posterior**.
2. **Limite:** ao criar, se já existirem **5 registros de encomendas** para `dataEntrega`, retornar erro e **não gravar** o sexto. Considerar todos os três status, inclusive `entregue`, porque representam encomendas já atendidas naquele dia.
3. **Atualização:** ao mudar `dataEntrega`, validar antecedência e limite da nova data; atualização de status isolada não deve incrementar o contador.
4. **Exclusão:** remover um registro libera uma posição na contagem da data (a API exige remoção). Em produto real seria interessante manter histórico, mas **não é requisito**.
5. **Concorrência:** garantir que dois pedidos simultâneos não ultrapassem o limite; a checagem e a gravação precisam ocorrer de modo seguro/transacional no banco.
6. **Erros:** retornar mensagens compreensíveis, sem expor dados sensíveis ou detalhes internos. Por exemplo, `400` para dados inválidos, `404` para ID inexistente e `409` para data esgotada.
7. **Segurança:** validar entradas no servidor, parametrizar consultas SQL, restringir CORS quando houver front-end publicado e proteger operações administrativas. Não deixar segredos em arquivos versionados.

## 8. API REST — contrato inicial

Base sugerida: `/api/encomendas`.

| Método | Endpoint | Objetivo |
|---|---|---|
| `POST` | `/api/encomendas` | Registrar uma encomenda pública, inicializando status `recebida` |
| `GET` | `/api/encomendas` | Listar encomendas (uso administrativo) |
| `GET` | `/api/encomendas/:id` | Consultar por ID, se útil para testes/admin |
| `PATCH` | `/api/encomendas/:id` | Atualizar data, produto, contato e/ou status |
| `DELETE` | `/api/encomendas/:id` | Remover encomenda |

Exemplo de entrada de `POST`:

```json
{
  "nomeCliente": "Ana Souza",
  "telefone": "73999999999",
  "produto": "Bolo de cenoura",
  "dataEntrega": "2026-11-02"
}
```

Exemplo de resposta de sucesso (`201 Created`):

```json
{
  "id": 15,
  "nomeCliente": "Ana Souza",
  "telefone": "73999999999",
  "produto": "Bolo de cenoura",
  "dataEntrega": "2026-11-02",
  "status": "recebida"
}
```

Padronizar a representação dos status em todo o projeto. Se for conveniente ao código, usar uma constante interna (`RECEBIDA`, `EM_PREPARO`, `ENTREGUE`), mas o valor exposto na API deve ser consistente e documentado; a especificação da atividade descreve os estados em português.

A API pode usar SQLite como persistência local. Preparar automaticamente a tabela de encomendas no primeiro uso, com instruções claras de execução e de limpeza/reinício de dados de teste.

## 9. Direção visual — conceito aprovado

**Conceito:** **"Café na casa da vó" + "Caderno de receitas"**.

Misturar fotografia de comida caseira e café com detalhes discretos de papel antigo, receitas escritas à mão, pequenos desenhos de xícaras/flores e sensação artesanal. **Não transformar o site numa aplicação corporativa.**

### Referência

Consultar `docs/referencia-visual.png` como **alvo visual principal**, especialmente para ritmo das seções, fotos, cores e atmosfera. O desenho de xícara é provisório até que a cliente forneça o logotipo original. **É um mockup conceitual, não um layout pronto para copiar cegamente**: alguns textos e detalhes da imagem são apenas ilustrativos. Os requisitos deste brief prevalecem se houver divergência.

### Paleta sugerida

- Creme/papel: `#F7F0E6`
- Areia: `#E5CDB4`
- Terracota: `#B66B4B`
- Marrom café: `#754B36`
- Chocolate escuro: `#39261E`

Criar variáveis CSS centralizadas (`:root`) para cores, tipografia, espaçamentos e raios.

### Diretrizes

- **Mobile-first**, depois desktop; testar 360 px, 390 px, 768 px e desktop.
- Fotografia caseira e natural, sem sensação de banco de imagens corporativo. Priorizar imagens locais autorizadas e otimizadas; se necessário usar placeholders temporários, identificar como ilustrativos.
- Título com tipografia expressiva (serifada ou manuscrita legível) e texto corrido com fonte simples. Evitar texto longo em fonte caligráfica.
- Contraste suficiente e botões grandes para toque; rótulos visíveis nos campos.
- Animações sutis de rolagem/expansão, respeitando `prefers-reduced-motion`.
- Evitar grandes blocos de efeitos, sobreposição que atrapalhe leitura e excesso de ornamentos.
- No hero mobile, organizar os textos, CTAs e contatos sem apertar tudo numa única tela.
- A seção de encomenda vem **depois** do cardápio, mesmo que o CTA do hero role diretamente até ela.

## 10. Conteúdo fictício centralizado

Manter informações facilmente editáveis em **um arquivo de configuração do front-end**, por exemplo `frontend/src/data/cafeConfig.ts`:

- Nome do café e frase de apresentação.
- Horários, endereço e WhatsApp.
- Instagram ilustrativo (não criar perfil real nem inventar que existe determinado @).
- Produtos, preços, descrições, imagens e disponibilidade para encomenda.

Produtos **ilustrativos** para começar: bolo de cenoura, bolo de chocolate, bolo de milho e pão de queijo (dúzia). Preços e tamanhos são **fictícios** e deverão ser substituídos antes de uso real. Não esconder essa condição no README.

## 11. Tecnologias e estrutura recomendadas

**Front-end:** React + TypeScript + Vite + CSS tradicional.  
**Back-end:** Node.js + Express (JavaScript, para reduzir complexidade inicial).  
**Persistência:** SQLite.  
**Versionamento:** Git e GitHub (repositório único).

Estrutura inicial sugerida, adaptável conforme evolução:

```text
cafe-do-bairro/
├── BRIEF.md
├── README.md
├── docs/
│   └── referencia-visual.png
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── sections/
│   │   ├── data/
│   │   ├── services/
│   │   ├── styles/
│   │   └── App.tsx
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── database/
│   │   └── app.js
│   └── package.json
└── .gitignore
```

Evitar abstrações desnecessárias e dependências grandes para um projeto pequeno. Não instalar Tailwind sem uma mudança deliberada de decisão.

## 12. Qualidade e testes mínimos

- Abrir a landing page no celular sem rolagem horizontal.
- Links dos dois CTAs levarem às seções corretas.
- Formulário expandir/recolher, manter dados e permitir envio.
- Validação de campos obrigatórios e data mínima.
- `POST` válido resultar em `201` e status `recebida`.
- Rejeitar pedido para hoje/passado.
- Aceitar até cinco encomendas para a mesma data e rejeitar a sexta com resposta clara.
- Não bloquear pedidos em outras datas por engano.
- `PATCH` mudar status; troca de data respeitar limite.
- `GET` listar pedidos; `DELETE` remover pedido; dados persistirem após reiniciar servidor.
- Se houver painel, somente usuário autenticado poderá ver nomes/telefones e executar ações administrativas.
- Verificar ao menos um teste de criação concorrente no limite, para evitar seis reservas simultâneas.

## 13. Regras para trabalhar com o Codex

- **Trabalhar em etapas pequenas**, sempre com uma versão executável ao fim de cada etapa.
- **Não gerar o projeto inteiro numa única operação.** Explicar brevemente decisões, arquivos alterados e como testar.
- **Não alterar requisitos confirmados** sem destacar a divergência.
- **Não inventar integrações externas** nem afirmar que WhatsApp/Pix/painel funcionam sem implementação real.
- Respeitar o mockup e adaptar quando necessário por usabilidade e responsividade.
- Não armazenar senhas, tokens ou telefones reais no repositório.
- Preferir comentários úteis, nomes simples e arquitetura que um estudante consiga explicar.
- Antes da entrega, criar README com instalação, execução do front-end/back-end, rotas, exemplos de requisição, decisões assumidas e imagens de demonstração.

## 14. Sequência de execução recomendada

1. **Preparar o repositório** e a estrutura React + TS + Vite/CSS.
2. **Construir hero e navegação** (âncoras, dois botões, contato), utilizando o mockup.
3. **Construir cardápio, encomendas expansíveis, informações e rodapé**, com dados fictícios centralizados.
4. **Criar API CRUD com SQLite**, incluindo regra das cinco encomendas e antecedência.
5. **Integrar o formulário à API**, com estados de carregamento, sucesso e erro.
6. **Testar regras críticas** e documentar no README.
7. **Se houver tempo**, adicionar login e painel administrativo seguro.
8. **Subir para o GitHub**, revisar `.gitignore`, conferir ausência de segredos e entregar o link.

> **Definição de concluído:** requisitos explícitos de front-end e API atendidos e testáveis; diferenciais apenas se não comprometerem a entrega. O mockup serve ao projeto, não o contrário.
