import { gerarHash } from './auth/senha.ts'

// A senha chega pela entrada padrão; nunca pelos argumentos ou por arquivo versionado.
let entrada = ''
for await (const parte of process.stdin) entrada += parte
try {
  console.log(await gerarHash(entrada.replace(/\r?\n$/, '')))
} catch {
  console.error('Não foi possível gerar o hash. Use uma senha entre 12 e 128 caracteres pela entrada padrão.')
  process.exitCode = 1
}
