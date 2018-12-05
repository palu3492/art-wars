var clock = 60;
var timer;
var words = ['Angry', 'Fireworks', 'Pumpkin', 'Baby', 'Flower', 'Rainbow', 'Beard', 'Flying saucer', 'Recycle', 'Bible', 'Giraffe', 'Sand castle', 'Bikini', 'Glasses', 'Snowflake', 'Book', 'High heel', 'Stairs', 'Bucket', 'Ice cream cone', 'Starfish', 'Bumble bee', 'Igloo', 'Strawberry', 'Butterfly', 'Lady bug', 'Sun', 'Camera', 'Lamp', 'Tire', 'Cat', 'Lion', 'Toast', 'Church', 'Mailbox', 'Toothbrush', 'Crayon', 'Night', 'Toothpaste', 'Dolphin', 'Nose', 'Truck', 'Egg', 'Olympics', 'Volleyball', 'Eiffel Tower', 'Peanut'];
var word = "";
var wordHint = [];
var practice = false;

function actorJoined(actor){
    if (actor.actorNr === photon.myActor().actorNr) {
        soundInit();
    } else{
        playSound('sounds/zap1.mp3');
    }
    changeActorList();
    notifyChat(actor.name + " joined");
    // if more than 1 players are in room and the game is not active
    if (photon.myRoomActorCount() > 1 && !photon.myRoom().getCustomProperty('gameActive')) {
        if (actor.actorNr === photon.myActor().actorNr) {
            hostSettings();
            startGame();
            photon.raiseEvent(9,"");
        }
    } else {
        if(actor.actorNr === photon.myActor().actorNr) {
            if (photon.myRoom().getCustomProperty('gameActive')) {
                notifyChat("Game is active, you can guess next round");
                addActorToOrder();
                correctGuess(false);
            } else {
                notifyChat("Waiting for more players");
            }
        } else {
            if (photon.myRoom().getCustomProperty('gameActive')) {
                if(yourTurn) {
                    photon.raiseEvent(8, photon.myActor().name);
                    sendHint(true);
                }
            }
        }
    }
}

function actorLeft(actor){
    changeActorList();
    notifyChat(actor.name + " left");
    var key = Object.keys(photon.myRoomActors())[0];
    if(photon.myRoomActors()[key] === photon.myActor()){
        var drawerGone = isDrawerGone(actor);
        removeActorFromOrder(actor);
        if(drawerGone){
            if(photon.myRoomActorCount() > 1){
                drawerLeft();
            } else {
                resetGame();
            }
        } else if (photon.myRoomActorCount() === 1){
            resetGame();
        } else {
            photon.raiseEvent(17, "");
        }
    }

}

function soundInit(){
    if (!createjs.Sound.initializeDefaultPlugins()) {return;}
    var audioPath = "sounds/";
    var sounds = [
        {id:"join", src:"zap1.mp3"}
    ];
    createjs.Sound.alternateExtensions = ["mp3"];
    createjs.Sound.addEventListener("fileload", handleLoad);
    createjs.Sound.registerSounds(sounds, audioPath);
}
function handleLoad(event) {
    createjs.Sound.play(event.src);
}
function playSound(src) {
    createjs.Sound.play(src);
}

function resetGame(){
    turnOver();
    notifyChat("Waiting for more players");
    photon.myRoom().setCustomProperty("gameActive", false);
    document.getElementById('drawing-hint-note').innerHTML = "";
    document.getElementById('drawing-hint').innerHTML = "";
    document.getElementById('drawing-note').innerHTML = "";
    document.getElementById('clock').innerHTML = "";
    newDrawing();
}

function startGame(){
    notifyChat("Game is starting");
    var order = photon.myRoom().getCustomProperty('drawOrder');
    var orderPos = photon.myRoom().getCustomProperty('drawOrderNum');
    if (photon.myActor().actorNr === order[orderPos]) {
        turnStart(photon.myActor().actorNr);
    }
}
function hostSettings(){
    photon.myRoom().setCustomProperty("gameActive", true);
    setDrawOrder();
    changeWordOrder();
}

function setDrawOrder(){
    // var actors = shuffle(photon.myRoomActors());
    var actors = photon.myRoomActors();
    var order = [];
    const keys = Object.keys(actors);
    for(var i=0; i<keys.length; i++){
        order.push(actors[keys[i]].actorNr);
    }
    photon.myRoom().setCustomProperty("drawOrder", order);
    photon.myRoom().setCustomProperty("drawOrderNum", 0);
}

function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

function addActorToOrder(){
    var order = photon.myRoom().getCustomProperty('drawOrder');
    order.push(photon.myActor().actorNr);
    photon.myRoom().setCustomProperty('drawOrder', order);
}

function removeActorFromOrder(actor){
    var order = photon.myRoom().getCustomProperty('drawOrder');
    for(var i=0; i<order.length; i++){
        if(order[i] === actor.actorNr){
            order.splice(i, 1);
            photon.myRoom().setCustomProperty('drawOrder', order);
            break;
        }
    }
}
function isDrawerGone(actor){
    var order = photon.myRoom().getCustomProperty('drawOrder');
    var drawOrderNum = photon.myRoom().getCustomProperty("drawOrderNum");
    if(order[drawOrderNum] === actor.actorNr){
        return true;
    }
    return false;
}

function guessWord(msg){
    var split = msg.split(": ");
    var name = split[0];
    var guess = split[1];
    var word = photon.myRoom().getCustomProperty('wordOrder')[photon.myRoom().getCustomProperty('wordNum')];
    if(guess && guess.toUpperCase().trim() === word.toUpperCase()){
        correctGuess(true);
        return true;
    }
    return false;
}

function correctGuess(guess){
    if(guess) {
        var actor = photon.myActor();
        document.getElementById('chat-input').disabled = true;
        actor.setCustomProperty("guessed", true);
        var points = addPoints(actor);
        var notify = photon.myActor().name + " guessed the word for " + points.toString() + " points";
        guessedWord(notify);
        photon.raiseEvent(7, notify);
    } else {
        var actor = photon.myActor();
        document.getElementById('chat-input').disabled = true;
        actor.setCustomProperty("guessed", true);
    }
}

function addPoints(actor){
    var points = actor.getCustomProperty("points");
    if(!points) {
        points = 0;
    }
    var addPoints = Math.ceil(clock/15)*15;
    points += addPoints;
    actor.setCustomProperty("points", points);
    return addPoints;
}

function changeActorList(){
    var actorsDiv = document.getElementById("actors");
    //remove all actors for list
    while (actorsDiv.firstChild) {
        actorsDiv.removeChild(actorsDiv.firstChild);
    }
    var actors = photon.myRoomActors();
    const keys = Object.keys(actors);
    document.getElementById("player-count").innerHTML = keys.length.toString() + "/20";
    for(var i=0; i<keys.length; i++){
        var actor = actors[keys[i]];
        var html = "<div class='actor'><div class='avatar avatar-ingame'></div><div class='actor-text'><p></p><p>0</p></div></div>";
        var actorHtml = createElementFromHTML(html);
        actorHtml.childNodes[0].style.backgroundImage = actor.getCustomProperty('avatar');
        var actorName = actorHtml.childNodes[1].childNodes[0];
        actorName.innerHTML = actor.name;
        var actorPoints = actorHtml.childNodes[1].childNodes[1];
        var points = actor.getCustomProperty("points");
        if(!points){
            points = 0;
        }
        actorPoints.innerHTML = points.toString();
        actorsDiv.appendChild(actorHtml);
    }
}
function createElementFromHTML(htmlString) {
    var div = document.createElement('div');
    div.innerHTML = htmlString.trim();
    return div.firstChild;
}

function guessedWord(content) {
    notifyChat(content);
    changeActorList();
    didAllGuess();
}
function didAllGuess(){
    if(yourTurn) {
        var drawingOver = true;
        var actors = photon.myRoomActors();
        const keys = Object.keys(actors);
        for (var i = 0; i < keys.length; i++) {
            var actor = actors[keys[i]];
            if (actor !== photon.myActor()) {
                if (!actor.getCustomProperty('guessed')) {
                    drawingOver = false;
                }
            }
        }
        if (drawingOver) {
            newDrawer();
        }
    }
}

function changeWordOrder(){
    var shuffledWords = shuffle(words.slice());
    photon.myRoom().setCustomProperty("wordOrder", shuffledWords);
    photon.myRoom().setCustomProperty("wordNum", 0);
}

function playerDrawingNote(name){
    document.getElementById('drawing-note').innerHTML = name + " is drawing";
    document.getElementById('drawing-hint-note').innerHTML = "Hint:";
}

function turnOver(){
    setYourTurn(false);
    newDrawing();
    photon.raiseEvent(13, ""); //new drawing for everyone
    stopTimer();
    word = "";
    wordHint = [];
    document.getElementById('drawing-hint-note').innerHTML = "Hint:";
    document.getElementById('drawing-hint').innerHTML = "";
    document.getElementById('chat-input').disabled = false;
    document.getElementById('drawing-tools').style.display = "none";
    document.getElementById('draw').style.cursor = "default";
    document.getElementById('drawing-box').classList.remove("drawing-box-yourturn");
}

function turnStart(nr){
    newDrawing();
    stopTimer();
    if(photon.myActor().actorNr === nr) {
        setYourTurn(true);
        document.getElementById('chat-input').disabled = true;
        document.getElementById('drawing-tools').style.display = 'block';
        document.getElementById('drawing-box').classList.add("drawing-box-yourturn");
        document.getElementById('draw').style.cursor = "url(cursor15.png) 7.5 7.5, auto";
        if(!practice) {
            startTimer();
            photon.raiseEvent(8, photon.myActor().name); //canvas drawer note
            photon.raiseEvent(12, ""); //reset chat
            document.getElementById('drawing-note').innerHTML = "You are drawing";
            word = photon.myRoom().getCustomProperty('wordOrder')[photon.myRoom().getCustomProperty('wordNum')];
            createHint();
            sendHint(true);
            document.getElementById('drawing-hint-note').innerHTML = "Draw:";
            document.getElementById('drawing-hint').innerHTML = word;
        }
    }
}

function newDrawer(){
    turnOver();
    resetActorGuessed();
    var order = photon.myRoom().getCustomProperty('drawOrder');
    var drawOrderNum = photon.myRoom().getCustomProperty("drawOrderNum");
    drawOrderNum++;
    if(drawOrderNum >= order.length){
        drawOrderNum = 0;
    }
    photon.myRoom().setCustomProperty("drawOrderNum", drawOrderNum);
    var nr = order[drawOrderNum];
    var wordNum = photon.myRoom().getCustomProperty("wordNum");
    wordNum++;
    photon.myRoom().setCustomProperty("wordNum", wordNum);

    photon.raiseEvent(11, nr); //start turn for whom ever is nr
}

function drawerLeft(){
    resetActorGuessed();
    var order = photon.myRoom().getCustomProperty('drawOrder');
    var drawOrderNum = photon.myRoom().getCustomProperty("drawOrderNum");
    if(drawOrderNum >= order.length){
        drawOrderNum = 0;
    }
    photon.myRoom().setCustomProperty("drawOrderNum", drawOrderNum);
    var nr = order[drawOrderNum];
    var wordNum = photon.myRoom().getCustomProperty("wordNum");
    wordNum++;
    photon.myRoom().setCustomProperty("wordNum", wordNum);
    turnStart(nr);
    photon.raiseEvent(11, nr); //start turn for whom ever is nr
}

function resetActorGuessed(){
    var actors = photon.myRoomActors();
    const keys = Object.keys(actors);
    for(var i=0; i<keys.length; i++){
        var actor = actors[keys[i]];
        actor.setCustomProperty("guessed", false);
    }
}

function resetChat(){
    document.getElementById('chat-input').disabled = false;
}
function setPractice(bool){
    practice = bool;
}

function startTimer(){
    timer = setInterval(incrementSeconds, 1000);
    if(yourTurn){
        photon.raiseEvent(14, ""); // start everyone elses timer
    }
}

function incrementSeconds() {
    clock -= 1;
    document.getElementById('clock').innerHTML = clock.toString();
    if(clock <= 0){
        stopTimer();
        if(yourTurn) {
            newDrawer();
        }
    }
    if(yourTurn) {
        if (clock <= 35 && clock % (parseInt(60/word.length)+1) === 0 && clock > 0) {
            sendHint(false);
        }
    }
}
function stopTimer(){
    clearInterval(timer);
    timer = null;
    clock = 60;
    document.getElementById('clock').innerHTML = '60';
}

function sendHint(first){
    if(!first) {
        var r = Math.floor(Math.random() * word.length);
        while (wordHint[r] !== '_' && word[r] !== ' ') {
            r = Math.floor(Math.random() * word.length);
        }
        wordHint[r] = word[r];
    }
    var hint = wordHint.join(' ');
    photon.raiseEvent(15,hint);
}

function createHint(){
    for(var i=0; i<word.length; i++){
        if(word[i] === ' '){
            wordHint.push('&nbsp;');
        } else {
            wordHint.push('_');
        }
    }
}
function showHint(hint){
    document.getElementById('drawing-hint').innerHTML = hint;
}

function kickAll(){
    photon.raiseEvent(16,"");
}
function kicked(){
    location.reload();
}

function saveImage(){
    var canvas = document.getElementById('draw');
    var uri = canvas.toDataURL("image/png");
    downloadURI(uri, 'artwars');
}

function downloadURI(uri, name) {
    var link = document.createElement("a");
    link.download = name;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    delete link;
}