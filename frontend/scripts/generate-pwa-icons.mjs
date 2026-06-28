/**
 * Generates PWA PNG icons from public/icons/icon-source.png
 * Run: node scripts/generate-pwa-icons.mjs
 */
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const iconsDir = join(rootDir, 'public', 'icons');
const sourcePath = join(iconsDir, 'icon-source.png');

const outputs = [
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

async function main() {
  await mkdir(iconsDir, { recursive: true });

  for (const { name, size } of outputs) {
    const outputPath = join(iconsDir, name);
    await sharp(sourcePath)
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
