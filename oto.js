// Web Audio APIのコンテキストを作成
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

let audioBuffer = null;

// ファイルが選択されたときの処理
document.getElementById('audioFile').addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (file) {
    // ファイルを読み込む
    const reader = new FileReader();
    reader.onload = function(fileEvent) {
      const arrayBuffer = fileEvent.target.result;

      // Web Audio APIを使って音声データをデコード
      audioContext.decodeAudioData(arrayBuffer, function(buffer) {
        // デコードされた音声データを保存
        audioBuffer = buffer;
      }, function(e) {
        console.log("ファイルの読み込みに失敗しました。", e);
      });
    };
    reader.readAsArrayBuffer(file);
  }
});

document.getElementById('playButton').addEventListener('click', function() {
    if (audioBuffer) {
      // AudioContextが停止状態の場合、再開させる
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('AudioContext resumed successfully');
        });
      }
  
      // AudioBufferSourceNodeを作成
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0); // 再生を即時開始する
  
      // ゲームの更新処理を開始
      startGame();
    }
  });
  

// Canvas要素と描画コンテキストを取得
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ゲームの状態
let score = 0; // スコア
let blocks = [];
const columns = [100, 200, 300, 400]; // ブロックが出現する列の

// 指定された列のX座標にブロックを追加する
function addBlock(columnX, set_speed ) {
    blocks.push({ x: columnX, y: 0, speed: set_speed });
}


// タイミングラインのY座標と、キーと列の対応
const timingLineY = 550;
const keyToColumn = { 'A': 100, 'S': 200, 'D': 300, 'F': 400 };
const columnToKey = { 100: 'A', 200: 'S', 300: 'D', 400: 'F' };

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    // ブロックを描画
    blocks.forEach(block => {
      block.y += block.speed;
      ctx.fillStyle = 'blue';
      ctx.fillRect(block.x, block.y, 50, 50);
    });

    // タイミングラインを描画
    ctx.strokeStyle = 'red';
    ctx.beginPath();
    ctx.moveTo(0, timingLineY);
    ctx.lineTo(canvas.width, timingLineY);
    ctx.stroke();

    // キーと列の対応を示すテキストを描画
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    for (const [x, key] of Object.entries(columnToKey)) {
        ctx.fillText(key, parseInt(x) + 15, timingLineY + 30); // テキストを列の中央に配置
    }
  
    // スコアを描画
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${score}`, 10, 30);
  
    requestAnimationFrame(draw);
}

// キーボードイベントの処理を更新
document.addEventListener('keydown', (e) => {
    if (keyToColumn[e.key.toUpperCase()] !== undefined) {
      const columnIndex = keyToColumn[e.key.toUpperCase()];
      let blockIndex = blocks.findIndex(block => block.x === columnIndex && block.y > timingLineY - 50 && block.y < timingLineY + 50);
      if (blockIndex !== -1) {
        blocks.splice(blockIndex, 1);
        score += 10;
      }
    }
});
  
// 譜面のロジック
const chart = [
    { time: 1, column: 100, speed: 0.01 }, // 1秒後に列100にブロックが出現
    { time: 3, column: 200, speed: 0.01 }, // 3秒後に列200にブロックが出現
    { time: 4.5, column: 300, speed: 0.001 }, // 4.5秒後に列300にブロックが出現
    { time: 5.5, column: 400, speed: 0.01 },
    // 以下、曲に合わせて追加
];

// 再生ボタンが押されたときの処理
document.getElementById('playButton').addEventListener('click', function() {
    if (audioBuffer) {
      // AudioBufferSourceNodeを作成
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0); // 0は再生を即時開始することを意味します
  
      // ゲームの更新処理を開始
      startGame();
    }else{
        console.log("please set audio");
    }
});

let lastTime = 0;
let chartIndex = 0; // 現在の譜面のインデックス

function startGame() {
  lastTime = audioContext.currentTime;
  requestAnimationFrame(updateGame);
}


let lastFrameTime = Date.now();
function updateGame() {
    const now = Date.now();
    const deltaTime = (now - lastFrameTime) / 1000; // 秒単位の経過時間
    lastFrameTime = now;

    const currentTime = audioContext.currentTime;

    // 譜面に従ってブロックを追加
    while (chartIndex < chart.length && chart[chartIndex].time <= currentTime - lastTime) {
      addBlock(chart[chartIndex].column, chart[ chartIndex].speed ); // ここで指定された列にブロックを追加
      chartIndex++;
    }
  
    draw();
    requestAnimationFrame(updateGame);
}

  
