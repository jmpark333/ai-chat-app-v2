'use client'

import { Message as MessageType, MODELS, ModelId } from '@/lib/types'

interface ChatMessageProps {
  message: MessageType
  model?: ModelId
}

// Simple markdown parser for bold and code
function parseMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let key = 0
  let lastIndex = 0

  // Match **bold** and `code`
  const regex = /(\*\*[^*]+\*\*)|(`[^`]+`)/g
  let match

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    const matched = match[0]
    if (matched.startsWith('**')) {
      // Bold
      parts.push(
        <strong key={key++} style={{ fontWeight: 700 }}>
          {matched.slice(2, -2)}
        </strong>
      )
    } else if (matched.startsWith('`')) {
      // Code
      parts.push(
        <code key={key++} style={{
          background: 'rgba(0,0,0,0.05)',
          padding: '0.125rem 0.25rem',
          borderRadius: '0.25rem',
          fontFamily: 'monospace',
          fontSize: '0.875em'
        }}>
          {matched.slice(1, -1)}
        </code>
      )
    }

    lastIndex = match.index + matched.length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}

export function ChatMessage({ message, model }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const modelInfo = model ? MODELS[model] : null

  return (
    <div className={`message ${message.role}`}>
      {message.images && message.images.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {message.images.map((img, i) => (
            <img key={i} src={img} alt="Uploaded" />
          ))}
        </div>
      )}
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
        {parseMarkdown(message.content)}
      </div>
      {!isUser && modelInfo && (
        <div style={{ fontSize: '0.625rem', opacity: 0.5, marginTop: '0.25rem' }}>
          {modelInfo.name}
        </div>
      )}
    </div>
  )
}