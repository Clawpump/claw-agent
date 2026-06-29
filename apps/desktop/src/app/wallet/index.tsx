import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getPodWallets, transferWallet, type PodWallet } from '@/hermes'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { writeClipboardText } from '@/components/ui/copy-button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { InlineNotice } from '@/components/notifications'
import { Check, Copy, ExternalLink, Loader2, RefreshCw, Send } from '@/lib/icons'
import { $pendingChatPrompt } from '@/store/composer'
import { notify } from '@/store/notifications'

import { NEW_CHAT_ROUTE } from '../routes'
import type { SetStatusbarItemGroup } from '../shell/statusbar-controls'

const shortAddr = (a: string | null): string => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '—')
const fmt = (n: number | null | undefined, dp: number): string => (n == null ? '0' : n.toFixed(dp))

function AddressChip({ address }: { address: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
      onClick={async () => {
        await writeClipboardText(address)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1200)
      }}
      title={address}
      type="button"
    >
      {shortAddr(address)}
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </button>
  )
}

function TransferDialog({ wallet, onClose }: { wallet: PodWallet; onClose: () => void }) {
  const [token, setToken] = useState<'USDC' | 'SOL'>('USDC')
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsWhitelist, setNeedsWhitelist] = useState(false)

  const amountNum = Number(amount)
  const valid = to.trim().length >= 32 && Number.isFinite(amountNum) && amountNum > 0

  const send = async (addToWhitelist: boolean) => {
    if (!valid || busy) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await transferWallet({
        add_to_whitelist: addToWhitelist || undefined,
        agent_id: wallet.agent_id,
        amount: amountNum,
        to: to.trim(),
        token
      })
      if (!res.ok) {
        if (res.code === 'destination_not_whitelisted') {
          setNeedsWhitelist(true)
          setError('That address isn’t whitelisted yet. Whitelist it and send?')
          return
        }
        setError(res.error || 'Transfer failed.')
        return
      }
      notify({ durationMs: 4_000, kind: 'success', title: 'Sent', message: `${amountNum} ${token} sent.` })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog onOpenChange={busy ? undefined : onClose} open>
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle>Send from {wallet.name || shortAddr(wallet.agent_id)}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 p-4">
          <div className="flex gap-2">
            {(['USDC', 'SOL'] as const).map(tk => (
              <Button
                key={tk}
                onClick={() => setToken(tk)}
                size="sm"
                variant={token === tk ? 'default' : 'outline'}
              >
                {tk}
              </Button>
            ))}
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Destination address</span>
            <Input onChange={e => setTo(e.target.value)} placeholder="Solana address" value={to} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Amount ({token})</span>
            <Input inputMode="decimal" onChange={e => setAmount(e.target.value)} type="number" value={amount} />
          </label>
          {error && <InlineNotice kind={needsWhitelist ? 'warning' : 'error'}>{error}</InlineNotice>}
        </div>
        <DialogFooter className="flex-row items-center justify-end gap-2 bg-card p-3">
          <Button disabled={busy} onClick={onClose} variant="outline">
            Cancel
          </Button>
          {needsWhitelist ? (
            <Button disabled={busy} onClick={() => void send(true)}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : 'Whitelist & send'}
            </Button>
          ) : (
            <Button disabled={!valid || busy} onClick={() => void send(false)}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : `Send ${token}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface WalletViewProps extends React.ComponentProps<'section'> {
  setStatusbarItemGroup?: SetStatusbarItemGroup
}

export function WalletView({ setStatusbarItemGroup: _setStatusbarItemGroup, ...props }: WalletViewProps) {
  const navigate = useNavigate()
  const [transfer, setTransfer] = useState<PodWallet | null>(null)
  const wallets = useQuery({ queryKey: ['pod-wallets'], queryFn: getPodWallets, staleTime: 15_000 })
  const rows = wallets.data?.wallets ?? []

  const tokenize = (w: PodWallet) => {
    $pendingChatPrompt.set(
      `Launch a ClawPump token for my agent "${w.name || w.agent_id}" (agent_id ${w.agent_id}). Ask me for the ticker/symbol and any details you need, then launch it.`
    )
    navigate(NEW_CHAT_ROUTE)
  }

  return (
    <section {...props} className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 px-5 py-4">
          <header className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-semibold">Agent Wallets</h1>
            <Button onClick={() => void wallets.refetch()} size="icon" variant="ghost">
              <RefreshCw className={wallets.isFetching ? 'size-4 animate-spin' : 'size-4'} />
            </Button>
          </header>

          {wallets.isLoading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading wallets…
            </div>
          ) : rows.length === 0 ? (
            <InlineNotice kind="warning">
              {wallets.data?.error || 'No ClawPump agent wallets found. Create one in the ClawPump dashboard first.'}
            </InlineNotice>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {rows.map(w => (
                <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3" key={w.agent_id}>
                  <div className="flex items-center gap-2">
                    <img
                      alt=""
                      className="size-7 shrink-0 rounded-full border border-border bg-background object-cover"
                      src={w.avatar_url || '/claw-mark.png'}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {w.name || shortAddr(w.agent_id)}
                    </span>
                    {w.token_mint && (
                      <a
                        href={`https://solscan.io/token/${w.token_mint}`}
                        rel="noreferrer"
                        target="_blank"
                        title={w.token_mint}
                      >
                        <Badge variant="default">tokenized</Badge>
                      </a>
                    )}
                  </div>

                  {w.wallet_address && (
                    <div className="flex items-center justify-between gap-2">
                      <AddressChip address={w.wallet_address} />
                      <a
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        href={`https://solscan.io/account/${w.wallet_address}`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-md bg-background px-2 py-1.5">
                      <div className="text-[0.62rem] uppercase tracking-wide text-muted-foreground">SOL</div>
                      <div className="font-mono">{fmt(w.sol_balance, 4)}</div>
                    </div>
                    <div className="rounded-md bg-background px-2 py-1.5">
                      <div className="text-[0.62rem] uppercase tracking-wide text-muted-foreground">USDC</div>
                      <div className="font-mono">${fmt(w.usdc_balance, 2)}</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      disabled={!w.wallet_address}
                      onClick={() => setTransfer(w)}
                      size="sm"
                      variant="outline"
                    >
                      <Send className="size-3.5" /> Send
                    </Button>
                    {!w.token_mint && (
                      <Button className="flex-1" onClick={() => tokenize(w)} size="sm" variant="outline">
                        Tokenize
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {transfer && <TransferDialog onClose={() => setTransfer(null)} wallet={transfer} />}
    </section>
  )
}
