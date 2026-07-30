import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const desktopDir = `C:\\Users\\Shime\\Desktop\\Nola Visual Arts and AV Academy, Org\\Logo's and Promo Content`;
const outputDir = path.resolve('assets/play_console');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function processDesktopAssets() {
  console.log('Inspecting Desktop Logo Files...');

  const logo1x1Path = path.join(desktopDir, 'Logo 1x1.png');
  const logoWholePath = path.join(desktopDir, 'Logo Whole.png');
  const logoV4Path = path.join(desktopDir, 'NVA_Logo v4.png');
  const maskPath = path.join(desktopDir, 'Logo_Mask Solo v3.png');

  if (fs.existsSync(logo1x1Path)) {
    const meta = await sharp(logo1x1Path).metadata();
    console.log(`Logo 1x1.png: ${meta.width}x${meta.height}`);
  }
  if (fs.existsSync(logoWholePath)) {
    const meta = await sharp(logoWholePath).metadata();
    console.log(`Logo Whole.png: ${meta.width}x${meta.height}`);
  }
  if (fs.existsSync(logoV4Path)) {
    const meta = await sharp(logoV4Path).metadata();
    console.log(`NVA_Logo v4.png: ${meta.width}x${meta.height}`);
  }

  // Choose best source for Developer Icon (512x512)
  const iconSource = fs.existsSync(logo1x1Path) ? logo1x1Path : (fs.existsSync(maskPath) ? maskPath : logoV4Path);
  const devIconPath = path.join(outputDir, 'developer_icon_512x512.png');

  await sharp(iconSource)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 10, g: 10, b: 10, alpha: 1 }
    })
    .flatten({ background: '#0a0a0a' })
    .png({ quality: 95 })
    .toFile(devIconPath);

  const iconStats = fs.statSync(devIconPath);
  console.log(`✨ Clean High-Res Developer Icon created: ${devIconPath} (${(iconStats.size / 1024).toFixed(1)} KB)`);

  // Choose best source for Header Image (4096x2304)
  const headerSource = fs.existsSync(logoV4Path) ? logoV4Path : (fs.existsSync(logoWholePath) ? logoWholePath : iconSource);
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
  console.log(`✨ Clean High-Res Header Image created: ${headerPath} (${(headerStats.size / (1024 * 1024)).toFixed(2)} MB)`);
}

processDesktopAssets().catch(err => {
  console.error('Error processing assets:', err);
  process.exit(1);
});
