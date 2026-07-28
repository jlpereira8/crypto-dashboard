import React, { useCallback, useId, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/cn";
import { formatAmount, formatPrice } from "../../lib/format";
import type { Asset } from "../../lib/market-api";
import { spring, withReducedMotion } from "../../lib/motion";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Modal,
  Select,
  Skeleton,
  StatLabel,
  Tooltip,
} from "../ui";
import { CoinMark } from "./CoinMark";
import { StatusBanner, type StatusMessage } from "./StatusBanner";

export interface ExchangeCardProps {
  assets: Asset[] | undefined;
  loading: boolean;
  /** Anchor target, so the Portfolio card's CTA can link straight here. */
  id?: string;
}

const DEFAULT_FROM = "btc-bitcoin";
const DEFAULT_TO = "eth-ethereum";
/** Guard against fat-finger entry; also keeps the result readable. */
const MAX_AMOUNT = 1_000_000_000;

/**
 * Asset conversion widget.
 *
 * Hierarchy changes from the original: the amount is now the largest control and
 * sits *above* the asset picker (you decide how much before you decide what),
 * the two sides are separated by a real swap affordance rather than stacked
 * identically, and the result is an `<output>` — a live region, so the converted
 * figure is announced as you type instead of being silently recalculated.
 *
 * Submitting is simulated: there is no exchange backend here, which the Demo
 * badge states outright rather than implying an order was placed.
 */
export function ExchangeCard({ assets, loading, id }: ExchangeCardProps) {
  const [fromId, setFromId] = useState(DEFAULT_FROM);
  const [toId, setToId] = useState(DEFAULT_TO);
  const [amountText, setAmountText] = useState("1");
  const [touched, setTouched] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [swapTurns, setSwapTurns] = useState(0);

  const reduced = useReducedMotion() ?? false;
  const amountRef = useRef<HTMLInputElement>(null);
  const resultLabelId = `${useId()}-result-label`;

  const options = useMemo(
    () =>
      (assets ?? []).map((asset) => ({
        value: asset.id,
        label: `${asset.name} · ${asset.symbol}`,
      })),
    [assets],
  );

  const byId = useMemo(() => {
    const map = new Map<string, Asset>();
    for (const asset of assets ?? []) map.set(asset.id, asset);
    return map;
  }, [assets]);

  const fromCoin = byId.get(fromId);
  const toCoin = byId.get(toId);

  const amount = Number(amountText);
  const amountIsBlank = amountText.trim() === "";

  /** Validation runs always; the message only surfaces once the field is dirty. */
  const amountError = useMemo(() => {
    if (amountIsBlank) return "Enter an amount to convert.";
    if (!Number.isFinite(amount)) return "Enter a valid number.";
    if (amount <= 0) return "Amount must be greater than zero.";
    if (amount > MAX_AMOUNT) return "That amount is too large to convert.";
    return null;
  }, [amount, amountIsBlank]);

  const pairError = fromId === toId ? "Choose two different assets." : null;

  // Both prices can be null when the provider omits a quote; a missing price is
  // not a price of zero, so the rate stays null and the UI shows an em dash.
  const rate =
    fromCoin?.price != null && toCoin?.price != null && toCoin.price > 0
      ? fromCoin.price / toCoin.price
      : null;

  const result = rate !== null && !amountError ? amount * rate : null;

  const canSubmit = !amountError && !pairError && rate !== null && !loading;

  const swap = useCallback(() => {
    setFromId(toId);
    setToId(fromId);
    setSwapTurns((turns) => turns + 1);
    setStatus(null);
  }, [fromId, toId]);

  const onReview = useCallback(() => {
    setTouched(true);
    if (!canSubmit) {
      amountRef.current?.focus();
      return;
    }
    setStatus(null);
    setConfirmOpen(true);
  }, [canSubmit]);

  const onConfirm = useCallback(async () => {
    if (!fromCoin || !toCoin || result === null) return;
    setSubmitting(true);
    // Stand-in for the order request this demo has no backend for.
    await new Promise((resolve) => setTimeout(resolve, 900));
    setSubmitting(false);
    setConfirmOpen(false);
    setStatus({
      tone: "success",
      title: "Exchange simulated",
      detail: `${formatAmount(amount)} ${fromCoin.symbol} → ${formatAmount(
        result,
      )} ${toCoin.symbol}. No live order was placed.`,
    });
  }, [amount, fromCoin, result, toCoin]);

  const showAmountError = touched ? amountError : null;

  return (
    <>
      <Card id={id} className="flex flex-col scroll-mt-16">
        <CardHeader className="mb-3">
          <div>
            <CardTitle>Exchange</CardTitle>
            <CardDescription>Convert between any two tracked assets</CardDescription>
          </div>
          <Tooltip content="Rates are live, but no order is ever submitted">
            {/* tabIndex so the tooltip is reachable by keyboard, not hover-only */}
            <Badge tone="accent" tabIndex={0} className="cursor-help">
              Demo
            </Badge>
          </Tooltip>
        </CardHeader>

        {loading ? (
          <ExchangeSkeleton />
        ) : (
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              onReview();
            }}
            className="flex flex-1 flex-col"
          >
            {/* ── You send ─────────────────────────────────────────────── */}
            <fieldset className="min-w-0 space-y-2 rounded-lg bg-surface-subtle p-2.5">
              <legend className="sr-only">You send</legend>
              <StatLabel aria-hidden="true">You send</StatLabel>

              <Field
                label="Amount"
                hideLabel
                error={showAmountError ?? undefined}
                hint={fromCoin ? `1 ${fromCoin.symbol} ≈ ${formatPrice(fromCoin.price)}` : undefined}
              >
                <Input
                  ref={amountRef}
                  size="md"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={0}
                  alignEnd
                  value={amountText}
                  onChange={(event) => setAmountText(event.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="0.00"
                  trailing={fromCoin?.symbol}
                />
              </Field>

              <Field label="Asset to send" hideLabel error={pairError ?? undefined}>
                <Select
                  options={options}
                  value={fromId}
                  onChange={(event) => {
                    setFromId(event.target.value);
                    setStatus(null);
                  }}
                  leading={<CoinMark src={fromCoin?.logoUrl} symbol={fromCoin?.symbol ?? "?"} />}
                />
              </Field>
            </fieldset>

            {/* ── Swap ─────────────────────────────────────────────────── */}
            <div className="relative flex h-4 items-center justify-center">
              <span aria-hidden="true" className="absolute inset-x-3 top-1/2 h-px bg-line" />
              <Tooltip content="Swap direction">
                <button
                  type="button"
                  onClick={swap}
                  aria-label={
                    fromCoin && toCoin
                      ? `Swap direction: send ${toCoin.symbol} instead of ${fromCoin.symbol}`
                      : "Swap direction"
                  }
                  className={cn(
                    "focus-ring relative grid h-8 w-8 place-items-center rounded-full",
                    "bg-surface text-ink-secondary shadow-xs ring-1 ring-line-strong",
                    "transition-colors duration-fast hover:text-ink hover:ring-accent-line",
                  )}
                >
                  <motion.span
                    animate={{ rotate: swapTurns * 180 }}
                    transition={withReducedMotion(spring.snappy, reduced)}
                    className="grid place-items-center"
                  >
                    <SwapIcon />
                  </motion.span>
                </button>
              </Tooltip>
            </div>

            {/* ── You receive ──────────────────────────────────────────── */}
            <fieldset className="min-w-0 space-y-2 rounded-lg bg-surface-subtle p-2.5">
              <legend className="sr-only">You receive</legend>
              <StatLabel aria-hidden="true">You receive</StatLabel>

              <div className="space-y-1.5">
                <span className="sr-only" id={resultLabelId}>
                  Converted amount
                </span>
                {/* <output> is an implicit polite live region, so the figure is
                    announced as it recalculates. */}
                <output
                  aria-labelledby={resultLabelId}
                  className={cn(
                    "flex h-8 items-center justify-end gap-2 rounded-lg bg-surface px-2.5",
                    "text-sm font-semibold text-ink ring-1 ring-inset ring-line nums-tight",
                  )}
                >
                  <span>{result === null ? "—" : formatAmount(result)}</span>
                  {toCoin && (
                    <span className="text-xs font-medium text-ink-muted">
                      {toCoin.symbol}
                    </span>
                  )}
                </output>
              </div>

              <Field label="Asset to receive" hideLabel>
                <Select
                  options={options}
                  value={toId}
                  onChange={(event) => {
                    setToId(event.target.value);
                    setStatus(null);
                  }}
                  leading={<CoinMark src={toCoin?.logoUrl} symbol={toCoin?.symbol ?? "?"} />}
                />
              </Field>
            </fieldset>

            {/* ── Rate ─────────────────────────────────────────────────── */}
            <dl className="mt-2.5 flex items-baseline justify-between gap-2 text-xs">
              <dt className="text-ink-muted">Rate</dt>
              <dd className="truncate font-medium text-ink-secondary nums-tight">
                {rate === null || !fromCoin || !toCoin
                  ? "—"
                  : `1 ${fromCoin.symbol} = ${formatAmount(rate, 6)} ${toCoin.symbol}`}
              </dd>
            </dl>

            <StatusBanner message={status} onDismiss={() => setStatus(null)} />

            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              className="mt-3"
              disabled={!canSubmit}
            >
              Review exchange
            </Button>
          </form>
        )}
      </Card>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm exchange"
        description="Review the conversion before continuing. Nothing is submitted to an exchange."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" loading={submitting} onClick={onConfirm}>
              Confirm exchange
            </Button>
          </>
        }
      >
        <dl className="space-y-2.5 text-sm">
          <SummaryRow
            label="You send"
            value={`${formatAmount(amount)} ${fromCoin?.symbol ?? ""}`}
          />
          <SummaryRow
            label="You receive"
            value={`${result === null ? "—" : formatAmount(result)} ${toCoin?.symbol ?? ""}`}
          />
          <SummaryRow
            label="Rate"
            value={
              rate === null || !fromCoin || !toCoin
                ? "—"
                : `1 ${fromCoin.symbol} = ${formatAmount(rate, 6)} ${toCoin.symbol}`
            }
          />
        </dl>
      </Modal>
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line pb-2.5 last:border-0 last:pb-0">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-medium text-ink nums-tabular">{value}</dd>
    </div>
  );
}

function ExchangeSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <Skeleton className="h-[8.5rem] rounded-xl" />
      <Skeleton className="mx-auto h-8 w-8 rounded-full" />
      <Skeleton className="h-[8.5rem] rounded-xl" />
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-12 rounded-xl" />
    </div>
  );
}

function SwapIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M5.5 2.5v11M5.5 13.5 3 11M10.5 13.5v-11M10.5 2.5 13 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
