/// <reference path="3rdparty/easeljs.d.ts" />          
/// <reference path="Photon/Photon-Javascript_SDK.d.ts"/> 
/// <reference path="master-client.ts"/> 

// For Photon Cloud Application access create cloud-app-info.js file in the root directory (next to default.html) and place next lines in it:
//var AppInfo = {
//    AppId: "your app id",
//    AppVersion: "your app version",
//}


// fetching app info global variable while in global context
var DemoWss = this["AppInfo"] && this["AppInfo"]["Wss"];
var DemoAppId = this["AppInfo"] && this["AppInfo"]["AppId"] ? this["AppInfo"]["AppId"] : "<no-app-id>";
var DemoAppVersion = this["AppInfo"] && this["AppInfo"]["AppVersion"] ? this["AppInfo"]["AppVersion"] : "1.0";
var DemoFbAppId = this["AppInfo"] && this["AppInfo"]["FbAppId"];

var DemoConstants =
{
    EvClick: 1,
//    EvGetMap: 2, // for debug only
//    EvGetMapProgress: 3,
    EvNewGame: 4,

    MasterEventMax: 100, // separate events handled by master client from client events

    EvGameStateUpdate: 101,
    EvPlayersUpdate: 102,
    EvGameMap: 103,
    EvClickDebug: 104,
    EvShowCards: 105,
    EvHideCards: 106,
//    EvGameMapProgress: 107,
    EvMoveTimer: 108,

    EvDisconnectOnAlreadyConnected: 151,
   
    GameStateProp: "gameState",
    MoveCountProp: "moveCount",

    LogLevel: Exitgames.Common.Logger.Level.DEBUG,
}

class Demo extends Photon.LoadBalancing.LoadBalancingClient {

    masterClient: MasterClient;

    public useGroups: boolean = false;
    public automove: boolean = false;

    constructor(private canvas: HTMLCanvasElement) {
        super(DemoWss ? Photon.ConnectionProtocol.Wss : Photon.ConnectionProtocol.Ws, DemoAppId, DemoAppVersion);
        this.masterClient = new MasterClient(this);

        // uncomment to use Custom Authentication
        // this.setCustomAuthentication("username=" + "yes" + "&token=" + "yes");

        Output.log("Init", DemoAppId, DemoAppVersion);
        this.logger.info("Init", DemoAppId, DemoAppVersion);
        this.setLogLevel(DemoConstants.LogLevel);
    }

    // sends to all including itself
    raiseEventAll(eventCode: number, data?: any, options?: { interestGroup?: number; cache?: number; receivers?: number; targetActors?: number[]; }) {
        options = options || {};
        options.receivers = Photon.LoadBalancing.Constants.ReceiverGroup.All;
        this.raiseEvent(eventCode, data, options);
    }

    logger = new Exitgames.Common.Logger("Demo:", DemoConstants.LogLevel);

    // overrides
    roomFactory(name: string) { return new DemoRoom(this, name); }
    actorFactory(name: string, actorNr: number, isLocal: boolean) { return new DemoPlayer(this, name, actorNr, isLocal); }
    myRoom() { return <DemoRoom>super.myRoom(); }
    myActor() { return <DemoPlayer>super.myActor(); }
    myRoomActors() { return <DemoRoom>super.myRoomActors(); }

    start() {
        this.stage = new createjs.Stage(this.canvas);
        this.setupUI();
        this.myRoom().loadResources(this.stage);
//        this.connectToRegionMaster("EU");

    }

    // overrides
    onError(errorCode: number, errorMsg: string) {
        Output.log("Error", errorCode, errorMsg);
        // optional super call
        super.onError(errorCode, errorMsg);
    }

    onOperationResponse(errorCode: number, errorMsg: string, code: number, content: any) {

        this.masterClient.onOperationResponse(errorCode, errorMsg, code, content);

        if (errorCode) {
            switch (code) {                
                case Photon.LoadBalancing.Constants.OperationCode.JoinRandomGame:
                    switch (errorCode) {
                        case Photon.LoadBalancing.Constants.ErrorCode.NoRandomMatchFound:
                            Output.log("Join Random:", errorMsg);
                            this.createDemoRoom();
                            break
                        default:
                            Output.log("Join Random:", errorMsg);
                            break;
                    }
                    break;
                case Photon.LoadBalancing.Constants.OperationCode.CreateGame:
                    if (errorCode != 0) {
                        Output.log("CreateGame:", errorMsg);
                        this.disconnect();
                    }
                    break;
                case Photon.LoadBalancing.Constants.OperationCode.JoinGame:
                    if (errorCode != 0) {
                        Output.log("CreateGame:", errorMsg);
                        this.disconnect();
                    }
                    break;

                default:
                    Output.log("Operation Response error:", errorCode, errorMsg, code, content);
                    break;
            }
        }
    }

    onEvent(code: number, content: any, actorNr: number) {

        this.masterClient.onEvent(code, content, actorNr);

        switch (code) {
            case DemoConstants.EvDisconnectOnAlreadyConnected:
                Output.log("Disconnected by Master Client as already connected player");
                this.disconnect();
                break;
            case DemoConstants.EvMoveTimer:
                var t = document.getElementById("info");
                t.textContent = "Your turn now! (" + content.timeout + " sec.)";
                break
            case DemoConstants.EvClickDebug:
                Output.log(content.msg);
                break
            case DemoConstants.EvShowCards:
                Output.log("show ", content.cards);
                for (var c in content.cards) {
                    this.showCard(parseInt(c), content.cards[c]);
                }
                if (content.resetShown) {
                    var demo = this;
                    setTimeout(function () {
                        for (var c in content.resetShown.cards) {
                            demo.hideCard(parseInt(content.resetShown.cards[c]), true);
                        }
                        demo.stage.update();
                    }, GameProperties.cardShowTimeout);
                }
                this.stage.update();
                break;
            case DemoConstants.EvHideCards:
                Output.log("hide ", content.cards);
                if (content.all) {
                    for (var i = 1; i <= this.myRoom().variety * 2; ++i) {
                        this.hideCard(i);
                    }
                }
                for (var k in content.cards) {
                    this.hideCard(content.cards[k]);
                }
                this.stage.update();
                break;


            default:
            }

        this.logger.info("Demo: onEvent", code, "content:", content, "actor:", actorNr);
    }

    onStateChange(state: number) {

        this.masterClient.onStateChange(state);

        // "namespace" import for static members shorter acceess
        var LBC = Photon.LoadBalancing.LoadBalancingClient;

        var stateText = document.getElementById("statetxt");
        stateText.textContent = LBC.StateToName(state);
        switch (state) {
            case LBC.State.JoinedLobby:
                this.joinRandomRoom();
                break;
            default:
                break;
        }
        this.updateRoomButtons();
        var t = document.getElementById("info");
        t.textContent = "Not in Game";

        this.updateAutoplay(this);
    }

    private autoClickTimer: number = 0;

    updateAutoplay(client: Demo) {
        clearInterval(this.autoClickTimer);
        var t = <HTMLInputElement>document.getElementById("autoplay");
        if (this.isConnectedToGame() && t.checked) {
            this.autoClickTimer = setInterval(
                function () {
                    var hidden = [];
                    var j = 0;
                    for (var i = 1; i <= client.myRoom().variety * 2; ++i) {
                        if (!client.shownCards[i]) {
                            hidden[j] = i;
                            ++j;
                        }
                    }
                    if (hidden.length > 0) {
                        var card = hidden[Math.floor(Math.random() * hidden.length)];
                        client.raiseEventAll(DemoConstants.EvClick, { "card": card });
                    }
                },
                750)
        }
    }

    private updateMasterClientMark() {
        var el = document.getElementById("masterclientmark");
        el.textContent = this.masterClient.isMaster() ? "!" : "";
    }

    onRoomListUpdate(rooms: Photon.LoadBalancing.RoomInfo[], roomsUpdated: Photon.LoadBalancing.RoomInfo[], roomsAdded: Photon.LoadBalancing.RoomInfo[], roomsRemoved: Photon.LoadBalancing.RoomInfo[]) {
        //        Output.log("onRoomListUpdate", rooms, roomsUpdated, roomsAdded, roomsRemoved);
        this.updateRoomButtons(); // join btn state can be changed
    }

    onRoomList(rooms: Photon.LoadBalancing.RoomInfo[]) {
        this.updateRoomButtons();
    }

    onJoinRoom() {
        this.updateMasterClientMark();
        this.masterClient.onJoinRoom();

        this.logger.info("onJoinRoom myRoom", this.myRoom());
        this.logger.info("onJoinRoom myActor", this.myActor());
        this.logger.info("onJoinRoom myRoomActors", this.myRoomActors());
        this.updatePlayerOnlineList();

        this.setupScene();
        var game = this.myRoom().getCustomProperty("game");
        for (var card = 1; card <= this.myRoom().variety * 2; ++card) {
            // TODO: remove game.mapProgress check after empty object send bug fix
            var icon = game.mapProgress && game.mapProgress[card];
            if (icon) {
                this.showCard(card, icon);
            }
        }
        this.stage.update();
    }

    onActorJoin(actor: Photon.LoadBalancing.Actor) {
        this.updateMasterClientMark();
        this.masterClient.onActorJoin(actor);
        Output.log("actor " + actor.actorNr + " joined");
        this.updatePlayerOnlineList();
    }

    onActorLeave(actor: Photon.LoadBalancing.Actor) {
        this.updateMasterClientMark();
        this.masterClient.onActorLeave(actor);
        Output.log("actor " + actor.actorNr + " left");
        this.updatePlayerOnlineList();
    }

    // tools
    private createDemoRoom() {
        Output.log("New Game");
        this.myRoom().setEmptyRoomLiveTime(10000);
        this.createRoomFromMy("DemoPairsGame (Master Client)");
    }

    //scene
    private stage: createjs.Stage;
    private shape: createjs.Shape;

    private cellWidth = 96;
    private cellHeight = 96;

    private bgColor = 'rgba(100,100,100,255)';
    private gridColor = 'rgba(180,180,180,255)';

    private setupScene() {
        this.shownCards = [];
        this.stage.removeAllChildren();
        this.canvas.width = this.cellWidth * this.myRoom().columnCount
        this.canvas.height = this.cellHeight * this.myRoom().rowCount();
        this.drawBg();

        this.drawGrid();

        this.stage.update();
    }

    private shownCards: createjs.Bitmap[] = [];

    private hideCard(card: number, checkMap?: boolean) {
        var game = this.myRoom().getCustomProperty("game");
        // TODO: remove game.mapProgress check after empty object send bug fix
        if (checkMap && game.mapProgress && game.mapProgress[card]) {
            // leave it open
        }
        else {
            if (this.shownCards[card]) {
                this.stage.removeChild(this.shownCards[card]);
                this.shownCards[card] = null;
            }
        }
    }
    private showCard(card: number, icon: number) {
        if (!this.shownCards[card]) {
            var img = this.myRoom().icon(icon - 1);
            var bitmap = new createjs.Bitmap(img);
            var col = this.myRoom().columnCount;
            bitmap.x = ((card - 1) % col) * this.cellWidth;
            bitmap.y = Math.floor((card - 1) / col) * this.cellHeight;
            this.stage.addChild(bitmap);
            this.shownCards[card] = bitmap;
        }
    }

    private drawBg() {
        var bg = new createjs.Shape();
        bg.graphics.beginFill(this.bgColor).drawRect(0, 0, this.canvas.width, this.canvas.height);
        this.stage.addChild(bg);
    }
    private drawGrid() {
        var grid = new createjs.Shape();
        var w = this.canvas.width;
        var h = this.canvas.height
        for (var i = 0; i < this.myRoom().columnCount + 1; ++i) {
            var x = i * this.cellWidth;
            grid.graphics.setStrokeStyle(1);
            grid.graphics.beginStroke(this.gridColor).moveTo(x, 0).lineTo(x, h);
        }
        for (var i = 0; i < this.myRoom().rowCount() + 1; ++i) {
            var y = i * this.cellHeight;
            grid.graphics.setStrokeStyle(1);
            grid.graphics.beginStroke(this.gridColor).moveTo(0, y).lineTo(w, y);
        }

        this.stage.addChild(grid);
    }

    // ui
    private setupUI() {
        this.stage.addEventListener("stagemousedown", (ev) => {
            var x = Math.floor(this.stage.mouseX / this.cellWidth);
            var y = Math.floor(this.stage.mouseY / this.cellHeight);
            this.raiseEventAll(DemoConstants.EvClick, { "card": x + y * this.myRoom().columnCount + 1 });

            this.stage.update();
        })
        var cb = document.getElementById("autoplay");
        cb.onchange = () => this.updateAutoplay(this);

        var btn = <HTMLButtonElement>document.getElementById("connectbtn");
        btn.onclick = (ev) => {
            var n = <HTMLButtonElement>document.getElementById("playername");
            //                this.myActor().setName(n.value);

            var id = "n:" + n.value;

            // clients set actors's id
            this.myActor().setInfo(id, n.value);
            this.myActor().setCustomProperty("auth", { name: n.value });
            this.connectToRegionMaster("EU");
        }
        btn = <HTMLButtonElement>document.getElementById("disconnectbtn");
        btn.onclick = (ev) => {
            this.disconnect();
            return false;
        }

        btn = <HTMLButtonElement>document.getElementById("newgame");
        btn.onclick = (ev) => {
            this.raiseEventAll(DemoConstants.EvNewGame, null);
            return false;
        }
        btn = <HTMLButtonElement>document.getElementById("newtrivial");
        btn.onclick = (ev) => {
            this.raiseEventAll(DemoConstants.EvNewGame, { trivial: true });
            return false;
        }
        this.updateRoomButtons();
    }
    public updatePlayerOnlineList() {
        var list = document.getElementById("playeronlinelist");
        while (list.firstChild) {
            list.removeChild(list.firstChild);
        }
        for (var i in this.myRoomActors()) {
            var a = this.myRoomActors()[i];
            var item = document.createElement("li");
            item.attributes["value"] = a.getName() + " /" + a.getId();
            item.textContent = a.getName() + " / " + a.getId() + " / " + a.actorNr;
            if (a.isLocal) {
                item.textContent = "-> " + item.textContent;
            }
            list.appendChild(item);
            this.logger.info("actor:", a);
        }
    }
    private updateRoomButtons() {
        var btn;
        var connected = this.state != Photon.LoadBalancing.LoadBalancingClient.State.Uninitialized && this.state != Photon.LoadBalancing.LoadBalancingClient.State.Disconnected
        btn = <HTMLButtonElement>document.getElementById("connectbtn");
        btn.disabled = connected;
        btn = <HTMLButtonElement>document.getElementById("fblogin");
        btn.disabled = connected;
        btn.hidden = !DemoFbAppId;
        btn = <HTMLButtonElement>document.getElementById("disconnectbtn");
        btn.disabled = !connected;
        btn = document.getElementById("newgame");
        btn.disabled = !this.isJoinedToRoom()
        btn = document.getElementById("newtrivial");
        btn.disabled = !this.isJoinedToRoom()

    }
}

class Output {
    public static logger = new Exitgames.Common.Logger();

    static log(str: string, ...op: any[]) {
        var log = document.getElementById("log");
        var formatted = this.logger.formatArr(str, op);
        var newLine = document.createElement('div');
        newLine.textContent = formatted;
        log.appendChild(newLine);
        log.scrollTop = log.scrollHeight;
    }
}

class DemoRoom extends Photon.LoadBalancing.Room {
    constructor(private demo: Demo, name: string) {
        super(name);
        this.variety = GameProperties.variety;
        this.columnCount = GameProperties.columnCount;
        this.iconUrls = GameProperties.icons;
    }

    // acceess properties every time
    public variety = 0;
    public columnCount = 0;
    public rowCount() {
        return Math.ceil(2 * this.variety / this.columnCount)
    }
    public iconUrls = {};
    public icons = {};
    public iconUrl(i: number) {
        return this.iconUrls[i];
    }
    public icon(i: number) {
        return this.icons[i];
    }

    public onPropertiesChange(changedCustomProps: any, byClient?: boolean) {
        //case DemoConstants.EvGameStateUpdate:
        if (changedCustomProps.game) {

            var game = this.getCustomProperty("game");

            var t = document.getElementById("gamestate");
            t.textContent = JSON.stringify(game);
            t = document.getElementById("nextplayer");
            t.textContent = "";
            var turnsLeft = 0;
            for (var i = 0; i < game.nextPlayerList.length; i++) {
                if (turnsLeft == 0 && game.nextPlayerList[i] == this.demo.myActor().getId()) {
                    turnsLeft = i;
                }
                t.textContent += " " + game.nextPlayerList[i];
            }
            var t = document.getElementById("info");
            t.textContent = turnsLeft == 0 ? "Your turn now!" : "Wait " + turnsLeft + " turn(s)";

            if (game.nextPlayer == this.demo.myActor().getId()) {
                this.demo.updateAutoplay(this.demo);
            }
        }

        // case DemoConstants.EvPlayersUpdate:
        if (changedCustomProps.game || changedCustomProps.playersStats) {
            var game = this.getCustomProperty("game");
            var playersStats = this.getCustomProperty("playersStats") || {};

            var list = document.getElementById("players");
            while (list.firstChild) {
                list.removeChild(list.firstChild);
            }
            
            for (let i in game.players) {
                var id = game.players[i];
                var item = document.createElement("li");
                item.attributes["value"] = id;
                var d = game.playersData[id];
                var s = playersStats && playersStats[id];
                item.textContent = d.name + " / " + id + ": " + d.hitCount + " / " + (d.hitCount + d.missCount) + (s ? " [" + s.hitCount + " / " + (s.hitCount + s.missCount) + " / " + s.gamesPlayed + "]" : "");
                item.title = "Player id: " + id + ", name: " + d.name + "\nCurrent game: hits = " + d.hitCount + ", clicks = " + (d.hitCount + d.missCount) + (s ? "\n Totals: games played = " + s.gamesPlayed + ", hits = " + s.hitCount + ", clicks = " + (s.hitCount + s.missCount) : "");
                list.appendChild(item);
            }
        }
    }

    public loadResources(stage: createjs.Stage) {
        for (var i = 0; i < this.variety; ++i) {
            var img = new Image();
            this.icons[i] = img;
            img.onload = function () {
                Output.log("Image " + img.src + " loaded");
                stage.update();
            };
            img.src = this.iconUrl(i);
        }
    }

}

class DemoPlayer extends Photon.LoadBalancing.Actor {
    constructor(private demo: Demo, name: string, actorNr: number, isLocal: boolean) {
        super(name, actorNr, isLocal);
    }
    public getId() {
        return this.getCustomProperty("id");
    }
    public getName() {
        return this.getCustomProperty("name");
    }
    public onPropertiesChange(changedCustomProps: any) {
        if (this.isLocal) {
            document.title = this.getName() + " / " + this.getId() + " Pairs Game (Master Client)";
        }
        this.demo.updatePlayerOnlineList();
    }

    public setInfo(id: string, name: string) {
        this.demo.setUserId(id);
        this.setCustomProperty("id", id);
        this.setCustomProperty("name", name);
    }
}

var loadBalancingClient;
window.onload = () => {
  loadBalancingClient = new Demo(<HTMLCanvasElement>document.getElementById("canvas"));
    loadBalancingClient.start();
};