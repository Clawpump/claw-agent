import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Copy, ExternalLink, Search, Sparkles, Zap } from "lucide-react";
import { api } from "@/lib/api";
import type { X402Result } from "@/lib/api";
import { Button } from "@nous-research/ui/ui/components/button";
import { Badge } from "@nous-research/ui/ui/components/badge";
import { Spinner } from "@nous-research/ui/ui/components/spinner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@nous-research/ui/ui/components/card";

function bestPrice(r: X402Result): string | null {
  const chains = r.pricing ?? [];
  for (const c of chains) {
    if (c.priceLabel) return c.priceLabel;
  }
  return null;
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
      title="Copy resource URL"
      aria-label="Copy resource URL"
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function buildPrompt(r: X402Result): string {
  const price = bestPrice(r);
  const name = r.name ? ` ("${r.name}"${price ? `, ${price}` : ""})` : "";
  return `Use this x402 API and pay it with my ClawPump wallet: ${r.resourceUrl}${name}. First check what inputs it needs, then call it.`;
}

export default function X402Page() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<X402Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const search = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    api
      .searchX402(q)
      .then((resp) => {
        if (resp.ok) {
          setResults(resp.results ?? []);
        } else {
          setError(resp.error ?? "Search failed");
          setResults([]);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold">x402 Marketplace</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Search the Dexter x402 marketplace via the ClawPump MCP. Results are paid
        APIs an agent can pay for from its own ClawPump wallet.
      </p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") search();
            }}
            placeholder="e.g. image generation, ETH price, weather…"
            className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <Button onClick={search} disabled={loading || !query.trim()}>
          Search
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : searched && results.length === 0 && !error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No results.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {results.map((r, i) => {
            const price = bestPrice(r);
            return (
              <Card key={r.resourceUrl ?? i}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-sm font-semibold">
                      {r.name || r.host || "Untitled"}
                    </CardTitle>
                    {r.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {r.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {price && (
                      <span className="font-mono text-sm font-semibold text-emerald-400">
                        {price}
                      </span>
                    )}
                    {r.verified && (
                      <Badge tone="success" className="shrink-0">
                        verified
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {r.category && <Badge tone="secondary">{r.category}</Badge>}
                    {r.method && (
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono">
                        {r.method}
                      </span>
                    )}
                    {typeof r.qualityScore === "number" && (
                      <span>quality {r.qualityScore}</span>
                    )}
                  </div>
                  {r.resourceUrl && (
                    <div className="flex items-center gap-1">
                      <a
                        href={r.resourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-w-0 items-center gap-1 truncate font-mono text-xs text-emerald-300 hover:underline"
                      >
                        <span className="truncate">{r.resourceUrl}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                      <CopyButton value={r.resourceUrl} />
                    </div>
                  )}
                  {r.resourceUrl && (
                    <div className="pt-1">
                      <Button
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/chat?prompt=${encodeURIComponent(buildPrompt(r))}`,
                          )
                        }
                        prefix={<Sparkles className="h-4 w-4" />}
                      >
                        Use in chat
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
