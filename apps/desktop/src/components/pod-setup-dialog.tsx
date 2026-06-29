import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'

import { getPodWallets, provisionPod, type PodWallet } from '../hermes'
import { notify } from '../store/notifications'

import { InlineNotice } from './notifications'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { GlyphSpinner } from './ui/glyph-spinner'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

const DEFAULT_AMOUNT = '5'

const walletLabel = (w: PodWallet) =>
  (w.name || (w.wallet_address ? `${w.wallet_address.slice(0, 4)}…${w.wallet_address.slice(-4)}` : w.agent_id)) ?? w.agent_id

/**
 * One-screen Pod setup: pick a ClawPump agent wallet, pick an amount, confirm.
 * `usepod_provision` registers + funds a pod from that wallet on-chain in a
 * single call, and the backend switches the session onto Pod as the provider.
 * The single confirm is the on-chain USDC spend — everything else is prefilled.
 */
export function PodSetupDialog({
  open,
  onOpenChange,
  onProvisioned
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProvisioned: (model: string) => void
}) {
  const wallets = useQuery({
    queryKey: ['pod-wallets'],
    queryFn: getPodWallets,
    enabled: open,
    staleTime: 15_000
  })

  const rows = useMemo(() => wallets.data?.wallets ?? [], [wallets.data])
  const [agentId, setAgentId] = useState('')
  const [amount, setAmount] = useState(DEFAULT_AMOUNT)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Set once provisioning succeeds → switches the dialog to a "Pod ready" view.
  const [done, setDone] = useState<{ model: string; amount: number; signature?: string; fundingError?: string } | null>(
    null
  )

  // Fresh start every time the dialog reopens.
  useEffect(() => {
    if (open) {
      setDone(null)
      setError(null)
    }
  }, [open])

  // Default to the wallet with the most USDC so funding "just works".
  useEffect(() => {
    if (!agentId && rows.length > 0) {
      const best = [...rows].sort((a, b) => (b.usdc_balance ?? 0) - (a.usdc_balance ?? 0))[0]
      setAgentId(best.agent_id)
    }
  }, [rows, agentId])

  const selected = rows.find(w => w.agent_id === agentId) ?? null
  const amountNum = Number(amount)
  const balance = selected?.usdc_balance ?? 0
  const insufficient = Number.isFinite(amountNum) && amountNum > 0 && amountNum > balance
  const canFund = !busy && Boolean(agentId) && Number.isFinite(amountNum) && amountNum > 0 && !insufficient

  const fund = async () => {
    if (!canFund) return
    setBusy(true)
    setError(null)
    try {
      const res = await provisionPod(agentId, amountNum)
      if (!res.ok || !res.model) {
        setError(res.error || res.funding_error || 'Pod setup failed. Check the wallet balance and try again.')
        return
      }
      onProvisioned(res.model)
      notify({
        durationMs: 6_000,
        kind: 'success',
        title: 'Pod ready',
        message: `Funded $${amountNum.toFixed(2)} USDC — Pod is now your model provider.`
      })
      setDone({ amount: amountNum, fundingError: res.funding_error || undefined, model: res.model, signature: res.signature })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pod setup failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog onOpenChange={busy ? undefined : onOpenChange} open={open}>
      <DialogContent className="max-w-md gap-0 p-0">
        {done ? (
          <>
            <DialogHeader className="border-b border-border px-4 py-3">
              <DialogTitle className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-full bg-emerald-500/20 text-emerald-300">✓</span>
                Pod ready
              </DialogTitle>
              <DialogDescription className="text-xs leading-relaxed">
                Pod is now your model provider. New chats run on it automatically.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3 p-4">
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm">
                <div className="font-semibold text-emerald-300">⚡ Using Pod</div>
                <div className="mt-0.5 text-muted-foreground">
                  Funded <span className="font-mono">${done.amount.toFixed(2)} USDC</span> · model{' '}
                  <span className="font-mono">{done.model}</span>
                </div>
              </div>
              {done.signature && (
                <a
                  className="text-xs text-primary underline-offset-2 hover:underline"
                  href={`https://solscan.io/tx/${done.signature}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  View funding transaction ↗
                </a>
              )}
              {done.fundingError && (
                <InlineNotice kind="warning">
                  Pod was created but the deposit didn’t confirm ({done.fundingError}). Top it up from Set up Pod →
                  again, or it may settle shortly.
                </InlineNotice>
              )}
            </div>

            <DialogFooter className="flex-row items-center justify-end gap-2 bg-card p-3">
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle>Set up Pod</DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Fund a private inference Pod from a ClawPump agent wallet and use it as your model provider. You only pay for
            what you use — the Pod holds a prepaid USDC balance.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 p-4">
          {wallets.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <GlyphSpinner /> Loading your wallets…
            </div>
          ) : rows.length === 0 ? (
            <InlineNotice kind="warning">
              {wallets.data?.error || 'No ClawPump agent wallets found. Create one in the ClawPump dashboard first.'}
            </InlineNotice>
          ) : (
            <>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Pay from wallet</span>
                <Select onValueChange={setAgentId} value={agentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an agent wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {rows.map(w => (
                      <SelectItem key={w.agent_id} value={w.agent_id}>
                        {walletLabel(w)} — ${(w.usdc_balance ?? 0).toFixed(2)} USDC
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Amount to fund (USDC)</span>
                <Input
                  inputMode="decimal"
                  onChange={e => setAmount(e.target.value)}
                  type="number"
                  min="0"
                  step="1"
                  value={amount}
                />
                <span className="text-xs text-muted-foreground">
                  Wallet balance: <span className="font-mono">${balance.toFixed(2)} USDC</span>
                </span>
              </label>

              {insufficient && (
                <InlineNotice kind="warning">
                  Not enough USDC in this wallet for ${amountNum.toFixed(2)}. Pick a smaller amount or fund the wallet.
                </InlineNotice>
              )}
              {error && <InlineNotice kind="error">{error}</InlineNotice>}
            </>
          )}
        </div>

        <DialogFooter className="flex-row items-center justify-end gap-2 bg-card p-3">
          <Button disabled={busy} onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={!canFund} onClick={fund}>
            {busy ? (
              <span className="flex items-center gap-2">
                <GlyphSpinner /> Funding Pod…
              </span>
            ) : (
              `Fund $${Number.isFinite(amountNum) ? amountNum.toFixed(0) : '0'} & use Pod`
            )}
          </Button>
        </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
