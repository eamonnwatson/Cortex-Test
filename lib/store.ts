import type { Chat } from './types'

const CHATS_KEY = 'cortex_chats'
const CHATS_CHANGED_EVENT = 'cortex-chats-changed'

function notifyChatsChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(CHATS_CHANGED_EVENT))
}

export function subscribeToChats(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const onStorage = (event: StorageEvent) => {
    if (event.key === CHATS_KEY) onStoreChange()
  }

  window.addEventListener('storage', onStorage)
  window.addEventListener(CHATS_CHANGED_EVENT, onStoreChange)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(CHATS_CHANGED_EVENT, onStoreChange)
  }
}

export function getChatsSnapshot(): string {
  if (typeof window === 'undefined') return '[]'
  return localStorage.getItem(CHATS_KEY) || '[]'
}

export function parseChatsSnapshot(snapshot: string): Chat[] {
  try {
    return JSON.parse(snapshot) as Chat[]
  } catch {
    return []
  }
}

export function getChats(): Chat[] {
  if (typeof window === 'undefined') return []
  return parseChatsSnapshot(getChatsSnapshot())
}

export function getChat(id: string): Chat | null {
  return getChats().find(c => c.id === id) ?? null
}

export function saveChat(chat: Chat): void {
  if (typeof window === 'undefined') return
  const chats = getChats().filter(c => c.id !== chat.id)
  chats.unshift(chat)
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats.slice(0, 100)))
  notifyChatsChanged()
}

export function deleteChat(id: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CHATS_KEY, JSON.stringify(getChats().filter(c => c.id !== id)))
  notifyChatsChanged()
}

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
