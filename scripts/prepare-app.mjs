import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceHtml = path.join(root, 'hodo.html');
const appDir = path.join(root, 'app');
const vendorDir = path.join(appDir, 'vendor');

const wangeditorDir = path.join(root, 'node_modules', '@wangeditor', 'editor', 'dist');
const prismDir = path.join(root, 'node_modules', 'prismjs');

function assertFile(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${path.relative(root, file)}`);
  }
}

function copyFile(from, to) {
  assertFile(from);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

assertFile(sourceHtml);
assertFile(path.join(wangeditorDir, 'css', 'style.css'));
assertFile(path.join(wangeditorDir, 'index.js'));
assertFile(path.join(prismDir, 'themes', 'prism.min.css'));
assertFile(path.join(prismDir, 'prism.js'));
assertFile(path.join(prismDir, 'plugins', 'autoloader', 'prism-autoloader.min.js'));

fs.rmSync(appDir, { recursive: true, force: true });
fs.mkdirSync(vendorDir, { recursive: true });

copyFile(
  path.join(wangeditorDir, 'css', 'style.css'),
  path.join(vendorDir, 'wangeditor', 'style.css')
);
copyFile(
  path.join(wangeditorDir, 'index.js'),
  path.join(vendorDir, 'wangeditor', 'index.js')
);
copyFile(
  path.join(prismDir, 'themes', 'prism.min.css'),
  path.join(vendorDir, 'prism', 'prism.min.css')
);
copyFile(
  path.join(prismDir, 'prism.js'),
  path.join(vendorDir, 'prism', 'prism.js')
);
copyFile(
  path.join(prismDir, 'plugins', 'autoloader', 'prism-autoloader.min.js'),
  path.join(vendorDir, 'prism', 'prism-autoloader.min.js')
);

fs.cpSync(
  path.join(prismDir, 'components'),
  path.join(vendorDir, 'prism', 'components'),
  { recursive: true }
);

let html = fs.readFileSync(sourceHtml, 'utf8');

const replacements = [
  [
    'https://cdn.jsdelivr.net/npm/@wangeditor/editor@5.1.23/dist/css/style.css',
    './vendor/wangeditor/style.css'
  ],
  [
    'https://cdn.jsdelivr.net/npm/prismjs/themes/prism.min.css',
    './vendor/prism/prism.min.css'
  ],
  [
    'https://cdn.jsdelivr.net/npm/prismjs/prism.min.js',
    './vendor/prism/prism.js'
  ],
  [
    'https://cdn.jsdelivr.net/npm/prismjs/plugins/autoloader/prism-autoloader.min.js',
    './vendor/prism/prism-autoloader.min.js'
  ],
  [
    'https://cdn.jsdelivr.net/npm/prismjs/components/',
    './vendor/prism/components/'
  ],
  [
    'https://cdn.jsdelivr.net/npm/@wangeditor/editor@5.1.23/dist/index.min.js',
    './vendor/wangeditor/index.js'
  ]
];

for (const [from, to] of replacements) {
  html = html.split(from).join(to);
}

fs.writeFileSync(path.join(appDir, 'index.html'), html, 'utf8');

console.log('Prepared offline app assets in app/.');
