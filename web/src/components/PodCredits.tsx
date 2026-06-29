import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

/**
 * Compact "Pod $X.XX" credits pill, shown next to the model badge only when the
 * active provider is UsePod (Pod). Polls /api/clawpump/pod/status; keeps the
 * last value so a transient probe failure never blanks it. Mirrors the desktop
 * PodCredits.
 */
export default function PodCredits({ provider }: { provider: string }) {
  const isPod = provider === "usepod";
  const [balance, setBalance] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const lastBalance = useRef<number | null>(null);

  useEffect(() => {
    if (!isPod) return;
    let cancelled = false;
    const tick = () => {
      void api
        .getPodStatus()
        .then((r) => {
          if (cancelled) return;
          setConnected(!!r.connected);
          if (r.balance_usdc != null) {
            lastBalance.current = r.balance_usdc;
            setBalance(r.balance_usdc);
          } else if (lastBalance.current != null) {
            setBalance(lastBalance.current);
          }
        })
        .catch(() => undefined);
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isPod]);

  if (!isPod || !connected) return null;

  const low = balance != null && balance < 0.5;
  return (
    <span
      title={balance != null ? `Pod credits: $${balance.toFixed(4)} USDC` : "Pod connected"}
      className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[0.6875rem] font-medium ${
        low
          ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      }`}
    >
      ⚡ {balance != null ? `$${balance.toFixed(2)}` : "Pod"}
    </span>
  );
}
