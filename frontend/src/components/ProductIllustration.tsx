import type { TipoIlustracao } from '../data/cafeConfig'

export function ProductIllustration({ tipo }: { tipo: TipoIlustracao }) {
  return (
    <svg viewBox="0 0 320 180" fill="none" aria-hidden="true">
      <path d="M0 140Q160 115 320 140V180H0Z" fill="#e5cdb4" />
      <ellipse cx="160" cy="145" rx="105" ry="16" fill="#fff8ec" stroke="#b79572" strokeWidth="2" />
      {tipo === 'bolo' && <>
        <path d="M75 85h170v48c0 29-170 29-170 0Z" fill="#c18c4c" />
        <ellipse cx="160" cy="85" rx="85" ry="27" fill="#754b36" />
        <path d="M77 87c15 20 22 0 30 20s18 6 25-3 22-7 28 6 22 5 29-7 19-5 26 5 22 4 28-21" fill="#754b36" />
        <ellipse cx="160" cy="81" rx="65" ry="16" stroke="#b66b4b" strokeWidth="3" />
      </>}
      {tipo === 'cafe' && <>
        <path d="M213 85c54-12 47 47-5 40" stroke="#b79572" strokeWidth="12" />
        <path d="M101 80h115l-9 49c-7 32-90 32-98 0Z" fill="#fff8ec" stroke="#b79572" strokeWidth="2" />
        <ellipse cx="158" cy="80" rx="57" ry="15" fill="#754b36" stroke="#b79572" strokeWidth="3" />
        <path d="M139 56c-15-15 15-21 0-36m33 34c-15-15 15-21 0-36" stroke="#b66b4b" strokeWidth="3" strokeLinecap="round" />
        <path d="M146 109c-13-13-22 8 13 22 35-17 23-36 11-22l-12 8Z" fill="#b66b4b" />
      </>}
      {tipo === 'pao-queijo' && <g fill="#e6b56c" stroke="#b78146" strokeWidth="2">
        <circle cx="120" cy="98" r="30" /><circle cx="178" cy="91" r="33" />
        <circle cx="210" cy="126" r="27" /><circle cx="152" cy="131" r="31" /><circle cx="95" cy="131" r="25" />
        <path d="m110 88 12-6m47 0 12-5m-38 45 13-5m46 3 9-3m-122 8 8-4" stroke="#fff0c9" strokeWidth="4" strokeLinecap="round" />
      </g>}
      {tipo === 'panetone' && <>
        <path d="M103 89h114l-6 55H109Z" fill="#a27047" />
        <path d="M102 91c-23-76 140-76 116 0Z" fill="#d7a35b" stroke="#b78146" strokeWidth="2" />
        <path d="m133 99 3 39m23-39v39m27-39-2 39" stroke="#e5cdb4" strokeWidth="3" />
        <g fill="#754b36"><circle cx="128" cy="70" r="4" /><circle cx="156" cy="52" r="4" /><circle cx="191" cy="73" r="4" /></g>
      </>}
    </svg>
  )
}
