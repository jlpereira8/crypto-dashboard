import { Head, Html, Main, NextScript } from "next/document";

/**
 * Exists for one reason: `lang` on <html>.
 *
 * Without it a screen reader has to guess the document's language, which is a
 * WCAG 3.1.1 failure. Next only emits the attribute if something sets it, and in
 * the pages router that means a custom document.
 *
 * The font deliberately isn't wired up here — `next/font` cannot be used in
 * `_document`, so the family is published as a `:root` custom property from
 * `_app` instead.
 */
export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
