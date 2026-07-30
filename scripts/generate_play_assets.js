import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const assetsDir = path.resolve('assets/images');
const outputDir = path.resolve('assets/play_console');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateAssets() {
  console.log('Generating Google Play Console Developer Assets...');

  // 1. Developer Icon: 512x512 (PNG / JPEG, non-transparent background #0a0a0a)
  const iconSource = fs.existsSync(path.join(assetsDir, 'icon.png'))
    ? path.join(assetsDir, 'icon.png')
    : path.join(assetsDir, 'Logo_Mask Solo v3.1.png');

  const devIconPath = path.join(outputDir, 'developer_icon_512x512.png');
  await sharp(iconSource)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 10, g: 10, b: 10, alpha: 1 } // #0a0a0a solid dark background
    })
    .flatten({ background: '#0a0a0a' }) // Ensures no transparency
    .png({ quality: 90 })
    .toFile(devIconPath);

  const iconStats = fs.statSync(devIconPath);
  console.log(`✅ Developer Icon created: ${devIconPath} (${(iconStats.size / 1024).toFixed(1)} KB)`);

  // 2. Header Image: 4096x2304 (JPEG / PNG, non-transparent background)
  const headerSource = fs.existsSync(path.join(assetsDir, 'feature_graphic_1024x500.png'))
    ? path.join(assetsDir, 'feature_graphic_1024x500.png')
    : iconSource;

  const headerPath = path.join(outputDir, 'header_image_4096x2304.jpg');
  await sharp(headerSource)
    .resize(4096, 2304, {
      fit: 'contain',
      background: { r: 10, g: 10, b: 10, alpha: 1 }
    })
    .flatten({ background: '#0a0a0a' })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(headerPath);

  const headerStats = fs.statSync(headerPath);
  console.log(`✅ Header Image created: ${headerPath} (${(headerStats.size / (1024 * 1024)).toFixed(2)} MB)`);
}

generateAssets().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
