// Model configuration
export const MODELS = {
  'qwen3.5-plus': {
    id: 'qwen3.5-plus',
    name: 'Qwen 3.5 Plus',
    hasVision: true,
  },
  'kimi-k2.5': {
    id: 'kimi-k2.5',
    name: 'Kimi K2.5',
    hasVision: true,
  },
  'glm-5': {
    id: 'glm-5',
    name: 'GLM-5',
    hasVision: false,
  },
  'MiniMax-M2.5': {
    id: 'MiniMax-M2.5',
    name: 'MiniMax M2.5',
    hasVision: false,
  },
} as const

export type ModelId = keyof typeof MODELS

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  images?: string[]
  timestamp: number
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  model: ModelId
  createdAt: number
  updatedAt: number
}

export interface ChatState {
  conversations: Conversation[]
  currentConversationId: string | null
  selectedModel: ModelId
  searchQuery: string
}