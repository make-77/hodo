import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const linuxDir = path.join(distDir, 'linux-unpacked');
const iconPng = path.join(root, 'build', 'icon.png');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const packageName = 'hodo';
const productName = pkg.build?.productName || 'Hodo';
const installDir = `/opt/${productName}`;
const executableName = pkg.name;
const outputDeb = path.join(distDir, `${productName}-${pkg.version}-linux-amd64.deb`);
const now = Math.floor(Date.now() / 1000);

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function sizeOf(file) {
  return fs.statSync(file).size;
}

function walkFiles(dir) {
  const result = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      result.push({ type: 'dir', full });
      result.push(...walkFiles(full));
    } else if (entry.isFile()) {
      result.push({ type: 'file', full });
    }
  }

  return result;
}

function writeString(buffer, value, offset, length) {
  Buffer.from(String(value)).copy(buffer, offset, 0, length);
}

function writeOctal(buffer, value, offset, length) {
  const text = value.toString(8).padStart(length - 1, '0') + '\0';
  writeString(buffer, text, offset, length);
}

function splitTarPath(name) {
  const raw = Buffer.from(name);
  if (raw.length <= 100) {
    return { name, prefix: '' };
  }

  const parts = name.split('/');
  for (let index = parts.length - 1; index > 0; index -= 1) {
    const prefix = parts.slice(0, index).join('/');
    const shortName = parts.slice(index).join('/');

    if (Buffer.from(prefix).length <= 155 && Buffer.from(shortName).length <= 100) {
      return { name: shortName, prefix };
    }
  }

  throw new Error(`Tar path is too long: ${name}`);
}

function tarHeader(entry) {
  const header = Buffer.alloc(512, 0);
  const { name, prefix } = splitTarPath(entry.name);

  writeString(header, name, 0, 100);
  writeOctal(header, entry.mode, 100, 8);
  writeOctal(header, 0, 108, 8);
  writeOctal(header, 0, 116, 8);
  writeOctal(header, entry.size || 0, 124, 12);
  writeOctal(header, now, 136, 12);
  header.fill(0x20, 148, 156);
  writeString(header, entry.type, 156, 1);
  writeString(header, 'ustar', 257, 6);
  writeString(header, '00', 263, 2);
  writeString(header, 'root', 265, 32);
  writeString(header, 'root', 297, 32);
  writeString(header, prefix, 345, 155);

  let checksum = 0;
  for (const byte of header) {
    checksum += byte;
  }

  writeString(header, checksum.toString(8).padStart(6, '0') + '\0 ', 148, 8);
  return header;
}

function pad512(length) {
  const remainder = length % 512;
  return remainder === 0 ? Buffer.alloc(0) : Buffer.alloc(512 - remainder);
}

function makeTar(entries) {
  const buffers = [];

  for (const entry of entries) {
    const content = entry.content || Buffer.alloc(0);
    buffers.push(tarHeader({ ...entry, size: content.length }));
    buffers.push(content);
    buffers.push(pad512(content.length));
  }

  buffers.push(Buffer.alloc(1024));
  return Buffer.concat(buffers);
}

function addDirectory(entries, name) {
  const normalized = name.endsWith('/') ? name : `${name}/`;

  if (!entries.some(entry => entry.name === normalized)) {
    entries.push({ name: normalized, type: '5', mode: 0o755 });
  }
}

function addFile(entries, name, content, mode = 0o644) {
  entries.push({ name, type: '0', mode, content: Buffer.isBuffer(content) ? content : Buffer.from(content) });
}

function modeForLinuxFile(file) {
  const base = path.basename(file);

  if (base === executableName || base === 'chrome_crashpad_handler') {
    return 0o755;
  }

  if (base === 'chrome-sandbox') {
    return 0o4755;
  }

  if (base.endsWith('.so') || base.includes('.so.')) {
    return 0o755;
  }

  return 0o644;
}

function buildDataTar() {
  const entries = [];

  addDirectory(entries, './opt');
  addDirectory(entries, `.${installDir}`);

  for (const item of walkFiles(linuxDir)) {
    const relative = toPosix(path.relative(linuxDir, item.full));
    const target = `.${installDir}/${relative}`;

    if (item.type === 'dir') {
      addDirectory(entries, target);
    } else {
      addFile(entries, target, fs.readFileSync(item.full), modeForLinuxFile(item.full));
    }
  }

  addDirectory(entries, './usr');
  addDirectory(entries, './usr/bin');
  addFile(
    entries,
    './usr/bin/hodo',
    `#!/bin/sh\nexec "${installDir}/${executableName}" "$@"\n`,
    0o755
  );

  addDirectory(entries, './usr/share');
  addDirectory(entries, './usr/share/applications');
  addDirectory(entries, './usr/share/icons');
  addDirectory(entries, './usr/share/icons/hicolor');
  addDirectory(entries, './usr/share/icons/hicolor/256x256');
  addDirectory(entries, './usr/share/icons/hicolor/256x256/apps');

  if (fs.existsSync(iconPng)) {
    addFile(
      entries,
      './usr/share/icons/hicolor/256x256/apps/hodo.png',
      fs.readFileSync(iconPng),
      0o644
    );
  }

  addFile(
    entries,
    './usr/share/applications/hodo.desktop',
    [
      '[Desktop Entry]',
      'Type=Application',
      `Name=${productName}`,
      `Exec=${installDir}/${executableName} %U`,
      'Icon=hodo',
      'StartupWMClass=Hodo',
      'StartupNotify=true',
      'Terminal=false',
      'Categories=Office;',
      ''
    ].join('\n'),
    0o644
  );

  return zlib.gzipSync(makeTar(entries), { level: 9 });
}

function buildControlTar(installedSizeKb) {
  const authorName = pkg.author?.name || 'Hodo';
  const authorEmail = pkg.author?.email || 'maintainer@hodo.local';
  const description = pkg.description || 'Offline desktop application.';
  const control = [
    `Package: ${packageName}`,
    `Version: ${pkg.version}`,
    'Section: editors',
    'Priority: optional',
    'Architecture: amd64',
    `Maintainer: ${authorName} <${authorEmail}>`,
    `Installed-Size: ${installedSizeKb}`,
    `Homepage: ${pkg.homepage || 'https://hodo.local/'}`,
    `Description: ${description}`,
    ' Bundles the local HTML editor, Electron runtime, and frontend assets for offline use.',
    ''
  ].join('\n');

  const postinst = [
    '#!/bin/sh',
    'set -e',
    `if [ -f "${installDir}/chrome-sandbox" ]; then`,
    `  chown root:root "${installDir}/chrome-sandbox" || true`,
    `  chmod 4755 "${installDir}/chrome-sandbox" || true`,
    'fi',
    'if command -v gtk-update-icon-cache >/dev/null 2>&1; then',
    '  gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true',
    'fi',
    'if command -v update-desktop-database >/dev/null 2>&1; then',
    '  update-desktop-database -q /usr/share/applications || true',
    'fi',
    ''
  ].join('\n');

  const entries = [];
  addFile(entries, './control', control, 0o644);
  addFile(entries, './postinst', postinst, 0o755);

  return zlib.gzipSync(makeTar(entries), { level: 9 });
}

function arMember(name, content, mode = '100644') {
  const header = Buffer.alloc(60, 0x20);
  writeString(header, `${name}/`, 0, 16);
  writeString(header, now, 16, 12);
  writeString(header, '0', 28, 6);
  writeString(header, '0', 34, 6);
  writeString(header, mode, 40, 8);
  writeString(header, content.length, 48, 10);
  writeString(header, '`\n', 58, 2);

  return Buffer.concat([
    header,
    content,
    content.length % 2 === 0 ? Buffer.alloc(0) : Buffer.from('\n')
  ]);
}

if (!fs.existsSync(linuxDir)) {
  throw new Error('Missing dist/linux-unpacked. Run electron-builder --linux dir first.');
}

const installedBytes = walkFiles(linuxDir)
  .filter(item => item.type === 'file')
  .reduce((sum, item) => sum + sizeOf(item.full), 0);
const installedSizeKb = Math.ceil((installedBytes + 4096) / 1024);
const controlTar = buildControlTar(installedSizeKb);
const dataTar = buildDataTar();
const deb = Buffer.concat([
  Buffer.from('!<arch>\n'),
  arMember('debian-binary', Buffer.from('2.0\n')),
  arMember('control.tar.gz', controlTar),
  arMember('data.tar.gz', dataTar)
]);

fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(outputDeb, deb);

console.log(`Created ${path.relative(root, outputDeb)}`);
