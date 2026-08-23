import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { writeClipboardText } from '@/components/ui/copy-button'
import {
  createInbox as createInboxApi,
  getMailAddress,
  getPodWallets,
  listMail,
  type MailInbox,
  type MailMessage,
  type PodWallet,
  readMail,
  sendMail as sendMailApi
} from '@/hermes'
import { ArrowLeft, Check, Copy, Inbox, Loader2, Mail, PenSquare, RefreshCw, Send, ShieldCheck } from '@/lib/icons'

import type { SetStatusbarItemGroup } from '../shell/statusbar-controls'

type View = 'list' | 'read' | 'compose'
type Filter = 'all' | 'inbound' | 'outbound'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function parseRecipients(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map(s => s.trim())
    .filter(Boolean)
}

function formatDate(iso: string | null): string {
  if (!iso) {
    return ''
  }

  const d = new Date(iso)

  if (Number.isNaN(d.getTime())) {
    return ''
  }

  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const inputCls =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary'

// Inbound email HTML is untrusted. sandbox="" already blocks scripts/forms/
// popups/navigation; this CSP additionally blocks remote subresource loads —
// tracking pixels that would otherwise leak a read-receipt + the user's IP the
// moment a message is opened — while still allowing inline styles and data: URIs.
const EMAIL_CSP =
  '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\'; font-src data:">'

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  const onCopy = useCallback(async () => {
    await writeClipboardText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }, [value])

  return (
    <button
      aria-label="Copy email address"
      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      onClick={() => void onCopy()}
      title="Copy email address"
      type="button"
    >
      {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
    </button>
  )
}

interface AgentMailViewProps extends React.ComponentProps<'section'> {
  setStatusbarItemGroup?: SetStatusbarItemGroup
}

export function AgentMailView({ setStatusbarItemGroup: _setStatusbarItemGroup, ...props }: AgentMailViewProps) {
  // ── Agent selection (the MCP requires an explicit agent_id) ────────
  const [agents, setAgents] = useState<PodWallet[]>([])
  const [agentId, setAgentId] = useState('')
  // Latest agent the user has selected. In-flight loads capture the agent they
  // were started for and drop their response if it no longer matches — so a
  // slow response for a previously-selected agent can't overwrite the current
  // one (out-of-order / wrong-agent display).
  const currentAgentRef = useRef('')

  // ── Inbox state ────────────────────────────────────────────────────
  const [inbox, setInbox] = useState<MailInbox | null>(null)
  const [hasInbox, setHasInbox] = useState(false)
  const [inboxLoading, setInboxLoading] = useState(true)
  const [inboxError, setInboxError] = useState<string | null>(null)
  // True once we know the account has no ClawPump agent wallet at all (empty
  // list, a failed call, or the MCP isn't configured) — distinct from "inbox
  // not provisioned yet". Without this the tab would spin forever on first run.
  const [noAgents, setNoAgents] = useState(false)

  // ── Provisioning ───────────────────────────────────────────────────
  const [username, setUsername] = useState('')
  const [creating, setCreating] = useState(false)
  const [createArmed, setCreateArmed] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // ── Messages ───────────────────────────────────────────────────────
  const [view, setView] = useState<View>('list')
  const [filter, setFilter] = useState<Filter>('all')
  const [messages, setMessages] = useState<MailMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messagesError, setMessagesError] = useState<string | null>(null)
  const [selected, setSelected] = useState<MailMessage | null>(null)
  const [selectedLoading, setSelectedLoading] = useState(false)

  // ── Compose ────────────────────────────────────────────────────────
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [sending, setSending] = useState(false)
  const [sendArmed, setSendArmed] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const loadInbox = useCallback(() => {
    if (!agentId) {
      return
    }

    const forAgent = agentId
    setInboxLoading(true)
    setInboxError(null)
    getMailAddress(agentId)
      .then(resp => {
        if (currentAgentRef.current !== forAgent) {
          return
        }

        if (resp.ok) {
          setInbox(resp.inbox)
          setHasInbox(resp.has_inbox)
        } else {
          setInbox(null)
          setHasInbox(false)
          setInboxError(resp.error ?? 'Could not load inbox')
        }
      })
      .catch(e => {
        if (currentAgentRef.current === forAgent) {
          setInboxError(e instanceof Error ? e.message : String(e))
        }
      })
      .finally(() => {
        if (currentAgentRef.current === forAgent) {
          setInboxLoading(false)
        }
      })
  }, [agentId])

  const loadMessages = useCallback(() => {
    if (!agentId) {
      return
    }

    const forAgent = agentId
    setMessagesLoading(true)
    setMessagesError(null)
    listMail({ agentId, direction: filter === 'all' ? undefined : filter, limit: 100 })
      .then(resp => {
        if (currentAgentRef.current !== forAgent) {
          return
        }

        if (resp.ok) {
          setMessages(resp.messages ?? [])
        } else {
          setMessagesError(resp.error ?? 'Could not load messages')
          setMessages([])
        }
      })
      .catch(e => {
        if (currentAgentRef.current === forAgent) {
          setMessagesError(e instanceof Error ? e.message : String(e))
        }
      })
      .finally(() => {
        if (currentAgentRef.current === forAgent) {
          setMessagesLoading(false)
        }
      })
  }, [agentId, filter])

  // Load the agent list once; default to the first agent.
  useEffect(() => {
    getPodWallets()
      .then(r => {
        if (r.ok && r.wallets.length) {
          setAgents(r.wallets)
          setAgentId(cur => cur || r.wallets[0].agent_id)
        } else {
          // No ClawPump agent wallet (empty list, a non-ok response, or the
          // MCP isn't configured). There's no agent to load an inbox for, so
          // stop the initial spinner and show an empty state instead of
          // spinning forever (loadInbox early-returns while agentId is '').
          setNoAgents(true)
          setInboxLoading(false)
        }
      })
      .catch(() => {
        setNoAgents(true)
        setInboxLoading(false)
      })
  }, [])

  // Keep the ref in sync BEFORE the load effect below runs, so a load started
  // for the newly-selected agent sees a matching ref and stale in-flight loads
  // for a previous agent are dropped when they resolve.
  // eslint-disable-next-line no-restricted-syntax -- request identity guard, not a nanostores atom mirror
  useEffect(() => {
    currentAgentRef.current = agentId
  }, [agentId])

  useEffect(() => {
    loadInbox()
  }, [loadInbox])

  useEffect(() => {
    if (hasInbox) {
      loadMessages()
    }
  }, [hasInbox, loadMessages])

  const createInbox = useCallback(() => {
    setCreating(true)
    setCreateError(null)
    createInboxApi({ agent_id: agentId, username: username.trim() || undefined, confirm: true })
      .then(resp => {
        if (resp.ok) {
          setCreateArmed(false)

          if (resp.inbox) {
            setInbox(resp.inbox)
            setHasInbox(true)
          } else {
            loadInbox()
          }
        } else {
          setCreateError(resp.error ?? 'Could not create inbox')
        }
      })
      .catch(e => setCreateError(e instanceof Error ? e.message : String(e)))
      .finally(() => setCreating(false))
  }, [agentId, username, loadInbox])

  const openMessage = useCallback(
    (m: MailMessage) => {
      const forAgent = agentId
      setSelected(m)
      setView('read')
      setSelectedLoading(true)
      readMail(m.messageId, agentId)
        .then(resp => {
          if (currentAgentRef.current !== forAgent) {
            return
          }

          if (resp.ok && resp.message) {
            setSelected(resp.message)
          }
        })
        .catch(() => {})
        .finally(() => {
          if (currentAgentRef.current === forAgent) {
            setSelectedLoading(false)
          }
        })
    },
    [agentId]
  )

  // Confirmation must count every real recipient (To + Cc + Bcc), not just To.
  const recipientCount = useMemo(
    () => parseRecipients(to).length + parseRecipients(cc).length + parseRecipients(bcc).length,
    [to, cc, bcc]
  )
  const selectedWallet = useMemo(() => agents.find(a => a.agent_id === agentId) ?? null, [agents, agentId])

  const startCompose = useCallback(() => {
    setSendError(null)
    setSendArmed(false)
    setView('compose')
  }, [])

  const sendMail = useCallback(() => {
    const toList = parseRecipients(to)
    const ccList = parseRecipients(cc)
    const bccList = parseRecipients(bcc)
    const bad = [...toList, ...ccList, ...bccList].find(a => !EMAIL_RE.test(a))

    if (toList.length === 0) {
      setSendError('Add at least one recipient.')
      setSendArmed(false)

      return
    }

    if (bad) {
      setSendError(`Not a valid email: ${bad}`)
      setSendArmed(false)

      return
    }

    if (!subject.trim()) {
      setSendError('Add a subject.')
      setSendArmed(false)

      return
    }

    if (!bodyText.trim()) {
      setSendError('Write a message.')
      setSendArmed(false)

      return
    }

    setSending(true)
    setSendError(null)
    sendMailApi({
      agent_id: agentId,
      to: toList,
      cc: ccList.length ? ccList : undefined,
      bcc: bccList.length ? bccList : undefined,
      subject: subject.trim(),
      text: bodyText,
      reply_to: replyTo.trim() || undefined,
      confirm: true
    })
      .then(resp => {
        if (resp.ok) {
          setTo('')
          setCc('')
          setBcc('')
          setSubject('')
          setBodyText('')
          setReplyTo('')
          setSendArmed(false)
          setView('list')
          loadMessages()
        } else {
          setSendError(resp.error ?? 'Send failed')
          setSendArmed(false)
        }
      })
      .catch(e => {
        setSendError(e instanceof Error ? e.message : String(e))
        setSendArmed(false)
      })
      .finally(() => setSending(false))
  }, [agentId, to, cc, bcc, subject, bodyText, replyTo, loadMessages])

  const lowBalance = selectedWallet != null && (selectedWallet.usdc_balance ?? 0) < 2

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <section {...props} className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Mail className="size-5 text-muted-foreground" />
              <h1 className="text-lg font-semibold">Agent Mail</h1>
              {agents.length > 0 && (
                <select
                  className="ml-1 max-w-[180px] rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
                  onChange={e => {
                    setAgentId(e.target.value)
                    setView('list')
                    setSelected(null)
                    // Drop the previous agent's inbox/messages immediately so
                    // its address + verified badge don't linger under the newly
                    // selected agent while its inbox loads.
                    setInbox(null)
                    setHasInbox(false)
                    setMessages([])
                    setInboxError(null)
                    setMessagesError(null)
                    setInboxLoading(true)
                  }}
                  title="Select agent"
                  value={agentId}
                >
                  {agents.map(a => (
                    <option key={a.agent_id} value={a.agent_id}>
                      {a.name || a.agent_id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {hasInbox && view === 'list' && (
              <div className="flex items-center gap-2">
                <Button onClick={loadMessages} size="icon" title="Refresh" variant="ghost">
                  <RefreshCw className={messagesLoading ? 'size-4 animate-spin' : 'size-4'} />
                </Button>
                <Button onClick={startCompose} size="sm">
                  <PenSquare className="size-4" /> Compose
                </Button>
              </div>
            )}
          </div>

          {/* Inbox address bar */}
          {hasInbox && inbox && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <Inbox className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-mono text-sm text-emerald-300">{inbox.emailAddress}</span>
                <CopyButton value={inbox.emailAddress} />
              </div>
              <div className="flex items-center gap-1.5">
                {inbox.verified && (
                  <Badge className="shrink-0" variant="default">
                    <ShieldCheck className="mr-1 size-3" /> verified
                  </Badge>
                )}
                {inbox.status && inbox.status !== 'active' && <Badge variant="muted">{inbox.status}</Badge>}
              </div>
            </div>
          )}

          {inboxError && (
            <div className="rounded-lg border border-destructive/40 bg-card px-3 py-3 text-sm text-destructive">
              {inboxError}
            </div>
          )}

          {inboxLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : noAgents ? (
            <div className="space-y-2 rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">No agent wallet found</h2>
              <p className="text-sm text-muted-foreground">
                Agent Mail needs a ClawPump agent wallet. Connect the ClawPump MCP and create an
                agent, then reopen this tab.
              </p>
            </div>
          ) : !hasInbox ? (
            /* ── Provision an inbox ─────────────────────────────────────── */
            <div className="space-y-3 rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">No inbox yet</h2>
              <p className="text-sm text-muted-foreground">
                Give this agent a real email address (e.g.{' '}
                <span className="font-mono text-foreground">name@agentmail.to</span>) so it can send and receive
                mail. Provisioning is a one-time <span className="font-semibold text-foreground">~$2 USDC</span>{' '}
                payment from the agent&apos;s own wallet over x402.
              </p>
              {selectedWallet && (
                <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                  <span className="text-sm text-muted-foreground">This agent&apos;s USDC balance</span>
                  <span
                    className={`font-mono text-sm font-semibold ${
                      (selectedWallet.usdc_balance ?? 0) >= 2 ? 'text-emerald-300' : 'text-amber-300'
                    }`}
                  >
                    {selectedWallet.usdc_balance != null ? `$${selectedWallet.usdc_balance.toFixed(2)}` : '—'}
                  </span>
                </div>
              )}
              {lowBalance && (
                <p className="text-xs text-amber-300">
                  Not enough USDC for the ~$2 fee — add USDC to this agent&apos;s wallet (or swap
                  SOL&nbsp;→&nbsp;USDC) before creating the inbox.
                </p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className={inputCls + ' sm:flex-1'}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="optional username (a-z, 0-9, dot, dash) — omit to auto-generate"
                  value={username}
                />
              </div>
              {createError && <p className="text-sm text-destructive">{createError}</p>}
              {createArmed ? (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                  <span className="text-sm text-amber-200">
                    This pays <span className="font-semibold">~$2 USDC</span> from the agent wallet. Continue?
                  </span>
                  <div className="ml-auto flex gap-2">
                    <Button onClick={() => setCreateArmed(false)} size="sm" variant="text">
                      Cancel
                    </Button>
                    <Button disabled={creating} onClick={createInbox} size="sm">
                      {creating ? 'Creating…' : 'Confirm & pay'}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button disabled={creating} onClick={() => setCreateArmed(true)}>
                  Create inbox
                </Button>
              )}
            </div>
          ) : view === 'compose' ? (
            /* ── Compose ────────────────────────────────────────────────── */
            <div className="space-y-3 rounded-lg border border-border bg-card p-4">
              <div className="flex flex-row items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">New email</h2>
                <button
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setView('list')}
                  type="button"
                >
                  <ArrowLeft className="size-4" /> Back
                </button>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">To</label>
                <input
                  className={inputCls}
                  onChange={e => setTo(e.target.value)}
                  placeholder="alice@example.com, bob@example.com"
                  value={to}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Cc (optional)</label>
                  <input className={inputCls} onChange={e => setCc(e.target.value)} value={cc} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Bcc (optional)</label>
                  <input className={inputCls} onChange={e => setBcc(e.target.value)} value={bcc} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Subject</label>
                <input className={inputCls} onChange={e => setSubject(e.target.value)} value={subject} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Message</label>
                <textarea
                  className={inputCls + ' resize-y font-sans'}
                  onChange={e => setBodyText(e.target.value)}
                  rows={10}
                  value={bodyText}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Reply-To (optional)</label>
                <input className={inputCls} onChange={e => setReplyTo(e.target.value)} value={replyTo} />
              </div>

              {sendError && <p className="text-sm text-destructive">{sendError}</p>}

              {sendArmed ? (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                  <span className="text-sm text-amber-200">
                    Send a real email from <span className="font-mono">{inbox?.emailAddress}</span> to{' '}
                    {recipientCount} recipient{recipientCount === 1 ? '' : 's'}? Any per-send fee is paid in USDC
                    from the agent wallet.
                  </span>
                  <div className="ml-auto flex gap-2">
                    <Button onClick={() => setSendArmed(false)} size="sm" variant="text">
                      Cancel
                    </Button>
                    <Button disabled={sending} onClick={sendMail} size="sm">
                      <Send className="size-4" /> {sending ? 'Sending…' : 'Send now'}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  disabled={sending}
                  onClick={() => {
                    setSendError(null)
                    setSendArmed(true)
                  }}
                >
                  <Send className="size-4" /> Send
                </Button>
              )}
            </div>
          ) : view === 'read' && selected ? (
            /* ── Read one message ───────────────────────────────────────── */
            <div className="space-y-3 rounded-lg border border-border bg-card p-4">
              <div className="space-y-2">
                <button
                  className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setView('list')}
                  type="button"
                >
                  <ArrowLeft className="size-4" /> Back to inbox
                </button>
                <h2 className="text-base font-semibold">{selected.subject || '(no subject)'}</h2>
                <div className="space-y-0.5 text-xs text-muted-foreground">
                  <div>
                    <Badge className="mr-2" variant={selected.direction === 'inbound' ? 'muted' : 'default'}>
                      {selected.direction === 'inbound' ? 'received' : 'sent'}
                    </Badge>
                    {formatDate(selected.agentmailCreatedAt || selected.createdAt)}
                  </div>
                  {selected.fromAddress && (
                    <div>
                      <span className="text-foreground/70">From:</span> {selected.fromAddress}
                    </div>
                  )}
                  {selected.toAddresses?.length > 0 && (
                    <div>
                      <span className="text-foreground/70">To:</span> {selected.toAddresses.join(', ')}
                    </div>
                  )}
                  {selected.ccAddresses?.length > 0 && (
                    <div>
                      <span className="text-foreground/70">Cc:</span> {selected.ccAddresses.join(', ')}
                    </div>
                  )}
                </div>
              </div>
              {selectedLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : selected.textBody ? (
                <pre className="whitespace-pre-wrap break-words font-sans text-sm text-foreground/90">
                  {selected.textBody}
                </pre>
              ) : selected.htmlBody ? (
                <iframe
                  className="h-[60vh] w-full rounded-md border border-border bg-white"
                  referrerPolicy="no-referrer"
                  sandbox=""
                  srcDoc={EMAIL_CSP + selected.htmlBody}
                  title="email body"
                />
              ) : (
                <p className="text-sm text-muted-foreground">{selected.preview || '(empty message)'}</p>
              )}
            </div>
          ) : (
            /* ── Inbox list ─────────────────────────────────────────────── */
            <div className="space-y-3">
              <div className="flex gap-1">
                {(['all', 'inbound', 'outbound'] as Filter[]).map(f => (
                  <button
                    className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                      filter === f
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                    key={f}
                    onClick={() => setFilter(f)}
                    type="button"
                  >
                    {f === 'all' ? 'All' : f === 'inbound' ? 'Inbox' : 'Sent'}
                  </button>
                ))}
              </div>

              {messagesError && (
                <div className="rounded-lg border border-destructive/40 bg-card px-3 py-3 text-sm text-destructive">
                  {messagesError}
                </div>
              )}

              {messagesLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="rounded-lg border border-border bg-card py-8 text-center text-sm text-muted-foreground">
                  No messages yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map(m => {
                    const who =
                      m.direction === 'inbound'
                        ? m.fromAddress || 'unknown sender'
                        : `To: ${m.toAddresses?.join(', ') || '—'}`

                    return (
                      <button
                        className="w-full rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/30"
                        key={m.id}
                        onClick={() => openMessage(m)}
                        type="button"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            {m.direction === 'inbound' ? (
                              <Inbox className="size-3.5 shrink-0 text-muted-foreground" />
                            ) : (
                              <Send className="size-3.5 shrink-0 text-muted-foreground" />
                            )}
                            <span
                              className={`truncate text-sm ${
                                m.direction === 'inbound' && !m.read
                                  ? 'font-semibold text-foreground'
                                  : 'text-foreground/80'
                              }`}
                            >
                              {who}
                            </span>
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatDate(m.agentmailCreatedAt || m.createdAt)}
                          </span>
                        </div>
                        <div className="mt-1 truncate text-sm text-foreground/90">
                          {m.subject || '(no subject)'}
                        </div>
                        {m.preview && (
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">{m.preview}</div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
