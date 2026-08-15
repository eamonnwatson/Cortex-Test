import type { Chat } from './types'

const CHATS_KEY = 'cortex_chats'

export function getChats(): Chat[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(CHATS_KEY) || '[]')
  } catch {
    return []
  }
}

export function getChat(id: string): Chat | null {
  return getChats().find(c => c.id === id) ?? null
}

export function saveChat(chat: Chat): void {
  if (typeof window === 'undefined') return
  const chats = getChats().filter(c => c.id !== chat.id)
  chats.unshift(chat)
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats.slice(0, 100)))
}

export function deleteChat(id: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CHATS_KEY, JSON.stringify(getChats().filter(c => c.id !== id)))
}

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
