import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { getOrCreateDeviceUserId } from '../../supabaseClient'
import { GroupChatServiceError, GroupMessage, GroupSummary, listGroupMessages, listMyGroup, sendGroupMessage } from '../../services/groupChat'
import { chatStyles } from '../../styles'

interface GroupChatPanelProps {
  group: GroupSummary | null
  onGroupChange?: (group: GroupSummary | null) => void
}

// High contrast dark text on light backgrounds
const DARK_TEXT = '#0f172a'
const DARK_TEXT_MUTED = '#475569'
const DARK_TEXT_SUBTLE = '#64748b'

const formatDateTime = (value: string | null): string => {
  if (!value) return ''
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return ''

  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(parsed))
}

const getGroupChatErrorMessage = (error: unknown): string => {
  if (error instanceof GroupChatServiceError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Ocorreu um erro inesperado no chat de grupo.'
}

// Compact local styles aligned with Results page
const localStyles = {
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  panelTitle: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: 700,
    color: DARK_TEXT,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  iconButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    background: 'rgba(255, 255, 255, 0.7)',
    color: DARK_TEXT_MUTED,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '0.9rem',
  },
  spin: {
    animation: 'spin 1s linear infinite',
  },
  panelDescription: {
    margin: '0 0 0.75rem 0',
    color: DARK_TEXT_SUBTLE,
    fontSize: '0.85rem',
    lineHeight: 1.5,
  },
  groupLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.375rem 0.75rem',
    background: 'rgba(255, 255, 255, 0.7)',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: DARK_TEXT,
    marginBottom: '0.75rem',
  },
  errorText: {
    color: '#dc2626',
    margin: '0 0 0.5rem 0',
    fontSize: '0.85rem',
  },
  emptyState: {
    color: DARK_TEXT_SUBTLE,
    margin: 0,
    fontSize: '0.85rem',
    fontStyle: 'italic',
  },
  conversationHeader: {
    margin: '0 0 0.5rem 0',
    fontWeight: 600,
    color: DARK_TEXT,
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
  },
  getMessageBubble: (isMine: boolean) => ({
    alignSelf: isMine ? 'flex-end' : 'flex-start',
    maxWidth: '85%',
    borderRadius: '12px',
    padding: '0.625rem 0.875rem',
    marginBottom: '0.375rem',
    background: isMine
      ? 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)'
      : 'rgba(255, 255, 255, 0.8)',
    color: isMine ? 'white' : DARK_TEXT,
    border: isMine ? 'none' : '1px solid rgba(0, 0, 0, 0.08)',
    boxShadow: isMine
      ? '0 2px 8px rgba(14, 165, 233, 0.25)'
      : '0 1px 4px rgba(0, 0, 0, 0.05)',
  }),
  messageSender: {
    fontSize: '0.7rem',
    opacity: 0.85,
    marginBottom: '0.15rem',
    fontWeight: 500,
  },
  messageTime: {
    fontSize: '0.65rem',
    opacity: 0.75,
    marginTop: '0.25rem',
  },
  inputRow: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'flex-start',
    marginTop: '0.5rem',
  },
  textarea: {
    flex: 1,
    minHeight: '44px',
    maxHeight: '100px',
    borderRadius: '10px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    padding: '0.625rem 0.75rem',
    resize: 'none' as const,
    background: 'rgba(255, 255, 255, 0.7)',
    color: DARK_TEXT,
    fontFamily: 'inherit',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'all 0.2s ease',
    lineHeight: 1.4,
  },
  sendButton: {
    flexShrink: 0,
    padding: '0.625rem 1rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    alignSelf: 'flex-end',
    height: '44px',
  },
  sendButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  charCount: {
    color: DARK_TEXT_SUBTLE,
    fontSize: '0.75rem',
    marginTop: '0.375rem',
    textAlign: 'right' as const,
  },
}

export const GroupChatPanel: React.FC<GroupChatPanelProps> = ({ group, onGroupChange }) => {
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  const [draftMessage, setDraftMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState('')

  const myUserId = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return getOrCreateDeviceUserId()
  }, [])

  const groupThreadId = group?.group_thread_id ?? null

  const loadMessages = useCallback(async (silent = false) => {
    if (!groupThreadId) return

    if (!silent) {
      setIsLoading(true)
      setLoadError('')
    }

    try {
      const msgs = await listGroupMessages(groupThreadId, 100)
      setMessages(msgs)
    } catch (error) {
      setLoadError(getGroupChatErrorMessage(error))
      if (!silent) {
        setMessages([])
      }
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }, [groupThreadId])

  const refreshGroup = async () => {
    try {
      const g = await listMyGroup()
      onGroupChange?.(g)
    } catch {
      // Silently ignore - group fetch is best-effort on refresh
    }
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    setLoadError('')
    await Promise.all([refreshGroup(), loadMessages()])
    setIsLoading(false)
  }

  useEffect(() => {
    if (!groupThreadId) {
      setMessages([])
      return
    }

    loadMessages()
  }, [groupThreadId, loadMessages])

  useEffect(() => {
    if (!groupThreadId) return

    const interval = window.setInterval(() => {
      loadMessages(true).catch(() => undefined)
    }, 8000)

    return () => {
      window.clearInterval(interval)
    }
  }, [groupThreadId, loadMessages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!group?.group_thread_id || isSending) return

    const trimmedBody = draftMessage.trim()
    if (!trimmedBody) return

    setIsSending(true)
    setSendError('')

    try {
      const sent = await sendGroupMessage(group.group_thread_id, trimmedBody)
      setDraftMessage('')
      setMessages((prev) => [...prev, sent])
    } catch (error) {
      setSendError(getGroupChatErrorMessage(error))
    } finally {
      setIsSending(false)
    }
  }

  if (!group) {
    return (
      <div>
        <div style={localStyles.headerRow}>
          <h3 style={localStyles.panelTitle}>
            <span>👥</span>
            <span>Chat de Grupo</span>
          </h3>
          <div style={localStyles.headerActions}>
            <button
              type="button"
              onClick={refreshGroup}
              style={localStyles.iconButton}
              title="Verificar atribuição de grupo"
            >
              🔄
            </button>
          </div>
        </div>
        <p style={localStyles.panelDescription}>
          Ainda não estás atribuído a nenhum grupo. O grupo será atribuído automaticamente pelo sistema.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Compact header with title and refresh */}
      <div style={localStyles.headerRow}>
        <h3 style={localStyles.panelTitle}>
          <span>👥</span>
          <span>Chat de Grupo</span>
        </h3>
        <div style={localStyles.headerActions}>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            style={localStyles.iconButton}
            title="Atualizar mensagens"
          >
            <span style={isLoading ? localStyles.spin : undefined}>🔄</span>
          </button>
        </div>
      </div>

      <p style={localStyles.panelDescription}>
        Chat anónimo com os outros membros do teu grupo atribuído.
      </p>

      {/* Group label */}
      <div style={localStyles.groupLabel}>
        <span>🏷️</span>
        <span>{group.group_label || group.group_key}</span>
      </div>

      {loadError && <p style={localStyles.errorText}>{loadError}</p>}

      {/* Messages */}
      <p style={localStyles.conversationHeader}>
        <span>💬</span>
        <span>Mensagens do grupo</span>
      </p>

      <div style={chatStyles.chatContainer}>
        {isLoading && messages.length === 0 && (
          <p style={localStyles.emptyState}>A carregar mensagens...</p>
        )}
        {!isLoading && messages.length === 0 && (
          <p style={localStyles.emptyState}>
            Ainda não há mensagens neste grupo. Sê o primeiro a escrever!
          </p>
        )}
        {messages.map((message) => {
          const isMine = message.sender_user_id === myUserId
          return (
            <div key={message.id} style={localStyles.getMessageBubble(isMine)}>
              {!isMine && (
                <div style={localStyles.messageSender}>
                  {message.sender_display_name || message.sender_alias || 'Anónimo'}
                </div>
              )}
              <div>{message.body}</div>
              <div style={localStyles.messageTime}>
                {formatDateTime(message.created_at)}
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <form onSubmit={handleSend}>
        <div style={localStyles.inputRow}>
          <textarea
            value={draftMessage}
            onChange={(e) => setDraftMessage(e.target.value)}
            rows={2}
            placeholder="Escreve uma mensagem para o grupo..."
            style={localStyles.textarea}
            maxLength={500}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend(e)
              }
            }}
          />
          <button
            type="submit"
            style={{
              ...localStyles.sendButton,
              ...(isSending || !draftMessage.trim() ? localStyles.sendButtonDisabled : {}),
            }}
            disabled={isSending || !draftMessage.trim()}
          >
            {isSending ? '...' : 'Enviar'}
          </button>
        </div>
        <div style={localStyles.charCount}>
          {draftMessage.trim().length}/500
        </div>
        {sendError && (
          <p style={{ ...localStyles.errorText, marginTop: '0.375rem', marginBottom: 0 }}>{sendError}</p>
        )}
      </form>
    </div>
  )
}
