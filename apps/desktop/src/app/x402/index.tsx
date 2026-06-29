import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { searchX402, type X402Result } from '@/hermes'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { writeClipboardText } from '@/components/ui/copy-button'
import { Input } from '@/components/ui/input'
import { Check, Copy, ExternalLink, Loader2, Search, Zap } from '@/lib/icons'
import { $pendingChatPrompt } from '@/store/composer'
import { notifyError } from '@/store/notifications'

import { NEW_CHAT_ROUTE } from '../routes'
import type { SetStatusbarItemGroup } from '../shell/statusbar-controls'

const bestPrice = (r: X402Result): string => r.pricing?.find(p => p.priceLabel)?.priceLabel ?? ''

const buildPrompt = (r: X402Result): string => {
  const label = r.name || r.host || 'this service'
  const price = bestPrice(r)
  return `Use this x402 API and pay it with my ClawPump wallet: ${r.resourceUrl} (${label}${price ? `, ${price}` : ''}). First check what inputs it needs, then call it.`
}

interface X402ViewProps extends React.ComponentProps<'section'> {
  setStatusbarItemGroup?: SetStatusbarItemGroup
}

export function X402View({ setStatusbarItemGroup: _setStatusbarItemGroup, ...props }: X402ViewProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<X402Result[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const run = async () => {
    const q = query.trim()
    if (!q || loading) {
      return
    }
    setLoading(true)
    try {
      const res = await searchX402(q)
      setResults(res.results ?? [])
    } catch (err) {
      notifyError(err, 'x402 search failed')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const useInChat = (r: X402Result) => {
    $pendingChatPrompt.set(buildPrompt(r))
    navigate(NEW_CHAT_ROUTE)
  }

  const copy = async (url: string) => {
    await writeClipboardText(url)
    setCopied(url)
    window.setTimeout(() => setCopied(c => (c === url ? null : c)), 1200)
  }

  return (
    <section {...props} className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 px-5 py-4">
          <header className="flex items-center gap-2">
            <Zap className="size-5 text-primary" />
            <h1 className="text-lg font-semibold">x402 Marketplace</h1>
          </header>
          <p className="text-sm text-muted-foreground">
            Search the Dexter x402 bazaar (via the ClawPump MCP). Any endpoint is pay-per-call from your agent wallet —
            send one to chat and the agent calls + pays it for you.
          </p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    void run()
                  }
                }}
                placeholder="e.g. image generation, ETH price, weather…"
                value={query}
              />
            </div>
            <Button disabled={loading || !query.trim()} onClick={() => void run()}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : 'Search'}
            </Button>
          </div>

          {results && results.length === 0 && !loading && (
            <div className="py-10 text-center text-sm text-muted-foreground">No results — try a different query.</div>
          )}

          <div className="grid gap-2">
            {(results ?? []).map((r, i) => (
              <div className="rounded-lg border border-border bg-card p-3" key={r.resourceUrl ?? `${r.name}-${i}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.name || r.host || 'Untitled'}</div>
                    {r.description && (
                      <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{r.description}</div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {bestPrice(r) && <span className="font-mono text-xs text-primary">{bestPrice(r)}</span>}
                    {r.verified && <Badge variant="default">verified</Badge>}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {r.category && <Badge variant="muted">{r.category}</Badge>}
                  {r.method && (
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.62rem] uppercase text-muted-foreground">
                      {r.method}
                    </span>
                  )}
                  {typeof r.qualityScore === 'number' && (
                    <span className="text-[0.62rem] text-muted-foreground">quality {r.qualityScore}</span>
                  )}
                </div>

                {r.resourceUrl && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                      {r.resourceUrl}
                    </span>
                    <button
                      className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                      onClick={() => void copy(r.resourceUrl!)}
                      title="Copy URL"
                      type="button"
                    >
                      {copied === r.resourceUrl ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    </button>
                    <a
                      className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                      href={r.resourceUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                )}

                <Button className="mt-2 w-full" onClick={() => useInChat(r)} size="sm" variant="outline">
                  Use in chat
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
