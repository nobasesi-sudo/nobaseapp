// ============================================================
// RetailPorter 週次自動スクレイピング - Google Apps Script
// ============================================================
//
// 概要:
//   毎週水曜に自動実行し、retailporter.net の発注一覧から
//   「生鮮納品あり」のデータを取得してスプレッドシートに保存し
//   メールで通知します。
//
// セットアップ手順:
//   1. このスクリプトを Google Sheets の Apps Script に貼り付け
//   2. setCredentials() を手動実行 → IDとパスワードを安全に保存
//   3. scrapeRetailporter() を手動実行して動作確認
//   4. createWeeklyTrigger() を実行して自動化完了
//
// ※ 初回実行時にフィールド名の確認・調整が必要な箇所に「※要確認」と記載
// ============================================================

// ----- 定数 -----
var LOGIN_URL = 'https://vrg-rwc.retailporter.net/seisen_f/Form/Login.aspx';
var BASE_URL  = 'https://vrg-rwc.retailporter.net/seisen_f';
var NOTIFICATION_EMAIL = 'nobase.si@gmail.com';

// スプレッドシートのシート名
var SHEET_RAW         = '発注データ';
var SHEET_BY_SUPPLIER = '取引先別集計';
var SHEET_MONTHLY     = '月次集計';
var SHEET_PIVOT       = '商品×店舗×取引先一覧';

// 発注データシートのカラム順
var RAW_HEADERS = ['取得日時', '納品日', '店舗名', '取引先', '商品名', '数量', '納入単価', '納入金額'];

// ============================================================
// メイン処理（トリガーから毎週水曜に呼ばれる）
// ============================================================

function scrapeRetailporter() {
  try {
    Logger.log('=== RetailPorter スクレイピング開始 ===');

    // 1. ログイン
    var cookies = login();
    if (!cookies) {
      MailApp.sendEmail(NOTIFICATION_EMAIL,
        '[RetailPorter] ログイン失敗',
        'ログインに失敗しました。IDとパスワードを確認してください。\n' +
        'setCredentials() で再設定してください。');
      return;
    }
    Logger.log('ログイン成功');

    // 2. カレンダーページ取得
    var calendarResult = getCalendarPage(cookies);
    if (!calendarResult) {
      Logger.log('カレンダーページ取得失敗');
      return;
    }
    var calendarHtml = calendarResult.html;
    cookies = calendarResult.cookies; // Cookie を更新

    // 3. 「生鮮納品あり」リンクを抽出
    var deliveryLinks = findDeliveryLinks(calendarHtml);
    Logger.log('生鮮納品ありリンク数: ' + deliveryLinks.length);

    if (deliveryLinks.length === 0) {
      Logger.log('今週の生鮮納品ありリンクが見つかりません');
      MailApp.sendEmail(NOTIFICATION_EMAIL,
        '[RetailPorter] 今週の発注データなし',
        '今週は「生鮮納品あり」のリンクが見つかりませんでした。\n' +
        'サイトを手動で確認してください。');
      return;
    }

    // 4. 各詳細ページからデータ抽出
    var allRows = [];
    var now = new Date();

    for (var i = 0; i < deliveryLinks.length; i++) {
      var link = deliveryLinks[i];
      Logger.log('詳細取得 [' + (i+1) + '/' + deliveryLinks.length + ']: ' + link.url + ' (納品日: ' + link.date + ')');
      Utilities.sleep(1000); // サーバー負荷軽減のため1秒待機

      var detailHtml = getDetailPage(link.url, cookies);
      if (!detailHtml) continue;

      var rows = parseOrderRows(detailHtml, link.date, now);
      Logger.log('  抽出行数: ' + rows.length);
      for (var j = 0; j < rows.length; j++) {
        allRows.push(rows[j]);
      }
    }

    if (allRows.length === 0) {
      Logger.log('データ抽出結果: 0行（テーブル構造の確認が必要かもしれません）');
      MailApp.sendEmail(NOTIFICATION_EMAIL,
        '[RetailPorter] データ抽出0件',
        '発注ページは取得できましたがデータが0件でした。\n' +
        '実行ログを確認してください。\nApps Script > 実行数 > ログを確認');
      return;
    }

    // 5. スプレッドシートに保存
    appendToRawSheet(allRows);

    // 6. 集計シート更新
    refreshSummarySheets();

    // 7. メール通知
    sendNotificationEmail(allRows);

    Logger.log('=== 完了: ' + allRows.length + '行を保存しました ===');

  } catch (e) {
    Logger.log('エラー: ' + e.toString() + '\n' + e.stack);
    MailApp.sendEmail(NOTIFICATION_EMAIL,
      '[RetailPorter] エラー発生',
      'スクレイピング中にエラーが発生しました:\n\n' + e.toString());
  }
}

// ============================================================
// ログイン (ASP.NET WebForms 対応)
// ============================================================

function login() {
  var props = PropertiesService.getScriptProperties();
  var username = props.getProperty('RETAILPORTER_USERNAME');
  var password = props.getProperty('RETAILPORTER_PASSWORD');

  if (!username || !password) {
    Logger.log('エラー: 認証情報が未設定です。setCredentials() を実行してください。');
    return null;
  }

  // Step 1: GET でログインページを取得し ViewState・Cookie を取得
  var getRes = UrlFetchApp.fetch(LOGIN_URL, {
    method: 'GET',
    followRedirects: true,
    muteHttpExceptions: true
  });

  var html = getRes.getContentText('UTF-8');
  var rawCookies = getRes.getAllHeaders()['Set-Cookie'];
  var cookies = parseCookies(rawCookies);

  var viewState       = extractHidden(html, '__VIEWSTATE');
  var viewStateGen    = extractHidden(html, '__VIEWSTATEGENERATOR');
  var eventValidation = extractHidden(html, '__EVENTVALIDATION');

  Logger.log('ViewState取得: ' + (viewState.length > 0 ? 'OK (' + viewState.length + '文字)' : 'NG - フォームが見つかりません'));

  // Step 2: POST でログイン
  // ※ 以下のフィールド名はサイトのHTMLソースを確認して調整してください
  // ブラウザの開発者ツール(F12) > Network > Login.aspx の POST リクエストを確認
  var payload = {
    '__VIEWSTATE':           viewState,
    '__VIEWSTATEGENERATOR':  viewStateGen,
    '__EVENTVALIDATION':     eventValidation,
    'ctl00$MainContent$txtLoginID':  username,  // ※要確認: IDフィールドのname属性
    'ctl00$MainContent$txtPassword': password,  // ※要確認: パスワードフィールドのname属性
    'ctl00$MainContent$btnLogin':    'ログイン' // ※要確認: ログインボタンのname属性
  };

  var postRes = UrlFetchApp.fetch(LOGIN_URL, {
    method: 'post',
    headers: { 'Cookie': cookies },
    payload: payload,
    followRedirects: true,
    muteHttpExceptions: true
  });

  var responseCode = postRes.getResponseCode();
  Logger.log('ログインレスポンスコード: ' + responseCode);

  var responseHtml = postRes.getContentText('UTF-8');
  var newRawCookies = postRes.getAllHeaders()['Set-Cookie'];
  var sessionCookies = parseCookies(newRawCookies) || cookies;

  // ログイン成功判定（ログアウトリンクがあればログイン済み）
  // ※ 実際のページに合わせて条件を調整してください
  var isLoggedIn = responseHtml.indexOf('ログアウト') !== -1
                || responseHtml.indexOf('Logout') !== -1
                || responseHtml.indexOf('logout') !== -1
                || (responseCode === 200 && responseHtml.indexOf('LoginID') === -1);

  if (!isLoggedIn) {
    Logger.log('警告: ログイン成功の確認ができませんでした（処理は続行します）');
    Logger.log('レスポンスの先頭300文字: ' + responseHtml.substring(0, 300));
  }

  return sessionCookies;
}

// ============================================================
// カレンダーページ取得
// ============================================================

function getCalendarPage(cookies) {
  // ※ ログイン後のカレンダーページURLを設定してください
  // ログイン後にブラウザのアドレスバーに表示されるURLを確認してください
  var calendarUrl = BASE_URL + '/Calendar.aspx'; // ※要確認

  var res = UrlFetchApp.fetch(calendarUrl, {
    method: 'GET',
    headers: { 'Cookie': cookies },
    followRedirects: true,
    muteHttpExceptions: true
  });

  var responseCode = res.getResponseCode();
  if (responseCode !== 200) {
    Logger.log('カレンダーページ取得失敗 (HTTP ' + responseCode + '): ' + calendarUrl);
    Logger.log('ログインが切れているか、URLが間違っている可能性があります');
    return null;
  }

  var newCookies = parseCookies(res.getAllHeaders()['Set-Cookie']);
  return {
    html: res.getContentText('UTF-8'),
    cookies: newCookies || cookies
  };
}

// ============================================================
// 「生鮮納品あり」リンクを抽出
// ============================================================

function findDeliveryLinks(html) {
  var links = [];

  // パターン1: 「生鮮納品あり」というテキストを持つ <a> タグを抽出
  // ※ HTMLの実際の構造に合わせて正規表現を調整してください
  var pattern = /href="([^"]+)"[^>]*>(?:[^<]*<[^>]+>)*[^<]*生鮮納品あり[^<]*(?:<\/[^>]+>)*[^<]*<\/a>/gi;
  var match;

  while ((match = pattern.exec(html)) !== null) {
    var url = match[1];

    // 相対URLを絶対URLに変換
    if (url.indexOf('http') !== 0) {
      if (url.indexOf('/') === 0) {
        url = 'https://vrg-rwc.retailporter.net' + url;
      } else {
        url = BASE_URL + '/' + url;
      }
    }

    // URLまたは周辺テキストから納品日を抽出
    var date = extractDateFromContext(match[0], url);
    links.push({ url: url, date: date });
  }

  // パターン1で見つからない場合のフォールバック
  if (links.length === 0) {
    Logger.log('パターン1でリンクが見つかりません。パターン2を試します...');
    // 「生鮮納品あり」テキストの位置から前後のタグを探す
    var idx = html.indexOf('生鮮納品あり');
    while (idx !== -1) {
      // idx の前方 300文字以内にある href を取得
      var searchArea = html.substring(Math.max(0, idx - 300), idx);
      var hrefMatch = searchArea.match(/href="([^"]+)"\s*(?:>|[^>]*>)[^<]*$/);
      if (hrefMatch) {
        var url2 = hrefMatch[1];
        if (url2.indexOf('http') !== 0) {
          url2 = (url2.indexOf('/') === 0 ? 'https://vrg-rwc.retailporter.net' : BASE_URL + '/') + url2;
        }
        links.push({ url: url2, date: extractDateFromUrl(url2) });
      }
      idx = html.indexOf('生鮮納品あり', idx + 1);
    }
  }

  Logger.log('抽出リンク: ' + JSON.stringify(links));
  return links;
}

// URLや周辺テキストから日付を抽出
function extractDateFromContext(context, url) {
  // URLから日付を抽出（例: date=20260612, d=2026-06-12 など）
  var date = extractDateFromUrl(url);
  if (date) return date;

  // 周辺テキストから日付を抽出
  var patterns = [
    /(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/,
    /(\d{1,2})[\/\-](\d{1,2})\(([月火水木金土日])\)/
  ];
  for (var i = 0; i < patterns.length; i++) {
    var m = context.match(patterns[i]);
    if (m) return m[0];
  }
  return '';
}

function extractDateFromUrl(url) {
  var m;
  m = url.match(/[?&](?:date|d|dt)=(\d{8})/);
  if (m) return formatDate8(m[1]);
  m = url.match(/(\d{4})[-\/](\d{2})[-\/](\d{2})/);
  if (m) return m[0];
  return '';
}

// ============================================================
// 詳細ページ取得
// ============================================================

function getDetailPage(url, cookies) {
  var res = UrlFetchApp.fetch(url, {
    method: 'GET',
    headers: { 'Cookie': cookies },
    followRedirects: true,
    muteHttpExceptions: true
  });

  var responseCode = res.getResponseCode();
  if (responseCode !== 200) {
    Logger.log('詳細ページ取得失敗 (HTTP ' + responseCode + '): ' + url);
    return null;
  }

  return res.getContentText('UTF-8');
}

// ============================================================
// 発注テーブルのデータ抽出
// （納入価格のみ取得・伝票売価は無視）
// ============================================================

function parseOrderRows(html, deliveryDate, fetchTime) {
  var rows = [];
  var fetchTimeStr = Utilities.formatDate(fetchTime, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');

  // すべての <table> を抽出
  var tablePattern = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  var tableMatch;
  var tableIndex = 0;

  while ((tableMatch = tablePattern.exec(html)) !== null) {
    tableIndex++;
    var tableHtml = tableMatch[0];
    var trMatches = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
    if (!trMatches || trMatches.length < 2) continue;

    // ヘッダー行でカラム位置を検出
    var headerCells = extractCells(trMatches[0]);
    var colMap = detectColumns(headerCells);

    Logger.log('テーブル' + tableIndex + ' ヘッダー: [' + headerCells.join(', ') + ']');
    Logger.log('テーブル' + tableIndex + ' カラムマップ: ' + JSON.stringify(colMap));

    // 商品名カラムが見つからないテーブルはスキップ
    if (colMap.productName === -1) continue;

    // データ行を処理
    for (var i = 1; i < trMatches.length; i++) {
      var cells = extractCells(trMatches[i]);
      if (cells.length === 0) continue;

      var productName = getCell(cells, colMap.productName);
      var supplier    = getCell(cells, colMap.supplier);
      var storeName   = getCell(cells, colMap.storeName);
      var quantity    = parseNumber(getCell(cells, colMap.quantity));
      var unitPrice   = parseNumber(getCell(cells, colMap.unitPrice));
      var totalAmount = parseNumber(getCell(cells, colMap.totalAmount));

      // 数量×単価で納入金額を算出（テーブルに金額カラムがない場合）
      if (totalAmount === 0 && quantity > 0 && unitPrice > 0) {
        totalAmount = quantity * unitPrice;
      }

      // 商品名が空または数量が0の行はスキップ
      if (!productName || quantity === 0) continue;

      rows.push([
        fetchTimeStr,
        deliveryDate,
        storeName,
        supplier,
        productName,
        quantity,
        unitPrice,
        totalAmount
      ]);
    }

    if (rows.length > 0) {
      Logger.log('テーブル' + tableIndex + 'からデータ取得: ' + rows.length + '行');
      break; // 最初にデータが取れたテーブルで終了
    }
  }

  if (rows.length === 0) {
    Logger.log('データが取得できませんでした。HTMLの先頭1000文字:');
    Logger.log(html.substring(0, 1000));
  }

  return rows;
}

// テーブルセルの内容を配列で返す
function extractCells(rowHtml) {
  var cells = [];
  var pattern = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
  var match;
  while ((match = pattern.exec(rowHtml)) !== null) {
    cells.push(stripHtml(match[1]).trim());
  }
  return cells;
}

// ヘッダーテキストからカラムインデックスを自動検出
// 伝票売価は意図的に無視する
function detectColumns(headers) {
  var map = {
    productName: -1,
    supplier:    -1,
    storeName:   -1,
    quantity:    -1,
    unitPrice:   -1,  // 納入単価のみ
    totalAmount: -1   // 納入金額のみ
  };

  for (var i = 0; i < headers.length; i++) {
    var h = headers[i].replace(/\s/g, '');
    if (/商品名|品名|アイテム/.test(h))          map.productName = i;
    else if (/取引先|仕入先|業者|メーカー/.test(h)) map.supplier = i;
    else if (/店舗名|店名|店コード|店/.test(h))    map.storeName = i;
    else if (/数量|入数|ケース数|個数/.test(h))    map.quantity = i;
    // 納入価格のみ取得（伝票売価は無視）
    else if (/納入単価|仕入単価|仕入価格/.test(h)) map.unitPrice = i;
    else if (/納入金額|仕入金額|仕入合計/.test(h)) map.totalAmount = i;
    // 「伝票売価」「売価」は意図的に無視
  }

  return map;
}

// ============================================================
// スプレッドシートへの保存
// ============================================================

function appendToRawSheet(rows) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_RAW);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_RAW, 0);
    var headerRange = sheet.getRange(1, 1, 1, RAW_HEADERS.length);
    headerRange.setValues([RAW_HEADERS]);
    headerRange.setFontWeight('bold')
               .setBackground('#4a86e8')
               .setFontColor('white')
               .setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
    // カラム幅の調整
    sheet.setColumnWidth(1, 140); // 取得日時
    sheet.setColumnWidth(2, 100); // 納品日
    sheet.setColumnWidth(3, 120); // 店舗名
    sheet.setColumnWidth(4, 120); // 取引先
    sheet.setColumnWidth(5, 150); // 商品名
    sheet.setColumnWidth(6, 60);  // 数量
    sheet.setColumnWidth(7, 90);  // 納入単価
    sheet.setColumnWidth(8, 90);  // 納入金額
  }

  // 重複チェック: 同じ「取得日時+商品名+店舗名」の組み合わせが既にあればスキップ
  var existingData = sheet.getDataRange().getValues();
  var existingKeys = {};
  for (var i = 1; i < existingData.length; i++) {
    var key = existingData[i][0] + '|' + existingData[i][4] + '|' + existingData[i][2];
    existingKeys[key] = true;
  }

  var newRows = [];
  for (var j = 0; j < rows.length; j++) {
    var row = rows[j];
    var rowKey = row[0] + '|' + row[4] + '|' + row[2];
    if (!existingKeys[rowKey]) {
      newRows.push(row);
    }
  }

  if (newRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, RAW_HEADERS.length).setValues(newRows);
    Logger.log(newRows.length + '行を「' + SHEET_RAW + '」に追記しました（' +
               (rows.length - newRows.length) + '行は重複のためスキップ）');
  } else {
    Logger.log('新規データなし（全行が重複）');
  }
}

// ============================================================
// 集計シート更新
// ============================================================

function refreshSummarySheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var today = new Date();
  var ym = Utilities.formatDate(today, 'Asia/Tokyo', 'yyyy/MM');

  // シート2: 取引先別集計（今月）
  updateSupplierSheet(ss, ym);

  // シート3: 月次集計
  updateMonthlySheet(ss);

  // シート4: 商品×店舗×取引先一覧
  updatePivotSheet(ss);

  Logger.log('集計シートを更新しました');
}

function updateSupplierSheet(ss, ym) {
  var sheet = ss.getSheetByName(SHEET_BY_SUPPLIER);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_BY_SUPPLIER);
  }
  sheet.clearContents();

  var headers = ['取引先', '今月納入金額合計', '今月件数'];
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold').setBackground('#4a86e8').setFontColor('white');
  sheet.setFrozenRows(1);

  // QUERY で今月分を取引先別に集計
  // 発注データシートのB列(納品日)がYYYY/MM/DDの場合
  sheet.getRange(2, 1).setFormula(
    '=IFERROR(QUERY(\'' + SHEET_RAW + '\'!A:H,' +
    '"SELECT D, SUM(H), COUNT(E) ' +
    'WHERE D <> \'\' AND H > 0 ' +
    'GROUP BY D ' +
    'ORDER BY SUM(H) DESC ' +
    'LABEL D \'取引先\', SUM(H) \'今月納入金額合計\', COUNT(E) \'今月件数\'",0),"")'
  );

  // 今月フィルタ用のテキストを表示
  sheet.getRange(1, 5).setValue('集計期間');
  sheet.getRange(2, 5).setValue(ym + ' のデータ');
  sheet.getRange(1, 5, 2, 1).setFontColor('#888888');
}

function updateMonthlySheet(ss) {
  var sheet = ss.getSheetByName(SHEET_MONTHLY);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_MONTHLY);
  }
  sheet.clearContents();

  var headers = ['年', '月', '月次納入金額合計', '件数'];
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold').setBackground('#4a86e8').setFontColor('white');
  sheet.setFrozenRows(1);

  // 月ごとに集計（納品日B列基準）
  sheet.getRange(2, 1).setFormula(
    '=IFERROR(QUERY(\'' + SHEET_RAW + '\'!A:H,' +
    '"SELECT YEAR(B), MONTH(B), SUM(H), COUNT(E) ' +
    'WHERE B IS NOT NULL AND H > 0 ' +
    'GROUP BY YEAR(B), MONTH(B) ' +
    'ORDER BY YEAR(B) DESC, MONTH(B) DESC ' +
    'LABEL YEAR(B) \'年\', MONTH(B) \'月\', SUM(H) \'月次納入金額合計\', COUNT(E) \'件数\'",0),"")'
  );
}

function updatePivotSheet(ss) {
  var sheet = ss.getSheetByName(SHEET_PIVOT);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_PIVOT);
  }
  sheet.clearContents();

  // タイトル行
  sheet.getRange(1, 1).setValue('※ 発注データシートの全データを元に集計（納品日・商品名・取引先・店舗別）');
  sheet.getRange(1, 1).setFontColor('#888888').setFontStyle('italic');

  // 商品×店舗×取引先の一覧
  sheet.getRange(2, 1).setFormula(
    '=IFERROR(QUERY(\'' + SHEET_RAW + '\'!A:H,' +
    '"SELECT B, E, D, C, SUM(F), SUM(H) ' +
    'WHERE B IS NOT NULL ' +
    'GROUP BY B, E, D, C ' +
    'ORDER BY B DESC, E, D ' +
    'LABEL B \'納品日\', E \'商品名\', D \'取引先\', C \'店舗名\', SUM(F) \'数量合計\', SUM(H) \'納入金額合計\'",0),"")'
  );
}

// ============================================================
// メール通知
// ============================================================

function sendNotificationEmail(rows) {
  var count = rows.length;
  var totalAmount = 0;
  for (var i = 0; i < rows.length; i++) {
    totalAmount += (rows[i][7] || 0);
  }

  // 取引先別集計
  var supplierTotals = {};
  for (var j = 0; j < rows.length; j++) {
    var supplier = rows[j][3] || '（取引先不明）';
    supplierTotals[supplier] = (supplierTotals[supplier] || 0) + (rows[j][7] || 0);
  }

  var subject = '[RetailPorter] 発注データ取得完了 - ' + count + '件 / 合計 ¥' + totalAmount.toLocaleString();

  var body = 'RetailPorterの発注データを自動取得しました。\n\n';
  body += '━━━━━━━━━━━━━━━━━━━━━━━━\n';
  body += '取得件数  : ' + count + ' 件\n';
  body += '合計納入金額: ¥' + totalAmount.toLocaleString() + '\n';
  body += '━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
  body += '【取引先別 納入金額】\n';

  var entries = Object.keys(supplierTotals).map(function(k) {
    return { name: k, amount: supplierTotals[k] };
  }).sort(function(a, b) { return b.amount - a.amount; });

  for (var k = 0; k < entries.length; k++) {
    body += '  ' + entries[k].name + ': ¥' + entries[k].amount.toLocaleString() + '\n';
  }

  body += '\nスプレッドシートで詳細を確認してください。\n';
  body += '（「取引先別集計」「月次集計」「商品×店舗×取引先一覧」シートも自動更新済み）';

  MailApp.sendEmail({
    to: NOTIFICATION_EMAIL,
    subject: subject,
    body: body
  });

  Logger.log('メール通知を送信しました → ' + NOTIFICATION_EMAIL);
}

// ============================================================
// ユーティリティ関数
// ============================================================

// Set-Cookie ヘッダーをパース
function parseCookies(setCookieHeader) {
  if (!setCookieHeader) return '';
  var cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  return cookies.map(function(c) { return c.split(';')[0]; }).join('; ');
}

// ASP.NET の hidden フィールド値を抽出
function extractHidden(html, fieldName) {
  var pattern = new RegExp('name=["\']' + fieldName + '["\']\\s+value=["\']([^"\']*)["\']', 'i');
  var match = html.match(pattern);
  if (match) return match[1];

  var pattern2 = new RegExp('value=["\']([^"\']*)["\']\\s+[^>]*name=["\']' + fieldName + '["\']', 'i');
  var match2 = html.match(pattern2);
  return match2 ? match2[1] : '';
}

// HTML タグ除去
function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, function(m, n) { return String.fromCharCode(parseInt(n)); })
    .trim();
}

// 文字列から数値を抽出
function parseNumber(str) {
  if (!str) return 0;
  var num = parseFloat(str.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num;
}

// 配列から安全にセルを取得
function getCell(cells, index) {
  return (index >= 0 && index < cells.length) ? cells[index] : '';
}

// YYYYMMDD → YYYY/MM/DD
function formatDate8(str) {
  if (!str || str.length !== 8) return str || '';
  return str.slice(0, 4) + '/' + str.slice(4, 6) + '/' + str.slice(6, 8);
}

// ============================================================
// 初期設定関数（初回のみ手動実行）
// ============================================================

/**
 * 認証情報を Script Properties に安全に保存する。
 * 実行後はこの関数内のIDとパスワードを空文字に戻してください。
 * Script Properties に保存済みのため、コードに残す必要はありません。
 */
function setCredentials() {
  var props = PropertiesService.getScriptProperties();

  // ★ ここにIDとパスワードを入力して実行後、すぐに文字列を削除してください
  props.setProperties({
    'RETAILPORTER_USERNAME': 'ここにIDを入力',  // ← 変更して実行
    'RETAILPORTER_PASSWORD': 'ここにパスワードを入力'  // ← 変更して実行
  });

  Logger.log('✅ 認証情報を Script Properties に保存しました');
  Logger.log('⚠️  このコードの ID とパスワードを空文字に戻してください（保存済みのため不要）');
}

/**
 * 週次トリガーを設定する（毎週水曜 9:00 JST）。
 * Apps Script のタイムゾーンが Asia/Tokyo に設定されていることを確認してください。
 * 「プロジェクトの設定」→「タイムゾーン」で確認できます。
 */
function createWeeklyTrigger() {
  // 同名の既存トリガーを削除
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'scrapeRetailporter') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // 毎週水曜 9:00 に実行
  ScriptApp.newTrigger('scrapeRetailporter')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.WEDNESDAY)
    .atHour(9)
    .create();

  Logger.log('✅ 週次トリガーを設定しました（毎週水曜 9:00）');
  Logger.log('確認: 「トリガー」メニュー → 設定されたトリガー一覧を確認してください');
}

/**
 * 動作テスト用: スクリプトの動作確認に使用する。
 * ログイン → ページ取得のみ行い、シートへの書き込みはしない。
 */
function testLogin() {
  Logger.log('=== ログインテスト ===');
  var cookies = login();
  if (cookies) {
    Logger.log('✅ ログイン成功');
    Logger.log('取得Cookie: ' + cookies.substring(0, 100) + '...');

    var result = getCalendarPage(cookies);
    if (result) {
      Logger.log('✅ カレンダーページ取得成功');
      Logger.log('HTMLの先頭500文字:\n' + result.html.substring(0, 500));

      var links = findDeliveryLinks(result.html);
      Logger.log('生鮮納品ありリンク数: ' + links.length);
      Logger.log('リンク一覧: ' + JSON.stringify(links));
    } else {
      Logger.log('❌ カレンダーページ取得失敗');
    }
  } else {
    Logger.log('❌ ログイン失敗');
  }
}

/**
 * 全トリガーを削除する（リセット用）。
 */
function deleteAllTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  Logger.log('全トリガーを削除しました（' + triggers.length + '件）');
}
