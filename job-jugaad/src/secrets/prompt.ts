import readline from 'node:readline'
import { stdin as input, stdout as output } from 'node:process'

/**
 * Interactive secrets — memory only for this process.
 * Never write to .env, disk, wiki, or chat echoes.
 */
export type PromptedSecrets = {
  gmailAddress?: string
  gmailAppPassword?: string
  apiKeys: Record<string, string>
}

const session: PromptedSecrets = { apiKeys: {} }

function ask(question: string, { silent = false } = {}): Promise<string> {
  return new Promise((resolve) => {
    if (!silent) {
      const rl = readline.createInterface({ input, output })
      rl.question(question, (answer) => {
        rl.close()
        resolve(answer.trim())
      })
      return
    }
    // Masked password: disable echo
    output.write(question)
    const wasRaw = input.isRaw
    if (input.isTTY) input.setRawMode?.(true)
    let buf = ''
    const onData = (chunk: Buffer) => {
      const s = chunk.toString('utf8')
      for (const ch of s) {
        if (ch === '\n' || ch === '\r' || ch === '\u0004') {
          input.off('data', onData)
          if (input.isTTY) input.setRawMode?.(wasRaw ?? false)
          output.write('\n')
          resolve(buf.trim())
          return
        }
        if (ch === '\u0003') {
          process.exit(130)
        }
        if (ch === '\u007f' || ch === '\b') {
          buf = buf.slice(0, -1)
          continue
        }
        buf += ch
        output.write('*')
      }
    }
    input.on('data', onData)
  })
}

export async function promptGmailCreds(force = false): Promise<{
  address: string
  appPassword: string
}> {
  if (!force && session.gmailAddress && session.gmailAppPassword) {
    return {
      address: session.gmailAddress,
      appPassword: session.gmailAppPassword,
    }
  }
  const address = await ask('Gmail address: ')
  const appPassword = await ask('Gmail App Password (masked): ', {
    silent: true,
  })
  if (!address || !appPassword) {
    throw new Error('Gmail address and App Password are required for this run')
  }
  session.gmailAddress = address
  session.gmailAppPassword = appPassword
  return { address, appPassword }
}

export async function promptApiKey(
  name: string,
  force = false,
): Promise<string> {
  if (!force && session.apiKeys[name]) return session.apiKeys[name]
  const value = await ask(`${name} (API key, masked): `, { silent: true })
  if (!value) throw new Error(`${name} is required for this run`)
  session.apiKeys[name] = value
  return value
}

export function clearSessionSecrets(): void {
  session.gmailAddress = undefined
  session.gmailAppPassword = undefined
  session.apiKeys = {}
}

export function getSessionSecrets(): Readonly<PromptedSecrets> {
  return session
}
