/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'sources', 'approved-contact-sheet.png');
const output = path.join(root, 'screenshots');
const panels = [
  { left: 0, width: 443, name: '01-home.png' },
  { left: 443, width: 443, name: '02-calendar.png' },
  { left: 886, width: 444, name: '03-insights.png' },
  { left: 1330, width: 444, name: '04-streaks.png' },
];

(async () => {
  const metadata = await sharp(source).metadata();
  if (metadata.width !== 1774 || metadata.height !== 887) {
    throw new Error(`Unexpected contact-sheet dimensions: ${metadata.width}×${metadata.height}`);
  }

  fs.mkdirSync(output, { recursive: true });
  for (const panel of panels) {
    await sharp(source)
      .extract({ left: panel.left, top: 0, width: panel.width, height: metadata.height })
      .resize({ width: 1080, height: 1920, fit: 'contain', background: '#ffffff' })
      .flatten({ background: '#ffffff' })
      .removeAlpha()
      .png()
      .toFile(path.join(output, panel.name));
  }

  console.log(`Saved ${panels.length} approved Google Play screenshots to ${output}`);
})();
