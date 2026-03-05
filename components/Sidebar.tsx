'use client'

import { ModelId, MODELS } from '@/lib/types'

interface SidebarProps {
  selectedModel: ModelId
  onModelChange: (model: ModelId) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  conversations: Array<{
    id: string
    title: string
    updatedAt: number
  }>
  currentConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewChat: () => void
  onDeleteConversation: (id: string) => void
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({
  selectedModel,
  onModelChange,
  searchQuery,
  onSearchChange,
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  isOpen,
  onClose,
}: SidebarProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1 className="sidebar-title">AI Chat</h1>
        </div>

        <button className="new-chat-button" onClick={onNewChat}>
          + New Chat
        </button>

        <div className="model-selector">
          <label style={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.5)', marginBottom: '0.5rem', display: 'block' }}>
            Select Model
          </label>
          <div className="model-list">
            {Object.values(MODELS).map(model => (
              <button
                key={model.id}
                className={`model-button ${selectedModel === model.id ? 'active' : ''}`}
                onClick={() => onModelChange(model.id)}
              >
                <span className="model-name">{model.name}</span>
                {model.hasVision && (
                  <span className="model-badge">Vision</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="search-section">
          <input
            type="text"
            className="search-input"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>

        <div className="conversation-list">
          {conversations.length === 0 ? (
            <div style={{ padding: '1rem', color: 'rgba(0,0,0,0.4)', fontSize: '0.875rem' }}>
              No conversations yet
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                className={`conversation-item ${currentConversationId === conv.id ? 'active' : ''}`}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => onSelectConversation(conv.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="conversation-title">{conv.title}</div>
                    <div className="conversation-date">{formatDate(conv.updatedAt)}</div>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      onDeleteConversation(conv.id)
                    }}
                    style={{
                      padding: '0.25rem',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'rgba(0,0,0,0.3)',
                      fontSize: '1rem',
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  )
}