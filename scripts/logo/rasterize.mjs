import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const artwork = readFileSync("public/brand/logo.svg");
const mark = readFileSync("public/icon.svg");

mkdirSync("public/icons", { recursive: true });

const render = (source, size) =>
  sharp(source, { density: 384 })
    .resize(size, size, { kernel: "nearest" })
    .png()
    .toBuffer();

const [icon192, icon512, appleTouch, favicon32, favicon16] = await Promise.all([
  render(artwork, 192),
  render(artwork, 512),
  render(artwork, 180),
  render(mark, 32),
  render(mark, 16),
]);

writeFileSync("public/icons/icon-192.png", icon192);
writeFileSync("public/icons/icon-512.png", icon512);
writeFileSync("public/apple-touch-icon.png", appleTouch);

const icoHeader = Buffer.alloc(6 + 16 * 2);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(2, 4);

let offset = icoHeader.length;
for (const [index, [size, png]] of [[32, favicon32], [16, favicon16]].entries()) {
  const entry = 6 + index * 16;
  icoHeader.writeUInt8(size, entry);
  icoHeader.writeUInt8(size, entry + 1);
  icoHeader.writeUInt8(0, entry + 2);
  icoHeader.writeUInt8(0, entry + 3);
  icoHeader.writeUInt16LE(1, entry + 4);
  icoHeader.writeUInt16LE(32, entry + 6);
  icoHeader.writeUInt32LE(png.length, entry + 8);
  icoHeader.writeUInt32LE(offset, entry + 12);
  offset += png.length;
}

writeFileSync("public/favicon.ico", Buffer.concat([icoHeader, favicon32, favicon16]));
console.log("Rasterized transparent logo assets.");
