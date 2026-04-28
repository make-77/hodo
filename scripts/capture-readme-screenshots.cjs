const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'docs', 'images');
const indexHtml = path.join(root, 'app', 'index.html');
const storageKey = 'hodo_editor_autosave_v9';

const sampleDocument = {
  mode: 'outline',
  title: '项目阶段性汇报',
  date: '2026-04-28',
  items: [
    {
      title: '一、项目进展',
      start: '2026-04-01',
      end: '2026-04-28',
      body: [
        '<p>本阶段已完成核心流程梳理、内容模板收敛和导出页面优化，整体交付节奏保持稳定。</p>',
        '<p>预览和导出的 HTML 已调整为正式、简洁的文档风格，并保留右上角目录按钮用于快速跳转。</p>'
      ].join(''),
      bodyEmpty: false,
      remarks: [
        {
          html: '<p>后续交付时只需要分发安装包，应用可离线运行。</p>',
          empty: false
        }
      ]
    },
    {
      title: '二、后续计划',
      start: '2026-04-29',
      end: '2026-05-10',
      body: [
        '<p>下一阶段将完成验收材料整理、导出文件复核和发布前检查。</p>',
        '<ul><li>确认安装包版本</li><li>复核 README 和界面截图</li><li>发布 Windows 与 Linux 交付物</li></ul>'
      ].join(''),
      bodyEmpty: false,
      remarks: []
    }
  ]
};

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForExpression(win, expression, timeoutMs = 10000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const ok = await win.webContents.executeJavaScript(`Boolean(${expression})`);

    if (ok) {
      return;
    }

    await delay(100);
  }

  throw new Error(`Timed out waiting for: ${expression}`);
}

async function capture(win, filename) {
  await win.webContents.executeJavaScript(`
    document.querySelectorAll('.toast').forEach(el => el.classList.remove('show'));
  `);
  await delay(500);
  const image = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outDir, filename), image.toPNG());
}

async function main() {
  if (!fs.existsSync(indexHtml)) {
    throw new Error('Missing app/index.html. Run npm run prepare:app first.');
  }

  fs.mkdirSync(outDir, { recursive: true });

  const win = new BrowserWindow({
    width: 1440,
    height: 960,
    show: false,
    backgroundColor: '#f5f7fb',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  await win.loadFile(indexHtml);
  await waitForExpression(win, 'document.querySelector("#btnPreviewView")');

  await win.webContents.executeJavaScript(`
    localStorage.setItem(${JSON.stringify(storageKey)}, ${JSON.stringify(JSON.stringify(sampleDocument))});
    location.reload();
  `);

  await delay(1000);
  await waitForExpression(win, 'document.querySelector("#btnRestoreLast")');
  await win.webContents.executeJavaScript('document.querySelector("#btnRestoreLast").click()');
  await waitForExpression(win, '!document.querySelector(".start-mask") && document.querySelector("#outlineList .item")');

  await win.webContents.executeJavaScript('window.scrollTo(0, 0); document.querySelector("#btnEditView").click()');
  await capture(win, 'hodo-edit.png');

  await win.webContents.executeJavaScript('window.scrollTo(0, 0); document.querySelector("#btnPreviewView").click()');
  await waitForExpression(win, '!document.querySelector("#previewRoot").classList.contains("hidden") && document.querySelector(".preview-print-toc")');
  await capture(win, 'hodo-preview.png');
}

app.whenReady()
  .then(main)
  .then(() => app.quit())
  .catch(error => {
    console.error(error);
    app.exit(1);
  });
