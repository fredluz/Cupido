import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'

export interface ChatThreadSummary {
  thread_id: string
  user_a_id: string
  user_b_id: string
  other_user_id: string
  created_at: string
  revealed_at: string | null
  my_alias: string
  other_alias: string
  reveal_enabled: boolean
  my_display_name: string
  other_display_name: string
  last_message_at: string | null
  last_message_preview: string | null
}

export interface ChatThreadMessage {
  id: number
  thread_id: string
  sender_user_id: string
  sender_alias: string
  reveal_enabled: boolean
  sender_display_name: string
  body: string
  created_at: string
}

export type ChatServiceErrorCode =
  | 'NOT_MUTUAL_TOP3'
  | 'THREAD_NOT_ACCESSIBLE'
  | 'INVALID_REQUEST'
  | 'UNKNOWN'

export class ChatServiceError extends Error {
  readonly code: ChatServiceErrorCode
  readonly causeError: PostgrestError | null

  constructor(message: string, code: ChatServiceErrorCode, causeError: PostgrestError | null = null) {
    super(message)
    this.name = 'ChatServiceError'
    this.code = code
    this.causeError = causeError
  }
}

const parseText = (value: unknown): string => (typeof value === 'string' ? value : '')

const parseNullableText = (value: unknown): string | null => {
  if (typeof value === 'string') return value
  return null
}

const parseNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return 0
}

const parseBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase()
    if (normalizedValue === 'true') return true
    if (normalizedValue === 'false') return false
  }
  return false
}

const parseRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object') return null
  return value as Record<string, unknown>
}

const normalizeThread = (value: unknown): ChatThreadSummary | null => {
  const row = parseRecord(value)
  if (!row) return null

  const threadId = parseText(row.thread_id ?? row.id)
  const userAId = parseText(row.user_a_id)
  const userBId = parseText(row.user_b_id)
  const otherUserId = parseText(row.other_user_id)
  const myAlias = parseText(row.my_alias)
  const otherAlias = parseText(row.other_alias)

  if (!threadId || !userAId || !userBId) return null

  return {
    thread_id: threadId,
    user_a_id: userAId,
    user_b_id: userBId,
    other_user_id: otherUserId,
    created_at: parseText(row.created_at),
    revealed_at: parseNullableText(row.revealed_at),
    my_alias: myAlias,
    other_alias: otherAlias,
    reveal_enabled: parseBoolean(row.reveal_enabled),
    my_display_name: parseText(row.my_display_name) || myAlias,
    other_display_name: parseText(row.other_display_name) || otherAlias,
    last_message_at: parseNullableText(row.last_message_at),
    last_message_preview: parseNullableText(row.last_message_preview)
  }
}

const normalizeMessage = (value: unknown): ChatThreadMessage | null => {
  const row = parseRecord(value)
  if (!row) return null

  const id = parseNumber(row.id)
  const threadId = parseText(row.thread_id)
  const senderUserId = parseText(row.sender_user_id)
  const senderAlias = parseText(row.sender_alias)
  const senderDisplayName = parseText(row.sender_display_name) || senderAlias
  const body = parseText(row.body)
  const createdAt = parseText(row.created_at)

  if (!id || !threadId || !senderUserId || !body || !createdAt) {
    return null
  }

  return {
    id,
    thread_id: threadId,
    sender_user_id: senderUserId,
    sender_alias: senderAlias,
    reveal_enabled: parseBoolean(row.reveal_enabled),
    sender_display_name: senderDisplayName,
    body,
    created_at: createdAt
  }
}

const toErrorCode = (error: PostgrestError | null): ChatServiceErrorCode => {
  const message = (error?.message || '').toLowerCase()

  if (message.includes('pair is not currently mutual top-3 eligible for chat')) {
    return 'NOT_MUTUAL_TOP3'
  }

  if (message.includes('thread not accessible')) {
    return 'THREAD_NOT_ACCESSIBLE'
  }

  if (error?.code === '22023') {
    return 'INVALID_REQUEST'
  }

  if (error?.code === '42501') {
    return 'THREAD_NOT_ACCESSIBLE'
  }

  return 'UNKNOWN'
}

const toErrorMessage = (code: ChatServiceErrorCode): string => {
  if (code === 'NOT_MUTUAL_TOP3') return 'Este match já não é mutual top-3. Não foi possível abrir chat.'
  if (code === 'THREAD_NOT_ACCESSIBLE') return 'Não tens acesso a este chat.'
  if (code === 'INVALID_REQUEST') return 'Pedido inválido para o chat.'
  return 'Ocorreu um erro inesperado no chat.'
}

const throwChatServiceError = (error: PostgrestError | null): never => {
  const code = toErrorCode(error)
  throw new ChatServiceError(toErrorMessage(code), code, error)
}

export const getOrCreateThread = async (matchUserId: string): Promise<ChatThreadSummary> => {
  const normalizedMatchUserId = matchUserId.trim()
  if (!normalizedMatchUserId) {
    throw new ChatServiceError('Match inválido para chat.', 'INVALID_REQUEST')
  }

  const { data, error } = await supabase.rpc('create_thread_if_mutual', {
    match_user_id: normalizedMatchUserId
  })

  if (error) {
    throwChatServiceError(error)
  }

  const createdThread = normalizeThread(Array.isArray(data) ? data[0] : data)
  if (!createdThread) {
    throw new ChatServiceError('Não foi possível identificar a thread criada.', 'UNKNOWN')
  }

  const allThreads = await listMyThreads()
  const completeThread = allThreads.find((thread) => thread.thread_id === createdThread.thread_id)

  if (completeThread) {
    return completeThread
  }

  return createdThread
}

export const listMyThreads = async (): Promise<ChatThreadSummary[]> => {
  const { data, error } = await supabase.rpc('list_my_threads')

  if (error) {
    throwChatServiceError(error)
  }

  if (!Array.isArray(data)) {
    return []
  }

  return data
    .map((row) => normalizeThread(row))
    .filter((thread): thread is ChatThreadSummary => thread !== null)
}

export const listMessages = async (threadId: string): Promise<ChatThreadMessage[]> => {
  const normalizedThreadId = threadId.trim()
  if (!normalizedThreadId) {
    throw new ChatServiceError('Thread inválida.', 'INVALID_REQUEST')
  }

  const { data, error } = await supabase.rpc('list_thread_messages', {
    p_thread_id: normalizedThreadId,
    p_limit: 200
  })

  if (error) {
    throwChatServiceError(error)
  }

  if (!Array.isArray(data)) {
    return []
  }

  return data
    .map((row) => normalizeMessage(row))
    .filter((message): message is ChatThreadMessage => message !== null)
}

export const sendMessage = async (threadId: string, body: string): Promise<ChatThreadMessage> => {
  const normalizedThreadId = threadId.trim()
  const normalizedBody = body.trim()

  if (!normalizedThreadId) {
    throw new ChatServiceError('Thread inválida.', 'INVALID_REQUEST')
  }

  if (!normalizedBody) {
    throw new ChatServiceError('A mensagem não pode estar vazia.', 'INVALID_REQUEST')
  }

  const { data, error } = await supabase.rpc('send_thread_message', {
    p_thread_id: normalizedThreadId,
    p_body: normalizedBody
  })

  if (error) {
    throwChatServiceError(error)
  }

  const sentMessage = normalizeMessage(Array.isArray(data) ? data[0] : data)
  if (!sentMessage) {
    throw new ChatServiceError('Não foi possível ler a mensagem enviada.', 'UNKNOWN')
  }

  return sentMessage
}

export const subscribeReveal = (onRevealChanged: (revealEnabled: boolean) => void): (() => void) => {
  const channel = supabase
    .channel(`reveal-settings-${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'app_settings',
        filter: 'id=eq.1'
      },
      (payload) => {
        const nextState = parseRecord(payload.new) ?? parseRecord(payload.old)
        if (!nextState) return
        if (!Object.prototype.hasOwnProperty.call(nextState, 'reveal_enabled')) return

        onRevealChanged(parseBoolean(nextState.reveal_enabled))
      }
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
