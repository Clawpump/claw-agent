import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getMcpServers, mcpLogin, type McpServer } from '@/hermes'
import { Check, ChevronDown, ChevronRight, Download, ExternalLink, Loader2, Sparkles, Zap } from '@/lib/icons'
import { openUpdatesWindow } from '@/store/updates'

import type { SetStatusbarItemGroup } from '../shell/statusbar-controls'

// Where an unauthenticated user goes to connect the ClawPump MCP — the gateway
// (browser login / cpk_* key). Shown prominently when not connected.
const CLAWPUMP_GATEWAY_URL = 'https://agents.clawpump.tech/dashboard/api'
const isClawpump = (s: McpServer) => s.name.startsWith('clawpump')

// What the ClawPump MCP surface actually covers — curated groups over the raw
// tool list (shown on the MCP page so users can see what they get before/after
// connecting). Mirrors the manifest description.
const FEATURE_GROUPS: { blurb: string; title: string }[] = [
  { blurb: 'Balances + send SOL/USDC (whitelist-gated)', title: 'Wallet & transfers' },
  { blurb: 'Jupiter quotes and swaps', title: 'Trading & swaps' },
  { blurb: 'Open, close, manage collateral', title: 'Phoenix perps' },
  { blurb: 'Dollar-cost-average schedules', title: 'DCA' },
  { blurb: 'Jupiter lend / borrow', title: 'Lending' },
  { blurb: 'Launch a ClawPump token for your agent', title: 'Token launch' },
  { blurb: 'Discover and list agents', title: 'Marketplace' },
  { blurb: 'On-chain prediction markets', title: 'Predictions' },
  { blurb: 'Create a virtual debit card, spend at merchants, buy gift cards (Laso)', title: 'Debit & gift cards' },
  { blurb: 'Provision an inbox, send & read email', title: 'Agent mail' },
  { blurb: 'Pay APIs straight from your wallet', title: 'x402 paid APIs' },
  { blurb: 'Pay-per-use inference from your wallet', title: 'Pods (UsePod)' },
  { blurb: 'DEX pools, rug checks, token data', title: 'Market intelligence' }
]

// A desktop build can ship ahead of the agent backend it runs (the Electron
// shell updates on install, but ~/.hermes/hermes-agent only updates when the
// user self-updates). An older backend has no POST /api/mcp/{name}/login route,
// so the request 405s (falls through to the SPA catch-all) or 404s. Detect that
// so we can tell the user to update instead of surfacing a raw "Method Not
// Allowed".
const isStaleBackend = (err: unknown): boolean => {
  const m = err instanceof Error ? err.message : String(err ?? '')

  return /\b40[45]\b/.test(m) || /Method Not Allowed|No such API endpoint/i.test(m)
}

interface McpViewProps extends React.ComponentProps<'section'> {
  setStatusbarItemGroup?: SetStatusbarItemGroup
}

export function McpView({ setStatusbarItemGroup: _setStatusbarItemGroup, ...props }: McpViewProps) {
  const queryClient = useQueryClient()
  const [showFeatures, setShowFeatures] = useState(false)
  const query = useQuery({ queryKey: ['mcp-servers'], queryFn: getMcpServers, staleTime: 15_000 })
  const servers = query.data?.servers ?? []
  const clawpump = servers.find(isClawpump)
  const others = servers.filter(s => !isClawpump(s))

  // Trigger the real browser OAuth flow (the CLI's `claw clawpump login`) from
  // the GUI: a browser opens, the user signs in once, and the session connects.
  const login = useMutation({
    mutationFn: (name: string) => mcpLogin(name),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['mcp-servers'] })
      void queryClient.invalidateQueries({ queryKey: ['pod-status'] })
    }
  })

  // authenticated === true means the backend found the same OAuth/API-key
  // credentials the chat runtime uses. Enabled-but-not-connected states need
  // an action surface; otherwise stdio/API-key installs showed "Not connected"
  // with no way to fix or refresh credentials.
  const clawpumpConnected = Boolean(clawpump?.enabled && clawpump.authenticated === true)
  const clawpumpDisabled = clawpump != null && !clawpump.enabled
  const clawpumpNeedsConnection = clawpump != null && clawpump.enabled && !clawpumpConnected
  const clawpumpUsesStdio = clawpump?.transport === 'stdio' || Boolean(clawpump?.command)
  const clawpumpConnectCommand = clawpumpUsesStdio ? 'claw clawpump setup' : 'claw clawpump login'
  const clawpumpConnectLabel = clawpumpUsesStdio ? 'Connect with API key' : 'Connect at the gateway'

  const clawpumpConnectionHelp = clawpumpUsesStdio
    ? 'Add or refresh your ClawPump cpk_* API key, then restart the session so the MCP tools come online.'
    : 'Sign in at the ClawPump gateway to connect — then your 133 ClawPump tools come online in chat and across the app.'

  const openGateway = () => void window.hermesDesktop?.openExternal?.(CLAWPUMP_GATEWAY_URL)

  // stdio/API-key installs still need a cpk_* key from the gateway page; the
  // remote OAuth entry connects in one click via the browser login flow.
  const handleConnect = () => {
    if (clawpumpUsesStdio || !clawpump) {
      openGateway()

      return
    }

    login.mutate(clawpump.name)
  }

  return (
    <section {...props} className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 px-5 py-4">
          <header className="flex items-center gap-2">
            <Zap className="size-5 text-primary" />
            <h1 className="text-lg font-semibold">MCP Servers</h1>
          </header>
          <p className="text-sm text-muted-foreground">
            Model Context Protocol servers wired into your agent. The ClawPump MCP brings 133 tools — wallet, trading,
            marketplace, perps, token launch.
          </p>

          {query.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          )}

          {clawpump && (
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">ClawPump MCP</span>
                  <span className="text-xs text-muted-foreground">{clawpump.name}</span>
                </div>
                {clawpumpConnected ? (
                  <Badge className="gap-1">
                    <Check className="size-3" /> Connected
                  </Badge>
                ) : (
                  <Badge variant="outline">{clawpump.enabled ? 'Not connected' : 'Disabled'}</Badge>
                )}
              </div>
              {clawpumpDisabled && (
                <p className="mt-3 text-sm text-muted-foreground">
                  ClawPump MCP is installed but disabled. Re-enable it in MCP settings, then restart the session so the
                  tools come online.
                </p>
              )}
              {clawpumpNeedsConnection && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-muted-foreground">{clawpumpConnectionHelp}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button disabled={login.isPending} onClick={handleConnect} size="sm">
                      {login.isPending ? (
                        <>
                          <Loader2 className="size-4 animate-spin" /> Waiting for browser…
                        </>
                      ) : (
                        <>
                          <ExternalLink className="size-4" /> {clawpumpConnectLabel}
                        </>
                      )}
                    </Button>
                    <code className="rounded bg-muted px-2 py-1 text-xs">{clawpumpConnectCommand}</code>
                  </div>
                  {login.isPending && !clawpumpUsesStdio && (
                    <p className="text-xs text-muted-foreground">
                      A browser tab opened — sign in with ClawPump to finish connecting.
                    </p>
                  )}
                  {login.isError &&
                    (isStaleBackend(login.error) ? (
                      <div className="space-y-2">
                        <p className="text-xs text-destructive">
                          Your Claw Agent backend is out of date and doesn&apos;t support one-click login yet. Update it
                          below, or connect right now from a terminal with{' '}
                          <code className="rounded bg-muted px-1">claw clawpump login</code>.
                        </p>
                        <Button onClick={() => openUpdatesWindow()} size="sm" variant="outline">
                          <Download className="size-4" /> Update Claw Agent
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-destructive">
                        Login didn&apos;t complete: {(login.error as Error)?.message || 'unknown error'}. Try again, or
                        run <code className="rounded bg-muted px-1">{clawpumpConnectCommand}</code>.
                      </p>
                    ))}
                  {!clawpumpUsesStdio && (
                    <p className="break-all text-xs text-muted-foreground">{CLAWPUMP_GATEWAY_URL}</p>
                  )}
                </div>
              )}

              <div className="mt-3 border-t pt-3">
                <button
                  className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setShowFeatures(v => !v)}
                  type="button"
                >
                  {showFeatures ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  <Sparkles className="size-3.5 text-primary" /> What can it do?
                </button>
                {showFeatures && (
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {FEATURE_GROUPS.map(f => (
                      <div className="rounded-md border bg-muted/30 px-2.5 py-1.5" key={f.title}>
                        <div className="text-xs font-medium">{f.title}</div>
                        <div className="text-[0.7rem] text-muted-foreground">{f.blurb}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {!query.isPending && !clawpump && (
            <div className="space-y-2 rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                The ClawPump MCP isn&apos;t installed yet. Connect it at the gateway to unlock the 133 tools.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={openGateway} size="sm">
                  <ExternalLink className="size-4" /> Open the ClawPump gateway
                </Button>
                <code className="rounded bg-muted px-2 py-1 text-xs">claw clawpump setup</code>
              </div>
              <p className="break-all text-xs text-muted-foreground">{CLAWPUMP_GATEWAY_URL}</p>
            </div>
          )}

          {others.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">Other servers</h2>
              {others.map(s => (
                <div className="flex items-center justify-between rounded-md border px-3 py-2" key={s.name}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.transport}</span>
                  </div>
                  {s.enabled ? <Badge>Enabled</Badge> : <Badge variant="outline">Disabled</Badge>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
