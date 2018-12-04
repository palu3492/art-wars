var canvas;
var oldPt = { x: 0, y: 0 };
var oldMidPt = { x: 0, y: 0 };
var color = "#ff0000";
var width = 15;
var yourTurn = false;
var stage;
var drawingCanvas;
var cont;

function setupCanvas(){
    canvas = document.getElementById("draw");
    stage = new createjs.Stage(canvas);
    stage.autoClear = false;
    stage.enableDOMEvents(true);

    // createjs.Touch.enable(stage);
    // createjs.Ticker.framerate = 24;

    drawingCanvas = new createjs.Shape();

    stage.addEventListener("stagemousedown", handleMouseDown);
    stage.addEventListener("stagemouseup", handleMouseUp);

    // stage.addChild(drawingCanvas);
    cont = new createjs.Container();
    cont.addChild(drawingCanvas);
    stage.addChild(cont);
    stage.update();
}

// function resizeCanvas(){
//     canvas.width = canvas.clientWidth;
//     canvas.height = canvas.clientHeight;
// }

function handleMouseDown(event) {
    if(yourTurn) {
        if (!event.primary) {
            return;
        }
        oldPt = new createjs.Point(stage.mouseX, stage.mouseY);
        oldMidPt = oldPt.clone();
        stage.addEventListener("stagemousemove", handleMouseMove);
        photon.raiseEvent(1, [stage.mouseX, stage.mouseY]);
    }
}
function foreignMouseDown(coords){
    var mouseX = coords[0];
    var mouseY = coords[1];
    oldPt = new createjs.Point(mouseX, mouseY);
    oldMidPt = oldPt.clone();
}

function handleMouseMove(event) {
    if(yourTurn) {
        if (!event.primary) {
            return;
        }
        var midPt = new createjs.Point(oldPt.x + stage.mouseX >> 1, oldPt.y + stage.mouseY >> 1);

        drawingCanvas.graphics.clear().setStrokeStyle(width, 'round', 'round').beginStroke(color).moveTo(midPt.x, midPt.y).curveTo(oldPt.x, oldPt.y, oldMidPt.x, oldMidPt.y);

        oldPt.x = stage.mouseX;
        oldPt.y = stage.mouseY;

        oldMidPt.x = midPt.x;
        oldMidPt.y = midPt.y;

        stage.update();
        photon.raiseEvent(2, [stage.mouseX, stage.mouseY]);
    }
}

function foreignMouseMove(coords){
    var mouseX = coords[0];
    var mouseY = coords[1];
    var midPt = new createjs.Point(oldPt.x + mouseX >> 1, oldPt.y + mouseY >> 1);
    drawingCanvas.graphics.clear().setStrokeStyle(width, 'round', 'round').beginStroke(color).moveTo(midPt.x, midPt.y).curveTo(oldPt.x, oldPt.y, oldMidPt.x, oldMidPt.y);
    oldPt.x = mouseX;
    oldPt.y = mouseY;

    oldMidPt.x = midPt.x;
    oldMidPt.y = midPt.y;

    stage.update();
}

function handleMouseUp(event) {
    if (!event.primary) {
        return;
    }
    stage.removeEventListener("stagemousemove", handleMouseMove);
}

function changeWidth(size){
    width = size;
    if(yourTurn) {
        var cursor = "url(cursor" + size.toString() + ".png) " + (size/2).toString() + " " + (size/2).toString() + ", auto";
        document.getElementById('draw').style.cursor = cursor;
        photon.raiseEvent(3, size);
    }
}

function changeColor(newColor){
    color = newColor;
    if(yourTurn) {
        document.getElementById('color-circle').style.background = color;
        photon.raiseEvent(4, newColor);
    }
}

function clearCanvas(){
    drawingCanvas.graphics.beginStroke("white").beginFill('white').drawRect(0, 0, 2000, 2000);
    stage.update();
    if(yourTurn) {
        photon.raiseEvent(5, "");
    }
}
function fillCanvas(){
    drawingCanvas.graphics.beginStroke(color).beginFill(color).drawRect(0, 0, 2000, 2000);
    stage.update();
    if(yourTurn) {
        photon.raiseEvent(6, "");
    }
}

function setYourTurn(bool){
    yourTurn = bool;
}

function newDrawing(){
    clearCanvas();
    color = "#ff0000";
    document.getElementById('color-circle').style.background = color;
    width = 15;
}