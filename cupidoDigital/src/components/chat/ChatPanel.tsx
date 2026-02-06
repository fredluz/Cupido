import React, { useEffect, useMemo, useState } from 'react'
import { getOrCreateDeviceUserId } from '../../supabaseClient'
import { ChatServiceError, ChatThreadMessage, ChatThreadSummary, getOrCreateThread, listMessages, listMyThreads, sendMessage, subscribeReveal } from '../../services/chat'
import { QuizResponse } from '../../types'
import { chatStyles } from '../../styles'

interface ChatPanelProps {
  topMatches: QuizResponse[]
}

// High contrast dark text on light backgrounds (aligns with Results page)
const DARK_TEXT = '#0f172a'
const DARK_TEXT_MUTED = '#475569'
const DARK_TEXT_SUBTLE = '#64748b'
const ACCENT_CYAN = '#0891b2'

const threadSort = (a: ChatThreadSummary, b: ChatThreadSummary): number => {
  const aTs = Date.parse(a.last_message_at || a.created_at || '')
  const bTs = Date.parse(b.last_message_at || b.created_at || '')
  return (Number.isFinite(bTs) ? bTs : 0) - (Number.isFinite(aTs) ? aTs : 0)
}

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

const formatTimeShort = (value: string | null): string => {
  if (!value) return ''
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return ''
  return new Intl.DateTimeFormat('pt-PT', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(parsed))
}

const getChatErrorMessage = (error: unknown): string => {
  if (error instanceof ChatServiceError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Ocorreu um erro inesperado no chat.'
}

// Compact local styles aligned with Results page
const localStyles = {
  // Header area
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

  // Section headers
  sectionTitle: {
    margin: '0 0 0.5rem 0',
    fontWeight: 600,
    color: DARK_TEXT,
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
  },

  // Errors and empty states
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

  // Match items
  matchItem: {
    borderRadius: '10px',
    padding: '0.625rem 0.75rem',
    marginBottom: '0.375rem',
    background: 'rgba(255, 255, 255, 0.4)',
    border: '1px solid rgba(0, 0, 0, 0.06)',
    transition: 'all 0.2s ease',
  },
  matchItemDisabled: {
    background: 'rgba(0, 0, 0, 0.03)',
    opacity: 0.7,
  },
  matchItemContent: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '0.5rem',
    alignItems: 'center',
  },
  matchInfo: {
    flex: 1,
    minWidth: 0,
  },
  matchName: {
    margin: 0,
    fontWeight: 600,
    color: DARK_TEXT,
    fontSize: '0.9rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  matchStatus: {
    margin: '0.125rem 0 0 0',
    color: DARK_TEXT_SUBTLE,
    fontSize: '0.8rem',
  },
  actionButton: {
    flex: 'none',
    padding: '0.4rem 0.75rem',
    fontSize: '0.8rem',
    fontWeight: 500,
    borderRadius: '8px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    background: 'rgba(255, 255, 255, 0.7)',
    color: DARK_TEXT,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  },
  actionButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },

  // Thread list
  threadList: {
    marginBottom: '0.75rem',
  },
  getThreadButton: (isSelected: boolean) => ({
    width: '100%',
    textAlign: 'left' as const,
    border: `1px solid ${isSelected ? ACCENT_CYAN : 'rgba(0, 0, 0, 0.06)'}`,
    borderRadius: '10px',
    background: isSelected ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.5)',
    padding: '0.625rem 0.75rem',
    marginBottom: '0.375rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  }),
  threadHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.5rem',
  },
  threadName: {
    fontWeight: 600,
    color: DARK_TEXT,
    fontSize: '0.9rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  threadDate: {
    color: DARK_TEXT_SUBTLE,
    fontSize: '0.75rem',
    flexShrink: 0,
  },
  threadPreview: {
    margin: '0.25rem 0 0 0',
    color: DARK_TEXT_MUTED,
    fontSize: '0.8rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  // Conversation
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

  // Input area
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

  // Divider
  divider: {
    borderTop: '1px solid rgba(0, 0, 0, 0.08)',
    paddingTop: '0.75rem',
    marginTop: '0.25rem',
  },
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ topMatches }) => {
  const [threads, setThreads] = useState<ChatThreadSummary[]>([])
  const [isLoadingThreads, setIsLoadingThreads] = useState(true)
  const [threadsError, setThreadsError] = useState('')

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatThreadMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [messagesError, setMessagesError] = useState('')

  const [creatingForUserId, setCreatingForUserId] = useState<string | null>(null)
  const [createError, setCreateError] = useState('')
  const [draftMessage, setDraftMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState('')

  const myUserId = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return getOrCreateDeviceUserId()
  }, [])

  const threadByOtherUserId = useMemo(
    () => new Map(threads.map((thread) => [thread.other_user_id, thread])),
    [threads]
  )

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.thread_id === selectedThreadId) || null,
    [threads, selectedThreadId]
  )

  const refreshThreads = async (preferredThreadId: string | null = null) => {
    const fetchedThreads = await listMyThreads()
    const sortedThreads = [...fetchedThreads].sort(threadSort)
    setThreads(sortedThreads)

    if (sortedThreads.length === 0) {
      setSelectedThreadId(null)
      return
    }

    if (preferredThreadId && sortedThreads.some((thread) => thread.thread_id === preferredThreadId)) {
      setSelectedThreadId(preferredThreadId)
      return
    }

    setSelectedThreadId((currentThreadId) => {
      if (currentThreadId && sortedThreads.some((thread) => thread.thread_id === currentThreadId)) {
        return currentThreadId
      }
      return sortedThreads[0].thread_id
    })
  }

  const loadMessagesForThread = async (threadId: string, silent = false) => {
    if (!silent) {
      setIsLoadingMessages(true)
      setMessagesError('')
    }

    try {
      const threadMessages = await listMessages(threadId)
      setMessages(threadMessages)
    } catch (error) {
      setMessagesError(getChatErrorMessage(error))
      if (!silent) {
        setMessages([])
      }
    } finally {
      if (!silent) {
        setIsLoadingMessages(false)
      }
    }
  }

  useEffect(() => {
    const run = async () => {
      setIsLoadingThreads(true)
      setThreadsError('')
      try {
        await refreshThreads()
      } catch (error) {
        setThreadsError(getChatErrorMessage(error))
      } finally {
        setIsLoadingThreads(false)
      }
    }

    run().catch((error) => {
      setThreadsError(getChatErrorMessage(error))
      setIsLoadingThreads(false)
    })
  }, [])

  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([])
      return
    }

    loadMessagesForThread(selectedThreadId).catch((error) => {
      setMessagesError(getChatErrorMessage(error))
      setIsLoadingMessages(false)
    })
  }, [selectedThreadId])

  useEffect(() => {
    if (!selectedThreadId) return

    const interval = window.setInterval(() => {
      loadMessagesForThread(selectedThreadId, true).catch(() => undefined)
    }, 7000)

    return () => {
      window.clearInterval(interval)
    }
  }, [selectedThreadId])

  useEffect(() => {
    const unsubscribe = subscribeReveal(() => {
      refreshThreads(selectedThreadId)
        .catch((error) => {
          setThreadsError(getChatErrorMessage(error))
        })

      if (!selectedThreadId) return

      loadMessagesForThread(selectedThreadId, true).catch((error) => {
        setMessagesError(getChatErrorMessage(error))
      })
    })

    return () => {
      unsubscribe()
    }
  }, [selectedThreadId])

  const handleOpenOrCreateFromMatch = async (matchUserId: string, threadId: string | null) => {
    setCreateError('')

    if (threadId) {
      setSelectedThreadId(threadId)
      return
    }

    setCreatingForUserId(matchUserId)
    try {
      const createdThread = await getOrCreateThread(matchUserId)
      await refreshThreads(createdThread.thread_id)
    } catch (error) {
      setCreateError(getChatErrorMessage(error))
    } finally {
      setCreatingForUserId(null)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedThreadId || isSending) return

    const trimmedBody = draftMessage.trim()
    if (!trimmedBody) return

    setIsSending(true)
    setSendError('')

    try {
      const sent = await sendMessage(selectedThreadId, trimmedBody)
      setDraftMessage('')
      setMessages((prevMessages) => [...prevMessages, sent])
      setThreads((prevThreads) => {
        const updated = prevThreads.map((thread) => {
          if (thread.thread_id !== selectedThreadId) return thread
          return {
            ...thread,
            last_message_at: sent.created_at,
            last_message_preview: sent.body
          }
        })
        return updated.sort(threadSort)
      })
    } catch (error) {
      setSendError(getChatErrorMessage(error))
    } finally {
      setIsSending(false)
    }
  }

  const handleRefresh = () => {
    setIsLoadingThreads(true)
    setThreadsError('')
    refreshThreads(selectedThreadId)
      .catch((error) => setThreadsError(getChatErrorMessage(error)))
      .finally(() => setIsLoadingThreads(false))
  }

  return (
    <div>
      {/* Compact header with title and refresh */}
      <div style={localStyles.headerRow}>
        <h3 style={localStyles.panelTitle}>
          <span>💬</span>
          <span>Chat anónimo</span>
        </h3>
        <div style={localStyles.headerActions}>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoadingThreads}
            style={localStyles.iconButton}
            title="Atualizar chats"
          >
            <span style={isLoadingThreads ? localStyles.spin : undefined}>🔄</span>
          </button>
        </div>
      </div>

      <p style={localStyles.panelDescription}>
        Podes criar chat apenas com matches mutual top-3. Se uma thread já existir, o acesso mantém-se.
      </p>

      {createError && <p style={localStyles.errorText}>{createError}</p>}
      {threadsError && <p style={localStyles.errorText}>{threadsError}</p>}

      {/* Create/open chat from matches */}
      <div style={{ marginBottom: '0.75rem' }}>
        <p style={localStyles.sectionTitle}>
          <span>✨</span>
          <span>Criar ou abrir chat</span>
        </p>
        {topMatches.length === 0 && (
          <p style={localStyles.emptyState}>
            Sem matches para abrir chat.
          </p>
        )}
        {topMatches.map((match, index) => {
          const matchUserId = match.user_id
          if (!matchUserId) return null

          const existingThread = threadByOtherUserId.get(matchUserId)
          const canCreate = Boolean(match.is_mutual_top3)
          const disabled = !existingThread && !canCreate
          const isBusy = creatingForUserId === matchUserId
          const actionLabel = existingThread ? 'Abrir' : 'Criar'

          return (
            <div
              key={`${matchUserId}-${index}`}
              style={{
                ...localStyles.matchItem,
                ...(disabled ? localStyles.matchItemDisabled : {}),
              }}
            >
              <div style={localStyles.matchItemContent}>
                <div style={localStyles.matchInfo}>
                  <p style={localStyles.matchName}>
                    {match.user_name || 'Unknown'}
                  </p>
                  <p style={localStyles.matchStatus}>
                    {existingThread
                      ? `💬 ${existingThread.other_display_name}`
                      : canCreate
                        ? 'Elegível para novo chat'
                        : 'Não elegível neste momento'}
                  </p>
                </div>
                <button
                  type="button"
                  style={{
                    ...localStyles.actionButton,
                    ...(disabled || isBusy ? localStyles.actionButtonDisabled : {}),
                  }}
                  disabled={disabled || isBusy}
                  onClick={() => handleOpenOrCreateFromMatch(matchUserId, existingThread?.thread_id || null)}
                >
                  {isBusy ? '...' : actionLabel}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Thread list */}
      <div style={localStyles.threadList}>
        <p style={localStyles.sectionTitle}>
          <span>💬</span>
          <span>As tuas conversas</span>
        </p>
        {isLoadingThreads && threads.length === 0 && (
          <p style={localStyles.emptyState}>A carregar conversas...</p>
        )}
        {!isLoadingThreads && threads.length === 0 && (
          <p style={localStyles.emptyState}>
            Ainda não tens chats.
          </p>
        )}
        {threads.map((thread) => (
          <button
            key={thread.thread_id}
            type="button"
            style={localStyles.getThreadButton(thread.thread_id === selectedThreadId)}
            onClick={() => setSelectedThreadId(thread.thread_id)}
          >
            <div style={localStyles.threadHeader}>
              <span style={localStyles.threadName}>{thread.other_display_name}</span>
              <span style={localStyles.threadDate}>{formatTimeShort(thread.last_message_at || thread.created_at)}</span>
            </div>
            <p style={localStyles.threadPreview}>
              {thread.last_message_preview || 'Sem mensagens ainda'}
            </p>
          </button>
        ))}
      </div>

      {/* Selected conversation */}
      <div style={localStyles.divider}>
        {selectedThread ? (
          <>
            <p style={localStyles.conversationHeader}>
              <span>💬</span>
              <span>Conversa com {selectedThread.other_display_name}</span>
            </p>

            <div style={chatStyles.chatContainer}>
              {isLoadingMessages && messages.length === 0 && (
                <p style={localStyles.emptyState}>A carregar mensagens...</p>
              )}
              {messagesError && (
                <p style={localStyles.errorText}>{messagesError}</p>
              )}
              {!isLoadingMessages && !messagesError && messages.length === 0 && (
                <p style={localStyles.emptyState}>
                  Ainda não há mensagens nesta thread.
                </p>
              )}
              {messages.map((message) => {
                const isMine = message.sender_user_id === myUserId
                return (
                  <div
                    key={message.id}
                    style={localStyles.getMessageBubble(isMine)}
                  >
                    {!isMine && (
                      <div style={localStyles.messageSender}>
                        {message.sender_display_name}
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

            <form onSubmit={handleSendMessage}>
              <div style={localStyles.inputRow}>
                <textarea
                  value={draftMessage}
                  onChange={(e) => setDraftMessage(e.target.value)}
                  rows={2}
                  placeholder="Escreve uma mensagem..."
                  style={localStyles.textarea}
                  maxLength={500}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage(e)
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
          </>
        ) : (
          <p style={localStyles.emptyState}>
            Seleciona ou cria uma conversa para começar.
          </p>
        )}
      </div>
    </div>
  )
}
