# Créditos das imagens

As 11 fotografias são referências de alimentos, não registros dos produtos ou do estabelecimento Café do Bairro. Não indicam vínculo ou endosso dos fotógrafos. Não foram geradas por IA. As versões locais recebem o mesmo licenciamento da fotografia de origem; as adaptações CC BY-SA permanecem sob a respectiva CC BY-SA. O licenciamento das fotos não modifica a licença do código.

| Produto | Arquivo local | Fonte / URL original | Autor | Licença | Obtida em |
| --- | --- | --- | --- | --- | --- |
| Bolo de cenoura | `/images/produtos/bolo-cenoura.webp` | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Bolo_de_Cenoura_(diagonal),_08-12-2020.jpg) | Pedro Toniazzo Terres | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | 2026-11-01 |
| Bolo de chocolate | `/images/produtos/bolo-chocolate.webp` | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Chocolate_Cake_with_a_Decadent_Ganache.jpg) | روتانا | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) | 2026-11-01 |
| Bolo de milho | `/images/produtos/bolo-milho.webp` | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Bolo_de_milho_caseiro.jpg) | Alebasi24 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | 2026-11-01 |
| Bolo de fubá | `/images/produtos/bolo-fuba.webp` | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Bolo_de_Fub%C3%A1.jpg) | Wilfredor | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) | 2026-11-01 |
| Bolo de laranja | `/images/produtos/bolo-laranja.webp` | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Bolo_de_laranja_com_cobertura_de_a%C3%A7%C3%BAcar.jpg) | Sintegrity | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | 2026-11-01 |
| Café com leite | `/images/produtos/cafe-leite.webp` | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Caf%C3%A9_au_lait.jpg) | Tim Boyd from Brooklyn | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | 2026-11-01 |
| Pão de queijo | `/images/produtos/pao-queijo.webp` | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:P%C3%A3o_de_Queijo_-_cheese_bread.jpg) | Jonathan Wilkins | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | 2026-11-01 |
| Panetone | `/images/produtos/panetone.webp` | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Home_made_panettone_by_Nicola_(5300955223).jpg) | N i c o l a from Fiumicino (Rome), Italy | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | 2026-11-01 |
| Bolo de Natal | `/images/produtos/bolo-natal.webp` | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Fruitcake.jpg) | Jonathunder | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | 2026-11-01 |
| Bolo de coco | `/images/produtos/bolo-coco.webp` | [Unsplash](https://unsplash.com/photos/baked-pastry-5lKSHTKnarQ) | Bruno Oliveira | [Unsplash License](https://unsplash.com/license) | 2026-11-01 |
| Café coado | `/images/produtos/cafe-coado.webp` | [Pexels](https://www.pexels.com/photo/a-cup-of-coffee-on-a-wooden-table-12821518/) | Olena Bohovyk | [Pexels License](https://www.pexels.com/license/) | 2026-11-01 |

Cada produto também tem uma versão `-480.webp`. Ambas são hospedadas localmente, sem hotlinks. Alterações aplicadas: Recorte em 4:3, orientação EXIF aplicada, redimensionamento e conversão para WebP. Sem geração por IA. Autoria e licença estão nos metadados XMP das versões WebP e na [página pública de créditos](../frontend/public/creditos-imagens.html), acessível pelo rodapé.

O [manifesto](apresentacao-comercial/fontes-fotografias.json) registra os recortes, as URLs das cópias obtidas, dimensões e SHA-256 das versões principais. Licenças foram conferidas nas páginas individuais do Wikimedia Commons e nas páginas das fotos e licenças do Unsplash/Pexels. Foram usadas as fotos gratuitas, não conteúdo Unsplash+.

O hero existente (`mesa-caseira.webp` e `mesa-caseira-768.webp`) foi criado com IA em etapa anterior. Sua identificação permanece visível no próprio hero; ele não é uma fotografia do estabelecimento. Os ornamentos e a madeira existentes foram preservados.

Os ícones de WhatsApp e Instagram em `frontend/public/images/icons/` vêm do [Simple Icons](https://github.com/simple-icons/simple-icons), sob [CC0 1.0](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md). Os SVGs foram mantidos sem alteração e são exibidos na cor da interface por máscara CSS. As marcas identificam seus canais, sem alegar parceria.

Para substituir uma foto, obtenha uma imagem autorizada do produto correspondente, atualize o registro de fonte/licença e gere as duas versões locais. Confira o recorte visualmente e atualize `imagemAlt` em `backend/src/produtos.ts`. O script `scripts/preparar-fotografias.py` reproduz a otimização e gera este documento e a página pública, usando cópias locais; ele não busca nem autoriza novas imagens.
