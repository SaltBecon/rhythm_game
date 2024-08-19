//const root = "/"//ローカル
const root = "https://saltbecon.github.io/rhythm_game/"//GitHub
$.getJSON(root + "musics.json", function(musicList){
    //選曲用
    let musicListIndex = 0;
    let level = "easy";
    let situation = 1;//1:選曲画面, 2:ゲーム中, 3:リザルト画面
    //譜面用
    let disappeared = [];
    let keyStatus = [0, 0, 0, 0, 0, 0, 0, 0, 0];//読み込み中:(0:ロングノーツなし/1:あり) 再生中:({end: 0, judgement: perfect/good(意味なし)}:なし/{end: 終点のindex, judgement: perfect/good}:あり)
    let longNotesStatus = [];//0:まだ p:始点がperfect g:good 1:死(完走) 2:死(miss)
    let notes = [];
    let longNotes = [];
    let barlines = [];
    let frames = [];//フレームごとに描画する座標とか置いとく場所
    const judgmentWidth = [60, 120, 150];
    let keyPressed = [false, false, false, false, false, false, false, false, false];
    const keyCodes = ["Numpad1", "Numpad2", "Numpad3", "Numpad4", "Numpad5", "Numpad6", "Numpad7", "Numpad8", "Numpad9"];
    let combo = 0;
    let score = 0;
    let result = [0, 0, 0, 0];//[Perfect数, Good数, Bad数, Miss数]
    const frameOffset = 60;//最初の拍までのフレーム数
    const judgmentDelay = -50;//押したタイミングに足すやつ(ms)見た目と判定のずれ
    const offset = 0;//譜面と曲のずれ(ms) +:譜面が早い


    //描画用
    const canvas = document.getElementById("mainCanvas");
    const ctx = canvas.getContext("2d");
    const frameRate = 60;
    const square = {x:0, y:0, z:20, size:7}//中心のx座標, y座標, 一辺の長さ
    const limitAngle = {xMin: -0.5, xMax: 0.5, yMin: -0.298136083, yMax: 0.298136083};//arctan(tan(0.5) * (9/16))
    const slope = 0//譜面の傾き
    const noteStartZ = 1000;//ノーツの表示が始まる場所
    let speed = 7;

    let bpm = 120;
    let measure = [4, 4];
    let music;
    let playing = false;
    let ms = 0;
    let notesCount = 0;

    function load(chart){
        bpm = chart["data"]["bpm"];
        measure = chart["data"]["measure"];
        ms = 0;
        let simultaneousNotesCount;//同時押しノーツ数
        //ノーツデータ作成
        chart[level].forEach((shosetsu) => {//小節ごと
            if (shosetsu.constructor == Array){
                barlines.push(Math.round(ms * frameRate / 1000 + frameOffset));//timingFrame
                let notObjectThingsCountOfShosetsu = shosetsu.filter((x) => x.constructor != Object).length;
                shosetsu.forEach((beat) => {//拍ごと
                    if (beat != 0){
                        let sBeat = String(beat);
                        simultaneousNotesCount = 0;
                        for (let i = 0; i < sBeat.length; i++){
                            if("123456789".includes(sBeat[i])){
                                simultaneousNotesCount++;
                            }else if(keyStatus["zxcasdqwe".indexOf(sBeat[i])] == 0){
                                    simultaneousNotesCount++;
                            }
                        }
                        for (let i = 0; i < sBeat.length; i++){
                            notesCount++;
                            notes.push({timing: ms, timingFrame: Math.round(ms * frameRate / 1000 + frameOffset), noteStatus: 0});//noteStatus 0:存在 1:消滅 ロングノーツ始点0終点0:まだ 始1終0:継続中 始1終1:終
                            if(simultaneousNotesCount >= 2){
                                notes[notes.length - 1]["simultaneous"] = true;
                            }else{
                                notes[notes.length - 1]["simultaneous"] = false;
                            }
                            if("123456789".includes(sBeat[i])){
                                notes[notes.length - 1]["type"] = 0;//通常
                                notes[notes.length - 1]["key"] = Number(sBeat[i]) - 1;
                            }else{
                                notes[notes.length - 1]["key"] = "zxcasdqwe".indexOf(sBeat[i]);
                                if(keyStatus[notes[notes.length - 1]["key"]] == 0){
                                    notes[notes.length - 1]["type"] = 1;//ロング始点
                                    keyStatus[notes[notes.length - 1]["key"]] = 1;
                                }else{
                                    notesCount--;
                                    notes[notes.length - 1]["type"] = 2;//ロング終点
                                    notes[notes.length - 1]["missed"] = false;
                                    keyStatus[notes[notes.length - 1]["key"]] = 0;
                                }
                            }
                        }
                    }
                    ms += ((4 * measure[0] / measure[1]) * (60000 / bpm)) / notObjectThingsCountOfShosetsu;
                });
            }
            if(shosetsu.constructor == Object){
                if(shosetsu["measure"] != undefined){measure = shosetsu["measure"]}
            }
        });

        keyStatus = [
            {end: 0, judgement: 0}, {end: 0, judgement: 0}, {end: 0, judgement: 0},
            {end: 0, judgement: 0}, {end: 0, judgement: 0}, {end: 0, judgement: 0},
            {end: 0, judgement: 0}, {end: 0, judgement: 0}, {end: 0, judgement: 0}
        ];

        //描画用データ作成
        if (longNotes.length == 0){
            for (let i = 0; i <= frameOffset + Math.ceil(notes[notes.length - 1]["timing"] * frameRate / 1000) + judgmentWidth[judgmentWidth.length - 1] * 60 / 1000 + 120; i++){
                frames.push([]);
            }
        }else{
            for (let i = 0; i <= frameOffset + Math.ceil(Math.max(notes[notes.length - 1]["timing"], longNotes[longNotes.length - 1]["end"]) * frameRate / 1000) + judgmentWidth[judgmentWidth.length - 1] * 60 / 1000 + 120; i++){
                frames.push([]);
            }
        }
        barlines.forEach((barline) => {
            let xMin = square["x"] - square["size"] / 2;
            let xMax = square["x"] + square["size"] / 2;
            let yMin = square["y"] - square["size"] / 2;
            let yMax = square["y"] + square["size"] / 2;
            let z = square["z"];
            let strokeColor = "rgba(255, 255, 255, 0.5)";
            let fillColor = "rgba(0, 0, 0, 0)";
            for (let frame = barline; frame >= 0; frame--){
                if(z >= noteStartZ){continue}
                frames[frame].push({coordinates: [ct([xMin, yMin, z]), ct([xMax, yMin, z]), ct([xMax, yMax, z]), ct([xMin, yMax, z])], strokeColor: strokeColor, fillColor: fillColor, lineWidth: 10 * square["z"] / z});
                z += speed;
            }
        });
        /*[0, 2, 1, 3, 5, 4, 6, 8, 7]*/[0, 2, 6, 8, 1, 3, 5, 7, 4].forEach((key) => {//描画順 奥から手前 周りから中
            for (let i = 0; i < notes.length; i++){//タップ
                if (notes[i]["type"] == 0 && notes[i]["key"] == key){
                    let xMin = square["x"] - square["size"] / 2 + key % 3 * square["size"] / 3;
                    let xMax = xMin + square["size"] / 3;
                    let yMin = square["y"] + square["size"] / 2 - (Math.floor(key / 3) + 1) * square["size"] / 3;
                    let yMax = yMin + square["size"] / 3;
                    let z = square["z"];

                    //ノーツを小さめにするテスト
                    xMin+=0.5;
                    yMin+=0.5;
                    xMax-=0.5;
                    yMax-=0.5;

                    let strokeColor;
                    let fillColor;
                    //if (key % 2 == 0){
                    if (!notes[i]["simultaneous"]){
                        strokeColor = "rgb(0, 191, 225)";
                        fillColor = "rgba(63, 127, 225, 0.2)";
                    }else{
                        strokeColor = "rgb(255, 191, 0)";
                        fillColor = "rgba(255, 127, 63, 0.2)";
                    }
                    for (let frame = notes[i]["timingFrame"]; frame >= 0; frame--){
                        if(z >= noteStartZ){continue}
                        frames[frame].push({coordinates: [ct([xMin, yMin, z]), ct([xMax, yMin, z]), ct([xMax, yMax, z]), ct([xMin, yMax, z])], strokeColor: strokeColor, fillColor: fillColor, lineWidth: 10 * square["z"] / z});
                        z += speed;
                    }
                }
                if (notes[i]["type"] == 2 && notes[i]["key"] == key){
                    let startPoint = notes.slice(0, i).findLast((note) => note["type"] == 1 && note["key"] == key);

                    let xMin = square["x"] - square["size"] / 2 + key % 3 * square["size"] / 3;
                    let xMax = xMin + square["size"] / 3;
                    let yMin = square["y"] + square["size"] / 2 - (Math.floor(key / 3) + 1) * square["size"] / 3;
                    let yMax = yMin + square["size"] / 3;
                    let zMin = square["z"] - (notes[i]["timingFrame"] - startPoint["timingFrame"]) * speed;
                    let zMax = square["z"];

                    //ノーツを小さめにするテスト
                    xMin+=0.5;
                    yMin+=0.5;
                    xMax-=0.5;
                    yMax-=0.5;
                    
                    let strokeColor;
                    let fillColor;
                    //if (key % 2 == 0){
                    if (!startPoint["simultaneous"]){
                        strokeColor = "rgb(0, 191, 225)";
                        fillColor = "rgba(63, 127, 225, 0.2)";
                    }else{
                        strokeColor = "rgb(255, 191, 0)";
                        fillColor = "rgba(255, 127, 63, 0.2)";
                    }
                    let drawZMin;
                    let drawZMax;
                    for (let frame = notes[i]["timingFrame"]; frame >= 0; frame--){
                        if(zMin >= noteStartZ){continue}
                        drawZMin = Math.max(square["z"], zMin);
                        drawZMax = Math.min(noteStartZ, zMax);
                        //前, 奥, 上, 下, 左, 右
                        frames[frame].push({index: i, coordinates: [ct([xMin, yMin, drawZMin]), ct([xMax, yMin, drawZMin]), ct([xMax, yMax, drawZMin]), ct([xMin, yMax, drawZMin])], strokeColor: strokeColor, fillColor: fillColor, lineWidth: 10 * square["z"] / drawZMin});
                        frames[frame].push({index: i, coordinates: [ct([xMin, yMin, drawZMax]), ct([xMax, yMin, drawZMax]), ct([xMax, yMax, drawZMax]), ct([xMin, yMax, drawZMax])], strokeColor: strokeColor, fillColor: fillColor, lineWidth: 10 * square["z"] / drawZMax});
                        frames[frame].push({index: i, coordinates: [ct([xMin, yMin, drawZMin]), ct([xMin, yMin, drawZMax]), ct([xMax, yMin, drawZMax]), ct([xMax, yMin, drawZMin])], strokeColor: strokeColor, fillColor: fillColor, lineWidth: 2});
                        frames[frame].push({index: i, coordinates: [ct([xMin, yMax, drawZMin]), ct([xMin, yMax, drawZMax]), ct([xMax, yMax, drawZMax]), ct([xMax, yMax, drawZMin])], strokeColor: strokeColor, fillColor: fillColor, lineWidth: 2});
                        frames[frame].push({index: i, coordinates: [ct([xMin, yMin, drawZMin]), ct([xMin, yMin, drawZMax]), ct([xMin, yMax, drawZMax]), ct([xMin, yMax, drawZMin])], strokeColor: strokeColor, fillColor: fillColor, lineWidth: 2});
                        frames[frame].push({index: i, coordinates: [ct([xMax, yMin, drawZMin]), ct([xMax, yMin, drawZMax]), ct([xMax, yMax, drawZMax]), ct([xMax, yMax, drawZMin])], strokeColor: strokeColor, fillColor: fillColor, lineWidth: 2});
                        zMin += speed;
                        zMax += speed;
                    }
                }
            }
        });
        


        //ロングノーツ調整
        longNotes.forEach((note) => {
            note["start"] = note["start"] + judgmentWidth[judgmentWidth.length - 1];
            note["end"] = note["end"] - judgmentWidth[judgmentWidth.length - 1];
        });
    }

    function ct(xyz){//座標変換(coordinate transformation)
        let y = xyz[2] * Math.sin(slope) + xyz[1] * Math.cos(slope);
        let z = xyz[2] * Math.cos(slope) - xyz[1] * Math.sin(slope);

        let x = (Math.atan(xyz[0] / z) - limitAngle["xMin"]) * canvas.width / (limitAngle["xMax"] - limitAngle["xMin"]);
        y = (Math.atan(y / z) - limitAngle["yMin"]) * canvas.height / (limitAngle["yMax"] - limitAngle["yMin"]);
        return [x, y];
    }
    function ctX(xyz){
        let z = xyz[2] * Math.cos(slope) - xyz[1] * Math.sin(slope);
        return (Math.atan(xyz[0] / z) - limitAngle["xMin"]) * canvas.width / (limitAngle["xMax"] - limitAngle["xMin"]);
    }
    function ctY(yz){
        let y = yz[1] * Math.sin(slope) + yz[0] * Math.cos(slope);
        let z = yz[1] * Math.cos(slope) - yz[0] * Math.sin(slope);
        return (Math.atan(y / z) - limitAngle["yMin"]) * canvas.height / (limitAngle["yMax"] - limitAngle["yMin"]);
    }


    let startTime = 0;
    let count = 0;
    let chart;
    function game(){
        startTime = performance.now();
        let main = setInterval(() => {
            if (performance.now() - startTime - (1000 / frameRate) * count >= 1000 / frameRate){
                drawGame();
                if (count >= frameOffset + offset * frameRate / 1000 && playing == false){
                    music.play();
                    playing = true;
                }
                for (let key = 0; key < keyStatus.length; key++){
                    if(keyStatus[key]["end"] != 0){
                        if (notes[keyStatus[key]["end"]]["timing"] - judgmentWidth[1] < performance.now() - startTime - frameOffset * 1000 / frameRate + judgmentDelay){//ロングノーツ終了
                            if (keyStatus[key]["judgement"] == "perfect"){
                                result[0]++;
                            }
                            if (keyStatus[key]["judgement"] == "good"){
                                result[1]++;
                            }
                            score = (1000000 * result[0] + 500000 * result[1]) / notesCount;
                            combo++;
                            notes[keyStatus[key]["end"]]["noteStatus"] = 1;
                            console.log(keyStatus[key]["end"] + "end");
                            keyStatus[key]["end"] = 0;
                        }else{//ロングノーツ中
                            if(!keyPressed[key]){
                                combo = 0;
                                result[3]++;
                                notes[keyStatus[key]["end"]]["noteStatus"] = 1;
                                notes[keyStatus[key]["end"]]["missed"] = true;
                                keyStatus[key]["end"] = 0;
                            }
                        }
                    }
                }
                notes.forEach((note) => {
                    if (note["timing"] + judgmentWidth[2] < performance.now() - startTime - frameOffset * 1000 / frameRate + judgmentDelay && note["noteStatus"] == 0){//Miss
                        result[3]++;
                        combo = 0;
                        notes[notes.indexOf(note)]["noteStatus"] = 1;
                        if (note["type"] == 1){
                            notes[notes.slice(notes.indexOf(note) + 1).findIndex((endNote) => endNote["type"] == 2 && endNote["key"] == note["key"]) + notes.indexOf(note) + 1]["noteStatus"] = 1;
                            notes[notes.slice(notes.indexOf(note) + 1).findIndex((endNote) => endNote["type"] == 2 && endNote["key"] == note["key"]) + notes.indexOf(note) + 1]["missed"] = true;
                        }
                    }
                });
                while (performance.now() - startTime - (1000 / frameRate) * count >= 1000 / frameRate){
                    count++;
                }
                if (count >= frames.length){
                    clearInterval(main);
                    music.pause();
                    console.log(result);
                    console.log(notes);
                    situation = 3;
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
        ctx.font = "40px monospace";
        ctx.fillText("Hard", canvas.width * 21 / 24, canvas.height * 5 / 6 + 40);

        ctx.strokeStyle = levelColor;
        ctx.strokeRect(levelX - 120, canvas.height * 5 / 6 - 100, 240, 160);
        if(musicList[musicListIndex]["level"][level] != undefined){
            ctx.fillStyle = levelColor;
            ctx.font = "50px monospace";
            ctx.fillText("Press Enter to start", canvas.width * 17 / 24, canvas.height * 5 / 6 + 140);
        }

        //曲&譜面
        ctx.fillStyle = "#ffffff";
        ctx.font = "50px monospace";
        ctx.textAlign = "left";
        ctx.fillText(`♫:${musicList[musicListIndex]["music"]}`, canvas.width / 2, canvas.height * 5 / 6 - 190);
        if(musicList[musicListIndex]["chart"][level] != undefined){
            ctx.fillText(`▦:${musicList[musicListIndex]["chart"][level]}`, canvas.width / 2, canvas.height * 5 / 6 - 130);
        }
    }
    function drawGame(){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 4;
        ctx.globalCompositeOperation = "source-over";

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

        //奥の四角
        ctx.moveTo(ctX([square["x"] - square["size"] / 2, square["y"] - square["size"] / 2, noteStartZ]), ctY([square["y"] - square["size"] / 2, noteStartZ]));
        ctx.lineTo(ctX([square["x"] + square["size"] / 2, square["y"] - square["size"] / 2, noteStartZ]), ctY([square["y"] - square["size"] / 2, noteStartZ]));
        ctx.lineTo(ctX([square["x"] + square["size"] / 2, square["y"] + square["size"] / 2, noteStartZ]), ctY([square["y"] + square["size"] / 2, noteStartZ]));
        ctx.lineTo(ctX([square["x"] - square["size"] / 2, square["y"] + square["size"] / 2, noteStartZ]), ctY([square["y"] + square["size"] / 2, noteStartZ]));
        ctx.lineTo(ctX([square["x"] - square["size"] / 2, square["y"] - square["size"] / 2, noteStartZ]), ctY([square["y"] - square["size"] / 2, noteStartZ]));
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"
        ctx.lineWidth = 1;
        ctx.stroke();

        //補助線下
        ctx.beginPath();
        ctx.moveTo(ctX([square["x"] - square["size"] / 2, square["y"] + square["size"] / 2, square["z"]]), ctY([square["y"] + square["size"] / 2, square["z"]]));
        ctx.lineTo(ctX([square["x"] - square["size"] / 2, square["y"] + square["size"] / 2, noteStartZ]), ctY([square["y"] + square["size"] / 2, noteStartZ]));
        ctx.moveTo(ctX([square["x"] + square["size"] / 2, square["y"] + square["size"] / 2, square["z"]]), ctY([square["y"] + square["size"] / 2, square["z"]]));
        ctx.lineTo(ctX([square["x"] + square["size"] / 2, square["y"] + square["size"] / 2, noteStartZ]), ctY([square["y"] + square["size"] / 2, noteStartZ]));
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"
        ctx.lineWidth = 2;
        ctx.stroke();

        //補助線上
        ctx.beginPath();
        ctx.moveTo(ctX([square["x"] - square["size"] / 2, square["y"] + square["size"] / 2, square["z"]]), ctY([square["y"] - square["size"] / 2, square["z"]]));
        ctx.lineTo(ctX([square["x"] - square["size"] / 2, square["y"] + square["size"] / 2, noteStartZ]), ctY([square["y"] - square["size"] / 2, noteStartZ]));
        ctx.moveTo(ctX([square["x"] + square["size"] / 2, square["y"] + square["size"] / 2, square["z"]]), ctY([square["y"] - square["size"] / 2, square["z"]]));
        ctx.lineTo(ctX([square["x"] + square["size"] / 2, square["y"] + square["size"] / 2, noteStartZ]), ctY([square["y"] - square["size"] / 2, noteStartZ]));
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.stroke();

        //ノーツ
            frames[count].forEach((note) => {
                ctx.beginPath();
                ctx.moveTo(note["coordinates"][0][0], note["coordinates"][0][1]);
                for (let i = 1; i < note["coordinates"].length; i++){
                    ctx.lineTo(note["coordinates"][i][0], note["coordinates"][i][1]);
                }
                ctx.closePath();
                ctx.strokeStyle = note["strokeColor"];
                ctx.fillStyle = note["fillColor"];
                if (note["index"] != undefined){
                    if (notes[note["index"]]["missed"]){
                        ctx.strokeStyle = "rgb(127, 127, 127)";
                        ctx.fillStyle = "rgba(127, 127, 127, 0.2)";
                    }
                }
                ctx.lineWidth = note["lineWidth"];
                ctx.stroke();
                ctx.fill();
            });
        
        

        //判定枠
        ctx.beginPath();

        ctx.moveTo(ctX([square["x"] - square["size"] / 2, square["y"] - square["size"] / 2, square["z"]]), ctY([square["y"] - square["size"] / 2, square["z"]]));
        ctx.lineTo(ctX([square["x"] + square["size"] / 2, square["y"] - square["size"] / 2, square["z"]]), ctY([square["y"] - square["size"] / 2, square["z"]]));
        ctx.lineTo(ctX([square["x"] + square["size"] / 2, square["y"] + square["size"] / 2, square["z"]]), ctY([square["y"] + square["size"] / 2, square["z"]]));
        ctx.lineTo(ctX([square["x"] - square["size"] / 2, square["y"] + square["size"] / 2, square["z"]]), ctY([square["y"] + square["size"] / 2, square["z"]]));
        ctx.lineTo(ctX([square["x"] - square["size"] / 2, square["y"] - square["size"] / 2, square["z"]]), ctY([square["y"] - square["size"] / 2, square["z"]]));

        ctx.moveTo(ctX([square["x"] - square["size"] / 2, square["y"] - square["size"] / 6, square["z"]]), ctY([square["y"] - square["size"] / 6, square["z"]]));
        ctx.lineTo(ctX([square["x"] + square["size"] / 2, square["y"] - square["size"] / 6, square["z"]]), ctY([square["y"] - square["size"] / 6, square["z"]]));
        ctx.moveTo(ctX([square["x"] - square["size"] / 2, square["y"] + square["size"] / 6, square["z"]]), ctY([square["y"] + square["size"] / 6, square["z"]]));
        ctx.lineTo(ctX([square["x"] + square["size"] / 2, square["y"] + square["size"] / 6, square["z"]]), ctY([square["y"] + square["size"] / 6, square["z"]]));
        ctx.moveTo(ctX([square["x"] - square["size"] / 6, square["y"] - square["size"] / 2, square["z"]]), ctY([square["y"] - square["size"] / 2, square["z"]]));
        ctx.lineTo(ctX([square["x"] - square["size"] / 6, square["y"] + square["size"] / 2, square["z"]]), ctY([square["y"] + square["size"] / 2, square["z"]]));
        ctx.moveTo(ctX([square["x"] + square["size"] / 6, square["y"] - square["size"] / 2, square["z"]]), ctY([square["y"] - square["size"] / 2, square["z"]]));
        ctx.lineTo(ctX([square["x"] + square["size"] / 6, square["y"] + square["size"] / 2, square["z"]]), ctY([square["y"] + square["size"] / 2, square["z"]]));

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4;
        ctx.stroke();
    }

    function hitEffect(key, eplb){//eplb e:Early p:Perfect l:Late b:Bad
        let xMin = square["x"] - square["size"] / 2 + key % 3 * square["size"] / 3;
        let xMax = xMin + square["size"] / 3;
        let yMin = square["y"] + square["size"] / 2 - (Math.floor(key / 3) + 1) * square["size"] / 3;
        let yMax = yMin + square["size"] / 3;
        let strokeColor = "rgba(0, 0, 0, ";
        let fillColor = "rgba(0, 0, 0, ";
        let lineWidth = 10;
        let strokeAlpha = 0;
        let fillAlpha = 0;
        let length = 20;//かける時間
        let mc = -square["size"] / 300;//1フレームにどのくらい小さくなるか(margin coefficient)
        switch (eplb) {
            case "e":
                strokeColor = "rgba(0, 0, 255, ";
                strokeAlpha = 1;
                break;
            case "p":
                strokeColor = "rgba(255, 255, 255, ";
                strokeAlpha = 1;
                break;
            case "l":
                strokeColor = "rgba(255, 0, 0, ";
                strokeAlpha = 1;
                break;
            case "b":
                fillColor = "rgba(255, 0, 0, ";
                fillAlpha = 0.3;
                mc*=-1;
                break;
            default:
                break;
        }
        for (let i = 0; i < length && count + i < frames.length; i++){
            frames[count + i].push({coordinates: [ct([xMin + mc * i, yMin + mc * i, square["z"]]), ct([xMax - mc * i, yMin + mc * i, square["z"]]), ct([xMax - mc * i, yMax - mc * i, square["z"]]), ct([xMin + mc * i, yMax - mc * i, square["z"]])], strokeColor: strokeColor + String(strokeAlpha * (length - i) / length) + ")", fillColor: fillColor + String(fillAlpha * (length - i) / length) + ")", lineWidth: lineWidth * (length - i) / length});
        }
    }

    function drawResult(){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 4;
        ctx.globalCompositeOperation = "source-over";
        
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
                        x -= 0.1;
                        if (x <= -0.1){
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
                        x -= 0.1;
                        if (x <= -0.1){
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
                        x -= 0.1;
                        if (x <= -0.1){
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
                        x -= 0.1;
                        if (x <= -0.1){
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
                    /*
                    new Promise((resolve) => {
                        $.getJSON(`${root}charts/${musicList[musicListIndex]["chartfile"]}`, function(data){
                            chart = data;
                            resolve();
                        });
                    }).then(() => {
                        load(chart);
                    }).then(() => {
                        game();
                    });
                    */
                    const loadMusic = new Promise((resolve) => {
                        music = new Audio(`${root}musics/${musicList[musicListIndex]["musicfile"]}`);
                        music.addEventListener("canplay", () => {resolve();});
                    });
                    const loadChartFile = new Promise((resolve) => {
                        $.getJSON(`${root}charts/${musicList[musicListIndex]["chartfile"]}`, function(data){
                            chart = data;
                            resolve();
                            console.log(chart);
                        });
                    });
                    Promise.all([loadMusic, loadChartFile]).then(() => {
                        load(chart);
                    }).then(() => {
                        game();
                    });
                }
            }
        }
        if (situation == 2){
            if(keyCodes.includes(e.code)){
                let key = keyCodes.indexOf(e.code);
                if (!keyPressed[key]){
                    let pressTime = performance.now() - startTime - frameOffset * 1000 / frameRate + judgmentDelay;
                    let noteNowIndex = notes.findIndex((note) => note["key"] == key && note["timing"] - judgmentWidth[2] <= pressTime && pressTime <= note["timing"] + judgmentWidth[2] && note["noteStatus"] == 0);
                    if (noteNowIndex != -1){
                        if (notes[noteNowIndex]["type"] == 0){//タップ
                            console.log(notes[noteNowIndex]["timing"] - pressTime);
                            if (Math.abs(notes[noteNowIndex]["timing"] - pressTime) <= judgmentWidth[0]){//Perfect
                                notes[noteNowIndex]["noteStatus"] = 1;
                                console.log("Perfect");
                                result[0]++;
                                combo++;
                                hitEffect(key, "p");
                            }else if (Math.abs(notes[noteNowIndex]["timing"] - pressTime) <= judgmentWidth[1]){//Good
                                notes[noteNowIndex]["noteStatus"] = 1;
                                console.log("Good");
                                result[1]++;
                                combo++;
                                if (pressTime < notes[noteNowIndex]["timing"]){//Early
                                    hitEffect(key, "e");
                                }else{//Late
                                    hitEffect(key, "l");
                                }
                            }else if (Math.abs(notes[noteNowIndex]["timing"] - pressTime) <= judgmentWidth[2]){//Bad
                                notes[noteNowIndex]["noteStatus"] = 1;
                                console.log("Bad");
                                result[2]++;
                                combo = 0;
                                hitEffect(key, "b");
                            }
                            score = (1000000 * result[0] + 500000 * result[1]) / notesCount;
                        }else if (notes[noteNowIndex]["type"] == 1){//ロング始点
                            if (Math.abs(notes[noteNowIndex]["timing"] - pressTime) <= judgmentWidth[0]){//Perfect
                                notes[noteNowIndex]["noteStatus"] = 1;
                                keyStatus[key]["judgement"] = "perfect";
                                keyStatus[key]["end"] = notes.findIndex((note) => note["type"] == 2 && note["key"] == key && note["noteStatus"] == 0);
                                hitEffect(key, "p");
                            }else if (Math.abs(notes[noteNowIndex]["timing"] - pressTime) <= judgmentWidth[1]){//Good
                                notes[noteNowIndex]["noteStatus"] = 1;
                                keyStatus[key]["judgement"] = "good";
                                keyStatus[key]["end"] = notes.findIndex((note) => note["type"] == 2 && note["key"] == key && note["noteStatus"] == 0);
                                if (pressTime < notes[noteNowIndex]["timing"]){//Early
                                    hitEffect(key, "e");
                                }else{//Late
                                    hitEffect(key, "l");
                                }
                            }else if (Math.abs(notes[noteNowIndex]["timing"] - pressTime) <= judgmentWidth[2]){//Bad
                                notes[noteNowIndex]["noteStatus"] = 1;
                                notes[notes.findIndex((note) => note["type"] == 2 && note["key"] == key && note["noteStatus"] == 0)]["missed"] = true;
                                notes[notes.findIndex((note) => note["type"] == 2 && note["key"] == key && note["noteStatus"] == 0)]["noteStatus"] == 1;
                                result[2]++;
                                combo = 0;
                                hitEffect(key, "b");
                            }
                        }
                    }
                }
                keyPressed[key] = true;
            }
        }
    });

    document.addEventListener("keyup", function(e){
        if(keyCodes.includes(e.code)){
            keyPressed[keyCodes.indexOf(e.code)] = false;
        }
    });


    let demoVolume;
    demoStart();
    drawList();
    function demoStart(){
        music = new Audio(`${root}musics/${musicList[musicListIndex]["musicfile"]}#t=${musicList[musicListIndex]["demo"][0]},${musicList[musicListIndex]["demo"][1]}`);
        music.play();
        music.loop = true;
        demoVolume = setInterval(() => {
            music.volume = Math.max(0, Math.min(20 * (music.currentTime - musicList[musicListIndex]["demo"][0]), 1, musicList[musicListIndex]["demo"][1] - music.currentTime));
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
