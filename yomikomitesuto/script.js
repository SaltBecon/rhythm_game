import chart_newyear from "/charts/akeome.json" assert { type: "json" };

//譜面用
let disappeared = [];
let longNotesStatus = [];//0:まだ p:始点がperfect g:good 1:死(完走) 2:死(miss)
let notes = [];
let longNotes = [];
let keys = {81:[], 87:[], 69:[], 82:[], 84:[], 89:[], 85:[], 73:[], 79:[], 80:[], 192:[], 219:[],
            65:[], 83:[], 68:[], 70:[], 71:[], 72:[], 74:[], 75:[], 76:[], 187:[], 186:[], 221:[],
            90:[], 88:[], 67:[], 86:[], 66:[], 78:[], 77:[], 188:[], 190:[], 191:[], 226:[]};
let frames = [];
let pressedKeyCodes = [];
const judgmentWidth = [50, 90, 120]
//const keyCodes = {81:[0,0], 87:[0,1], 69:[0,2], 82:[0,3], 84:[0,4], 89:[0,5], 85:[0,6], 73:[0,7], 79:[0,8], 80:[0,9], 192:[0,10], 219:[0,11],
//                  65:[1,0], 83:[1,1], 68:[1,2], 70:[1,3], 71:[1,4], 72:[1,5], 74:[1,6], 75:[1,7], 76:[1,8], 187:[1,9], 186:[1,10], 221:[1,11],
//                  90:[2,0], 88:[2,1], 67:[2,2], 86:[2,3], 66:[2,4], 78:[2,5], 77:[2,6], 188:[2,7], 190:[2,8], 191:[2,9], 226:[2,10]};
let keyPressed = {81:false, 87:false, 69:false, 82:false, 84:false, 89:false, 85:false, 73:false, 79:false, 80:false, 192:false, 219:false,
                  65:false, 83:false, 68:false, 70:false, 71:false, 72:false, 74:false, 75:false, 76:false, 187:false, 186:false, 221:false,
                  90:false, 88:false, 67:false, 86:false, 66:false, 78:false, 77:false, 188:false, 190:false, 191:false, 226:false};
const keyCodes = [[81, 87, 69, 82, 84, 89, 85, 73, 79, 80, 192, 219],
                  [65, 83, 68, 70, 71, 72, 74, 75, 76, 187, 186, 221],
                  [90, 88, 67, 86, 66, 78, 77, 188, 190, 191, 226]]
let combo = 0;
let score = 0;
let result = [0, 0, 0, 0];//[Perfect数, Good数, Bad数, Miss数]
const frameOffset = 60;//最初の拍までのフレーム数
const judgmentDelay = -50;//押したタイミングに足すやつ(ms)見た目と判定のずれ
const offset = -50;//ノーツと曲のずれ(ms)


//描画用
const canvas = document.getElementById("mainCanvas");
const ctx = canvas.getContext("2d");
const frameRate = 60;
const lineY = 800;
const keyOffsetTop = 10;
const keyOffsetLeft = [450, 470, 510];//[上, 中, 下]
const keyMargin = 10;
const keyPadding = 70;
const speed = 20;

let bpm = 120;
let measure = [4, 4];
let music;
let playing = false;
let ms = 0;

function load(chart){
    bpm = chart["data"]["bpm"];
    measure = chart["data"]["measure"];
    music = new Audio(chart["data"]["music"]);
    ms = 0;
    //ノーツデータ作成
    chart["notes"].forEach((shosetsu) => {//小節ごと
        shosetsu.forEach((beat) => {//拍ごと
            if (beat != 0){
                beat.forEach((note) => {//ノーツごと
                    //ノーツリスト追加
                    if (note[0] == 0 || note[0] == 1){//タップ, ロング始点
                        disappeared.push(false);
                        notes.push([ms, [], note[0], 0, ms - judgmentWidth[judgmentWidth.length - 1], ms + judgmentWidth[judgmentWidth.length - 1]]);//タイミング, 対応キー, 種類, 色, 判定開始時間, 判定終了時間, 始点(段), 始点(列), 終点(段), 終点(列)
                        notes[notes.length - 1] = notes[notes.length - 1].concat(note.slice(1, 5));
                        //対応キー
                        if (note[1] == 2 && note[3] == 0){//紫
                            notes[notes.length - 1][1] = notes[notes.length - 1][1].concat(keyCodes[0].slice(Math.max(note[2], 0), Math.min(note[4] + 1, 12)));
                            notes[notes.length - 1][1] = notes[notes.length - 1][1].concat(keyCodes[2].slice(Math.max(note[2], 0), Math.min(note[4] + 1, 12)));
                        }else{
                            for (let i = 0; i < 3; i++){//紫以外
                                if (note[1] <= i && i <= note[3]){
                                    notes[notes.length - 1][1] = notes[notes.length - 1][1].concat(keyCodes[i].slice(Math.max(note[2], 0), Math.min(note[4] + 1, keyCodes[i].length)));
                                }
                            }
                        }
                        //キーごとのリスト
                        notes[notes.length - 1][1].forEach((key) => {
                            keys[key].push(notes.length - 1);
                        });
                        //色
                        if (note[1] == 0 && note[3] == 0){//赤
                            notes[notes.length - 1][3] = 0;
                        }
                        if (note[1] == 1 && note[3] == 1){//緑
                            notes[notes.length - 1][3] = 1;
                        }
                        if (note[1] == 2 && note[3] == 2){//青
                            notes[notes.length - 1][3] = 2;
                        }
                        if (note[1] == 0 && note[3] == 1){//黄
                            notes[notes.length - 1][3] = 3;
                        }
                        if (note[1] == 1 && note[3] == 2){//水
                            notes[notes.length - 1][3] = 4;
                        }
                        if (note[1] == 2 && note[3] == 0){//紫
                            notes[notes.length - 1][3] = 5;
                        }
                        if (note[1] == 0 && note[3] == 2){//白
                            notes[notes.length - 1][3] = 6;
                        }

                        if (note[0] == 1){//ロング始点のみ
                            notes[notes.length - 1].push(longNotes.length);
                            longNotes.push([longNotes.length, notes.length - 1, ms, -1, notes[notes.length - 1][1]]);//ロングノーツID, ノーツ番号, 開始タイミング, 終了タイミング, 対応キー, 始点(段), 始点(列), 終点(段), 終点(列)
                            longNotes[longNotes.length - 1] = longNotes[longNotes.length - 1].concat(note.slice(1, 5));
                        }
                    }else if (note[0] == 2){//ロング終点
                        longNotes[
                            longNotes.findIndex((longNote) => {//longNote.slice(5, 9) == note.slice(1, 5)
                            if(longNotes[longNote[0]][3] != -1){
                                return false;
                            }
                            for (let i = 0; i < 4; i++) {
                              if (longNote.slice(5, 9)[i] != note.slice(1, 5)[i]) return false;
                            }
                            return true;
                          })
                        ][3] = ms;
                        longNotesStatus.push(0);
                    }
                });
            }
            ms += ((4 * measure[0] / measure[1]) * (60000 / bpm)) / shosetsu.length;
        });
    });

    //縦連判定
    for (let number = 0; number < notes.length; number++){
        for (let i = -1; number + i >= 0; i--){//early側
            if (notes[number][1].filter(x => notes[number + i][1].includes(x)).length != 0){//場所被り(同時押しは被らない想定)
                if (notes[number][0] - notes[number + i][0] < judgmentWidth[judgmentWidth.length - 1] * 2){//被りあり
                    notes[number][4] = Math.min((notes[number][0] + notes[number + i][0]) / 2, notes[number][0] - judgmentWidth[0]);
                    break;
                }else{//被りなし
                    break;
                }
            }
        }
        for (let i = 1; number + i < notes.length; i++){//late側
            if (notes[number][1].filter(x => notes[number + i][1].includes(x)).length != 0){//場所被り(同時押しは被らない想定)
                if (notes[number + i][0] - notes[number][0] < judgmentWidth[judgmentWidth.length - 1] * 2){//被りあり
                    notes[number][5] = Math.max((notes[number][0] + notes[number + i][0]) / 2, notes[number][0] + judgmentWidth[0]);
                    break;
                }else{//被りなし
                    break;
                }
            }
        }
    }


    //描画用データ作成
    //とりあえず画面の上端から降らせる
    if (longNotes.length == 0){
        for (let i = 0; i <= frameOffset + Math.ceil(notes[notes.length - 1][0] * frameRate / 1000) + judgmentWidth[judgmentWidth.length - 1] * 60 / 1000 + 100; i++){
            frames.push([]);
        }
    }else{
        for (let i = 0; i <= frameOffset + Math.ceil(Math.max(notes[notes.length - 1][0], longNotes[longNotes.length - 1][3]) * frameRate / 1000) + judgmentWidth[judgmentWidth.length - 1] * 60 / 1000 + 100; i++){
            frames.push([]);
        }
    }
    for (let i = 0; i < longNotes.length; i++){//ロング
        for (let frame = Math.round(longNotes[i][3] * frameRate / 1000 + frameOffset); frame >= 0; frame--){
            if (lineY - speed * ((longNotes[i][2] * frameRate / 1000 + frameOffset) - frame) < 0){
                break;
            }
            if (notes[longNotes[i][1]][3] == 0){//赤
                frames[frame].push([longNotes[i][1], 1, keyOffsetLeft[0] + longNotes[i][6] * (keyMargin + keyPadding), lineY - speed * ((longNotes[i][3] * frameRate / 1000 + frameOffset) - frame), (longNotes[i][8] - longNotes[i][6]) * (keyMargin + keyPadding) + keyPadding, Math.min(speed * ((longNotes[i][3] * frameRate / 1000 + frameOffset) - (longNotes[i][2] * frameRate / 1000 + frameOffset)), speed * ((longNotes[i][3] * frameRate / 1000 + frameOffset) - frame)), "#ff0000", 10, "#990000"]);
            }
            if (notes[longNotes[i][1]][3] == 1){//緑
                frames[frame].push([longNotes[i][1], 1, keyOffsetLeft[1] + longNotes[i][6] * (keyMargin + keyPadding), lineY - speed * ((longNotes[i][3] * frameRate / 1000 + frameOffset) - frame), (longNotes[i][8] - longNotes[i][6]) * (keyMargin + keyPadding) + keyPadding, Math.min(speed * ((longNotes[i][3] * frameRate / 1000 + frameOffset) - (longNotes[i][2] * frameRate / 1000 + frameOffset)), speed * ((longNotes[i][3] * frameRate / 1000 + frameOffset) - frame)), "#00ff00", 10, "#009900"]);
            }
            if (notes[longNotes[i][1]][3] == 2){//青
                frames[frame].push([longNotes[i][1], 1, keyOffsetLeft[2] + longNotes[i][6] * (keyMargin + keyPadding), lineY - speed * ((longNotes[i][3] * frameRate / 1000 + frameOffset) - frame), (longNotes[i][8] - longNotes[i][6]) * (keyMargin + keyPadding) + keyPadding, Math.min(speed * ((longNotes[i][3] * frameRate / 1000 + frameOffset) - (longNotes[i][2] * frameRate / 1000 + frameOffset)), speed * ((longNotes[i][3] * frameRate / 1000 + frameOffset) - frame)), "#0000ff", 10, "#000099"]);
            }
            if (notes[longNotes[i][1]][3] == 3){//黄
                frames[frame].push([longNotes[i][1], 1, (keyOffsetLeft[0] + keyOffsetLeft[1]) / 2 + longNotes[i][6] * (keyMargin + keyPadding), lineY - speed * ((longNotes[i][3] * frameRate / 1000 + frameOffset) - frame), (longNotes[i][8] - longNotes[i][6]) * (keyMargin + keyPadding) + keyPadding, Math.min(speed * ((longNotes[i][3] * frameRate / 1000 + frameOffset) - (longNotes[i][2] * frameRate / 1000 + frameOffset)), speed * ((longNotes[i][3] * frameRate / 1000 + frameOffset) - frame)), "#ffff00", 10, "#999900"]);
            }
            if (notes[longNotes[i][1]][3] == 4){//水
                frames[frame].push([longNotes[i][1], 1, (keyOffsetLeft[1] + keyOffsetLeft[2]) / 2 + longNotes[i][6] * (keyMargin + keyPadding), lineY - speed * ((longNotes[i][3] * frameRate / 1000 + frameOffset) - frame), (longNotes[i][8] - longNotes[i][6]) * (keyMargin + keyPadding) + keyPadding, Math.min(speed * ((longNotes[i][3] * frameRate / 1000 + frameOffset) - (longNotes[i][2] * frameRate / 1000 + frameOffset)), speed * ((longNotes[i][3] * frameRate / 1000 + frameOffset) - frame)), "#00ffff", 10, "#009999"]);
            }
            if (notes[longNotes[i][1]][3] == 5){//紫
                frames[frame].push([longNotes[i][1], 1, (keyOffsetLeft[2] + keyOffsetLeft[0]) / 2 + longNotes[i][6] * (keyMargin + keyPadding), lineY - speed * ((longNotes[i][3] * frameRate / 1000 + frameOffset) - frame), (longNotes[i][8] - longNotes[i][6]) * (keyMargin + keyPadding) + keyPadding, Math.min(speed * ((longNotes[i][3] * frameRate / 1000 + frameOffset) - (longNotes[i][2] * frameRate / 1000 + frameOffset)), speed * ((longNotes[i][3] * frameRate / 1000 + frameOffset) - frame)), "#ff00ff", 10, "#990099"]);
            }
            if (notes[longNotes[i][1]][3] == 6){//白
                frames[frame].push([longNotes[i][1], 1, (keyOffsetLeft[0] + keyOffsetLeft[1] + keyOffsetLeft[2]) / 3 + longNotes[i][6] * (keyMargin + keyPadding), lineY - speed * ((longNotes[i][3] * frameRate / 1000 + frameOffset) - frame), (longNotes[i][8] - longNotes[i][6]) * (keyMargin + keyPadding) + keyPadding, Math.min(speed * ((longNotes[i][3] * frameRate / 1000 + frameOffset) - (longNotes[i][2] * frameRate / 1000 + frameOffset)), speed * ((longNotes[i][3] * frameRate / 1000 + frameOffset) - frame)), "#ffffff", 10, "#999999"]);
            }
        }
    }
    for (let i = 0; i < notes.length; i++){//タップ
        if (notes[i][2] == 0){
            for (let frame = Math.round(notes[i][0] * frameRate / 1000 + frameOffset); frame >= 0; frame--){
                if (lineY - speed * ((notes[i][0] * frameRate / 1000 + frameOffset) - frame) < 0){
                    break;
                }
                if (notes[i][3] == 0){//赤
                    frames[frame].push([i, 0, keyOffsetLeft[0] + notes[i][7] * (keyMargin + keyPadding), lineY - speed * ((notes[i][0] * frameRate / 1000 + frameOffset) - frame), keyOffsetLeft[0] + notes[i][9] * (keyMargin + keyPadding) + keyPadding, lineY - speed * ((notes[i][0] * frameRate / 1000 + frameOffset) - frame), "#ff0000", 20]);
                }
                if (notes[i][3] == 1){//緑
                    frames[frame].push([i, 0, keyOffsetLeft[1] + notes[i][7] * (keyMargin + keyPadding), lineY - speed * ((notes[i][0] * frameRate / 1000 + frameOffset) - frame), keyOffsetLeft[1] + notes[i][9] * (keyMargin + keyPadding) + keyPadding, lineY - speed * ((notes[i][0] * frameRate / 1000 + frameOffset) - frame), "#00ff00", 20]);
                }
                if (notes[i][3] == 2){//青
                    frames[frame].push([i, 0, keyOffsetLeft[2] + notes[i][7] * (keyMargin + keyPadding), lineY - speed * ((notes[i][0] * frameRate / 1000 + frameOffset) - frame), keyOffsetLeft[2] + notes[i][9] * (keyMargin + keyPadding) + keyPadding, lineY - speed * ((notes[i][0] * frameRate / 1000 + frameOffset) - frame), "#0000ff", 20]);
                }
                if (notes[i][3] == 3){//黄
                    frames[frame].push([i, 0, (keyOffsetLeft[0] + keyOffsetLeft[1]) / 2 + notes[i][7] * (keyMargin + keyPadding), lineY - speed * ((notes[i][0] * frameRate / 1000 + frameOffset) - frame), (keyOffsetLeft[0] + keyOffsetLeft[1]) / 2 + notes[i][9] * (keyMargin + keyPadding) + keyPadding, lineY - speed * ((notes[i][0] * frameRate / 1000 + frameOffset) - frame), "#ffff00", 20]);
                }
                if (notes[i][3] == 4){//水
                    frames[frame].push([i, 0, (keyOffsetLeft[1] + keyOffsetLeft[2]) / 2 + notes[i][7] * (keyMargin + keyPadding), lineY - speed * ((notes[i][0] * frameRate / 1000 + frameOffset) - frame), (keyOffsetLeft[1] + keyOffsetLeft[2]) / 2 + notes[i][9] * (keyMargin + keyPadding) + keyPadding, lineY - speed * ((notes[i][0] * frameRate / 1000 + frameOffset) - frame), "#00ffff", 20]);
                }
                if (notes[i][3] == 5){//紫
                    frames[frame].push([i, 0, (keyOffsetLeft[2] + keyOffsetLeft[0]) / 2 + notes[i][7] * (keyMargin + keyPadding), lineY - speed * ((notes[i][0] * frameRate / 1000 + frameOffset) - frame), (keyOffsetLeft[2] + keyOffsetLeft[0]) / 2 + notes[i][9] * (keyMargin + keyPadding) + keyPadding, lineY - speed * ((notes[i][0] * frameRate / 1000 + frameOffset) - frame), "#ff00ff", 20]);
                }
                if (notes[i][3] == 6){//白
                    frames[frame].push([i, 0, (keyOffsetLeft[0] + keyOffsetLeft[1] + keyOffsetLeft[2]) / 3 + notes[i][7] * (keyMargin + keyPadding), lineY - speed * ((notes[i][0] * frameRate / 1000 + frameOffset) - frame), (keyOffsetLeft[0] + keyOffsetLeft[1] + keyOffsetLeft[2]) / 3 + notes[i][9] * (keyMargin + keyPadding) + keyPadding, lineY - speed * ((notes[i][0] * frameRate / 1000 + frameOffset) - frame), "#ffffff", 20]);
                }
            }
        }
    }


    //ロングノーツ調整
    longNotes.forEach((note) => {
        note[2] = note[2] + judgmentWidth[judgmentWidth.length - 1];
        note[3] = note[3] - judgmentWidth[judgmentWidth.length - 1];
    });
}


let startTime = 0;
let count = 0;
function game(){
    load(chart_newyear);
    startTime = performance.now();
    let main = setInterval(() => {
        if (performance.now() - startTime - (1000 / frameRate) * count >= 1000 / frameRate){
            draw();
            if (count >= frameOffset + offset * frameRate / 1000 && playing == false){
                music.play();
                playing = true;
            }
            longNotes.forEach((note) => {
                if (note[3] < performance.now() - startTime - frameOffset * 1000 / frameRate + judgmentDelay){//ロングノーツ終了
                    if (longNotesStatus[longNotes.indexOf(note)] != 0 && longNotesStatus[longNotes.indexOf(note)] != 1 && longNotesStatus[longNotes.indexOf(note)] != 2){//ロングノーツ完走
                        if (longNotesStatus[longNotes.indexOf(note)] == "p"){
                            result[0]++;
                        }
                        if (longNotesStatus[longNotes.indexOf(note)] == "g"){
                            result[1]++;
                        }
                        score = (1000000 * result[0] + 500000 * result[1]) / notes.length;
                        combo++;
                        longNotesStatus[longNotes.indexOf(note)] = 1;
                    }
                }else if(note[2] <= performance.now() - startTime - frameOffset * 1000 / frameRate + judgmentDelay){//ロングノーツ中
                    if (longNotesStatus[longNotes.indexOf(note)] == "p" || longNotesStatus[longNotes.indexOf(note)] == "g"){
                        if (note[4].find((key) => keyPressed[key] == true) == undefined){//Miss
                            //console.log("Miss");
                            combo = 0;
                            longNotesStatus[longNotes.indexOf(note)] = 2;
                        }
                    }
                }
            });
            notes.forEach((note) => {
                if (note[5] < performance.now() - startTime - frameOffset * 1000 / frameRate + judgmentDelay && !disappeared[notes.indexOf(note)]){//Miss
                    //console.log("Miss");
                    result[3]++;
                    combo = 0;
                    disappeared[notes.indexOf(note)] = true;
                    if (note[2] == 1){
                        longNotesStatus[note[10]] = 2;
                    }
                }
            });
            while (performance.now() - startTime - (1000 / frameRate) * count >= 1000 / frameRate){
                count++;
            }
            if (count >= frames.length){
                clearInterval(main);
            }
        }
    }, 0);
  }

function draw(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 4;

    //スコア
    ctx.beginPath();
    ctx.font = "48px monospace";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "right";
    ctx.fillText("Score:" + ("0000000" + String(Math.floor(score))).slice(-7), canvas.width, 50);

    //コンボ
    if (combo > 0){
        ctx.beginPath();
        ctx.font = "48px monospace";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "right";
        ctx.fillText(String(combo) + "Combo", canvas.width, 100);
    }

    //判定線
    ctx.beginPath();
    ctx.moveTo(0, lineY);
    ctx.lineTo(canvas.width, lineY);
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    //ノーツ+判定後エフェクト
    frames[count].forEach((note) => {
        ctx.beginPath();
        ctx.strokeStyle = note[6];
        ctx.lineWidth = note[7];
        ctx.fillStyle = note[8];
        if (note[1] == 0){//タップ
            if (disappeared[note[0]] == false){
                ctx.moveTo(note[2], note[3]);
                ctx.lineTo(note[4], note[5]);
                ctx.stroke();
            }
        }
        if (note[1] == 1){//ロング
            if (longNotesStatus[notes[note[0]][10]] == 2){
                ctx.fillStyle = "#222222";
            }
            //if (longNotesStatus[notes[note[0]][10]] != 1){
                ctx.rect(note[2], note[3], note[4], note[5]);
                ctx.fill();
                ctx.beginPath();
                ctx.rect(note[2], note[3], note[4], note[5]);
                ctx.stroke();
            //}
        }
        if (note[1] == 2){//判定後エフェクト
            ctx.rect(note[2], note[3], note[4], note[5]);
            ctx.stroke();
        }
    });

    ctx.lineWidth = 4;
    //キーボード
    for (let i = 0; i < 12; i++){
        ctx.beginPath();
        if (keyPressed[keyCodes[0][i]]){/*
            ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
            ctx.rect(keyOffsetLeft[0] + i * (keyMargin + keyPadding), 0, keyPadding, lineY);
            ctx.fill();
            ctx.beginPath();*/
            ctx.strokeStyle = "#ff0000";
        }else{
            ctx.strokeStyle = "#660000";
        }
        ctx.rect(keyOffsetLeft[0] + i * (keyMargin + keyPadding), lineY + keyMargin, keyPadding, keyPadding);
        ctx.stroke();
    }
    for (let i = 0; i < 12; i++){
        ctx.beginPath();
        if (keyPressed[keyCodes[1][i]]){/*
            ctx.fillStyle = "rgba(0, 255, 0, 0.1)";
            ctx.rect(keyOffsetLeft[1] + i * (keyMargin + keyPadding), 0, keyPadding, lineY);
            ctx.fill();
            ctx.beginPath();*/
            ctx.strokeStyle = "#00ff00";
        }else{
            ctx.strokeStyle = "#006600";
        }
        ctx.rect(keyOffsetLeft[1] + i * (keyMargin + keyPadding), lineY + keyMargin + keyMargin + keyPadding, keyPadding, keyPadding);
        ctx.stroke();
    }
    for (let i = 0; i < 11; i++){
        ctx.beginPath();
        if (keyPressed[keyCodes[2][i]]){/*
            ctx.fillStyle = "rgba(0, 0, 255, 0.1)";
            ctx.rect(keyOffsetLeft[2] + i * (keyMargin + keyPadding), 0, keyPadding, lineY);
            ctx.fill();
            ctx.beginPath();*/
            ctx.strokeStyle = "#0000ff";
        }else{
            ctx.strokeStyle = "#000066";
        }
        ctx.rect(keyOffsetLeft[2] + i * (keyMargin + keyPadding), lineY + keyMargin + 2 * (keyMargin + keyPadding), keyPadding, keyPadding);
        ctx.stroke();
    }
    //黄水紫白
    //左
    ctx.beginPath();
    ctx.fillStyle = "#ffff00";
    ctx.rect(keyOffsetLeft[0] - keyMargin - 20, lineY + keyMargin, 20, keyPadding + keyMargin + keyPadding);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#00ffff";
    ctx.rect(keyOffsetLeft[0] - keyMargin - 50, lineY + keyMargin + keyMargin + keyPadding, 20, keyPadding + keyMargin + keyPadding);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#ff00ff";
    ctx.rect(keyOffsetLeft[0] - keyMargin - 80, lineY + keyMargin, 20, keyPadding);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#ff00ff";
    ctx.rect(keyOffsetLeft[0] - keyMargin - 80, lineY + keyMargin + 2 * (keyMargin + keyPadding), 20, keyPadding);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#ffffff";
    ctx.rect(keyOffsetLeft[0] - keyMargin - 110, lineY + keyMargin, 20, keyPadding + 2 * (keyMargin + keyPadding));
    ctx.fill();
    //右
    ctx.beginPath();
    ctx.fillStyle = "#ffff00";
    ctx.rect(keyOffsetLeft[1] + 12 * (keyMargin + keyPadding) + keyMargin, lineY + keyMargin, 20, keyPadding + keyMargin + keyPadding);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#00ffff";
    ctx.rect(keyOffsetLeft[1] + 12 * (keyMargin + keyPadding) + keyMargin + 30, lineY + keyMargin + keyMargin + keyPadding, 20, keyPadding + keyMargin + keyPadding);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#ff00ff";
    ctx.rect(keyOffsetLeft[1] + 12 * (keyMargin + keyPadding) + keyMargin + 60, lineY + keyMargin, 20, keyPadding);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#ff00ff";
    ctx.rect(keyOffsetLeft[1] + 12 * (keyMargin + keyPadding) + keyMargin + 60, lineY + keyMargin + 2 * (keyMargin + keyPadding), 20, keyPadding);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#ffffff";
    ctx.rect(keyOffsetLeft[1] + 12 * (keyMargin + keyPadding) + keyMargin + 90, lineY + keyMargin, 20, keyPadding + 2 * (keyMargin + keyPadding));
    ctx.fill();
}

function hitEffect(nowNote, r, g, b){
    let startX;
    let paddingX = (nowNote[9] - nowNote[7]) * (keyMargin + keyPadding) + keyPadding;
    if (nowNote[3] == 0){
        startX = keyOffsetLeft[0] + nowNote[7] * (keyMargin + keyPadding);
    }
    if (nowNote[3] == 1){
        startX = keyOffsetLeft[1] + nowNote[7] * (keyMargin + keyPadding);
    }
    if (nowNote[3] == 2){
        startX = keyOffsetLeft[2] + nowNote[7] * (keyMargin + keyPadding);
    }
    if (nowNote[3] == 3){
        startX = (keyOffsetLeft[0] + keyOffsetLeft[1]) / 2 + nowNote[7] * (keyMargin + keyPadding);
    }
    if (nowNote[3] == 4){
        startX = (keyOffsetLeft[1] + keyOffsetLeft[2]) / 2 + nowNote[7] * (keyMargin + keyPadding);
    }
    if (nowNote[3] == 5){
        startX = (keyOffsetLeft[2] + keyOffsetLeft[0]) / 2 + nowNote[7] * (keyMargin + keyPadding);
    }
    if (nowNote[3] == 6){
        startX = (keyOffsetLeft[0] + keyOffsetLeft[1] + keyOffsetLeft[2]) / 3 + nowNote[7] * (keyMargin + keyPadding);
    }
    for (let i = 0; i < 20 && count + i < frames.length; i++){
        frames[count + i].push([null, 2, startX - 5 * i, lineY - 5 * i, paddingX + 10 * i, 10 * i, `rgba(${r}, ${g}, ${b}, ${(20 - i) / 20})`, 5 - i / 4]);
    }
}

document.addEventListener("keydown", function(e){
    if (e.keyCode == 13 && startTime == 0){//仮スタート
        game();
    }
    if (!keyPressed[e.keyCode]){
        let pressTime = performance.now() - startTime - frameOffset * 1000 / frameRate + judgmentDelay;
        let noteNowIndex = notes.findIndex((note) => note[1].includes(e.keyCode) && note[4] <= pressTime && pressTime <= note[5] && !disappeared[notes.indexOf(note)]);
        if (noteNowIndex != -1){
            if (notes[noteNowIndex][2] == 0){//タップ
                console.log(notes[noteNowIndex][0] - pressTime);
                if (Math.abs(notes[noteNowIndex][0] - pressTime) <= judgmentWidth[0]){//Perfect
                    disappeared[noteNowIndex] = true;
                    console.log("Perfect");
                    result[0]++;
                    combo++;
                    hitEffect(notes[noteNowIndex], 255, 255, 255);
                }else if (Math.abs(notes[noteNowIndex][0] - pressTime) <= judgmentWidth[1]){//Good
                    disappeared[noteNowIndex] = true;
                    console.log("Good");
                    result[1]++;
                    combo++;
                    if (pressTime < notes[noteNowIndex][0]){//fast
                        hitEffect(notes[noteNowIndex], 0, 0, 255);
                    }else{//late
                        hitEffect(notes[noteNowIndex], 255, 0, 0);
                    }
                }else if (Math.abs(notes[noteNowIndex][0] - pressTime) <= judgmentWidth[2]){//Bad
                    disappeared[noteNowIndex] = true;
                    console.log("Bad");
                    result[2]++;
                    combo = 0;
                }
                score = (1000000 * result[0] + 500000 * result[1]) / notes.length;
            }else if (notes[noteNowIndex][2] == 1){//ロング始点
                if (Math.abs(notes[noteNowIndex][0] - pressTime) <= judgmentWidth[0]){//Perfect
                    disappeared[noteNowIndex] = true;
                    longNotesStatus[notes[noteNowIndex][10]] = "p";
                    hitEffect(notes[noteNowIndex], 255, 255, 255);
                }else if (Math.abs(notes[noteNowIndex][0] - pressTime) <= judgmentWidth[1]){//Good
                    disappeared[noteNowIndex] = true;
                    longNotesStatus[notes[noteNowIndex][10]] = "g";
                    if (pressTime < notes[noteNowIndex][0]){//fast
                        hitEffect(notes[noteNowIndex], 0, 0, 255);
                    }else{//late
                        hitEffect(notes[noteNowIndex], 255, 0, 0);
                    }
                }
            }
        }
    }
    keyPressed[e.keyCode] = true;
});

document.addEventListener("keyup", function(e){
    keyPressed[e.keyCode] = false;
});