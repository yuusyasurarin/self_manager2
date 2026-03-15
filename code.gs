// ===================================================================
//  GAS Backend — Self-Manager App
//  設定: SPREADSHEET_ID と DRIVE_FOLDER_ID を書き換えてください
// ===================================================================

const SPREADSHEET_ID = '1n8shC0jBDHdAwpklqedw4pLiMfr-phS0oj85xSzTCUQ';  // ← スプレッドシートIDに書き換え
const DRIVE_FOLDER_ID = '1Bn_GuuSSXPnPzrw_isAe1JYNdKhFAX6u'; // ← DriveフォルダIDに書き換え

// シート名定数
const SHEET = {
  TASKS:     'Tasks',
  STUDY:     'Study',
  FINANCE:   'Finance',
  DIARY:     'Diary',
  QUESTIONS: 'Questions',
  CONFIG:    'Config',
};

// ===================================================================
//  JSON レスポンス
//  ※ GASウェブアプリは「全員」公開設定でCORSが自動許可されるため
//    setHeader() は不要（ContentServiceは非対応でエラーになる）
// ===================================================================
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===================================================================
//  doGet — データ取得
// ===================================================================
function doGet(e) {
  try {
    const callback = e.parameter.callback; // JSONP対応
    const sheet = e.parameter.sheet;
    const key   = e.parameter.key;   // Config用

    let result;
    if (!sheet) {
      result = getAllData();
    } else if (sheet === SHEET.CONFIG) {
      result = { ok: true, value: getConfig(key) };
    } else {
      const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
      const ws   = getOrCreateSheet(ss, sheet);
      const rows = sheetToJson(ws);
      result = { ok: true, rows };
    }

    // JSONP: callbackパラメータがあれば callback(JSON) 形式で返す
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(result) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return jsonResponse(result);

  } catch (err) {
    const errResult = { ok: false, error: err.message };
    const callback = e.parameter.callback;
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(errResult) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return jsonResponse(errResult);
  }
}

// 全シートを一括取得
function getAllData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  initSheets(ss);

  const result = {
    ok: true,
    tasks:     sheetToJson(getOrCreateSheet(ss, SHEET.TASKS)),
    studies:   sheetToJson(getOrCreateSheet(ss, SHEET.STUDY)),
    finances:  sheetToJson(getOrCreateSheet(ss, SHEET.FINANCE)),
    diary:     diarySheetToObj(getOrCreateSheet(ss, SHEET.DIARY)),
    questions: sheetToJson(getOrCreateSheet(ss, SHEET.QUESTIONS)),
    config:    configSheetToObj(getOrCreateSheet(ss, SHEET.CONFIG)),
  };
  return result;
}

// ===================================================================
//  doPost — データ操作
// ===================================================================
function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;
    const sheet  = body.sheet;

    // 画像アップロード
    if (action === 'uploadImage') {
      return jsonResponse(handleImageUpload(body));
    }

    // Config（キャリア系ネストデータ）の保存
    if (action === 'setConfig') {
      setConfig(body.key, body.value);
      return jsonResponse({ ok: true });
    }

    // 通常シートのCRUD
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const ws = getOrCreateSheet(ss, sheet);

    if      (action === 'add')        handleAdd(ws, body.row, sheet);
    else if (action === 'update')     handleUpdate(ws, body.id, body.fields);
    else if (action === 'delete')     handleDelete(ws, body.id);
    else if (action === 'replaceAll') handleReplaceAll(ws, body.rows, sheet);
    // Diary は行形式ではなくキー・値形式
    else if (action === 'saveDiary')     handleSaveDiary(ws, body.date, body.entry);
    else if (action === 'deleteDiary')   handleDeleteDiary(ws, body.date);
    else if (action === 'saveAllDiaries') handleSaveAllDiaries(ws, body.entries);
    else return jsonResponse({ ok: false, error: 'Unknown action: ' + action });

    return jsonResponse({ ok: true });

  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

// ===================================================================
//  シート初期化
// ===================================================================
function initSheets(ss) {
  const schemas = {
    [SHEET.TASKS]:     ['id', 'text', 'category', 'done', 'createdAt', 'memo'],
    [SHEET.STUDY]:     ['id', 'subject', 'minutes', 'date', 'memo'],
    [SHEET.FINANCE]:   ['id', 'type', 'category', 'amount', 'memo', 'date'],
    [SHEET.QUESTIONS]: ['id', 'text', 'solved', 'answer', 'createdAt'],
    [SHEET.DIARY]:     ['date', 'content', 'rating', 'imageUrl', 'updatedAt'],
    [SHEET.CONFIG]:    ['key', 'value'],
  };
  for (const [name, headers] of Object.entries(schemas)) {
    const ws = getOrCreateSheet(ss, name);
    const lastRow = ws.getLastRow();
    const lastCol = ws.getLastColumn();
    // ヘッダーが存在しないか、列数が足りない場合は1行目に設定
    if (lastRow === 0) {
      ws.appendRow(headers);
    } else {
      const existing = ws.getRange(1, 1, 1, Math.max(lastCol, headers.length)).getValues()[0];
      // 最初のヘッダーが期待値と違う場合は上書き
      if (existing[0] !== headers[0]) {
        ws.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
    }
  }
}

function getOrCreateSheet(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

// ===================================================================
//  シート <-> JSON 変換
// ===================================================================
function sheetToJson(ws) {
  const data = ws.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] !== undefined ? row[i] : '';
    });
    return obj;
  });
}

// Diary シートを { date: {content, rating, imageUrl, updatedAt} } の形式に変換
function diarySheetToObj(ws) {
  const rows = sheetToJson(ws);
  const obj = {};
  rows.forEach(r => {
    if (r.date) {
      obj[r.date] = {
        content:   r.content   || '',
        rating:    r.rating    || null,
        imageUrl:  r.imageUrl  || null,
        updatedAt: r.updatedAt || '',
      };
    }
  });
  return obj;
}

// Config シートを { key: parsedValue } の形式に変換
function configSheetToObj(ws) {
  const rows = sheetToJson(ws);
  const obj = {};
  rows.forEach(r => {
    if (r.key) {
      try {
        obj[r.key] = JSON.parse(r.value);
      } catch {
        obj[r.key] = r.value;
      }
    }
  });
  return obj;
}

// ===================================================================
//  CRUD ヘルパー（通常テーブルシート用）
// ===================================================================
function handleAdd(ws, row, sheetName) {
  // ヘッダー行を取得
  const headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
  const newRow  = headers.map(h => {
    if (typeof row[h] === 'boolean') return String(row[h]);
    return row[h] !== undefined ? row[h] : '';
  });
  ws.appendRow(newRow);
}

function handleUpdate(ws, id, fields) {
  const data    = ws.getDataRange().getValues();
  const headers = data[0];
  const idCol   = headers.indexOf('id');
  if (idCol === -1) return;

  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idCol]) === String(id)) {
      for (const [key, val] of Object.entries(fields)) {
        const col = headers.indexOf(key);
        if (col !== -1) {
          const cellVal = typeof val === 'boolean' ? String(val) : val;
          ws.getRange(r + 1, col + 1).setValue(cellVal);
        }
      }
      return;
    }
  }
}

function handleDelete(ws, id) {
  const data    = ws.getDataRange().getValues();
  const headers = data[0];
  const idCol   = headers.indexOf('id');
  if (idCol === -1) return;

  for (let r = data.length - 1; r >= 1; r--) {
    if (String(data[r][idCol]) === String(id)) {
      ws.deleteRow(r + 1);
      return;
    }
  }
}

// ===================================================================
//  全件置換（replaceAll）
// ===================================================================
function handleReplaceAll(ws, rows, sheetName) {
  // スプレッドシートの実際のヘッダーを取得（ヘッダー行がない場合はスキーマで初期化）
  const defaultSchemas = {
    'Tasks':     ['id', 'text', 'category', 'done', 'createdAt', 'memo'],
    'Study':     ['id', 'subject', 'minutes', 'date', 'memo'],
    'Finance':   ['id', 'type', 'category', 'amount', 'memo', 'date'],
    'Questions': ['id', 'text', 'solved', 'answer', 'createdAt'],
  };

  let sheetHeaders;
  if (ws.getLastRow() >= 1 && ws.getLastColumn() >= 1) {
    sheetHeaders = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0].map(String);
  }
  if (!sheetHeaders || sheetHeaders.length === 0 || sheetHeaders[0] === '') {
    sheetHeaders = defaultSchemas[sheetName];
    if (!sheetHeaders) return;
    ws.getRange(1, 1, 1, sheetHeaders.length).setValues([sheetHeaders]);
  }

  // エイリアスの逆引き: コード側のキー名 → スプレッドシートのヘッダー名
  // HEADER_ALIAS は上で const で定義されている前提（例: title->text, status->done）
  const REVERSE_ALIAS = {};
  Object.entries(HEADER_ALIAS).forEach(([sheetKey, codeKey]) => {
    REVERSE_ALIAS[codeKey] = sheetKey;
  });

  // ヘッダー行以外をすべて削除
  const lastRow = ws.getLastRow();
  if (lastRow > 1) ws.deleteRows(2, lastRow - 1);

  // 新規データを一括追加（スプレッドシートのヘッダー名に合わせてマッピング）
  if (!rows || rows.length === 0) return;
  const data = rows.map(row => sheetHeaders.map(sheetCol => {
    // スプレッドシートのヘッダー名に対応するコード側のキーを解決
    const codeKey = HEADER_ALIAS[sheetCol] || sheetCol; 
    const v = row[codeKey] !== undefined ? row[codeKey] : row[sheetCol]; // どちらでも対応
    if (typeof v === 'boolean') return String(v);
    return v !== undefined && v !== null ? v : '';
  }));
  ws.getRange(2, 1, data.length, sheetHeaders.length).setValues(data);
}

// ===================================================================
//  Diary 専用操作（date をキーとする）
// ===================================================================
function handleSaveDiary(ws, date, entry) {
  const data    = ws.getDataRange().getValues();
  const rawHeaders = data[0];
  const dateCol = rawHeaders.indexOf('date');
  if (dateCol === -1) return;

  // ヘッダーに基づいて書き込む値のオブジェクトを作成
  const entryObj = {
    date:      date,
    content:   entry.content   || '',
    rating:    entry.rating    || '',
    imageUrl:  entry.imageUrl  || '',
    updatedAt: entry.updatedAt || new Date().toISOString(),
  };
  const newRow = rawHeaders.map(h => entryObj[h] !== undefined ? entryObj[h] : '');

  for (let r = 1; r < data.length; r++) {
    if (String(data[r][dateCol]) === String(date)) {
      // 既存行を更新
      ws.getRange(r + 1, 1, 1, rawHeaders.length).setValues([newRow]);
      return;
    }
  }
  // 新規行を追加
  ws.appendRow(newRow);
}

function handleDeleteDiary(ws, date) {
  const data    = ws.getDataRange().getValues();
  const headers = data[0];
  const dateCol = headers.indexOf('date');
  if (dateCol === -1) return;

  for (let r = data.length - 1; r >= 1; r--) {
    if (String(data[r][dateCol]) === String(date)) {
      ws.deleteRow(r + 1);
      return;
    }
  }
}

// 日記を全件まとめて保存
function handleSaveAllDiaries(ws, entries) {
  // ヘッダー行を取得（なければデフォルト）
  let headers;
  if (ws.getLastRow() >= 1 && ws.getLastColumn() >= 1) {
    headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0].map(String);
  }
  if (!headers || headers.length === 0 || headers[0] === '') {
    headers = ['date', 'content', 'rating', 'imageUrl', 'updatedAt'];
    ws.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  // ヘッダー以外削除
  const lastRow = ws.getLastRow();
  if (lastRow > 1) ws.deleteRows(2, lastRow - 1);
  if (!entries || Object.keys(entries).length === 0) return;

  const rows = Object.entries(entries).map(([date, e]) => {
    const obj = { date, content: e.content||'', rating: e.rating||'',
      imageUrl: e.imageUrl||'', updatedAt: e.updatedAt||new Date().toISOString() };
    return headers.map(h => obj[h] !== undefined ? obj[h] : '');
  });
  if (rows.length > 0) ws.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

// ===================================================================
//  Config（キャリア系ネストデータ用KVストア）
// ===================================================================
function getConfig(key) {
  const ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  const ws  = getOrCreateSheet(ss, SHEET.CONFIG);
  const rows = sheetToJson(ws);
  const row  = rows.find(r => r.key === key);
  if (!row) return null;
  try { return JSON.parse(row.value); } catch { return row.value; }
}

function setConfig(key, value) {
  const ss      = SpreadsheetApp.openById(SPREADSHEET_ID);
  const ws      = getOrCreateSheet(ss, SHEET.CONFIG);
  const data    = ws.getDataRange().getValues();
  const headers = data[0];
  const keyCol  = headers.indexOf('key');

  if (keyCol === -1) {
    // ヘッダーがない場合は初期化
    ws.appendRow(['key', 'value']);
    ws.appendRow([key, JSON.stringify(value)]);
    return;
  }

  const serialized = JSON.stringify(value);

  for (let r = 1; r < data.length; r++) {
    if (String(data[r][keyCol]) === String(key)) {
      const valCol = headers.indexOf('value');
      ws.getRange(r + 1, valCol + 1).setValue(serialized);
      return;
    }
  }
  // キーが存在しない場合は新規追加
  ws.appendRow([key, serialized]);
}

// ===================================================================
//  画像アップロード（Google Drive）
// ===================================================================
function handleImageUpload(body) {
  const base64Data = body.imageData; // "data:image/jpeg;base64,..." 形式
  const fileName   = body.fileName || ('diary_' + new Date().getTime() + '.jpg');

  // base64 部分だけ抽出
  const parts = base64Data.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mimeType  = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const rawBase64 = parts[1];

  const blob = Utilities.newBlob(
    Utilities.base64Decode(rawBase64),
    mimeType,
    fileName
  );

  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const file   = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // 直接表示できる URL を生成
  const fileId       = file.getId();
  const directViewUrl = 'https://drive.google.com/uc?export=view&id=' + fileId;

  return { ok: true, imageUrl: directViewUrl, fileId };
}
