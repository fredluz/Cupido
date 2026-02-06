import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'

export interface GroupSummary {
  group_id: string
  group_key: string
  group_label: string
  group_description: string
  group_thread_id: string
  member_count: number
  reveal_enabled: boolean
  my_alias: string
  my_display_name: string
}

export interface GroupMessage {
  id: number
  thread_id: string
  sender_user_id: string
  sender_alias: string
  sender_display_name: string
  reveal_enabled: boolean
  body: string
  created_at: string
}

export type GroupChatServiceErrorCode =
  | 'NOT_IN_GROUP'
  | 'THREAD_NOT_ACCESSIBLE'
  | 'INVALID_REQUEST'
  | 'UNKNOWN'

export class GroupChatServiceError extends Error {
  readonly code: GroupChatServiceErrorCode
  readonly causeError: PostgrestError | null

  constructor(message: string, code: GroupChatServiceErrorCode, causeError: PostgrestError | null = null) {
    super(message)
    this.name = 'GroupChatServiceError'
    this.code = code
    this.causeError = causeError
  }
}

const parseText = (value: unknown): string => (typeof value === 'string' ? value : '')

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

const parseRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object') return null
  return value as Record<string, unknown>
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

const normalizeGroup = (value: unknown): GroupSummary | null => {
  const row = parseRecord(value)
  if (!row) return null

  const groupId = parseText(row.group_id)
  const groupKey = parseText(row.group_key)
  const groupLabel = parseText(row.group_label)
  const groupDescription = parseText(row.group_description)
  const groupThreadId = parseText(row.group_thread_id)

  if (!groupId || !groupKey || !groupThreadId) return null

  return {
    group_id: groupId,
    group_key: groupKey,
    group_label: groupLabel || groupKey,
    group_description: groupDescription,
    group_thread_id: groupThreadId,
    member_count: parseNumber(row.member_count),
    reveal_enabled: parseBoolean(row.reveal_enabled),
    my_alias: parseText(row.my_alias),
    my_display_name: parseText(row.my_display_name)
  }
}

const normalizeMessage = (value: unknown): GroupMessage | null => {
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
    sender_display_name: senderDisplayName,
    reveal_enabled: parseBoolean(row.reveal_enabled),
    body,
    created_at: createdAt
  }
}

const toErrorCode = (error: PostgrestError | null): GroupChatServiceErrorCode => {
  const message = (error?.message || '').toLowerCase()

  if (
    message.includes('not in group') ||
    message.includes('no group assigned') ||
    message.includes('primary group unavailable')
  ) {
    return 'NOT_IN_GROUP'
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

const toErrorMessage = (code: GroupChatServiceErrorCode): string => {
  if (code === 'NOT_IN_GROUP') return 'Ainda não estás atribuído a nenhum grupo.'
  if (code === 'THREAD_NOT_ACCESSIBLE') return 'Não tens acesso a este chat de grupo.'
  if (code === 'INVALID_REQUEST') return 'Pedido inválido.'
  return 'Ocorreu um erro inesperado no chat de grupo.'
}

const throwGroupChatServiceError = (error: PostgrestError | null): never => {
  const code = toErrorCode(error)
  throw new GroupChatServiceError(toErrorMessage(code), code, error)
}

export const listMyGroup = async (): Promise<GroupSummary | null> => {
  const { data, error } = await supabase.rpc('list_my_group')

  if (error) {
    // If the error indicates no group, return null gracefully
    const code = toErrorCode(error)
    if (code === 'NOT_IN_GROUP') {
      return null
    }
    throwGroupChatServiceError(error)
  }

  if (!data) {
    return null
  }

  // Handle both array and single object responses
  const raw = Array.isArray(data) ? data[0] : data
  if (!raw) return null
  return normalizeGroup(raw)
}

export const listGroupMessages = async (threadId: string, limit = 100): Promise<GroupMessage[]> => {
  const normalizedThreadId = threadId.trim()
  if (!normalizedThreadId) {
    throw new GroupChatServiceError('Thread inválida.', 'INVALID_REQUEST')
  }

  const { data, error } = await supabase.rpc('list_group_messages', {
    p_thread_id: normalizedThreadId,
    p_limit: limit
  })

  if (error) {
    throwGroupChatServiceError(error)
  }

  if (!Array.isArray(data)) {
    return []
  }

  return data
    .map((row) => normalizeMessage(row))
    .filter((message): message is GroupMessage => message !== null)
}

export const sendGroupMessage = async (threadId: string, body: string): Promise<GroupMessage> => {
  const normalizedThreadId = threadId.trim()
  const normalizedBody = body.trim()

  if (!normalizedThreadId) {
    throw new GroupChatServiceError('Thread inválida.', 'INVALID_REQUEST')
  }

  if (!normalizedBody) {
    throw new GroupChatServiceError('A mensagem não pode estar vazia.', 'INVALID_REQUEST')
  }

  const { data, error } = await supabase.rpc('send_group_message', {
    p_thread_id: normalizedThreadId,
    p_body: normalizedBody
  })

  if (error) {
    throwGroupChatServiceError(error)
  }

  const sentMessage = normalizeMessage(Array.isArray(data) ? data[0] : data)
  if (!sentMessage) {
    throw new GroupChatServiceError('Não foi possível ler a mensagem enviada.', 'UNKNOWN')
  }

  return sentMessage
}
