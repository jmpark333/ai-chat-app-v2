'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChatState, Conversation, Message, ModelId, MODELS } from '@/lib/types'
import { loadState, saveState, createConversation, generateTitle } from '@/lib/storage'

export function useConversations() {
  const [state, setState] = useState<ChatState>({
    conversations: [],
    currentConversationId: null,
    selectedModel: 'qwen3.5-plus',
    searchQuery: '',
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loaded = loadState()
    setState(loaded)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!isLoading) {
      saveState(state)
    }
  }, [state, isLoading])

  const currentConversation = state.conversations.find(
    c => c.id === state.currentConversationId
  )

  const setSelectedModel = useCallback((model: ModelId) => {
    setState(prev => ({ ...prev, selectedModel: model }))
  }, [])

  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }))
  }, [])

  const filteredConversations = state.searchQuery
    ? state.conversations.filter(c =>
        c.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        c.messages.some(m =>
          m.content.toLowerCase().includes(state.searchQuery.toLowerCase())
        )
      )
    : state.conversations

  const startNewConversation = useCallback(() => {
    const newConv = createConversation(state.selectedModel)
    setState(prev => ({
      ...prev,
      conversations: [newConv, ...prev.conversations],
      currentConversationId: newConv.id,
    }))
    return newConv.id
  }, [state.selectedModel])

  const selectConversation = useCallback((id: string) => {
    setState(prev => ({ ...prev, currentConversationId: id }))
  }, [])

  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    setState(prev => {
      const convId = prev.currentConversationId
      if (!convId) return prev

      const newMessage: Message = {
        ...message,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      }

      const conversations = prev.conversations.map(c => {
        if (c.id !== convId) return c

        const updatedMessages = [...c.messages, newMessage]
        const title = c.messages.length === 0 && message.role === 'user'
          ? generateTitle(message.content)
          : c.title

        return {
          ...c,
          messages: updatedMessages,
          title,
          updatedAt: Date.now(),
        }
      })

      return { ...prev, conversations }
    })
  }, [])

  const updateLastAssistantMessage = useCallback((content: string) => {
    setState(prev => {
      const convId = prev.currentConversationId
      if (!convId) return prev

      const conversations = prev.conversations.map(c => {
        if (c.id !== convId) return c

        const messages = [...c.messages]
        const lastIndex = messages.length - 1
        if (lastIndex >= 0 && messages[lastIndex].role === 'assistant') {
          messages[lastIndex] = {
            ...messages[lastIndex],
            content,
          }
        }
        return { ...c, messages, updatedAt: Date.now() }
      })

      return { ...prev, conversations }
    })
  }, [])

  const deleteConversation = useCallback((id: string) => {
    setState(prev => {
      const conversations = prev.conversations.filter(c => c.id !== id)
      const currentConversationId = prev.currentConversationId === id
        ? conversations[0]?.id ?? null
        : prev.currentConversationId
      return { ...prev, conversations, currentConversationId }
    })
  }, [])

  return {
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
    currentModel: MODELS[state.selectedModel],
  }
}