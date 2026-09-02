/** Parse "Next: 1) foo · 2) bar" style notes into task strings. */
export function parseNextTasks(notes: string, nextMilestone: string): string[] {
  const tasks: string[] = []
  if (nextMilestone && !nextMilestone.startsWith('Next:')) {
    tasks.push(nextMilestone)
  }
  const nextBlock = notes.match(/Next:\s*([\s\S]+?)(?:\n\n|$)/i)
  if (nextBlock) {
    const parts = nextBlock[1].split(/\s·\s|\n/)
    for (const p of parts) {
      const t = p.replace(/^\d+\)\s*/, '').trim()
      if (t && !tasks.includes(t)) tasks.push(t)
    }
  }
  return tasks.slice(0, 5)
}

export function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase().trim()
  if (!q) return true
  const t = text.toLowerCase()
  let qi = 0
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++
  }
  return qi === q.length
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
