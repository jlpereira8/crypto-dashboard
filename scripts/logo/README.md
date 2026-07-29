# Logo sources

The CryptoBay mark is pixel art, generated rather than hand-drawn, so the
geometry stays editable — the alternative is hand-editing SVG path data.

Two sources, one identity:

| Script | Grid | Output | Contents |
| --- | --- | --- | --- |
| `generate-artwork.mjs` | 64 units | `public/brand/logo.svg` | The full artwork: violet **C** ring, three ascending candlesticks, sunset, shoreline, palm tree |
| `generate-mark.mjs` | 24 units | `public/icon.svg` | The reduced mark: the ring and the three candlesticks only |

Both outputs use a transparent canvas. Dark pixels inside the full artwork are
intentional illustration details, not a background tile.

```bash
node scripts/logo/generate-artwork.mjs   # -> public/brand/logo.svg
node scripts/logo/generate-mark.mjs      # -> public/icon.svg
```

Both take an optional output path as `argv[2]`.

## Why there are two

The artwork was rasterized at 512, 192, 32, 24 and 16px and inspected. It is
excellent down to ~48px and readable at 32px, but at **24px** — the size the
sidebar renders — the three candle bodies fuse into a single blob and the palm
disappears. So detail is *removed* for small sizes rather than scaled down and
lost:

- **Artwork** → PWA icons (192, 512) and `apple-touch-icon.png` (180)
- **Reduced mark** → the sidebar at 24px, and `favicon.ico` (32 + 16)

Each grid is chosen so one unit maps to whole device pixels at the sizes that
matter: 64 divides 512 (×8) and 192 (×3); 24 is exactly the sidebar size. Scaling
either to a non-multiple of its grid reintroduces antialiasing, which is why
`shape-rendering="crispEdges"` alone is not enough.

## The React component

`components/layout/BrandMark.tsx` inlines the reduced mark's paths (~1.2 kB)
instead of loading `/icon.svg`, so there is no request to miss and no first paint
with a hole in the sidebar. `generate-mark.mjs` prints the paths it produces —
paste them into the component when the geometry changes. Do not edit the path
data by hand.

## Rasterizing the PNGs and the .ico

`public/icons/icon-{192,512}.png`, `public/apple-touch-icon.png` and
`public/favicon.ico` are rasterized from the two SVGs above with:

```bash
node scripts/logo/rasterize.mjs
```

The PNGs preserve transparency; `favicon.ico` is a 2-entry icon directory
wrapping the 32px and 16px PNGs (the ICO format permits PNG payloads).
