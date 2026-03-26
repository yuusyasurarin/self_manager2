/**
 * build.js — GitHub Pages デプロイ用ビルドスクリプト
 *
 * 処理内容:
 *   1. index.html を読み込む
 *   2. __GAS_APP_URL__ プレースホルダーを環境変数 GAS_APP_URL で置換
 *   3. dist/index.html に書き出す
 *
 * 使用例（PowerShell）:
 *   $env:GAS_APP_URL="https://script.google.com/.../exec"
 *   node build.js
 */

const fs   = require('fs');
const path = require('path');

const PLACEHOLDER = '__GAS_APP_URL__';
const gasUrl      = process.env.GAS_APP_URL;

if (!gasUrl) {
  console.error('[build.js] エラー: 環境変数 GAS_APP_URL が設定されていません。');
  console.error('  例: $env:GAS_APP_URL="https://script.google.com/macros/s/.../exec"');
  process.exit(1);
}

const srcFile  = path.join(__dirname, 'index.html');
const distDir  = path.join(__dirname, 'dist');
const distFile = path.join(distDir, 'index.html');

// dist/ ディレクトリが存在しない場合は作成
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// index.html を読み込んでプレースホルダーを置換
let html = fs.readFileSync(srcFile, 'utf-8');

const before = (html.match(new RegExp(PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
html = html.split(PLACEHOLDER).join(gasUrl);
const after = (html.match(new RegExp(PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;

if (before === 0) {
  console.warn('[build.js] 警告: index.html に __GAS_APP_URL__ プレースホルダーが見つかりませんでした。');
  console.warn('  index.html の GAS_APP_URL 定義を確認してください。');
}

fs.writeFileSync(distFile, html, 'utf-8');

console.log(`[build.js] ビルド完了 → ${distFile}`);
console.log(`  置換箇所: ${before} 箇所`);
console.log(`  GAS URL : ${gasUrl.slice(0, 60)}...`);
