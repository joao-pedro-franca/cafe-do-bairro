export function hojeNoFuso(fusoHorario: string, agora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: fusoHorario, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(agora)
  const parte = (tipo: string) => partes.find((item) => item.type === tipo)!.value
  return `${parte('year')}-${parte('month')}-${parte('day')}`
}

export function dentroDoPrazo(dataEntrega: string, prazo: string, hoje: string) {
  if (!prazo) return true
  // As datas são dias ISO validados pela API. UTC serve somente como ordinal
  // de calendário: não convertemos a retirada para o fuso do dispositivo.
  const dias = (Date.parse(`${dataEntrega}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / 86_400_000
  return prazo === '30+' ? dias > 30 : dias >= 1 && dias <= Number(prazo)
}
