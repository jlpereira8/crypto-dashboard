import { useState } from "react";
import Head from "next/head";
import { motion } from "framer-motion";
import { cn } from "../../lib/cn";
import { API_BASE, ENDPOINTS, ERRORS, LIMITS, LOGO_BASE } from "../../lib/api-reference";
import { fadeUp, staggerContainer, transition } from "../../lib/motion";
import {
  Badge,
  Callout,
  Card,
  CodeBlock,
  PageHeader,
  StatLabel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableScroll,
} from "../../components/ui";

/**
 * Developer reference for the data layer.
 *
 * Documents the real CoinPaprika integration rather than inventing a CryptoBay
 * API: this app has no backend, and fabricated endpoints and API keys would be
 * documentation for software that doesn't exist. Everything here was verified
 * against the live service.
 */
export default function ApiPage() {
  const [active, setActive] = useState(ENDPOINTS[0]?.id ?? "");

  return (
    <>
      <Head>
        <title>API reference — CryptoBay</title>
        <meta
          name="description"
          content="The endpoints, parameters, limits and error handling behind CryptoBay's market data."
        />
      </Head>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div variants={fadeUp} transition={transition.base}>
          <PageHeader
            eyebrow="Platform"
            title="API reference"
            description="CryptoBay reads market data straight from CoinPaprika's public API — no backend, no proxy, no key. This page documents the three requests the app actually makes, with the exact parameters and limits it works within."
            actions={
              <Badge tone="positive" className="gap-1.5">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-positive" />
                No auth required
              </Badge>
            }
          >
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded bg-surface-subtle px-2 py-1 font-mono text-xs text-ink-secondary ring-1 ring-inset ring-line">
                {API_BASE}
              </code>
            </div>
          </PageHeader>
        </motion.div>

        {/* ── Overview ─────────────────────────────────────────────────────── */}
        <motion.section
          variants={fadeUp}
          transition={transition.base}
          aria-label="Overview"
          className="border-b border-line bg-surface px-4 py-5 sm:px-6"
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <h3 className="text-sm font-semibold tracking-tight text-ink">Overview</h3>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-secondary">
                Three endpoints cover the whole product. The market list is fetched once and every
                table interaction — search, sort, filter, pagination — derives from it client-side.
                Price history is the only per-asset call, keyed by asset and range so revisiting
                either is served from cache.
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                <div>
                  <dt>
                    <StatLabel>Requests per session</StatLabel>
                  </dt>
                  <dd className="mt-0.5 text-lg font-semibold text-ink">3</dd>
                </div>
                <div>
                  <dt>
                    <StatLabel>Cache window</StatLabel>
                  </dt>
                  <dd className="mt-0.5 text-lg font-semibold text-ink">60 s</dd>
                </div>
                <div>
                  <dt>
                    <StatLabel>Assets returned</StatLabel>
                  </dt>
                  <dd className="mt-0.5 text-lg font-semibold text-ink">50</dd>
                </div>
              </dl>
            </div>

            <Callout tone="info" title="Asset logos are not an API call">
              Logos come from a predictable static path, so fifty of them cost zero requests
              against the API:
              <code className="mt-1.5 block break-all rounded bg-surface px-1.5 py-1 font-mono text-micro text-ink-secondary">
                {LOGO_BASE}/{"{assetId}"}/logo.png
              </code>
            </Callout>
          </div>
        </motion.section>

        {/* ── Authentication ───────────────────────────────────────────────── */}
        <motion.section
          variants={fadeUp}
          transition={transition.base}
          aria-label="Authentication"
          className="border-b border-line bg-surface px-4 py-5 sm:px-6"
        >
          <h3 className="text-sm font-semibold tracking-tight text-ink">Authentication</h3>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-secondary">
            None. The endpoints below are public and respond to unauthenticated requests. That is
            what makes a browser-only demo possible — with a keyed API the key would either sit in
            the client bundle or need a server to hide it.
          </p>
          <Callout tone="warning" title="If you fork this" className="mt-3 max-w-2xl">
            The moment you move to a keyed provider, the key belongs on a server. Anything shipped
            to the browser is public, including values in <code className="font-mono">
              NEXT_PUBLIC_
            </code>{" "}
            variables.
          </Callout>
        </motion.section>

        {/* ── Endpoints ────────────────────────────────────────────────────── */}
        <motion.section
          variants={fadeUp}
          transition={transition.base}
          aria-label="Endpoints"
          className="border-b border-line bg-surface"
        >
          <div className="px-4 pb-3 pt-5 sm:px-6">
            <h3 className="text-sm font-semibold tracking-tight text-ink">Endpoints</h3>
            <p className="mt-1 text-xs text-ink-muted">
              {ENDPOINTS.length} endpoints, all GET, all unauthenticated.
            </p>
          </div>

          {/* Jump links double as a table of contents on narrow screens. */}
          <div
            role="tablist"
            aria-label="Endpoints"
            className="scrollbar-slim flex gap-1 overflow-x-auto border-y border-line bg-surface-raised px-4 py-2 sm:px-6"
          >
            {ENDPOINTS.map((endpoint) => (
              <button
                key={endpoint.id}
                type="button"
                role="tab"
                aria-selected={active === endpoint.id}
                onClick={() => setActive(endpoint.id)}
                className={cn(
                  "focus-ring shrink-0 rounded px-2 py-1 font-mono text-xs",
                  "transition-colors duration-fast",
                  active === endpoint.id
                    ? "bg-accent-soft text-accent-text"
                    : "text-ink-muted hover:bg-surface-subtle hover:text-ink",
                )}
              >
                {endpoint.path}
              </button>
            ))}
          </div>

          <div className="divide-y divide-line">
            {ENDPOINTS.filter((endpoint) => endpoint.id === active).map((endpoint) => (
              <article key={endpoint.id} className="px-4 py-5 sm:px-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="accent" className="font-mono">
                    {endpoint.method}
                  </Badge>
                  <code className="break-all font-mono text-sm font-medium text-ink">
                    {endpoint.path}
                  </code>
                </div>
                <p className="mt-2 max-w-2xl text-sm text-ink-secondary">{endpoint.summary}</p>
                <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-ink-muted">
                  {endpoint.usage}
                </p>

                {endpoint.params && (
                  <div className="mt-4">
                    <StatLabel className="mb-1.5">Query parameters</StatLabel>
                    <TableScroll>
                      <Table>
                        <TableHead>
                          <tr>
                            <TableHeaderCell>Name</TableHeaderCell>
                            <TableHeaderCell>Example</TableHeaderCell>
                            <TableHeaderCell>Description</TableHeaderCell>
                          </tr>
                        </TableHead>
                        <TableBody>
                          {endpoint.params.map((param) => (
                            <tr key={param.name}>
                              <TableCell className="font-mono text-xs text-ink">
                                {param.name}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-accent-text">
                                {param.value}
                              </TableCell>
                              <TableCell className="whitespace-normal text-xs text-ink-secondary">
                                {param.note}
                              </TableCell>
                            </tr>
                          ))}
                        </TableBody>
                      </Table>
                    </TableScroll>
                  </div>
                )}

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div>
                    <StatLabel className="mb-1.5">Request</StatLabel>
                    <CodeBlock samples={endpoint.samples} caption={endpoint.path} />
                  </div>
                  <div>
                    <StatLabel className="mb-1.5">Response</StatLabel>
                    <CodeBlock
                      samples={[{ language: "JSON", code: endpoint.responseSample }]}
                      caption="200 OK"
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <StatLabel className="mb-1.5">Fields this app reads</StatLabel>
                  <TableScroll>
                    <Table>
                      <TableHead>
                        <tr>
                          <TableHeaderCell>Field</TableHeaderCell>
                          <TableHeaderCell>Type</TableHeaderCell>
                          <TableHeaderCell>Notes</TableHeaderCell>
                        </tr>
                      </TableHead>
                      <TableBody>
                        {endpoint.fields.map((field) => (
                          <tr key={field.name}>
                            <TableCell className="font-mono text-xs text-ink">
                              {field.name}
                            </TableCell>
                            <TableCell className="text-xs text-ink-muted">{field.type}</TableCell>
                            <TableCell className="whitespace-normal text-xs text-ink-secondary">
                              {field.note}
                            </TableCell>
                          </tr>
                        ))}
                      </TableBody>
                    </Table>
                  </TableScroll>
                </div>
              </article>
            ))}
          </div>
        </motion.section>

        {/* ── Limits + errors ──────────────────────────────────────────────── */}
        <motion.section
          variants={fadeUp}
          transition={transition.base}
          aria-label="Limits and error handling"
          className="border-b border-line bg-surface px-4 py-5 sm:px-6"
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-ink">Limits</h3>
              <p className="mt-1 text-xs text-ink-muted">
                Provider constraints, plus the ones this client imposes on itself.
              </p>
              <dl className="mt-3 divide-y divide-line-subtle">
                {LIMITS.map((limit) => (
                  <div key={limit.label} className="py-2.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <dt className="text-xs font-medium text-ink">{limit.label}</dt>
                      <dd className="font-mono text-xs text-accent-text">{limit.value}</dd>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{limit.note}</p>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <h3 className="text-sm font-semibold tracking-tight text-ink">Error handling</h3>
              <p className="mt-1 text-xs text-ink-muted">
                Raw provider payloads never reach the interface.
              </p>
              <Card padding="none" className="mt-3 overflow-hidden">
                <TableScroll>
                  <Table>
                    <TableHead>
                      <tr>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell>Meaning</TableHeaderCell>
                        <TableHeaderCell>Behaviour</TableHeaderCell>
                      </tr>
                    </TableHead>
                    <TableBody>
                      {ERRORS.map((error) => (
                        <tr key={error.status}>
                          <TableCell className="font-mono text-xs text-ink">
                            {error.status}
                          </TableCell>
                          <TableCell className="whitespace-normal text-xs text-ink-secondary">
                            {error.meaning}
                          </TableCell>
                          <TableCell className="whitespace-normal text-xs text-ink-muted">
                            {error.handling}
                          </TableCell>
                        </tr>
                      ))}
                    </TableBody>
                  </Table>
                </TableScroll>
              </Card>
            </div>
          </div>
        </motion.section>
      </motion.div>
    </>
  );
}
