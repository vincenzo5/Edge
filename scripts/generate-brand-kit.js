const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const BRAND_DIR = path.join(__dirname, '..', 'public', 'brand');

async function generateBrandKit() {
  const iconSvg = fs.readFileSync(path.join(BRAND_DIR, 'icon-light.svg'));
  const logoSvg = fs.readFileSync(path.join(BRAND_DIR, 'logo-full-light.svg'));
  const monoWhiteSvg = fs.readFileSync(path.join(BRAND_DIR, 'icon-mono-white.svg'));

  // Icon PNG sizes
  const iconSizes = [16, 32, 48, 128, 256, 512, 1024];
  for (const size of iconSizes) {
    await sharp(iconSvg).resize(size, size).png().toFile(path.join(BRAND_DIR, `icon-${size}.png`));
    console.log(`Generated icon-${size}.png`);
  }

  // Favicon ICO (use 48px PNG as ICO source — browsers accept PNG favicons too)
  await sharp(iconSvg).resize(32, 32).png().toFile(path.join(BRAND_DIR, 'favicon-16.png'));
  await sharp(iconSvg).resize(48, 48).png().toFile(path.join(BRAND_DIR, 'favicon-48.png'));
  console.log('Generated favicon PNGs');

  // WebP versions
  await sharp(iconSvg).resize(512, 512).webp().toFile(path.join(BRAND_DIR, 'icon-512.webp'));
  console.log('Generated icon-512.webp');

  // OG Image — 1200x630 dark background with logo centered
  const ogBackground = Buffer.from(`
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="#0A0B0E"/>
      <rect x="0" y="0" width="1200" height="630" fill="#1E2030" opacity="0.15"/>
    </svg>
  `);

  const logoBuffer = await sharp(logoSvg).resize(480, 120).png().toBuffer();

  await sharp(ogBackground)
    .composite([{
      input: logoBuffer,
      top: 220,
      left: 360,
    }])
    .png()
    .toFile(path.join(BRAND_DIR, 'og-image.png'));
  console.log('Generated og-image.png (1200x630)');

  console.log('Brand kit generation complete!');
}

generateBrandKit().catch(console.error);
