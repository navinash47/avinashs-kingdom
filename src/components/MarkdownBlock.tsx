import type { ReactNode } from 'react'

type Props = {
  text: string
  className?: string
}

export function MarkdownBlock({ text, className = '' }: Props) {
  if (!text.trim()) return null

  const blocks: ReactNode[] = []
  const lines = text.split('\n')
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        code.push(lines[i])
        i++
      }
      i++
      blocks.push(
        <pre key={key++} className="md-code">
          {lang ? <code className={`lang-${lang}`}>{code.join('\n')}</code> : code.join('\n')}
        </pre>,
      )
      continue
    }

    if (line.startsWith('### ')) {
      blocks.push(<h5 key={key++}>{line.slice(4)}</h5>)
      i++
      continue
    }

    if (line.startsWith('## ')) {
      blocks.push(<h4 key={key++}>{line.slice(3)}</h4>)
      i++
      continue
    }

    if (line.startsWith('# ')) {
      blocks.push(<h3 key={key++}>{line.slice(2)}</h3>)
      i++
      continue
    }

    if (/^[-*]\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''))
        i++
      }
      blocks.push(
        <ul key={key++} className="md-list">
          {items.map((item) => (
            <li key={item}>{formatInline(item)}</li>
          ))}
        </ul>,
      )
      continue
    }

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''))
        i++
      }
      blocks.push(
        <ol key={key++} className="md-list">
          {items.map((item) => (
            <li key={item}>{formatInline(item)}</li>
          ))}
        </ol>,
      )
      continue
    }

    if (line.trim() === '') {
      i++
      continue
    }

    const para: string[] = []
    while (i < lines.length && lines[i].trim() !== '' && !/^#{1,3}\s/.test(lines[i]) && !/^[-*]\s/.test(lines[i])) {
      para.push(lines[i])
      i++
    }
    blocks.push(
      <p key={key++} className="md-para">
        {formatInline(para.join(' '))}
      </p>,
    )
  }

  return <div className={`md-block ${className}`.trim()}>{blocks}</div>
}

function formatInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[\[[^\]]+\]\])/g)
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={idx}>{part.slice(1, -1)}</code>
    }
    if (part.startsWith('[[') && part.endsWith(']]')) {
      return <em key={idx} className="wiki-link">{part.slice(2, -2)}</em>
    }
    return part
  })
}
