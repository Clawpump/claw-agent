import { useQuery } from '@tanstack/react-query'

import { getPodStatus } from '@/hermes'
import { Tip } from '@/components/ui/tooltip'

/**
 * Compact "Pod $X.XX" credits pill, shown in the composer control row only when
 * the active provider is UsePod (Pod). Reads the live pod balance from
 * /api/clawpump/pod/status. Click-through is intentionally none — it's a glance
 * indicator; top-ups go through the Set up Pod flow.
 */
export function PodCredits({ provider }: { provider: string }) {
  const isPod = provider === 'usepod'
  const status = useQuery({
    queryKey: ['pod-status'],
    queryFn: getPodStatus,
    enabled: isPod,
    staleTime: 30_000,
    refetchInterval: 60_000
  })

  if (!isPod || !status.data?.connected) {
    return null
  }

  const bal = status.data.balance_usdc
  const low = bal != null && bal < 0.5

  return (
    <Tip label={bal != null ? `Pod credits: $${bal.toFixed(4)} USDC` : 'Pod connected'}>
      <span
        className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[0.6875rem] font-medium ${
          low
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
        }`}
      >
        <img alt="" className="size-3 rounded-sm" src="/claw-mark.png" />
        {bal != null ? `$${bal.toFixed(2)}` : 'Pod'}
      </span>
    </Tip>
  )
}
