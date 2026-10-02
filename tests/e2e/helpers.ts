import { deflateSync } from "node:zlib";
import type { Page } from "@playwright/test";

/** A solid-colour PNG, so tests don't need binary fixtures. */
export function solidPng(width: number, height: number, rgb = [200, 190, 170]): Buffer {
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x++) row.set(rgb, 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Taps the wall canvas at a wall position in cm (x from left, y from the floor). */
export async function tapWall(page: Page, wall: { widthCm: number; heightCm: number }, x: number, y: number) {
  const canvas = page.locator('[data-testid="wall-canvas"] .konvajs-content');
  const box = (await canvas.boundingBox())!;
  const scale = box.width / wall.widthCm;
  await canvas.click({ position: { x: x * scale, y: (wall.heightCm - y) * scale } });
}

/** Keep tests offline: stub map tiles and place search. */
export async function stubExternal(page: Page) {
  await page.route(/tile\.openstreetmap\.org/, (r) => r.fulfill({ status: 204 }));
  await page.route(/nominatim\.openstreetmap\.org/, (r) =>
    r.fulfill({ json: [{ display_name: "Ottawa, Ontario, Canada", lat: "45.4215", lon: "-75.6972" }] }),
  );
}
