export function ativarRolagemSuave() {
  const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)')
  let quadro = 0
  let destino: number | null = null
  function cancelar() { cancelAnimationFrame(quadro); quadro = 0; destino = null }

  function focar(alvo: HTMLElement) {
    const temporario = !alvo.hasAttribute('tabindex')
    if (temporario) alvo.setAttribute('tabindex', '-1')
    // Mover o foco não pode antecipar a rolagem e teletransportar a página.
    alvo.focus({ preventScroll: true })
    if (temporario) alvo.addEventListener('blur', () => alvo.removeAttribute('tabindex'), { once: true })
  }
  function preferenciaMudou() {
    if (movimentoReduzido.matches && destino !== null) {
      const final = destino
      cancelar()
      window.scrollTo({ top: final, behavior: 'instant' })
    }
  }
  function navegar(evento: MouseEvent) {
    if (evento.defaultPrevented || evento.button !== 0 || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey
      || !(evento.target instanceof Element)) return
    const link = evento.target.closest<HTMLAnchorElement>('a[href^="#"]')
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return
    if (!['#inicio', '#cardapio', '#encomendas', '#contato'].includes(link.hash)) return
    const alvo = document.getElementById(link.hash.slice(1))
    if (!alvo) return

    // Impede o salto nativo; pushState atualiza URL/histórico sem mover a tela.
    evento.preventDefault()
    cancelar()
    const inicio = window.scrollY
    const margem = parseFloat(getComputedStyle(alvo).scrollMarginTop) || 0
    const final = Math.max(0, Math.min(alvo.getBoundingClientRect().top + inicio - margem,
      document.documentElement.scrollHeight - window.innerHeight))
    if (window.location.hash !== link.hash) window.history.pushState(window.history.state, '', link.hash)
    focar(alvo)
    if (movimentoReduzido.matches || inicio === final) {
      window.scrollTo({ top: final, behavior: 'instant' })
      return
    }
    destino = final
    const comeco = performance.now()
    function animar(agora: number) {
      const progresso = Math.min(1, (agora - comeco) / 1200)
      const curva = 1 - (1 - progresso) ** 3
      window.scrollTo({ top: inicio + (final - inicio) * curva, behavior: 'instant' })
      if (progresso < 1) quadro = requestAnimationFrame(animar)
      else { quadro = 0; destino = null }
    }
    quadro = requestAnimationFrame(animar)
  }
  function historicoMudou() {
    cancelar()
    const alvo = document.getElementById(window.location.hash.slice(1) || 'inicio')
    if (alvo) focar(alvo)
    // A posição de voltar/avançar continua sendo restaurada pelo navegador.
  }
  document.addEventListener('click', navegar)
  const interrupcoes = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
  for (const evento of interrupcoes) window.addEventListener(evento, cancelar, { passive: true })
  window.addEventListener('popstate', historicoMudou)
  window.addEventListener('hashchange', historicoMudou)
  movimentoReduzido.addEventListener('change', preferenciaMudou)
  return () => {
    cancelar()
    document.removeEventListener('click', navegar)
    for (const evento of interrupcoes) window.removeEventListener(evento, cancelar)
    window.removeEventListener('popstate', historicoMudou)
    window.removeEventListener('hashchange', historicoMudou)
    movimentoReduzido.removeEventListener('change', preferenciaMudou)
  }
}
