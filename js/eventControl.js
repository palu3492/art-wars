var otherPos ={ x: 0, y: 0 };
photon.onEvent = function(code, content, actorNr){

    if(code === 1){
        foreignMouseDown(content);
    } else if (code === 2){
        foreignMouseMove(content);
    }  else if (code === 3){
        changeWidth(content);
    } else if (code === 4){
        changeColor(content);
    } else if (code === 5){
        clearCanvas();
    } else if (code === 6){
        fillCanvas();
    } else if (code === 10){
        addMsg(content, false, false);
    } else if (code === 7){
        guessedWord(content);
    } else if (code === 8){
        playerDrawingNote(content);
    } else if (code === 9){
        startGame();
    } else if (code === 11){
        turnStart(content);
    } else if (code === 12){
        resetChat();
    } else if (code === 13){
        newDrawing();
    } else if (code === 14){
        startTimer();
    } else if (code === 15){
        showHint(content);
    } else if (code === 16){
        kicked();
    } else if (code === 17){
        didAllGuess();
    }


};

function setOtherPosition(x, y) {
    otherPos.x = x;
    otherPos.y = y;
}

function drawOther(x, y) {
    ctx.beginPath(); // begin the drawing path

    ctx.lineWidth = width; // width of line
    ctx.lineCap = "round"; // rounded end cap
    ctx.strokeStyle = color; // hex color of line

    ctx.moveTo(otherPos.x, otherPos.y); // from position
    setOtherPosition(x, y);
    ctx.lineTo(otherPos.x, otherPos.y); // to position

    ctx.stroke(); // draw it!

}