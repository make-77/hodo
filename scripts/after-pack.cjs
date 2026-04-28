const { execFileSync } = require('node:child_process');
const path = require('node:path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') {
    return;
  }

  const root = context.packager.projectDir;
  const productFilename = context.packager.appInfo.productFilename;
  const exePath = path.join(context.appOutDir, `${productFilename}.exe`);
  const iconPath = path.join(root, 'build', 'icon.ico');
  const rceditPath = path.join(root, 'node_modules', 'electron-winstaller', 'vendor', 'rcedit.exe');

  execFileSync(rceditPath, [
    exePath,
    '--set-icon',
    iconPath,
    '--set-version-string',
    'CompanyName',
    'Hodo',
    '--set-version-string',
    'FileDescription',
    'Hodo',
    '--set-version-string',
    'ProductName',
    'Hodo',
    '--set-version-string',
    'InternalName',
    'Hodo',
    '--set-version-string',
    'OriginalFilename',
    'Hodo.exe'
  ], { stdio: 'inherit' });
};
