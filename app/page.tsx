'use client'

import { useState, useRef, useEffect } from 'react'
import { useConversations } from '@/hooks/useConversations'
import { Sidebar } from '@/components/Sidebar'
import { ChatMessage } from '@/components/ChatMessage'
import { MODELS } from '@/lib/types'

export default function HomePage() {
  const {
    state,
    isLoading,
    currentConversation,
    filteredConversations,
    setSelectedModel,
    setSearchQuery,
    startNewConversation,
    selectConversation,
    addMessage,
    updateLastAssistantMessage,
    deleteConversation,
    currentModel,
  } = useConversations()

  const [input, setInput] = useState('')
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const chatContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [currentConversation?.messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [state.currentConversationId])

  const handleImageSelect = (images: string[]) => {
    setSelectedImages(images)
  }

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()

    const trimmedInput = input.trim()
    if (!trimmedInput && selectedImages.length === 0) return
    if (isStreaming) return

    let convId = state.currentConversationId
    if (!convId) {
      convId = startNewConversation()
    }

    const hasVisionModel = currentModel.hasVision
    const imagesToSend = hasVisionModel ? selectedImages : []

    addMessage({
      role: 'user',
      content: trimmedInput,
      images: imagesToSend.length > 0 ? imagesToSend : undefined,
    })

    setInput('')
    setSelectedImages([])
    setIsStreaming(true)

    addMessage({
      role: 'assistant',
      content: '',
    })

    try {
      const messages = currentConversation?.messages.slice(0, -1).map(m => ({
        role: m.role,
        content: m.content,
      })) || []

      messages.push({
        role: 'user',
        content: trimmedInput,
      })

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          model: state.selectedModel,
          images: imagesToSend,
        }),
      })

      if (!response.ok) {
        throw new Error('API request failed')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue

              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content || ''
                if (content) {
                  fullContent += content
                  updateLastAssistantMessage(fullContent)
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      if (!fullContent) {
        updateLastAssistantMessage('Sorry, I could not generate a response. Please try again.')
      }
    } catch (error) {
      console.error('Chat error:', error)
      updateLastAssistantMessage('Sorry, an error occurred. Please try again.')
    } finally {
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <Sidebar
        selectedModel={state.selectedModel}
        onModelChange={setSelectedModel}
        searchQuery={state.searchQuery}
        onSearchChange={setSearchQuery}
        conversations={filteredConversations}
        currentConversationId={state.currentConversationId}
        onSelectConversation={id => {
          selectConversation(id)
          setSidebarOpen(false)
        }}
        onNewChat={() => {
          startNewConversation()
          setSidebarOpen(false)
        }}
        onDeleteConversation={deleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="main-content">
        <header className="chat-header">
          <button className="menu-button" onClick={() => setSidebarOpen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span style={{ fontWeight: 500 }}>{currentModel.name}</span>
          {currentModel.hasVision && (
            <span className="model-badge" style={{ fontSize: '0.75rem' }}>Vision</span>
          )}
        </header>

        <div className="chat-container" ref={chatContainerRef}>
          {!currentConversation || currentConversation.messages.length === 0 ? (
            <div style={{
              display: 'flex',
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(0,0,0,0.4)',
              textAlign: 'center',
              padding: '2rem'
            }}>
              <div>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>💬</div>
                <div>Start a new conversation</div>
                <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  Using {currentModel.name}
                </div>
              </div>
            </div>
          ) : (
            currentConversation.messages.map(msg => (
              <ChatMessage
                key={msg.id}
                message={msg}
                model={state.selectedModel}
              />
            ))
          )}
          {isStreaming && (
            <div className="message assistant">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
        </div>

        <div className="input-area">
          {selectedImages.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              {selectedImages.map((img, i) => (
                <div key={i} className="image-preview">
                  <img src={img} alt={`Preview ${i + 1}`} />
                  <button
                    className="remove-image"
                    onClick={() => handleRemoveImage(i)}
                    type="button"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleSubmit} className="input-container">
            <div className="input-wrapper">
              {currentModel.hasVision && (
                <button
                  type="button"
                  className="upload-button"
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'image/*'
                    input.multiple = true
                    input.onchange = async (e) => {
                      const files = (e.target as HTMLInputElement).files
                      if (!files) return
                      const base64Promises = Array.from(files).map(file => {
                        return new Promise<string>((resolve, reject) => {
                          const reader = new FileReader()
                          reader.onload = () => resolve(reader.result as string)
                          reader.onerror = reject
                          reader.readAsDataURL(file)
                        })
                      })
                      const base64Images = await Promise.all(base64Promises)
                      setSelectedImages(prev => [...prev, ...base64Images])
                    }
                    input.click()
                  }}
                  disabled={isStreaming}
                  title="Upload image"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21,15 16,10 5,21" />
                  </svg>
                </button>
              )}
              <textarea
                ref={inputRef}
                className="chat-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={currentModel.hasVision ? "Type a message or upload an image..." : "Type a message..."}
                rows={1}
                disabled={isStreaming}
              />
            </div>
            <button
              type="submit"
              className="send-button"
              disabled={isStreaming || (!input.trim() && selectedImages.length === 0)}
            >
              Send
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}