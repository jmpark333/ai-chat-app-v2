'use client'

import { Message as MessageType, MODELS, ModelId } from '@/lib/types'

interface ChatMessageProps {
  message: MessageType
  model?: ModelId
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
      <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
      {!isUser && modelInfo && (
        <div style={{ fontSize: '0.625rem', opacity: 0.5, marginTop: '0.25rem' }}>
          {modelInfo.name}
        </div>
      )}
    </div>
  )
}