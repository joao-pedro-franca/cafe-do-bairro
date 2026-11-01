import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto'

// Parâmetros fixos: N=2^16, r=8, p=2; o salt torna cada hash diferente.
function derivar(senha: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(senha, salt, 64, { N: 65536, r: 8, p: 2, maxmem: 128 * 1024 * 1024 }, (erro, chave) => erro ? reject(erro) : resolve(chave))
  })
}
export function hashValido(hash: string) {
  return /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(hash)
}
export function comparar(a: string, b: string) {
  const hash = (valor: string) => createHash('sha256').update(valor).digest()
  return timingSafeEqual(hash(a), hash(b))
}
export async function gerarHash(senha: string) {
  if (senha.length < 12 || senha.length > 128) throw new Error('Use uma senha entre 12 e 128 caracteres.')
  const salt = randomBytes(16).toString('hex')
  return `scrypt$${salt}$${(await derivar(senha, salt)).toString('hex')}`
}
export async function verificarSenha(senha: string, hash: string) {
  if (!hashValido(hash)) return false
  const [, salt, esperado] = hash.split('$')
  return timingSafeEqual(await derivar(senha, salt!), Buffer.from(esperado!, 'hex'))
}
