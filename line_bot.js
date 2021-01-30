// 利用しているシート
var SHEET_ID = '';
// 利用しているSSのシート名（※変えるとみえなくなる）
var SHEET_NAME = 'faq';
// 利用しているもしかしてSSのシート名（※変えるとみえなくなる）
var SHEET_NAME_MAYBE = 'maybe';

// LINE Message API アクセストークン
var ACCESS_TOKEN = '';
// 通知URL
var PUSH = "https://api.line.me/v2/bot/message/push";
// リプライ時URL
var REPLY = "https://api.line.me/v2/bot/message/reply";
// プロフィール取得URL
var PROFILE = "https://api.line.me/v2/profile";
var F=0;

/**
 * doPOST
 * POSTリクエストのハンドリング
 */
function doPost(e) {
  var json = JSON.parse(e.postData.contents);
  reply(json);
}

/** 
 * doGet
 * GETリクエストのハンドリング
 */
function doGet(e) {
    return ContentService.createTextOutput("SUCCESS");
}

/** 
 * reply
 * ユーザからのアクションに返信する
 */
function reply(data) {
  // POST情報から必要データを抽出
  var lineUserId = data.events[0].source.userId;
  var postMsg    = data.events[0].message.text;
  var replyToken = data.events[0].replyToken;
  var action    = data.events[0].message.action;
  // 記録用に検索語とuserIdを記録
  debug(postMsg, lineUserId);
  //debug(action, lineUserId);
  if( postMsg === '選曲して'|| postMsg === '選曲' ){
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    var data = sheet.getDataRange().getValues();
    var i=CountColA();
    var range = sheet.getRange(i,1);
    var range2 = sheet.getRange(i, 3)
    var replyText = range.getValue()+'\n'+range2.getValue();
    sendMessage(replyToken, replyText);
    //Logger.log(range.getValue());
  }else{
    // 検索語に対しての回答をSSから取得
    var answers = findResponseArray(postMsg);
  
    // 回答メッセージを作成
    var replyText = '「' + postMsg + '」ですね。かしこまりました。以下、回答です。';
    // 回答の有無に応じて分岐
    if (answers.length === 0) {
      // 「類似の検索キーワード」がないかチェック
      var mayBeWord = findMaybe(postMsg);
      if (typeof mayBeWord === "undefined") {
        // 回答がない場合の定型文
        sendMessage(replyToken, '答えが見つかりませんでした。別のキーワードで質問してみてください。選曲してと質問するとランダムに曲を答えます。曲名を入力すると歌詞が表示されます。');        
      } else {
        sendMayBe(replyToken, mayBeWord);
      }
    } else {
        // 回答がある場合のメッセージ生成
      if(F==1){
         answers.forEach(function(answer) {
          replyText = replyText + "\n\n＝＝＝＝＝＝＝＝＝＝＝＝＝\n\nQ：" + answer.type + "\n\nA：" + answer.key;
        });
      }else{
        answers.forEach(function(answer) {
          replyText = replyText + "\n\n＝＝＝＝＝＝＝＝＝＝＝＝＝\n\nQ：" + answer.key + "\n\n" + answer.type + "\n\nA：" + answer.value;
        });
      }
        // 4950文字を超える場合は途中で切る
        if (replyText.length > 4950) {
          replyText = replyText.slice(0,4950) + "……\n\n＝＝＝＝＝＝＝＝＝＝＝＝＝\n\n回答文字数オーバーです。詳細に検索キーワードを絞ってください。";
        }
        // メッセージAPI送信
        sendMessage(replyToken, replyText);
    }
  }
}
//スプレッドシートから行数を求める
function CountColA(){
  var sheet = SpreadsheetApp.getActiveSheet();
  var data = sheet.getDataRange().getValues();
  for(var i = data.length-1 ; i >=0 ; i--){
    if (data[i][0] != null && data[i][0] != ''){
      return (Math.floor(Math.random()*i))+2;
    }
  }
}   
// SSからデータを取得
function getData() {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  var data = sheet.getDataRange().getValues();

  return data.map(function(row) { return {key: row[0], value: row[1], type: row[2]}; });
}

// SSから「もしかして」データを取得
function getMayBeData() {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME_MAYBE);
  var data = sheet.getDataRange().getValues();
  return data.map(function(row) { return {key: row[0], value: row[1], type: row[2]}; });
}

// 単語が一致したセルの回答を配列で返す
function findResponseArray(word) {
  // スペース検索用のスペースを半角に統一
  //word="Dance My Generation";
  word = word.replace('　',' ');
  // 単語ごとに配列に分割
  var wordArray = word.split(' ');
  return getData().reduce(function(memo, row) {
    // 値が入っているか row is seetnodata. value in kasi. memo is .key in kyokumei.
    if (row.value) {
      // AND検索ですべての単語を含んでいるか
      var matchCnt = 0;
      //Logger.log(wordArray.length);  
      // 単語を含んでいればtrue
      //Logger.log(word);
      if (row.key === word) {
        memo.push(row);
      }
    }
    if(row.key){
      var matchCnt = 0;
      wordArray.forEach(function(wordUnit){ 
        // 単語を含んでいればtrue
        if (row.type.indexOf(wordUnit) > -1) {
          matchCnt = matchCnt + 1;
        }
      });
      if (wordArray.length === matchCnt) {
        memo.push(row);
        F=1;
      }
    }
    return memo;
  }, []) || [];
}

// 単語が一致したセルの回答を「もしかして」を返す
function findMaybe(word) {
  return getMayBeData().reduce(function(memo, row) { return memo || (row.key === word && row.value); }, false) || undefined;
}

// 画像形式でAPI送信
function sendMessageImage(replyToken, imageUrl) {
  // replyするメッセージの定義
  var postData = {
    "replyToken" : replyToken,
    "messages" : [
      {
        "type": "image",
        "originalContentUrl": imageUrl
      }
    ]
  };
  return postMessage(postData);
}

// LINE messaging apiにJSON形式でデータをPOST
function sendMessage(replyToken, replyText) {  
  // replyするメッセージの定義
  var postData = {
    "replyToken" : replyToken,
    "messages" : [
      {
        "type" : "text",
        "text" : replyText
      }
    ]
  };
  return postMessage(postData);
}

// LINE messaging apiにJSON形式で確認をPOST
function sendMayBe(replyToken, mayBeWord) {  
  // replyするメッセージの定義
  var postData = {
    "replyToken" : replyToken,
    "messages" : [
      {
        "type" : "template",
        "altText" : "もしかして検索キーワードは「" + mayBeWord + "」ですか？",
        "template": {
          "type": "confirm",
          "actions": [
            {
                "type":"postback",
                "label":"はい",
                "data":"action=detail",
            },
            {
                "type": "message",
                "label": "いいえ",
                "text": "いいえ、違います。"
            }
          ],
          "text": "答えが見つかりませんでした。もしかして検索キーワードは「" + mayBeWord + "」ですか？"
        }

      }
    ]
  };
  return postMessage(postData);
}

// LINE messaging apiにJSON形式でデータをPOST
function postMessage(postData) {  
  // リクエストヘッダ
  var headers = {
    "Content-Type" : "application/json; charset=UTF-8",
    "Authorization" : "Bearer " + ACCESS_TOKEN
  };
  // POSTオプション作成
  var options = {
    "method" : "POST",
    "headers" : headers,
    "payload" : JSON.stringify(postData)
  };
  return UrlFetchApp.fetch(REPLY, options);      
}

/** ユーザーのアカウント名を取得
 */
function getUserDisplayName(userId) {
  var url = 'https://api.line.me/v2/bot/profile/' + userId;
  var userProfile = UrlFetchApp.fetch(url,{
    'headers': {
      'Authorization' :  'Bearer ' + ACCESS_TOKEN,
    },
  })
  return JSON.parse(userProfile).displayName;
}

// userIdシートに記載
function lineUserId(userId) {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('userId');
  sheet.appendRow([userId]);
}

// debugシートに値を記載
function debug(text, userId) {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('debug');
  var date = new Date();
  var userName = getUserDisplayName(userId);
  sheet.appendRow([userId, userName, text, Utilities.formatDate( date, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss')]);
}
