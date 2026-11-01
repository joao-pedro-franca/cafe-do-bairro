export function ativarRolagemSuave() {
  const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)')
  let quadro = 0
  let destino: number | null = null
  function cancelar() { cancelAnimationFrame(quadro); quadro = 0; destino = null }
  function preferenciaMudou() {
    if (movimentoReduzido.matches && destino !== null) {
      const final = destino
      cancelar()
      window.scrollTo({ top: final, behavior: 'instant' })
    }
  }
  function navegar(evento: MouseEvent) {
    if (evento.defaultPrevented || evento.button !== 0 || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey
      || movimentoReduzido.matches || !(evento.target instanceof Element)) return
    const link = evento.target.closest<HTMLAnchorElement>('a[href^="#"]')
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return
    if (!['#inicio', '#cardapio', '#encomendas', '#contato'].includes(link.hash)) return
    cancelar()
    const inicio = window.scrollY
    // A navegação nativa mantém hash, histórico, foco e o ponto de continuação do teclado.
    quadro = requestAnimationFrame(() => {
      if (evento.defaultPrevented || movimentoReduzido.matches || window.location.hash !== link.hash) return
      const alvo = document.getElementById(link.hash.slice(1))
      if (!alvo) return
      const margem = parseFloat(getComputedStyle(alvo).scrollMarginTop) || 0
      const final = Math.max(0, Math.min(alvo.getBoundingClientRect().top + window.scrollY - margem,
        document.documentElement.scrollHeight - window.innerHeight))
      // Se o navegador já está animando, deixa o CSS conduzir a rolagem.
      if (Math.abs(window.scrollY - final) > 2 || Math.abs(final - inicio) < 32) return
      destino = final
      window.scrollTo({ top: inicio, behavior: 'instant' })
      const comeco = performance.now()
      function animar(agora: number) {
        if (window.location.hash !== link!.hash) return cancelar()
        const progresso = Math.min(1, (agora - comeco) / 450)
        const curva = 1 - (1 - progresso) ** 3
        window.scrollTo({ top: inicio + (final - inicio) * curva, behavior: 'instant' })
        if (progresso < 1) quadro = requestAnimationFrame(animar)
        else { quadro = 0; destino = null }
      }
      quadro = requestAnimationFrame(animar)
    })
  }
  document.addEventListener('click', navegar)
  const interrupcoes = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
  for (const evento of interrupcoes) window.addEventListener(evento, cancelar, { passive: true })
  movimentoReduzido.addEventListener('change', preferenciaMudou)
  return () => {
    cancelar()
    document.removeEventListener('click', navegar)
    for (const evento of interrupcoes) window.removeEventListener(evento, cancelar)
    movimentoReduzido.removeEventListener('change', preferenciaMudou)
  }
}
