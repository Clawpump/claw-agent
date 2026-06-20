import { useCallback, useEffect, useState } from "react";
import { Check, Copy, RefreshCw, Wallet } from "lucide-react";
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

/** Truncate a Solana address to `7xKq…9fRe` for compact display. */
function shortAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

/** Format a token balance; `null`/undefined renders as an em dash. */
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
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
}

export default function WalletPage() {
  const [wallets, setWallets] = useState<AgentWalletBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          prefix={
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          }
        >
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="py-3 text-sm text-destructive">
            {error}
          </CardContent>
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
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {w.agent_id}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                    {w.wallet_address ? shortAddress(w.wallet_address) : "—"}
                  </code>
                  {w.wallet_address && <CopyButton value={w.wallet_address} />}
                </div>
                <div className="flex gap-6">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      USDC
                    </div>
                    <div className="text-xl font-semibold tabular-nums">
                      {fmtBalance(w.usdc_balance)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      SOL
                    </div>
                    <div className="text-xl font-semibold tabular-nums">
                      {fmtBalance(w.sol_balance)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
