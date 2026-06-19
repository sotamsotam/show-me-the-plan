/**
 * Generates PWA PNG icons from public/icons/icon.svg
 * Run: node scripts/generate-pwa-icons.mjs
 */
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const iconsDir = join(rootDir, 'public', 'icons');
const svgPath = join(iconsDir, 'icon.svg');

const outputs = [
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

async function main() {
  const svgBuffer = await readFile(svgPath);

  await mkdir(iconsDir, { recursive: true });

  for (const { name, size } of outputs) {
    const outputPath = join(iconsDir, name);
    await sharp(svgBuffer, { density: 300 })
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Created ${name}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
