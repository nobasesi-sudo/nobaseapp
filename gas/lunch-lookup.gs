// ================================================================
// 既存の GAS プロジェクトに追記するコード
//
// 手順:
//   1. GAS エディタ (script.google.com) を開く
//   2. このファイルの内容を既存のコードに追記する
//   3. 既存の doGet 関数の中に下記のルーティングを追加する:
//
//      if (path === 'lunch-lookup') {
//        return lunchLookupHandler(e.parameter);
//      }
//
//   4. 「デプロイ」→「デプロイを管理」→新しいバージョンで再デプロイ
// ================================================================

var LUNCH_SPREADSHEET_ID = '1z9Ml6fZkDNoBlqJA2GNvQaBKCjni9n5Wywg1wXjOOn0';

function lunchLookupHandler(params) {
  var month = parseInt(params.month) || (new Date().getMonth() + 1);
  var sheetName = '受注情報_' + month + '月';

  try {
    var ss = SpreadsheetApp.openById(LUNCH_SPREADSHEET_ID);
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'シート「' + sheetName + '」が見つかりません' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return ContentService
        .createTextOutput(JSON.stringify({ rows: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var headers = data[0].map(function(h) { return String(h); });
    function idx(col) { return headers.indexOf(col); }

    var rows = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var product = String(row[idx('商品名')] || '');
      if (!product) continue;

      // 日付セルが Date オブジェクトで返る場合は文字列に変換
      function cellStr(val) {
        if (!val && val !== 0) return '';
        if (val instanceof Date) {
          return (val.getMonth() + 1) + '月' + val.getDate() + '日';
        }
        return String(val);
      }

      rows.push({
        使用日:       cellStr(row[idx('学校使用日')]),
        納品先:       cellStr(row[idx('納品先名')]),
        商品名:       product,
        数量:         parseFloat(row[idx('数量')]) || 0,
        単位:         cellStr(row[idx('単位')]),
        発注先:       cellStr(row[idx('発注先')]),
        納品希望日:   cellStr(row[idx('納品希望日')]),
        kg換算:       parseFloat(row[idx('kg換算')]) || 0,
        納品数:       parseFloat(row[idx('納品数')]) || 0,
        納品単位:     cellStr(row[idx('納品単位')]),
        納品数量表示: cellStr(row[idx('納品数量表示')]),
        配送担当:     cellStr(row[idx('配送担当')]),
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({ rows: rows }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
