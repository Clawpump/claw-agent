import { useQuery } from '@tanstack/react-query'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getMcpServers, type McpServer } from '@/hermes'
import { Check, ExternalLink, Loader2, Zap } from '@/lib/icons'

import type { SetStatusbarItemGroup } from '../shell/statusbar-controls'

// Where an unauthenticated user goes to connect the ClawPump MCP — the gateway
// (browser login / cpk_* key). Shown prominently when not connected.
const CLAWPUMP_GATEWAY_URL = 'https://agents.clawpump.tech/dashboard/api'
const CLAWPUMP_NAMES = new Set(['clawpump', 'clawpump-agents', 'clawpump-stdio'])

const isClawpump = (s: McpServer) => CLAWPUMP_NAMES.has(s.name)

interface McpViewProps extends React.ComponentProps<'section'> {
  setStatusbarItemGroup?: SetStatusbarItemGroup
}

export function McpView({ setStatusbarItemGroup: _setStatusbarItemGroup, ...props }: McpViewProps) {
  const query = useQuery({ queryKey: ['mcp-servers'], queryFn: getMcpServers, staleTime: 15_000 })
  const servers = query.data?.servers ?? []
  const clawpump = servers.find(isClawpump)
  const others = servers.filter(s => !isClawpump(s))

  // authenticated === true → OAuth tokens are on disk (the same session chat
  // uses), so the MCP is genuinely connected. === false → needs sign-in.
  const clawpumpConnected = clawpump?.authenticated === true
  const clawpumpNeedsAuth = clawpump != null && clawpump.authenticated === false

  const openGateway = () => void window.hermesDesktop?.openExternal?.(CLAWPUMP_GATEWAY_URL)

  return (
    <section {...props} className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 px-5 py-4">
          <header className="flex items-center gap-2">
            <Zap className="size-5 text-primary" />
            <h1 className="text-lg font-semibold">MCP Servers</h1>
          </header>
          <p className="text-sm text-muted-foreground">
            Model Context Protocol servers wired into your agent. The ClawPump MCP brings 133 tools —
            wallet, trading, marketplace, perps, token launch.
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
                  <Badge variant="outline">Not connected</Badge>
                )}
              </div>
              {clawpumpNeedsAuth && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Sign in at the ClawPump gateway to connect — then your 133 ClawPump tools come
                    online in chat and across the app.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={openGateway} size="sm">
                      <ExternalLink className="size-4" /> Connect at the gateway
                    </Button>
                    <code className="rounded bg-muted px-2 py-1 text-xs">claw clawpump login</code>
                  </div>
                  <p className="break-all text-xs text-muted-foreground">{CLAWPUMP_GATEWAY_URL}</p>
                </div>
              )}
            </div>
          )}

          {!query.isPending && !clawpump && (
            <div className="space-y-2 rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                The ClawPump MCP isn&apos;t installed yet. Connect it at the gateway to unlock the 133
                tools.
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
                <div
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                  key={s.name}
                >
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
