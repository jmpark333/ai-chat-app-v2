import { Conversation, ChatState, ModelId } from './types'

const STORAGE_KEY = 'ai-chat-data'

export function loadState(): ChatState {
  if (typeof window === 'undefined') {
    return {
      conversations: [],
      currentConversationId: null,
      selectedModel: 'qwen3.5-plus',
      searchQuery: '',
    }
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('Failed to load state:', e)
  }

  return {
    conversations: [],
    currentConversationId: null,
    selectedModel: 'qwen3.5-plus',
    searchQuery: '',
  }
}

export function saveState(state: ChatState): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save state:', e)
  }
}

export function createConversation(model: ModelId): Conversation {
  return {
    id: crypto.randomUUID(),
    title: 'New Chat',
    messages: [],
    model,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export function generateTitle(firstMessage: string): string {
  const maxLength = 30
  const cleaned = firstMessage.replace(/\n/g, ' ').trim()
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.substring(0, maxLength) + '...'
}