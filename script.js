//$.getJSON("/musics.json", function(musicList){//ローカル
$.getJSON("https://saltbecon.github.io/rhythm_game/musics.json", function(musicList){//GitHub
    //const root = "/"//ローカル
    const root = "https://saltbecon.github.io/rhythm_game/"//GitHub
    //選曲用
    let musicListIndex = 0;
    let level = "easy";
    let situation = 1;//1:選曲画面, 2:ゲーム中, 3:リザルト画面
    //譜面用
    let disappeared = [];
    let longNotesStatus = [];//0:まだ p:始点がperfect g:good 1:死(完走) 2:死(miss)
    let notes = [];
    let longNotes = [];
    let frames = [];
    let scrolls = [];//フレームごとのスクロール速度
    let bpms = [];//フレームごとのBPM
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
    const keyOffsetLeft = [450, 470, 510];//[上, 中, 下]
    const keyMargin = 10;
    const keyPadding = 70;
    let setSpeed = 20;

    let bpm = 120;
    let measure = [4, 4];
    let music;
    let playing = false;
    let ms = 0;

    function load(chart){
        let hs = 1;//HighSpeed
        let scroll = 1;
        bpm = chart["data"]["bpm"];
        measure = chart["data"]["measure"];
        music = new Audio(`${root}musics/${musicList[musicListIndex]["musicfile"]}`);
        if (chart["data"]["speed"] != undefined){setSpeed = chart["data"]["speed"]};
        if (chart["data"]["scroll"] != undefined){scroll = chart["data"]["scroll"]};
        ms = 0;
        //ノーツデータ作成
        let shosetsuCount = 0;
        chart[level].forEach((shosetsu) => {//小節ごと
            shosetsuCount++;
            if (shosetsu.constructor == Array){
                let notObjectThingsCountOfShosetsu = shosetsu.filter((x) => x.constructor != Object).length;
                shosetsu.forEach((beat) => {//拍ごと
                    if (beat == 0){ms += ((4 * measure[0] / measure[1]) * (60000 / bpm)) / notObjectThingsCountOfShosetsu;}
                    if (beat.constructor == Array){
                        beat.forEach((note) => {//ノーツごと
                            if (note.constructor == Array){
                                //ノーツリスト追加
                                if (note[0] == 0 || note[0] == 1){//タップ, ロング始点
                                    disappeared.push(false);
                                    notes.push({timing: ms, keys: [], type: note[0], color: 0, judgeStart: ms - judgmentWidth[judgmentWidth.length - 1], judgeEnd: ms + judgmentWidth[judgmentWidth.length - 1], startRow: 0, startColumn: 0, endRow: 0, endColumn: 0, hs: hs});//タイミング, 対応キー, 種類, 色, 判定開始時間, 判定終了時間, 始点(段), 始点(列), 終点(段), 終点(列), (始点)HS, (ロングノーツID)
                                    notes[notes.length - 1]["startRaw"] = note[1];
                                    notes[notes.length - 1]["startColumn"] = note[2];
                                    notes[notes.length - 1]["endRaw"] = note[3];
                                    notes[notes.length - 1]["endColumn"] = note[4];
                                    //ギミック
                                    if (note[5] != undefined){
                                        notes[notes.length - 1]["gimmicks"] = note[5];
                                        notes[notes.length - 1]["gimmicks"].forEach((element, index) => {
                                            if (element.constructor == String){
                                                notes[notes.length - 1]["gimmicks"] = notes[notes.length - 1]["gimmicks"].slice(0, index).concat(gimmick[element], notes[notes.length - 1]["gimmicks"].slice(index + 1, notes[notes.length - 1]["gimmicks"].length));
                                            }
                                        });
                                    }
                                    //対応キー
                                    if (note[1] == 2 && note[3] == 0){//紫
                                        notes[notes.length - 1]["keys"] = notes[notes.length - 1]["keys"].concat(keyCodes[0].slice(Math.max(note[2], 0), Math.min(note[4] + 1, 12)));
                                        notes[notes.length - 1]["keys"] = notes[notes.length - 1]["keys"].concat(keyCodes[2].slice(Math.max(note[2], 0), Math.min(note[4] + 1, 12)));
                                    }else{//紫以外
                                        for (let i = 0; i < 3; i++){
                                            if (note[1] <= i && i <= note[3]){
                                                notes[notes.length - 1]["keys"] = notes[notes.length - 1]["keys"].concat(keyCodes[i].slice(Math.max(note[2], 0), Math.min(note[4] + 1, keyCodes[i].length)));
                                            }
                                        }
                                    }
                                    //色
                                    if (note[1] == 0 && note[3] == 0){//赤
                                        notes[notes.length - 1]["color"] = 0;
                                    }
                                    if (note[1] == 1 && note[3] == 1){//緑
                                        notes[notes.length - 1]["color"] = 1;
                                    }
                                    if (note[1] == 2 && note[3] == 2){//青
                                        notes[notes.length - 1]["color"] = 2;
                                    }
                                    if (note[1] == 0 && note[3] == 1){//黄
                                        notes[notes.length - 1]["color"] = 3;
                                    }
                                    if (note[1] == 1 && note[3] == 2){//水
                                        notes[notes.length - 1]["color"] = 4;
                                    }
                                    if (note[1] == 2 && note[3] == 0){//紫
                                        notes[notes.length - 1]["color"] = 5;
                                    }
                                    if (note[1] == 0 && note[3] == 2){//白
                                        notes[notes.length - 1]["color"] = 6;
                                    }

                                    if (note[0] == 1){//ロング始点のみ
                                        notes[notes.length - 1]["longNoteId"] = longNotes.length;
                                        longNotes.push({longNoteId: longNotes.length, noteNumber: notes.length - 1, start: ms, end: -1, keys: notes[notes.length - 1]["keys"]});//ロングノーツID, ノーツ番号, 開始タイミング, 終了タイミング, 対応キー, 始点(段), 始点(列), 終点(段), 終点(列), 始点HS, 終点HS
                                        longNotes[longNotes.length - 1]["startRaw"] = note[1];
                                        longNotes[longNotes.length - 1]["startColumn"] = note[2];
                                        longNotes[longNotes.length - 1]["endRaw"] = note[3];
                                        longNotes[longNotes.length - 1]["endColumn"] = note[4];
                                        longNotes[longNotes.length - 1]["startHs"] = hs;
                                    }
                                }else if (note[0] == 2){//ロング終点
                                    let index = longNotes.findIndex((longNote) => {//longNote.slice(5, 9) == note.slice(1, 5)
                                        if(longNotes[longNote["longNoteId"]]["end"] != -1){
                                            return false;
                                        }
                                        if (longNote["startRaw"] != note[1]) return false;
                                        if (longNote["startColumn"] != note[2]) return false;
                                        if (longNote["endRaw"] != note[3]) return false;
                                        if (longNote["endColumn"] != note[4]) return false;
                                        return true;
                                    });
                                    longNotes[index]["end"] = ms;
                                    longNotes[index]["endHs"] = hs;
                                    longNotesStatus.push(0);
                                }
                            }
                            if (note.constructor == Object){
                                if(note["hs"] != undefined){hs = note["hs"]}
                                if(note["scroll"] != undefined){
                                    for(;scrolls.length < Math.round(ms * frameRate / 1000) + frameOffset;){
                                        scrolls.push(scroll);
                                    }
                                    scroll = note["scroll"];
                                }
                            }
                        });
                        ms += ((4 * measure[0] / measure[1]) * (60000 / bpm)) / notObjectThingsCountOfShosetsu;
                    }
                    if(beat.constructor == Object){
                        if(beat["bpm"] != undefined){
                            for(;bpms.length < Math.round(ms * frameRate / 1000) + frameOffset;){
                                bpms.push(bpm);
                            }
                            bpm = beat["bpm"];
                        }
                    }
                });
            }
            if(shosetsu.constructor == Object){
                if(shosetsu["measure"] != undefined){measure = shosetsu["measure"]}
            }
        });
        for(;scrolls.length < Math.round(ms * frameRate / 1000) + 10;){
            scrolls.push(scroll);
        }
        for(;bpms.length < Math.round(ms * frameRate / 1000) + 10;){
            bpms.push(bpm);
        }

        //縦連判定
        for (let number = 0; number < notes.length; number++){
            for (let i = -1; number + i >= 0; i--){//early側
                if (notes[number]["keys"].filter(x => notes[number + i]["keys"].includes(x)).length != 0){//場所被り(同時押しは被らない想定)
                    if (notes[number]["timing"] - notes[number + i]["timing"] < judgmentWidth[judgmentWidth.length - 1] * 2){//被りあり
                        notes[number]["judgeStart"] = Math.min((notes[number]["timing"] + notes[number + i]["timing"]) / 2, notes[number]["timing"] - judgmentWidth[0]);
                        break;
                    }else{//被りなし
                        break;
                    }
                }
            }
            for (let i = 1; number + i < notes.length; i++){//late側
                if (notes[number]["keys"].filter(x => notes[number + i]["keys"].includes(x)).length != 0){//場所被り(同時押しは被らない想定)
                    if (notes[number + i]["timing"] - notes[number]["timing"] < judgmentWidth[judgmentWidth.length - 1] * 2){//被りあり
                        notes[number]["judgeEnd"] = Math.max((notes[number]["timing"] + notes[number + i]["timing"]) / 2, notes[number]["timing"] + judgmentWidth[0]);
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
            for (let i = 0; i <= frameOffset + Math.ceil(notes[notes.length - 1]["timing"] * frameRate / 1000) + judgmentWidth[judgmentWidth.length - 1] * 60 / 1000 + 100; i++){
                frames.push([]);
            }
        }else{
            for (let i = 0; i <= frameOffset + Math.ceil(Math.max(notes[notes.length - 1]["timing"], longNotes[longNotes.length - 1]["end"]) * frameRate / 1000) + judgmentWidth[judgmentWidth.length - 1] * 60 / 1000 + 100; i++){
                frames.push([]);
            }
        }
        let offset;
        let mainColor;
        let subColor;
        for (let i = 0; i < longNotes.length; i++){//ロング
            switch (notes[longNotes[i]["noteNumber"]]["color"]){
                case 0:
                    offset = keyOffsetLeft[0];
                    mainColor = "#ff0000";
                    subColor = "#990000";
                    break;
                case 1:
                    offset = keyOffsetLeft[1];
                    mainColor = "#00ff00";
                    subColor = "#009900";
                    break;
                case 2:
                    offset = keyOffsetLeft[2];
                    mainColor = "#0000ff";
                    subColor = "#000099";
                    break;
                case 3:
                    offset = (keyOffsetLeft[0] + keyOffsetLeft[1]) / 2;
                    mainColor = "#ffff00";
                    subColor = "#999900";
                    break;
                case 4:
                    offset = (keyOffsetLeft[1] + keyOffsetLeft[2]) / 2;
                    mainColor = "#00ffff";
                    subColor = "#009999";
                    break;
                case 5:
                    offset = (keyOffsetLeft[2] + keyOffsetLeft[0]) / 2;
                    mainColor = "#ff00ff";
                    subColor = "#990099";
                    break;
                case 6:
                    offset = (keyOffsetLeft[0] + keyOffsetLeft[1] + keyOffsetLeft[2]) / 3;
                    mainColor = "#ffffff";
                    subColor = "#999999";
                    break;
            }
            let startY = lineY - setSpeed * longNotes[i]["startHs"] * ((longNotes[i]["start"] * frameRate / 1000 + frameOffset) - Math.round(longNotes[i]["start"] * frameRate / 1000 + frameOffset));
            let endY = lineY - setSpeed * longNotes[i]["endHs"] * ((longNotes[i]["end"] * frameRate / 1000 + frameOffset) - Math.round(longNotes[i]["end"] * frameRate / 1000 + frameOffset));
            for (let frame = Math.round(longNotes[i]["end"] * frameRate / 1000 + frameOffset); frame >= 0; frame--){
                if (!((startY < 0 && endY < 0) || (canvas.height < startY && canvas.height < endY))){
                    frames[frame].push([longNotes[i]["noteNumber"], 1, offset + longNotes[i]["startColumn"] * (keyMargin + keyPadding), endY, (longNotes[i]["endColumn"] - longNotes[i]["startColumn"]) * (keyMargin + keyPadding) + keyPadding, startY - endY, mainColor, 10, subColor]);

                }
                if (frame <= Math.round(longNotes[i]["start"] * frameRate / 1000 + frameOffset)){
                    startY -= setSpeed * longNotes[i]["startHs"] * scrolls[frame];
                }
                endY -= setSpeed * longNotes[i]["endHs"] * scrolls[frame];

            }
        }
        for (let i = 0; i < notes.length; i++){//タップ
            if (notes[i]["type"] == 0){
                switch (notes[i]["color"]){
                    case 0:
                        offset = keyOffsetLeft[0];
                        mainColor = "#ff0000";
                        break;
                    case 1:
                        offset = keyOffsetLeft[1];
                        mainColor = "#00ff00";
                        break;
                    case 2:
                        offset = keyOffsetLeft[2];
                        mainColor = "#0000ff";
                        break;
                    case 3:
                        offset = (keyOffsetLeft[0] + keyOffsetLeft[1]) / 2;
                        mainColor = "#ffff00";
                        break;
                    case 4:
                        offset = (keyOffsetLeft[1] + keyOffsetLeft[2]) / 2;
                        mainColor = "#00ffff";
                        break;
                    case 5:
                        offset = (keyOffsetLeft[2] + keyOffsetLeft[0]) / 2;
                        mainColor = "#ff00ff";
                        break;
                    case 6:
                        offset = (keyOffsetLeft[0] + keyOffsetLeft[1] + keyOffsetLeft[2]) / 3;
                        mainColor = "#ffffff";
                        break;
                }
                let y = lineY - setSpeed * notes[i]["hs"] * scrolls[Math.round(notes[i]["timing"] * frameRate / 1000 + frameOffset)] * ((notes[i]["timing"] * frameRate / 1000 + frameOffset) - Math.round(notes[i]["timing"] * frameRate / 1000 + frameOffset));
                let relativeY = 0;
                let nowJ = -1;
                let lastBorderFrame = Math.round(notes[i]["timing"] * frameRate / 1000 + frameOffset);//ノーツの動きが変わる境目
                let nextBorderFrame = Math.round(notes[i]["timing"] * frameRate / 1000 + frameOffset);
                for (let frame = Math.round(notes[i]["timing"] * frameRate / 1000 + frameOffset); frame >= 0; frame--){
                    if (y < 0){
                        continue;
                    }
                    frames[frame].push([i, 0, offset + notes[i]["startColumn"] * (keyMargin + keyPadding), y + relativeY, offset + notes[i]["endColumn"] * (keyMargin + keyPadding) + keyPadding, y + relativeY, mainColor, 20]);
                    if (notes[i]["gimmicks"] == undefined){//ギミック指定なし
                        y -= setSpeed * notes[i]["hs"] * scrolls[frame];
                    }else{//ギミック指定あり
                        let acceleration = 1;
                        let cumulativeTime = 0;
                        for (let j = notes[i]["gimmicks"].length - 1; j >= 0; j--){
                            if (nowJ == -1){
                                nowJ = j;
                            }
                            if (notes[i]["gimmicks"][j]["time"] == undefined){
                                lastBorderFrame = frame - 1//強制的に次のif文に引っかからせる
                            }else{
                                lastBorderFrame = Math.round(notes[i]["timing"] * frameRate / 1000 + frameOffset);
                                cumulativeTime += notes[i]["gimmicks"][j]["time"][0] / notes[i]["gimmicks"][j]["time"][1];
                                for (let borderTime = 0; borderTime < cumulativeTime; borderTime += (1 / frameRate) / (240 / bpms[lastBorderFrame])){
                                    lastBorderFrame--;
                                }
                            }
                            if (frame >= lastBorderFrame){
                                if (j != nowJ){
                                    y += relativeY;
                                    relativeY = 0;
                                    nowJ--;
                                }
                                if (notes[i]["gimmicks"][j]["acceleration"] == undefined){
                                    acceleration = 0;
                                }else{
                                    acceleration = notes[i]["gimmicks"][j]["acceleration"];
                                }
                                //relativeY -= notes[i]["gimmicks"][j]["speed"];//元の
                                relativeY = notes[i]["gimmicks"][j]["speed"] * (frame - lastBorderFrame) * (acceleration * (frame - lastBorderFrame) / (nextBorderFrame - lastBorderFrame) + 1 - acceleration) - notes[i]["gimmicks"][j]["speed"] * (nextBorderFrame - lastBorderFrame);
                                break;
                            }
                            nextBorderFrame = lastBorderFrame;
                        }
                    }
                }
            }
        }


        //ロングノーツ調整
        longNotes.forEach((note) => {
            note["start"] = note["start"] + judgmentWidth[judgmentWidth.length - 1];
            note["end"] = note["end"] - judgmentWidth[judgmentWidth.length - 1];
        });
    }


    let startTime = 0;
    let count = 0;
    let chart;
    let gimmick;
    function game(){
        startTime = performance.now();
        let main = setInterval(() => {
            if (performance.now() - startTime - (1000 / frameRate) * count >= 1000 / frameRate){
                drawGame();
                if (count >= frameOffset + offset * frameRate / 1000 && playing == false){
                    music.play();
                    playing = true;
                }
                longNotes.forEach((note) => {
                    if (note["end"] < performance.now() - startTime - frameOffset * 1000 / frameRate + judgmentDelay){//ロングノーツ終了
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
                    }else if(note["start"] <= performance.now() - startTime - frameOffset * 1000 / frameRate + judgmentDelay){//ロングノーツ中
                        if (longNotesStatus[longNotes.indexOf(note)] == "p" || longNotesStatus[longNotes.indexOf(note)] == "g"){
                            if (note["keys"].find((key) => keyPressed[key] == true) == undefined){//Miss
                                //console.log("Miss");
                                combo = 0;
                                longNotesStatus[longNotes.indexOf(note)] = 2;
                            }
                        }
                    }
                });
                notes.forEach((note) => {
                    if (note["judgeEnd"] < performance.now() - startTime - frameOffset * 1000 / frameRate + judgmentDelay && !disappeared[notes.indexOf(note)]){//Miss
                        //console.log("Miss");
                        result[3]++;
                        combo = 0;
                        disappeared[notes.indexOf(note)] = true;
                        if (note["type"] == 1){
                            longNotesStatus[note["longNoteId"]] = 2;
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

    let scroll = 0;
    const listInterval = 70;
    let sixRandoms = []
    for (let i = 0; i < 6; i++){
        sixRandoms.push(Math.random() * 2 - 1);
    }
    const listFontSize = [30, 36];
    let levelColor = "#00ffff";
    let levelX = canvas.width * 13 / 24;
    function drawList(){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 4;
        //今選んでる曲の背景
        ctx.globalCompositeOperation = "lighter";
        ctx.beginPath();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(canvas.width / 4 - canvas.width / 6 - 20, canvas.height / 2 - 30, canvas.width / 3 + 40, 60);
        ctx.beginPath();
        ctx.fillStyle = "#ff0000";
        ctx.strokeStyle = "#ff0000";
        ctx.strokeRect(canvas.width / 4 - canvas.width / 6 + sixRandoms[0], -10, canvas.width / 3, canvas.height + 20);
        ctx.beginPath();
        ctx.fillStyle = "#00ff00";
        ctx.strokeStyle = "#00ff00";
        ctx.strokeRect(canvas.width / 4 - canvas.width / 6 + sixRandoms[2], -10, canvas.width / 3, canvas.height + 20);
        ctx.beginPath();
        ctx.fillStyle = "#0000ff";
        ctx.strokeStyle = "#0000ff";
        ctx.strokeRect(canvas.width / 4 - canvas.width / 6 + sixRandoms[4], -10, canvas.width / 3, canvas.height + 20);
        //リスト 前のレイヤー
        ctx.globalCompositeOperation = "source-atop";
        ctx.beginPath();
        ctx.font = `${listFontSize[1]}px monospace`;
        ctx.fillStyle = "#000000";
        ctx.textAlign = "center";
        ctx.fillText(musicList[((musicListIndex - 1) % musicList.length + musicList.length) % musicList.length]["title"], canvas.width / 4, canvas.height / 2 + listFontSize[1] / 3 + listFontSize[1] * (scroll - listInterval) / listFontSize[0], canvas.width / 3);
        ctx.fillText(musicList[musicListIndex]["title"], canvas.width / 4, canvas.height / 2 + listFontSize[1] / 3 + listFontSize[1] * scroll / listFontSize[0], canvas.width / 3);
        ctx.fillText(musicList[(musicListIndex + 1) % musicList.length]["title"], canvas.width / 4, canvas.height / 2 + listFontSize[1] / 3 + listFontSize[1] * (scroll + listInterval) / listFontSize[0], canvas.width / 3);
        //リスト 後ろのレイヤー
        ctx.globalCompositeOperation = "destination-over";
        for (let i = -1; canvas.height / 2 + listInterval * i + 11 + scroll > 0; i--){
            ctx.beginPath();
            ctx.font = `${listFontSize[0]}px monospace`;
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.fillText(musicList[((musicListIndex + i) % musicList.length + musicList.length) % musicList.length]["title"], canvas.width / 4, canvas.height / 2 + listInterval * i + listFontSize[0] / 3 + scroll, canvas.width / 3);
        }
        for (let i = 0; canvas.height / 2 + listInterval * i + 11 + scroll < canvas.height; i++){
            ctx.beginPath();
            ctx.font = `${listFontSize[0]}px monospace`;
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.fillText(musicList[(musicListIndex + i) % musicList.length]["title"], canvas.width / 4, canvas.height / 2 + listInterval * i + listFontSize[0] / 3 + scroll, canvas.width / 3);
        }
        //リスト背景
        ctx.beginPath();
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 4;
        ctx.rect(canvas.width / 4 - canvas.width / 6, -10, canvas.width / 3, canvas.height + 10);
        ctx.fill();


        //難易度選択
        ctx.globalCompositeOperation = "source-over";
        ctx.beginPath();
        ctx.lineWidth = 15;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.strokeRect(canvas.width * 13 / 24 - 120, canvas.height * 5 / 6 - 100, 240, 160);
        ctx.strokeRect(canvas.width * 17 / 24 - 120, canvas.height * 5 / 6 - 100, 240, 160);
        ctx.strokeRect(canvas.width * 21 / 24 - 120, canvas.height * 5 / 6 - 100, 240, 160);
        ctx.font = "100px monospace";
        if (musicList[musicListIndex]["level"]["easy"] == undefined){
            ctx.fillStyle = "#666666";
            ctx.fillText("-", canvas.width * 13 / 24, canvas.height * 5 / 6);
        }else{
            ctx.fillStyle = "#ffffff";
            ctx.fillText(String(musicList[musicListIndex]["level"]["easy"]), canvas.width * 13 / 24, canvas.height * 5 / 6, 220);
        }
        ctx.fillStyle = "#ffffff";
        ctx.font = "40px monospace";
        ctx.fillText("Easy", canvas.width * 13 / 24, canvas.height * 5 / 6 + 40);
        ctx.font = "100px monospace";
        if (musicList[musicListIndex]["level"]["normal"] == undefined){
            ctx.fillStyle = "#666666";
            ctx.fillText("-", canvas.width * 17 / 24, canvas.height * 5 / 6);
        }else{
            ctx.fillStyle = "#ffffff";
            ctx.fillText(String(musicList[musicListIndex]["level"]["normal"]), canvas.width * 17 / 24, canvas.height * 5 / 6, 220);
        }
        ctx.fillStyle = "#ffffff";
        ctx.font = "40px monospace";
        ctx.fillText("Normal", canvas.width * 17 / 24, canvas.height * 5 / 6 + 40);
        ctx.font = "100px monospace";
        if (musicList[musicListIndex]["level"]["hard"] == undefined){
            ctx.fillStyle = "#666666";
            ctx.fillText("-", canvas.width * 21 / 24, canvas.height * 5 / 6);
        }else{
            ctx.fillStyle = "#ffffff";
            ctx.fillText(String(musicList[musicListIndex]["level"]["hard"]), canvas.width * 21 / 24, canvas.height * 5 / 6, 220);
        }
        ctx.fillStyle = "#ffffff";
        ctx.font = "40px monospace";
        ctx.fillText("Hard", canvas.width * 21 / 24, canvas.height * 5 / 6 + 40);

        ctx.strokeStyle = levelColor;
        ctx.strokeRect(levelX - 120, canvas.height * 5 / 6 - 100, 240, 160);
        if(musicList[musicListIndex]["level"][level] != undefined){
            ctx.fillStyle = levelColor;
            ctx.font = "50px monospace";
            ctx.fillText("Press Enter to start", canvas.width * 17 / 24, canvas.height * 5 / 6 + 140);
        }

        //画像
        ctx.drawImage(images[musicListIndex], canvas.width * 14 / 24, canvas.height / 4 - canvas.width / 16, canvas.width / 4, canvas.width / 4);

        //曲&譜面
        ctx.fillStyle = "#ffffff";
        ctx.font = "50px monospace";
        ctx.textAlign = "left";
        ctx.fillText(`音楽:${musicList[musicListIndex]["music"]}`, canvas.width / 2, canvas.height * 5 / 6 - 190);
        if(musicList[musicListIndex]["chart"][level] != undefined){
            ctx.fillText(`譜面:${musicList[musicListIndex]["chart"][level]}`, canvas.width / 2, canvas.height * 5 / 6 - 130);
        }
    }
    function drawGame(){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 4;

        //スコア
        ctx.beginPath();
        ctx.font = "48px monospace";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "right";
        ctx.fillText("Score:" + ("0000000" + String(Math.floor(score))).slice(-7), canvas.width, 50);

        //コンボ
        if (combo >= 2){
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
                if (longNotesStatus[notes[note[0]]["longNoteId"]] == 2){
                    ctx.fillStyle = "#222222";
                }
                //if (longNotesStatus[notes[note[0]]["longNoteid"]] != 1){
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
        let paddingX = (nowNote["endColumn"] - nowNote["startColumn"]) * (keyMargin + keyPadding) + keyPadding;
        if (nowNote["color"] == 0){
            startX = keyOffsetLeft[0] + nowNote["startColumn"] * (keyMargin + keyPadding);
        }
        if (nowNote["color"] == 1){
            startX = keyOffsetLeft[1] + nowNote["startColumn"] * (keyMargin + keyPadding);
        }
        if (nowNote["color"] == 2){
            startX = keyOffsetLeft[2] + nowNote["startColumn"] * (keyMargin + keyPadding);
        }
        if (nowNote["color"] == 3){
            startX = (keyOffsetLeft[0] + keyOffsetLeft[1]) / 2 + nowNote["startColumn"] * (keyMargin + keyPadding);
        }
        if (nowNote["color"] == 4){
            startX = (keyOffsetLeft[1] + keyOffsetLeft[2]) / 2 + nowNote["startColumn"] * (keyMargin + keyPadding);
        }
        if (nowNote["color"] == 5){
            startX = (keyOffsetLeft[2] + keyOffsetLeft[0]) / 2 + nowNote["startColumn"] * (keyMargin + keyPadding);
        }
        if (nowNote["color"] == 6){
            startX = (keyOffsetLeft[0] + keyOffsetLeft[1] + keyOffsetLeft[2]) / 3 + nowNote["startColumn"] * (keyMargin + keyPadding);
        }
        for (let i = 0; i < 20 && count + i < frames.length; i++){
            frames[count + i].push([null, 2, startX - 5 * i, lineY - 5 * i, paddingX + 10 * i, 10 * i, `rgba(${r}, ${g}, ${b}, ${(20 - i) / 20})`, 5 - i / 4]);
        }
    }
    let scrollAnimation;
    let moving = false;
    document.addEventListener("keydown", function(e){
        if (situation == 1 && !moving){
            if (e.code == "ArrowUp"){//上矢印
                moving = true;
                demoStop();
                scroll = -listInterval;
                sixRandoms = [];
                for (let i = 0; i < 6; i++){
                    sixRandoms.push(Math.random() * 2 - 1);
                }
                if (musicListIndex == 0){
                    musicListIndex = musicList.length - 1;
                }else{
                    musicListIndex--;
                }
                scrollAnimation = setInterval(() => {
                    if (scroll >= 0){
                        clearInterval(scrollAnimation);
                        scroll = 0;
                        drawList();
                        moving = false;
                        demoStart();
                    }else{
                        scroll += 10;
                        drawList();
                    }
                }, 10);
            }
            if (e.code == "ArrowDown"){//下矢印
                moving = true;
                demoStop();
                scroll = listInterval;
                sixRandoms = [];
                for (let i = 0; i < 6; i++){
                    sixRandoms.push(Math.random() * 2 - 1);
                }
                if (musicListIndex == musicList.length - 1){
                    musicListIndex = 0;
                }else{
                    musicListIndex++;
                }
                scrollAnimation = setInterval(() => {
                    if (scroll <= 0){
                        clearInterval(scrollAnimation);
                        scroll = 0;
                        drawList();
                        moving = false;
                        demoStart();
                    }else{
                        scroll -= 10;
                        drawList();
                    }
                }, 10);
            }
            if (e.code == "ArrowLeft" && level != "easy"){//左矢印
                moving = true;
                let x = 1;
                if (level == "normal"){
                    level = "easy";
                    scrollAnimation = setInterval(() => {
                        levelX = canvas.width * 13 / 24 + x ** 2 * (canvas.width * 17 / 24 - canvas.width * 13 / 24);
                        levelColor = `rgb(${255 * x ** 2}, 255, ${255 * (1 - x) ** 2})`;
                        x -= 0.05;
                        if (x <= -0.05){
                            clearInterval(scrollAnimation);
                            moving = false;
                        }
                        drawList();
                    }, 10);
                }else{
                    level = "normal";
                    scrollAnimation = setInterval(() => {
                        levelX = canvas.width * 17 / 24 + x ** 2 * (canvas.width * 21 / 24 - canvas.width * 17 / 24);
                        levelColor = `rgb(255 ,${255 * (1 - x) ** 2} , ${255 * x ** 2})`;
                        x -= 0.05;
                        if (x <= -0.05){
                            clearInterval(scrollAnimation);
                            moving = false;
                        }
                        drawList();
                    }, 10);
                }
            }
            if (e.code == "ArrowRight" && level != "hard"){//右矢印
                moving = true;
                let x = 1;
                if (level == "easy"){
                    level = "normal";
                    scrollAnimation = setInterval(() => {
                        levelX = canvas.width * 17 / 24 - x ** 2 * (canvas.width * 17 / 24 - canvas.width * 13 / 24);
                        levelColor = `rgb(${255 * (1 - x) ** 2}, 255, ${255 * x ** 2})`;
                        x -= 0.05;
                        if (x <= -0.05){
                            clearInterval(scrollAnimation);
                            moving = false;
                        }
                        drawList();
                    }, 10);
                }else{
                    level = "hard";
                    scrollAnimation = setInterval(() => {
                        levelX = canvas.width * 21 / 24 - x ** 2 * (canvas.width * 21 / 24 - canvas.width * 17 / 24);
                        levelColor = `rgb(255 ,${255 * x ** 2} , ${255 * (1 - x) ** 2})`;
                        x -= 0.05;
                        if (x <= -0.05){
                            clearInterval(scrollAnimation);
                            moving = false;
                        }
                        drawList();
                    }, 10);
                }
            }
            if (e.code == "Enter"){
                if (musicList[musicListIndex]["level"][level] != undefined){
                    situation = 2;
                    demoStop();
                    new Promise((resolve) => {
                        $.getJSON(`${root}charts/${musicList[musicListIndex]["chartfile"]}`, function(data){
                            chart = data;
                            if (musicList[musicListIndex]["gimmickfile"] != undefined){
                                $.getJSON(`${root}gimmicks/${musicList[musicListIndex]["gimmickfile"]}`, function(data){
                                    gimmick = data;
                                    resolve();
                                });
                            }else{
                                resolve();
                            }
                        });
                    }).then(() => {
                        load(chart);
                    }).then(() => {
                        game();
                    });
                }
            }
        }
        if (situation == 2){
            if (!keyPressed[e.keyCode]){
                let pressTime = performance.now() - startTime - frameOffset * 1000 / frameRate + judgmentDelay;
                let noteNowIndex = notes.findIndex((note) => note["keys"].includes(e.keyCode) && note["judgeStart"] <= pressTime && pressTime <= note["judgeEnd"] && !disappeared[notes.indexOf(note)]);
                if (noteNowIndex != -1){
                    if (notes[noteNowIndex]["type"] == 0){//タップ
                        console.log(notes[noteNowIndex]["timing"] - pressTime);
                        if (Math.abs(notes[noteNowIndex]["timing"] - pressTime) <= judgmentWidth[0]){//Perfect
                            disappeared[noteNowIndex] = true;
                            console.log("Perfect");
                            result[0]++;
                            combo++;
                            hitEffect(notes[noteNowIndex], 255, 255, 255);
                        }else if (Math.abs(notes[noteNowIndex]["timing"] - pressTime) <= judgmentWidth[1]){//Good
                            disappeared[noteNowIndex] = true;
                            console.log("Good");
                            result[1]++;
                            combo++;
                            if (pressTime < notes[noteNowIndex]["timing"]){//fast
                                hitEffect(notes[noteNowIndex], 0, 0, 255);
                            }else{//late
                                hitEffect(notes[noteNowIndex], 255, 0, 0);
                            }
                        }else if (Math.abs(notes[noteNowIndex]["timing"] - pressTime) <= judgmentWidth[2]){//Bad
                            disappeared[noteNowIndex] = true;
                            console.log("Bad");
                            result[2]++;
                            combo = 0;
                        }
                        score = (1000000 * result[0] + 500000 * result[1]) / notes.length;
                    }else if (notes[noteNowIndex]["type"] == 1){//ロング始点
                        if (Math.abs(notes[noteNowIndex]["timing"] - pressTime) <= judgmentWidth[0]){//Perfect
                            disappeared[noteNowIndex] = true;
                            longNotesStatus[notes[noteNowIndex]["longNoteId"]] = "p";
                            hitEffect(notes[noteNowIndex], 255, 255, 255);
                        }else if (Math.abs(notes[noteNowIndex]["timing"] - pressTime) <= judgmentWidth[1]){//Good
                            disappeared[noteNowIndex] = true;
                            longNotesStatus[notes[noteNowIndex]["longNoteId"]] = "g";
                            if (pressTime < notes[noteNowIndex]["timing"]){//fast
                                hitEffect(notes[noteNowIndex], 0, 0, 255);
                            }else{//late
                                hitEffect(notes[noteNowIndex], 255, 0, 0);
                            }
                        }
                    }
                }
            }
            keyPressed[e.keyCode] = true;
        }
    });

    document.addEventListener("keyup", function(e){
        keyPressed[e.keyCode] = false;
    });

    let images = [];
    for(let i = 0; i < musicList.length; i++){
        images.push(new Image());
        images[i].src = `${root}images/${musicList[i]["imagefile"]}`;
    }
    images[musicList.length - 1].onload = () => {
        demoStart();
        drawList();
        
    }

    let demoVolume;
    function demoStart(){
        music = new Audio(`${root}musics/${musicList[musicListIndex]["musicfile"]}#t=${musicList[musicListIndex]["demo"][0]},${musicList[musicListIndex]["demo"][1]}`);
        music.play();
        music.loop = true;
        demoVolume = setInterval(() => {
            music.volume = Math.max(0, Math.min(1, musicList[musicListIndex]["demo"][1] - music.currentTime));
            if(music.currentTime >= musicList[musicListIndex]["demo"][1]){
                music.currentTime = musicList[musicListIndex]["demo"][0];
            }
        }, 10);
    }
    function demoStop(){
        clearInterval(demoVolume);
        music.pause();
        music.currentTime = 0;
    }
});
