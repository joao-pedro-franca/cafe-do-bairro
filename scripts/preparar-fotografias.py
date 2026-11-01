"""Otimiza as cópias licenciadas e gera os créditos; não faz downloads.

Uso: python scripts/preparar-fotografias.py CAMINHO_DAS_COPIAS
Cada cópia deve se chamar <id-do-produto>-original.jpg.
Requer Pillow. Fontes e recortes: docs/apresentacao-comercial/fontes-fotografias.json.
"""
import argparse
import hashlib
import html
import json
from pathlib import Path
from PIL import Image, ImageOps

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('originais', type=Path)
args = parser.parse_args()
raiz = Path(__file__).resolve().parents[1]
manifesto = raiz / 'docs/apresentacao-comercial/fontes-fotografias.json'
fontes = json.loads(manifesto.read_text(encoding='utf-8'))
destino = raiz / 'frontend/public/images/produtos'
destino.mkdir(parents=True, exist_ok=True)
alteracoes = 'Recorte em 4:3, orientação EXIF aplicada, redimensionamento e conversão para WebP. Sem geração por IA.'
linhas, cartoes = [], []
for fonte in fontes:
    origem = args.originais / f"{fonte['id']}-original.jpg"
    imagem = ImageOps.exif_transpose(Image.open(origem)).convert('RGB')
    fonte['dimensoesFonte'] = list(imagem.size)
    fonte['alteracoes'] = alteracoes
    fonte['arquivo'] = f"/images/produtos/{fonte['id']}.webp"
    fonte['arquivoPequeno'] = f"/images/produtos/{fonte['id']}-480.webp"
    # Os créditos também acompanham os arquivos, além da página pública.
    autor = html.escape(fonte['autor'])
    licenca = html.escape(fonte['licencaUrl'])
    xmp = f'''<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#"><dc:creator><rdf:Seq><rdf:li>{autor}</rdf:li></rdf:Seq></dc:creator><dc:rights>{html.escape(fonte['licenca'])}; {html.escape(alteracoes)}</dc:rights><cc:license rdf:resource="{licenca}"/></rdf:Description></rdf:RDF></x:xmpmeta>'''
    for largura, sufixo in [(960, ''), (480, '-480')]:
        recorte = ImageOps.fit(imagem, (largura, largura * 3 // 4), method=Image.Resampling.LANCZOS, centering=tuple(fonte['foco']))
        arquivo = destino / f"{fonte['id']}{sufixo}.webp"
        recorte.save(arquivo, 'WEBP', quality=82, method=6, xmp=xmp.encode('utf-8'))
    principal = destino / f"{fonte['id']}.webp"
    fonte['sha256Webp'] = hashlib.sha256(principal.read_bytes()).hexdigest()
    fonte['bytesWebp'] = principal.stat().st_size
    nome = fonte['id'].replace('-', ' ').capitalize()
    nomes = {'bolo-fuba': 'Bolo de fubá', 'cafe-leite': 'Café com leite', 'cafe-coado': 'Café coado', 'pao-queijo': 'Pão de queijo', 'bolo-natal': 'Bolo de Natal'}
    nome = nomes.get(fonte['id'], nome.replace('Bolo ', 'Bolo de '))
    fonte['produto'] = nome
    fonte['copiaObtida'] = fonte.get('copiaObtida', fonte['original'] + ('?auto=format&fit=max&w=1600&q=90' if fonte['fonte'] == 'Unsplash' else '?auto=compress&cs=tinysrgb&w=1600'))
    linhas.append(f"| {nome} | `{fonte['arquivo']}` | [{fonte['fonte']}]({fonte['pagina']}) | {fonte['autor']} | [{fonte['licenca']}]({fonte['licencaUrl']}) | {fonte['obtidaEm']} |")
    cartoes.append(f'''<li><h2>{html.escape(nome)}</h2><p>Fotografia: {autor}. Fonte: <a href="{html.escape(fonte['pagina'])}" rel="noopener noreferrer">{html.escape(fonte['fonte'])} — imagem original</a>.</p><p>Licença: <a href="{licenca}" rel="noopener noreferrer">{html.escape(fonte['licenca'])}</a>. {html.escape(alteracoes)}</p></li>''')
manifesto.write_text(json.dumps(fontes, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
creditos = '''# Créditos das imagens

As 11 fotografias são referências de alimentos, não registros dos produtos ou do estabelecimento Café do Bairro. Não indicam vínculo ou endosso dos fotógrafos. Não foram geradas por IA. As versões locais recebem o mesmo licenciamento da fotografia de origem; as adaptações CC BY-SA permanecem sob a respectiva CC BY-SA. O licenciamento das fotos não modifica a licença do código.

| Produto | Arquivo local | Fonte / URL original | Autor | Licença | Obtida em |
| --- | --- | --- | --- | --- | --- |
''' + '\n'.join(linhas) + '''

Cada produto também tem uma versão `-480.webp`. Ambas são hospedadas localmente, sem hotlinks. Alterações aplicadas: ''' + alteracoes + ''' Autoria e licença estão nos metadados XMP das versões WebP e na [página pública de créditos](../frontend/public/creditos-imagens.html), acessível pelo rodapé.

O [manifesto](apresentacao-comercial/fontes-fotografias.json) registra os recortes, as URLs das cópias obtidas, dimensões e SHA-256 das versões principais. Licenças foram conferidas nas páginas individuais do Wikimedia Commons e nas páginas das fotos e licenças do Unsplash/Pexels. Foram usadas as fotos gratuitas, não conteúdo Unsplash+.

O hero existente (`mesa-caseira.webp` e `mesa-caseira-768.webp`) foi criado com IA em etapa anterior. Sua identificação permanece visível no próprio hero; ele não é uma fotografia do estabelecimento. Os ornamentos e a madeira existentes foram preservados.

Os ícones de WhatsApp e Instagram em `frontend/public/images/icons/` vêm do [Simple Icons](https://github.com/simple-icons/simple-icons), sob [CC0 1.0](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md). Os SVGs foram mantidos sem alteração e são exibidos na cor da interface por máscara CSS. As marcas identificam seus canais, sem alegar parceria.

Para substituir uma foto, obtenha uma imagem autorizada do produto correspondente, atualize o registro de fonte/licença e gere as duas versões locais. Confira o recorte visualmente e atualize `imagemAlt` em `backend/src/produtos.ts`. O script `scripts/preparar-fotografias.py` reproduz a otimização e gera este documento e a página pública, usando cópias locais; ele não busca nem autoriza novas imagens.
'''
(raiz / 'docs/creditos-imagens.md').write_text(creditos, encoding='utf-8')
pagina = '''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Créditos das fotografias</title><meta name="robots" content="noindex"><style>body{margin:0;background:#f7f0e6;color:#39261e;font:1rem/1.7 Arial,sans-serif}main{max-width:70ch;margin:auto;padding:2rem 1.25rem}h1,h2{font-family:Georgia,serif;line-height:1.3}h1{font-size:2.4rem}h2{font-size:1.35rem}a{color:#754b36;text-underline-offset:.25em;overflow-wrap:anywhere}a:focus-visible{outline:3px solid #754b36;outline-offset:4px}main>a{display:inline-flex;min-height:44px;align-items:center}ul{list-style:none;padding:0}li{margin:1.5rem 0;padding:1rem 1.25rem;background:#fff9ed;border:1px solid #a87956;border-radius:.7rem}p{overflow-wrap:anywhere}</style></head><body><main><a href="/">← Voltar para o café</a><h1>Créditos das fotografias</h1><p>As fotografias do cardápio são referências de alimentos. Não são registros dos produtos ou do estabelecimento apresentado no site e não indicam endosso dos fotógrafos.</p><ul>''' + ''.join(cartoes) + '''</ul><p>A imagem do hero foi criada com IA em uma etapa anterior e está identificada no próprio site. Ícones de WhatsApp e Instagram: <a href="https://github.com/simple-icons/simple-icons">Simple Icons</a>, <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 1.0</a>.</p><a href="/">← Voltar para o café</a></main></body></html>'''
(raiz / 'frontend/public/creditos-imagens.html').write_text(pagina, encoding='utf-8')
print(f'{len(fontes)} fotos, duas resoluções e créditos gerados. {sum(f["bytesWebp"] for f in fontes)} bytes nas versões principais.')
