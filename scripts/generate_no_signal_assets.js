import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const assetsDir = path.resolve('assets/images');
const playConsoleDir = path.resolve('assets/play_console');

async function buildNoSignalPlayConsoleAssets() {
  const sourceImage = path.join(assetsDir, 'icon_no_signal_text.png');

  console.log(`Building Play Console assets from ${sourceImage}...`);

  // 1. 512x512 Developer Icon
  const iconTarget = path.join(playConsoleDir, 'developer_icon_512x512.png');
  await sharp(sourceImage)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 10, g: 10, b: 10, alpha: 1 }
    })
    .flatten({ background: '#0a0a0a' })
    .png({ quality: 95 })
    .toFile(iconTarget);

  // 2. 4096x2304 Header Image
  const headerTarget = path.join(playConsoleDir, 'header_image_4096x2304.jpg');
  await sharp(sourceImage)
    .resize(4096, 2304, {
      fit: 'contain',
      background: { r: 10, g: 10, b: 10, alpha: 1 }
    })
    .flatten({ background: '#0a0a0a' })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(headerTarget);

  console.log(`✨ Successfully generated No Signal! Developer Icon: ${iconTarget}`);
  console.log(`✨ Successfully generated No Signal! Header Image: ${headerTarget}`);
}

buildNoSignalPlayConsoleAssets().catch(console.error);
