import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Inbox,
  Mail,
  PenSquare,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import type { AgentWalletBalance, MailInbox, MailMessage } from "@/lib/api";
import { Button } from "@nous-research/ui/ui/components/button";
import { Badge } from "@nous-research/ui/ui/components/badge";
import { Spinner } from "@nous-research/ui/ui/components/spinner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@nous-research/ui/ui/components/card";

type View = "list" | "read" | "compose";
type Filter = "all" | "inbound" | "outbound";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function parseRecipients(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(() => {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }, [value]);
  return (
    <button
      type="button"
      onClick={onCopy}
      title="Copy email address"
      aria-label="Copy email address"
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

export default function AgentMailPage() {
  // ── Agent selection (the MCP requires an explicit agent_id) ────────
  const [agents, setAgents] = useState<AgentWalletBalance[]>([]);
  const [agentId, setAgentId] = useState("");

  // ── Inbox state ────────────────────────────────────────────────────
  const [inbox, setInbox] = useState<MailInbox | null>(null);
  const [hasInbox, setHasInbox] = useState(false);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [inboxError, setInboxError] = useState<string | null>(null);

  // ── Provisioning ───────────────────────────────────────────────────
  const [username, setUsername] = useState("");
  const [creating, setCreating] = useState(false);
  const [createArmed, setCreateArmed] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ── Messages ───────────────────────────────────────────────────────
  const [view, setView] = useState<View>("list");
  const [filter, setFilter] = useState<Filter>("all");
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MailMessage | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);

  // ── Compose ────────────────────────────────────────────────────────
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [sending, setSending] = useState(false);
  const [sendArmed, setSendArmed] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const loadInbox = useCallback(() => {
    if (!agentId) return;
    setInboxLoading(true);
    setInboxError(null);
    api
      .getMailAddress(agentId)
      .then((resp) => {
        if (resp.ok) {
          setInbox(resp.inbox);
          setHasInbox(resp.has_inbox);
        } else {
          setInbox(null);
          setHasInbox(false);
          setInboxError(resp.error ?? "Could not load inbox");
        }
      })
      .catch((e) => setInboxError(e instanceof Error ? e.message : String(e)))
      .finally(() => setInboxLoading(false));
  }, [agentId]);

  const loadMessages = useCallback(() => {
    if (!agentId) return;
    setMessagesLoading(true);
    setMessagesError(null);
    api
      .listMail({ agentId, direction: filter === "all" ? undefined : filter, limit: 100 })
      .then((resp) => {
        if (resp.ok) {
          setMessages(resp.messages ?? []);
        } else {
          setMessagesError(resp.error ?? "Could not load messages");
          setMessages([]);
        }
      })
      .catch((e) => setMessagesError(e instanceof Error ? e.message : String(e)))
      .finally(() => setMessagesLoading(false));
  }, [agentId, filter]);

  // Load the agent list once; default to the first agent.
  useEffect(() => {
    api
      .getWalletBalances()
      .then((r) => {
        if (r.ok && r.wallets.length) {
          setAgents(r.wallets);
          setAgentId((cur) => cur || r.wallets[0].agent_id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hasInbox) loadMessages();
  }, [hasInbox, loadMessages]);

  const createInbox = useCallback(() => {
    setCreating(true);
    setCreateError(null);
    api
      .createInbox({ agent_id: agentId, username: username.trim() || undefined, confirm: true })
      .then((resp) => {
        if (resp.ok) {
          setCreateArmed(false);
          if (resp.inbox) {
            setInbox(resp.inbox);
            setHasInbox(true);
          } else {
            loadInbox();
          }
        } else {
          setCreateError(resp.error ?? "Could not create inbox");
        }
      })
      .catch((e) => setCreateError(e instanceof Error ? e.message : String(e)))
      .finally(() => setCreating(false));
  }, [agentId, username, loadInbox]);

  const openMessage = useCallback(
    (m: MailMessage) => {
      setSelected(m);
      setView("read");
      setSelectedLoading(true);
      api
        .readMail(m.messageId, agentId)
        .then((resp) => {
          if (resp.ok && resp.message) setSelected(resp.message);
        })
        .catch(() => {})
        .finally(() => setSelectedLoading(false));
    },
    [agentId],
  );

  const recipients = useMemo(() => parseRecipients(to), [to]);

  const startCompose = useCallback(() => {
    setSendError(null);
    setSendArmed(false);
    setView("compose");
  }, []);

  const sendMail = useCallback(() => {
    const toList = parseRecipients(to);
    const ccList = parseRecipients(cc);
    const bccList = parseRecipients(bcc);
    const bad = [...toList, ...ccList, ...bccList].find((a) => !EMAIL_RE.test(a));
    if (toList.length === 0) {
      setSendError("Add at least one recipient.");
      setSendArmed(false);
      return;
    }
    if (bad) {
      setSendError(`Not a valid email: ${bad}`);
      setSendArmed(false);
      return;
    }
    if (!subject.trim()) {
      setSendError("Add a subject.");
      setSendArmed(false);
      return;
    }
    if (!bodyText.trim()) {
      setSendError("Write a message.");
      setSendArmed(false);
      return;
    }
    setSending(true);
    setSendError(null);
    api
      .sendMail({
        agent_id: agentId,
        to: toList,
        cc: ccList.length ? ccList : undefined,
        bcc: bccList.length ? bccList : undefined,
        subject: subject.trim(),
        text: bodyText,
        reply_to: replyTo.trim() || undefined,
        confirm: true,
      })
      .then((resp) => {
        if (resp.ok) {
          setTo("");
          setCc("");
          setBcc("");
          setSubject("");
          setBodyText("");
          setReplyTo("");
          setSendArmed(false);
          setView("list");
          loadMessages();
        } else {
          setSendError(resp.error ?? "Send failed");
          setSendArmed(false);
        }
      })
      .catch((e) => {
        setSendError(e instanceof Error ? e.message : String(e));
        setSendArmed(false);
      })
      .finally(() => setSending(false));
  }, [agentId, to, cc, bcc, subject, bodyText, replyTo, loadMessages]);

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Agent Mail</h1>
          {agents.length > 0 && (
            <select
              value={agentId}
              onChange={(e) => {
                setAgentId(e.target.value);
                setView("list");
                setSelected(null);
              }}
              title="Select agent"
              className="ml-1 max-w-[180px] rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
            >
              {agents.map((a) => (
                <option key={a.agent_id} value={a.agent_id}>
                  {a.name || a.agent_id.slice(0, 8)}
                </option>
              ))}
            </select>
          )}
        </div>
        {hasInbox && view === "list" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadMessages}
              title="Refresh"
              aria-label="Refresh"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RefreshCw className={`h-4 w-4 ${messagesLoading ? "animate-spin" : ""}`} />
            </button>
            <Button size="sm" prefix={<PenSquare className="h-4 w-4" />} onClick={startCompose}>
              Compose
            </Button>
          </div>
        )}
      </div>

      {/* Inbox address bar */}
      {hasInbox && inbox && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <Inbox className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-mono text-sm text-emerald-300">
                {inbox.emailAddress}
              </span>
              <CopyButton value={inbox.emailAddress} />
            </div>
            <div className="flex items-center gap-1.5">
              {inbox.verified && (
                <Badge tone="success" className="shrink-0">
                  <ShieldCheck className="mr-1 h-3 w-3" /> verified
                </Badge>
              )}
              {inbox.status && inbox.status !== "active" && (
                <Badge tone="secondary">{inbox.status}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {inboxError && (
        <Card className="border-destructive/40">
          <CardContent className="py-3 text-sm text-destructive">{inboxError}</CardContent>
        </Card>
      )}

      {inboxLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : !hasInbox ? (
        /* ── Provision an inbox ─────────────────────────────────────── */
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">No inbox yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Give this agent a real email address (e.g.{" "}
              <span className="font-mono text-foreground">name@agentmail.to</span>) so it can
              send and receive mail. Provisioning is a one-time{" "}
              <span className="font-semibold text-foreground">~$2 USDC</span> payment from the
              agent&apos;s own wallet over x402.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="optional username (a-z, 0-9, dot, dash) — omit to auto-generate"
                className={inputCls + " sm:flex-1"}
              />
            </div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
            {createArmed ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                <span className="text-sm text-amber-200">
                  This pays <span className="font-semibold">~$2 USDC</span> from the agent wallet.
                  Continue?
                </span>
                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateArmed(false)}
                    className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <Button size="sm" onClick={createInbox} disabled={creating}>
                    {creating ? "Creating…" : "Confirm & pay"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => setCreateArmed(true)} disabled={creating}>
                Create inbox
              </Button>
            )}
          </CardContent>
        </Card>
      ) : view === "compose" ? (
        /* ── Compose ────────────────────────────────────────────────── */
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-semibold">New email</CardTitle>
            <button
              type="button"
              onClick={() => setView("list")}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">To</label>
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="alice@example.com, bob@example.com"
                className={inputCls}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Cc (optional)</label>
                <input value={cc} onChange={(e) => setCc(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Bcc (optional)</label>
                <input value={bcc} onChange={(e) => setBcc(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Message</label>
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={10}
                className={inputCls + " resize-y font-sans"}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Reply-To (optional)</label>
              <input
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                className={inputCls}
              />
            </div>

            {sendError && <p className="text-sm text-destructive">{sendError}</p>}

            {sendArmed ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                <span className="text-sm text-amber-200">
                  Send a real email from{" "}
                  <span className="font-mono">{inbox?.emailAddress}</span> to{" "}
                  {recipients.length} recipient{recipients.length === 1 ? "" : "s"}? Any per-send
                  fee is paid in USDC from the agent wallet.
                </span>
                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSendArmed(false)}
                    className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <Button
                    size="sm"
                    prefix={<Send className="h-4 w-4" />}
                    onClick={sendMail}
                    disabled={sending}
                  >
                    {sending ? "Sending…" : "Send now"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                prefix={<Send className="h-4 w-4" />}
                onClick={() => {
                  setSendError(null);
                  setSendArmed(true);
                }}
                disabled={sending}
              >
                Send
              </Button>
            )}
          </CardContent>
        </Card>
      ) : view === "read" && selected ? (
        /* ── Read one message ───────────────────────────────────────── */
        <Card>
          <CardHeader className="space-y-2 pb-2">
            <button
              type="button"
              onClick={() => setView("list")}
              className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back to inbox
            </button>
            <CardTitle className="text-base font-semibold">
              {selected.subject || "(no subject)"}
            </CardTitle>
            <div className="space-y-0.5 text-xs text-muted-foreground">
              <div>
                <Badge
                  tone={selected.direction === "inbound" ? "secondary" : "success"}
                  className="mr-2"
                >
                  {selected.direction === "inbound" ? "received" : "sent"}
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
                  <span className="text-foreground/70">To:</span> {selected.toAddresses.join(", ")}
                </div>
              )}
              {selected.ccAddresses?.length > 0 && (
                <div>
                  <span className="text-foreground/70">Cc:</span> {selected.ccAddresses.join(", ")}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : selected.textBody ? (
              <pre className="whitespace-pre-wrap break-words font-sans text-sm text-foreground/90">
                {selected.textBody}
              </pre>
            ) : selected.htmlBody ? (
              <iframe
                title="email body"
                sandbox=""
                srcDoc={selected.htmlBody}
                className="h-[60vh] w-full rounded-md border border-border bg-white"
              />
            ) : (
              <p className="text-sm text-muted-foreground">{selected.preview || "(empty message)"}</p>
            )}
          </CardContent>
        </Card>
      ) : (
        /* ── Inbox list ─────────────────────────────────────────────── */
        <div className="space-y-3">
          <div className="flex gap-1">
            {(["all", "inbound", "outbound"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  filter === f
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {f === "all" ? "All" : f === "inbound" ? "Inbox" : "Sent"}
              </button>
            ))}
          </div>

          {messagesError && (
            <Card className="border-destructive/40">
              <CardContent className="py-3 text-sm text-destructive">{messagesError}</CardContent>
            </Card>
          )}

          {messagesLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : messages.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No messages yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {messages.map((m) => {
                const who =
                  m.direction === "inbound"
                    ? m.fromAddress || "unknown sender"
                    : `To: ${m.toAddresses?.join(", ") || "—"}`;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => openMessage(m)}
                    className="w-full rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/30"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        {m.direction === "inbound" ? (
                          <Inbox className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <Send className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span
                          className={`truncate text-sm ${
                            m.direction === "inbound" && !m.read
                              ? "font-semibold text-foreground"
                              : "text-foreground/80"
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
                      {m.subject || "(no subject)"}
                    </div>
                    {m.preview && (
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {m.preview}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
