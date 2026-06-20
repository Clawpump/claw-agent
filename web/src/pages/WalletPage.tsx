import { useCallback, useEffect, useState } from "react";
import { Check, Copy, RefreshCw, Send, Wallet, X } from "lucide-react";
import { api } from "@/lib/api";
import type { AgentWalletBalance } from "@/lib/api";
import { Button } from "@nous-research/ui/ui/components/button";
import { Spinner } from "@nous-research/ui/ui/components/spinner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@nous-research/ui/ui/components/card";

/* ── Token logos (inline SVG, no network) ─────────────────────────────── */

function SolLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 397.7 311.7" className={className} aria-hidden>
      <defs>
        <linearGradient id="sol-mark" x1="360.9" y1="-37.5" x2="141.2" y2="383.3" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
      </defs>
      <path fill="url(#sol-mark)" d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" />
      <path fill="url(#sol-mark)" d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" />
      <path fill="url(#sol-mark)" d="M333.1 120.9c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" />
    </svg>
  );
}

function UsdcLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#2775CA" />
      <path
        fill="#fff"
        d="M16 6.2a9.8 9.8 0 1 0 0 19.6 9.8 9.8 0 0 0 0-19.6zm0 17.6a7.8 7.8 0 1 1 0-15.6 7.8 7.8 0 0 1 0 15.6z"
      />
      <text
        x="16"
        y="21.2"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="#fff"
        fontFamily="system-ui, sans-serif"
      >
        $
      </text>
    </svg>
  );
}

/* ── helpers ───────────────────────────────────────────────────────────── */

function shortAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function fmtBalance(value: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

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
      title="Copy address"
      aria-label="Copy address"
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

/* ── Transfer dialog ───────────────────────────────────────────────────── */

function TransferDialog({
  wallet,
  onClose,
  onDone,
}: {
  wallet: AgentWalletBalance;
  onClose: () => void;
  onDone: () => void;
}) {
  const [token, setToken] = useState<"USDC" | "SOL">("USDC");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsWhitelist, setNeedsWhitelist] = useState(false);
  const [done, setDone] = useState(false);

  const submit = useCallback(
    (withWhitelist: boolean) => {
      const amt = Number(amount);
      if (!to.trim()) {
        setError("Enter a destination address.");
        return;
      }
      if (!amt || amt <= 0) {
        setError("Enter an amount greater than zero.");
        return;
      }
      setSubmitting(true);
      setError(null);
      api
        .transferWallet({
          agent_id: wallet.agent_id,
          to: to.trim(),
          amount: amt,
          token,
          add_to_whitelist: withWhitelist,
        })
        .then((resp) => {
          if (resp.ok) {
            setDone(true);
            onDone();
          } else if (resp.code === "destination_not_whitelisted") {
            setNeedsWhitelist(true);
            setError(
              "This address isn't on the agent's whitelist. On-chain transfers only go to whitelisted addresses.",
            );
          } else {
            setError(resp.error ?? "Transfer failed.");
          }
        })
        .catch((e) => setError(e instanceof Error ? e.message : String(e)))
        .finally(() => setSubmitting(false));
    },
    [amount, to, token, wallet.agent_id, onDone],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-background p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Transfer from {wallet.name || shortAddress(wallet.agent_id)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Check className="h-5 w-5" /> Transfer submitted on-chain.
            </div>
            <div className="flex justify-end">
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Token */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Token
              </label>
              <div className="flex gap-2">
                {(["USDC", "SOL"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setToken(t)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                      token === t
                        ? "border-primary bg-primary/10 font-medium"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {t === "SOL" ? <SolLogo className="h-4 w-4" /> : <UsdcLogo className="h-4 w-4" />}
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Destination */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Destination address
              </label>
              <input
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setNeedsWhitelist(false);
                }}
                placeholder="Solana address"
                className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Amount
              </label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm tabular-nums outline-none focus:border-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Available: {fmtBalance(token === "USDC" ? wallet.usdc_balance : wallet.sol_balance)}{" "}
                {token}
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <p className="text-xs text-muted-foreground">
              On-chain transfers are irreversible. Double-check the address and amount.
            </p>

            <div className="flex justify-end gap-2">
              <Button ghost onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              {needsWhitelist ? (
                <Button onClick={() => submit(true)} disabled={submitting} prefix={<Send className="h-4 w-4" />}>
                  Whitelist &amp; send
                </Button>
              ) : (
                <Button onClick={() => submit(false)} disabled={submitting} prefix={<Send className="h-4 w-4" />}>
                  {submitting ? "Sending…" : "Send"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function WalletPage() {
  const [wallets, setWallets] = useState<AgentWalletBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transfer, setTransfer] = useState<AgentWalletBalance | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .getWalletBalances()
      .then((resp) => {
        if (resp.ok) {
          setWallets(resp.wallets ?? []);
          setError(null);
        } else {
          setError(resp.error ?? "Failed to load wallet balances");
          setWallets(resp.wallets ?? []);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Agent Wallets</h1>
        </div>
        <Button
          outlined
          size="sm"
          onClick={load}
          disabled={loading}
          prefix={<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />}
        >
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {loading && wallets.length === 0 ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : wallets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No agent wallets found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {wallets.map((w) => (
            <Card key={w.agent_id}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="truncate text-sm font-semibold">
                  {w.name || shortAddress(w.agent_id)}
                </CardTitle>
                {w.wallet_address && (
                  <Button
                    outlined
                    size="sm"
                    onClick={() => setTransfer(w)}
                    prefix={<Send className="h-4 w-4" />}
                  >
                    Transfer
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <code className="rounded-md border border-emerald-500/40 bg-black/50 px-2.5 py-1 font-mono text-sm font-medium text-emerald-300">
                    {w.wallet_address ? shortAddress(w.wallet_address) : "—"}
                  </code>
                  {w.wallet_address && <CopyButton value={w.wallet_address} />}
                </div>
                <div className="flex gap-8">
                  <div className="flex items-center gap-2">
                    <UsdcLogo />
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        USDC
                      </div>
                      <div className="text-xl font-semibold tabular-nums">
                        {fmtBalance(w.usdc_balance)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <SolLogo />
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        SOL
                      </div>
                      <div className="text-xl font-semibold tabular-nums">
                        {fmtBalance(w.sol_balance)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {transfer && (
        <TransferDialog
          wallet={transfer}
          onClose={() => setTransfer(null)}
          onDone={load}
        />
      )}
    </div>
  );
}
