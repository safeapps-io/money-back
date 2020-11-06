import readline from 'readline'

const _readline = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

export const input = (question: string) =>
  new Promise<string>((resolve) => _readline.question(question, resolve))
