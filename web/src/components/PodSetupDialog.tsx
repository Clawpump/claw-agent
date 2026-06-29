import { useEffect, useMemo, useState } from "react";
import { Zap } from "lucide-react";
import { api } from "@/lib/api";
import type { AgentWalletBalance } from "@/lib/api";
import { Button } from "@nous-research/ui/ui/components/button";
import { Input } from "@nous-research/ui/ui/components/input";
import { Select, SelectOption } from "@nous-research/ui/ui/components/select";
import { Spinner } from "@nous-research/ui/ui/components/spinner";

const DEFAULT_AMOUNT = "5";

const walletLabel = (w: AgentWalletBalance): string =>
  w.name ||
  (w.wallet_address
    ? `${w.wallet_address.slice(0, 4)}…${w.wallet_address.slice(-4)}`
    : w.agent_id);

/**
 * One-screen Pod setup for the web dashboard: pick a ClawPump agent wallet, pick
 * an amount, confirm. `usepod_provision` registers + funds a pod from that wallet
 * on-chain in one call, and the backend switches the session onto Pod as the
 * provider. The single confirm is the on-chain USDC spend; everything else is
 * prefilled. Mirrors the desktop PodSetupDialog.
 */
export default function PodSetupDialog({
  onClose,
  onProvisioned,
}: {
  onClose: () => void;
  onProvisioned: (model: string) => void;
}) {
  const [wallets, setWallets] = useState<AgentWalletBalance[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [agentId, setAgentId] = useState("");
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ model: string; amount: number; signature?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api
      .getWalletBalances()
      .then((r) => {
        if (cancelled) return;
        const rows = (r.wallets ?? []).filter((w) => w.agent_id);
        setWallets(rows);
        if (rows.length > 0) {
          const best = [...rows].sort(
            (a, b) => (b.usdc_balance ?? 0) - (a.usdc_balance ?? 0),
          )[0];
          setAgentId(best.agent_id);
        }
      })
      .catch((e) => !cancelled && setLoadError(e instanceof Error ? e.message : "Failed to load wallets"));
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = wallets ?? [];
  const selected = rows.find((w) => w.agent_id === agentId) ?? null;
  const amountNum = Number(amount);
  const balance = selected?.usdc_balance ?? 0;
  const insufficient = Number.isFinite(amountNum) && amountNum > 0 && amountNum > balance;
  const canFund =
    !busy && Boolean(agentId) && Number.isFinite(amountNum) && amountNum > 0 && !insufficient;

  const heading = useMemo(() => (done ? "Pod ready" : "Set up Pod"), [done]);

  const fund = async () => {
    if (!canFund) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.provisionPod(agentId, amountNum);
      if (!res.ok || !res.model) {
        setError(res.error || res.funding_error || "Pod setup failed. Check the wallet balance and try again.");
        return;
      }
      onProvisioned(res.model);
      setDone({ amount: amountNum, model: res.model, signature: res.signature });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pod setup failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => (busy ? undefined : onClose())}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">{heading}</h2>
        </div>

        {done ? (
          <div className="flex flex-col gap-3 p-4">
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm">
              <div className="font-semibold text-emerald-300">⚡ Using Pod</div>
              <div className="mt-0.5 text-muted-foreground">
                Funded <span className="font-mono">${done.amount.toFixed(2)} USDC</span> · model{" "}
                <span className="font-mono">{done.model}</span>. New chats run on Pod automatically.
              </div>
            </div>
            {done.signature && (
              <a
                className="text-xs text-primary hover:underline"
                href={`https://solscan.io/tx/${done.signature}`}
                rel="noreferrer"
                target="_blank"
              >
                View funding transaction ↗
              </a>
            )}
            <div className="flex justify-end">
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 p-4">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Fund a private inference Pod from a ClawPump agent wallet and use it as your model
                provider. You only pay for what you use — the Pod holds a prepaid USDC balance.
              </p>

              {wallets === null ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="text-xs" /> Loading your wallets…
                </div>
              ) : loadError || rows.length === 0 ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  {loadError ||
                    "No ClawPump agent wallets found. Create one in the ClawPump dashboard first."}
                </div>
              ) : (
                <>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">Pay from wallet</span>
                    <Select value={agentId} onValueChange={setAgentId}>
                      {rows.map((w) => (
                        <SelectOption key={w.agent_id} value={w.agent_id}>
                          {walletLabel(w)} — ${(w.usdc_balance ?? 0).toFixed(2)} USDC
                        </SelectOption>
                      ))}
                    </Select>
                  </label>

                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">Amount to fund (USDC)</span>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    <span className="text-xs text-muted-foreground">
                      Wallet balance: <span className="font-mono">${balance.toFixed(2)} USDC</span>
                    </span>
                  </label>

                  {insufficient && (
                    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                      Not enough USDC in this wallet for ${amountNum.toFixed(2)}. Pick a smaller amount.
                    </div>
                  )}
                  {error && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {error}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
              <Button variant="outline" disabled={busy} onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={!canFund} onClick={() => void fund()}>
                {busy ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="text-xs" /> Funding Pod…
                  </span>
                ) : (
                  `Fund $${Number.isFinite(amountNum) ? amountNum.toFixed(0) : "0"} & use Pod`
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
