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
  const [viewportHeight, setViewportHeight] = useState(0)

  const chatContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Handle visual viewport for mobile
  useEffect(() => {
    const updateHeight = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height)
      } else {
        setViewportHeight(window.innerHeight)
      }
    }

    updateHeight()

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateHeight)
      return () => window.visualViewport?.removeEventListener('resize', updateHeight)
    }
  }, [])

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

    // Build messages BEFORE any state updates
    const existingMessages = state.conversations.find(c => c.id === convId)?.messages || []
    const messages = existingMessages.map(m => ({
      role: m.role,
      content: m.content,
    }))

    // Add current user message to the array we'll send
    messages.push({
      role: 'user',
      content: trimmedInput,
    })

    // Now update UI state
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
      const decoder = new TextDecoder('utf-8', { fatal: false })
      let fullContent = ''
      let buffer = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')

          // Keep the last incomplete line in buffer
          buffer = lines.pop() || ''

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
                // Skip invalid JSON - might be incomplete
              }
            }
          }
        }

        // Process any remaining buffer
        if (buffer.startsWith('data: ')) {
          const data = buffer.slice(6)
          if (data !== '[DONE]') {
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
    <div className="app-container" style={{ height: viewportHeight ? `${viewportHeight}px` : '100dvh' }}>
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
        <header className="chat-header" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              background: '#fbbf24',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '1rem',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
            </svg>
          </button>
          <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>{currentModel.name}</span>
          {currentModel.hasVision && (
            <span style={{
              fontSize: '0.75rem',
              padding: '0.125rem 0.5rem',
              borderRadius: '0.25rem',
              background: 'rgba(59, 130, 246, 0.2)',
              color: 'var(--primary)',
            }}>Vision</span>
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