/// <reference path="3rdparty/easeljs.d.ts" />          
/// <reference path="Photon/Photon-Javascript_SDK.d.ts"/> 

// For Photon Cloud Application access create cloud-app-info.js file in the root directory (next to default.html) and place next lines in it:
//var AppInfo = {
//    StartAddress: "start server address:port",
//    AppId: "your app id",
//    AppVersion: "your app version",
//}

// fetching app info global variable while in global context
var ParticleDemoWss = this["AppInfo"] && this["AppInfo"]["Wss"];
var ParticleDemoAppId = this["AppInfo"] && this["AppInfo"]["AppId"] ? this["AppInfo"]["AppId"] : "<no-app-id>";
var ParticleDemoAppVersion = this["AppInfo"] && this["AppInfo"]["AppVersion"] ? this["AppInfo"]["AppVersion"] : "1.0";
var ParticleDemoFbAppId = this["AppInfo"] && this["AppInfo"]["FbAppId"];

var DemoConstants =
{
    /// <summary>(1) Event defining a color of a player.</summary>
    EvColor: 1,

    /// <summary>(2) Event defining the position of a player.</summary>
    EvPosition: 2,

    /// <summary>("s") Property grid size currently used in this room.</summary>
    GridSizeProp: "s",

    /// <summary>("m") Property map (map / level / scene) currently used in this room.</summary>
    MapProp: "m",

    /// <summary>Types available as map / level / scene.</summary>
    MapType: { Forest: "Forest", Town: "Town", Sea: "Sea" },

    GroupsPerAxis : 2,

    GridSizeDefault: 16,
    GridSizeMin: 4,
    GridSizeMax: 256,

    TickInterval: 500,

    LogLevel: Exitgames.Common.Logger.Level.INFO,
}

class ParticleDemo extends Photon.LoadBalancing.LoadBalancingClient {


    public useGroups: boolean = false;
    public automove: boolean = false;

    // connect to random room or create new one automatocally 
    // close button click sets this to false
    public autoconnect: boolean = true;

    private masterStart: boolean = false; // set to true to connect directly to default master
    constructor(private canvas: HTMLCanvasElement) {
        super(ParticleDemoWss ? Photon.ConnectionProtocol.Wss : Photon.ConnectionProtocol.Ws, ParticleDemoAppId, ParticleDemoAppVersion);

        var addr = this.masterStart ? this.getMasterServerAddress() : this.getNameServerAddress();

        Output.log("Init", addr, ParticleDemoAppId, ParticleDemoAppVersion);
        this.logger.info("Init", addr, ParticleDemoAppId, ParticleDemoAppVersion);
        this.setLogLevel(DemoConstants.LogLevel);
        this.myActor().setName("ts" + Math.floor(Math.random() * 100));
    }

    logger = new Exitgames.Common.Logger("Demo:", DemoConstants.LogLevel);

    // overrides
    roomFactory(name: string) { return new ParticleRoom(name); }
    actorFactory(name: string, actorNr: number, isLocal: boolean) { return new ParticlePlayer(this, name, actorNr, isLocal); }
    myRoom() { return <ParticleRoom>super.myRoom(); }
    myActor() { return <ParticlePlayer>super.myActor(); }
    myRoomActors() { return <ParticleRoom>super.myRoomActors(); }

    private timerToken: number;

    start() {
        this.stage = new createjs.Stage(this.canvas);
        this.setupUI();
        this.updateCellSize();

        // connect if no fb auth required 
        if (!ParticleDemoFbAppId) {           
            this.setCustomAuthentication("username=" + "yes" + "&token=" + "yes");
            if (this.masterStart) { // Master Server
                this.connect({ keepMasterConnection: true });
            }
            else { // Name Server
                this.connectToRegionMaster("EU"); 
                //            this.connectToNameServer(); 
            }
        }

        this.setupScene();

        this.timerToken = setInterval(() => {
//            if (this.isJoinedToRoom()) {
                this.tick();
//            }
        }, DemoConstants.TickInterval);
    }
    stop() {
        clearTimeout(this.timerToken);
    }
    tick() {
        for (var a in this.myRoomActors()) {
            // comment to freeze all
            this.myRoomActors()[a].tick();
        }
        this.stage.update();
    }

    // overrides
    onError(errorCode: number, errorMsg: string) {
        Output.log("Error", errorCode, errorMsg);
        // optional super call
        super.onError(errorCode, errorMsg);
    }

    onFindFriendsResult(errorCode: number, errorMsg: string, friends: any) {
        Output.log("onFindFriendsResult", errorCode, errorMsg);
        for (var name in friends) {
            var f = friends[name];
            Output.log("  ", name, f.online, f.roomId);
        }
    }

//    onAppStats(errorCode: number, errorMsg: string, stats: any) {
//        Output.log("onAppStats", errorCode, errorMsg, stats);
//    }

    onLobbyStats(errorCode: number, errorMsg: string, lobbies: any) {
        Output.log("onLobbyStats", errorCode, errorMsg, lobbies);
    }

    onOperationResponse(errorCode: number, errorMsg: string, code: number, content: any) {
        if (errorCode) {
            switch (code) {
                case Photon.LoadBalancing.Constants.OperationCode.JoinRandomGame:
                    switch (errorCode) {
                        case Photon.LoadBalancing.Constants.ErrorCode.NoRandomMatchFound:
                            Output.log("Join Random:", errorMsg);
                            this.createParticleDemoRoom();
                            break
                        default:
                            Output.log("Join Random:", errorMsg);
                            break;
                    }
                    break;
                default:
                    Output.log("Operation Response error:", errorCode, errorMsg, code, content);
                    break;
            }
        }
    }

    onEvent(code: number, content: any, actorNr: number) {
        switch (code) {
            case DemoConstants.EvColor:
                var color = content[1];
                var p = <ParticlePlayer>(this.myRoomActors()[actorNr]);
                p.setColor(color);
                break;
            case DemoConstants.EvPosition:
                var p = <ParticlePlayer>(this.myRoomActors()[actorNr]);
                p.move(content[1][0], content[1][1]);
                Output.logger.debug("Actor", actorNr, "Pos:", content[1][0], content[1][1]);
                break;

            default:
            }
        this.logger.debug("onEvent", code, "content:", content, "actor:", actorNr);
    }

    onWebRpcResult(errorCode: number, message: string, uriPath: string, resultCode: number, data: {}) {
        Output.log("onWebRpcResult:", errorCode, message, uriPath, resultCode, data);
    }

    onGetRegionsResult(errorCode: number, errorMsg: string, regions: {}) {
        Output.log("onGetRegionsResult:", errorCode, errorMsg, regions);
    }

    onStateChange(state: number) {
        // "namespace" import for static members shorter acceess
        var LBC = Photon.LoadBalancing.LoadBalancingClient;

        var stateText = document.getElementById("statetxt");
        stateText.textContent = LBC.StateToName(state);
        if (state == LBC.State.Joined) {
            stateText.textContent = stateText.textContent + " " + this.myRoom().name;
        }
        switch (state) {
            case LBC.State.ConnectedToNameServer:
                this.getRegions();
                this.connectToRegionMaster("EU");
                break;
            case LBC.State.ConnectedToMaster:
//                this.webRpc("GetGameList");
                break;
            case LBC.State.JoinedLobby:
                if (this.autoconnect) {
                    Output.log("joining random room...");
                    this.joinRandomRoom();
                }
                break;
            default:
                break;
        }
        this.updateRoomButtons();
    }

    onRoomListUpdate(rooms: Photon.LoadBalancing.RoomInfo[], roomsUpdated: Photon.LoadBalancing.RoomInfo[], roomsAdded: Photon.LoadBalancing.RoomInfo[], roomsRemoved: Photon.LoadBalancing.RoomInfo[]) {
        Output.log("onRoomListUpdate", rooms, roomsUpdated, roomsAdded, roomsRemoved);
        this.updateRoomListMenu(rooms);
        this.updateRoomButtons(); // join btn state can be changed
    }

    onRoomList(rooms: Photon.LoadBalancing.RoomInfo[]) {
        this.updateRoomListMenu(rooms);
        this.updateRoomButtons();
    }

    onMyRoomPropertiesChange() {
        this.setupScene();
    }

    onJoinRoom() {
        this.logger.info("onJoinRoom myRoom", this.myRoom());
        this.logger.info("onJoinRoom myActor", this.myActor());
        this.logger.info("onJoinRoom myRoomActors", this.myRoomActors());
        this.updatePlayerList();
        this.setupScene();
        this.myActor().raiseColorEvent();

        this.updateGroups();
    }

    onActorJoin(actor: Photon.LoadBalancing.Actor) {
        Output.log("actor " + actor.actorNr + " joined");
        this.updatePlayerList();
        var p = <ParticlePlayer>actor;
        p.setVisual(new ParticlePlayerVisual(this.stage, p, this.cellWidth, this.cellHeight));
    }

    onActorLeave(actor: Photon.LoadBalancing.Actor) {
        var p = <ParticlePlayer>actor;
        if (!p.isLocal) {
            p.clearVisual();
        }
        Output.log("actor " + actor.actorNr + " left");
        this.updatePlayerList();
    }

    // tools
    private createParticleDemoRoom() {
        Output.log("New Game");
        this.createRoomFromMy();
    }

    private updateGroups() {
        Output.log("updateGroups", this.useGroups);
        if (this.isJoinedToRoom()) {
            if (this.useGroups) {
                this.changeGroups([], [this.myActor().group()]);
            }
            else {
                this.changeGroups([], null);
            }
        }
    }

    //scene
    private stage: createjs.Stage;
    private shape: createjs.Shape;

    private cellWidth = 1;
    private cellHeight = 1;

    private updateCellSize() {
        this.cellWidth = Math.floor(this.canvas.width / this.myRoom().gridSize());
        this.cellHeight = Math.floor(this.canvas.height / this.myRoom().gridSize());
    }

    private bgColor = 'rgba(240,240,240,255)';
    private gridColor = 'rgba(180,180,180,255)';
    private checkerColor = 'rgba(210,210,210,255)';

    private checker = new createjs.Container();

    private setupScene() {        
        this.stage.removeAllChildren();
        this.updateCellSize();

        this.stage.removeAllChildren();

        this.drawBg();
        this.drawChecker();
        this.drawGrid();

        for (var aNr in this.myRoomActors()) {

            var p = <ParticlePlayer>this.myRoomActors()[aNr];
            p.setVisual(new ParticlePlayerVisual(this.stage, p, this.cellWidth, this.cellHeight));
        }

        this.stage.update();
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
        for (var i = 0; i < this.myRoom().gridSize() + 1; ++i) {
            var x = i * this.cellWidth;
            var y = i * this.cellHeight;
            grid.graphics.setStrokeStyle(1);
            grid.graphics.beginStroke(this.gridColor).moveTo(x, 0).lineTo(x, h);
            grid.graphics.beginStroke(this.gridColor).moveTo(0, y).lineTo(w, y);
        }
        this.stage.addChild(grid);
    }

    private drawChecker() {
        this.checker.removeAllChildren();
        for (var x = 0; x < DemoConstants.GroupsPerAxis; ++x) {
            for (var y = 0; y < DemoConstants.GroupsPerAxis; ++y) {
                if ((x % 2) != (y % 2)) {
                    var square = new createjs.Shape();
                    var x0 = this.cellWidth * Math.ceil(x * this.myRoom().gridSize() / DemoConstants.GroupsPerAxis);
                    var y0 = this.cellHeight * Math.ceil(y * this.myRoom().gridSize() / DemoConstants.GroupsPerAxis);
                    var x1 = this.cellWidth * Math.ceil((x + 1) * this.myRoom().gridSize() / DemoConstants.GroupsPerAxis);
                    var y1 = this.cellHeight * Math.ceil((y + 1) * this.myRoom().gridSize() / DemoConstants.GroupsPerAxis);
                    square.graphics.beginFill(this.checkerColor).drawRect(x0, y0, x1 - x0, y1 - y0);
                    this.checker.addChild(square);
                }
            }
        }
        this.stage.addChild(this.checker);
        this.updateCheckerVisibility();

    }

    public updateCheckerVisibility() {
        this.checker.visible = this.useGroups;
    }

    nextGridSize() {
        var s = this.myRoom().gridSize();
        s = s << 1;
        if (s > DemoConstants.GridSizeMax) {
            s = DemoConstants.GridSizeMin;
        }
        Output.log("nextGridSize:", this.myRoom().gridSize() + " -> " + s);
        this.myRoom().setCustomProperty(DemoConstants.GridSizeProp, s);
    }

    // ui
    private setupUI() {
        this.stage.addEventListener("stagemousedown", (ev) => {
            var x = Math.floor(this.stage.mouseX / this.cellWidth);
            var y = Math.floor(this.stage.mouseY / this.cellHeight);
            this.myActor().moveLocal(x, y);
            this.stage.update();
        })

        var btn = <HTMLButtonElement>document.getElementById("newgamebtn");
        btn.onclick = (ev) => {
            if (this.isInLobby()) {
                this.createParticleDemoRoom();
            }
            else {
                Output.log("Reload page to connect to Master");
            }
            return false;
        }
        btn = <HTMLButtonElement>document.getElementById("joinbtn");
        btn.onclick = (ev) => {
            if (this.isInLobby()) {
                var menu = <HTMLSelectElement>document.getElementById("gamelist");
                if (menu.selectedIndex >= 0 && menu.selectedIndex < this.availableRooms().length) {
                    var gameId = this.availableRooms()[menu.selectedIndex].name;
                    Output.log("Join Game", gameId);
                    this.joinRoom(gameId, { rejoin: (<HTMLInputElement>document.getElementById("rejoin")).checked });
                }
                else {
                    Output.log("No Rooms to Join");
                }
            }
            else {
                Output.log("Reload page to connect to Master");
            }
            return false;
        }
        btn = <HTMLButtonElement>document.getElementById("leavebtn");
        btn.onclick = (ev) => {
            this.autoconnect = false;
            if ((<HTMLInputElement>document.getElementById("rejoin")).checked) {
                Output.log("Suspending...");
                this.suspendRoom();
            }
            else {
                Output.log("Leaving...");
                this.leaveRoom();
            }
            return false;
        }
        btn = <HTMLButtonElement>document.getElementById("gridsize");
        btn.onclick = (ev) => {
            this.nextGridSize();
            this.setupScene();
            return false;
        }
        btn = <HTMLButtonElement>document.getElementById("randomcolor");
        btn.onclick = (ev) => {
            this.myActor().setRandomColor();
            this.stage.update();
            return false;
        }

        var checkBox = <HTMLInputElement>document.getElementById("usegroups");
        this.useGroups = checkBox.checked;
        checkBox.onclick = (ev) => {
            this.useGroups = ev.currentTarget["checked"];
            this.updateGroups();
            this.updateCheckerVisibility();
        }
        checkBox = <HTMLInputElement>document.getElementById("automove");
        this.automove = checkBox.checked
        checkBox.onclick = (ev) => {
            this.automove = ev.currentTarget["checked"];
        }

        this.updateRoomButtons();
    }
    private updateRoomListMenu(rooms: Photon.LoadBalancing.RoomInfo[]) {
        Output.log("onRoomList", rooms);

        var menu = document.getElementById("gamelist");
        while (menu.firstChild) {
            menu.removeChild(menu.firstChild);
        }
        var selectedIndex = 0;

        for (var i = 0; i < rooms.length; ++i) {
            var r = rooms[i];
            var item = document.createElement("option");
            item.attributes["value"] = r.name;
            item.textContent = r.name + "/" + r.getCustomProperty(DemoConstants.MapProp) + "/" + r.getCustomProperty(DemoConstants.GridSizeProp);
            menu.appendChild(item);
            if (this.myRoom().name == r.name) {
                selectedIndex = i;
            }
            Output.log("room:", r);
        }
        (<HTMLSelectElement>menu).selectedIndex = selectedIndex;
        Output.log("Rooms total: " + rooms.length);
    }
    private updatePlayerList() {
        var list = document.getElementById("playerlist");
        while (list.firstChild) {
            list.removeChild(list.firstChild);
        }
        for (var i in this.myRoomActors()) {
            var a = this.myRoomActors()[i];
            var item = document.createElement("li");
            item.attributes["value"] = a.name;
            item.textContent = a.name + "/" + a.actorNr;
            if (a.isLocal) {
                item.textContent = item.textContent + " <-";
            }
            list.appendChild(item);
        }
    }
    private updateRoomButtons() {
        var btn;
        btn = <HTMLButtonElement>document.getElementById("newgamebtn");
        btn.disabled = !this.isInLobby();
        btn = <HTMLButtonElement>document.getElementById("joinbtn");
        btn.disabled = !(this.isInLobby() && this.availableRooms().length > 0);
        btn = <HTMLButtonElement>document.getElementById("leavebtn");
        btn.disabled = !this.isJoinedToRoom();
    }
    public requestLobbyStatsDemo() {
        var lobbies = <HTMLInputElement>document.getElementById('lobbiesToRequest');
        var param = undefined;
        if (lobbies.value) {
            var larr = lobbies.value.split(',');
            if (larr) {
                param = larr.map(function (nt) { var x: any[] = nt.split(":"); if (x[1]) x[1] = parseInt(x[1]); return x; });
            }
        }
        this.requestLobbyStats(param);
        return false;
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

class ParticleRoom extends Photon.LoadBalancing.Room {
    constructor (name: string) {
        super(name);
        this.setCustomProperty(DemoConstants.MapProp, DemoConstants.MapType.Forest);
        this.setCustomProperty(DemoConstants.GridSizeProp, DemoConstants.GridSizeDefault);
        this.setPropsListedInLobby([DemoConstants.MapProp]);
        this.setEmptyRoomLiveTime(10000);
        this.setSuspendedPlayerLiveTime(10000);
    }

    // acceess properties every time
    public mapType() { return this.getCustomPropertyOrElse(DemoConstants.MapProp, DemoConstants.MapType.Forest); }
    
    // cached property value
    public gridSize() { return this._gridSize; }
    // grid size cache
    private _gridSize:number;
    
    public onPropertiesChange(changedCustomProps: any) { 
        // optional: check if size prop in changedCustomProps
        this._gridSize = this.getCustomPropertyOrElse(DemoConstants.GridSizeProp, this._gridSize); 
    }

    public setGridSize(value: number) {
        this.setCustomProperty(DemoConstants.GridSizeProp, value);
    }
}

class ParticlePlayerVisual {
    constructor (private stage: createjs.Stage, private player: ParticlePlayer, private cellWidth: number, private cellHeight: number) {
        this.updateShape(player.color, 0, 0);
    }
    private root: createjs.Container;
    private shape: createjs.Shape;
    private text: createjs.Text;
    public updateShape(color: number, x: number, y: number) {
        var scolor = Util.toRgbString(color);
        this.clear();
        this.root = new createjs.Container;
        this.stage.addChild(this.root);
        this.shape = new createjs.Shape();
        this.shape.graphics.beginFill(scolor).drawRect(1, 1, this.cellWidth - 2, this.cellHeight - 2);
        if (this.player.isLocal) {
            this.shape.graphics.beginStroke("black").drawRect(1, 1, this.cellWidth - 2, this.cellHeight - 2);
        }
        this.root.addChild(this.shape);
        this.text = new createjs.Text("init");
        this.root.addChild(this.text);

        this.update(x, y);
    }
    public clear() {
        if (this.root) {
            this.stage.removeChild(this.root);
            this.root = null;
        }
    }
    update(x: number, y: number) {
        this.root.alpha = 255;
        this.root.x = x * this.cellWidth;
        this.root.y = y * this.cellHeight;
    }
    setAlpha(a: number) {
        this.root.alpha = a;
    }
    updateText(text: string) {
        if (this.text) {
            this.text.text = text;
        }
    }
}

class ParticlePlayer extends Photon.LoadBalancing.Actor {
    constructor (private game: ParticleDemo, name: string, actorNr: number, isLocal: boolean) {
        super(name, actorNr, isLocal);
    }
    public getRoom() { return <ParticleRoom>super.getRoom(); }

    public x = 0;
    public y = 0;
    public color = Util.randomColor(100);

    setVisual(visual: ParticlePlayerVisual) {
        this.visual = visual;
        this.visual.update(this.x, this.y);
        this.updateText();
    }
    clearVisual() {
        if (this.visual) {
            this.visual.clear();
        }
    }
    setRandomColor() {
        this.setColor(Util.randomColor(100));
        this.raiseColorEvent();
    }
    setColor(color: number) {
        this.color = color;
        this.visual.updateShape(color, this.x, this.y);
        this.updateText();
    }
    private visual: ParticlePlayerVisual;

    move(x: number, y: number) {
        this.x = x;
        this.y = y;
        this._group = this.getGroupByPos();
        if (this.visual) {
            this.visual.update(this.x, this.y);
            this.updateText();
        }
        this.lastUpdateTime = Date.now();
    }
    private updateText() {
        this.visual.updateText(this.name + "/" + this.actorNr + "\n" + this.group());
    }
    tick() {
        if (this.isLocal) {
            this.tickLocal();
        }
        else {
            this.tickRemote();
        }
    }

    private tickRemote() {
        var t = Date.now() - this.lastUpdateTime;
        if (t > 2000) {

            this.visual.setAlpha(Math.max(0.1,( 2000 + 5000 - t) / 5000));
        }
        else {
            this.visual.setAlpha(1);
        }
    }
    private tickLocal() {
        if (this.game.isJoinedToRoom()) {
            if (this.getRoom()) {
                if (this.game.automove) {
                    var d = Math.floor(Math.random() * 8);
                    var s = this.getRoom().gridSize();
                    var x = this.x + [-1, 0, 1, -1, 1, -1, 0, 1][d];
                    var y = this.y + [1, 1, 1, 0, 0, -1, -1, -1][d];
                    if (x < 0) x = 1;
                    if (x >= s) x = s - 2;
                    if (y < 0) y = 1;
                    if (y >= s) y = s - 2;
                    this.moveLocal(x, y);
                }
            }
        }
    }
    moveLocal(x: number, y: number) {
        this.x = x;
        this.y = y;
        var newGroup = this.getGroupByPos();
        if (newGroup !== this._group) {
            this._group = newGroup;
            if (this.game.useGroups) {
                this.game.changeGroups([], [this.group()]);
            }
        }
        this.raiseEvent(DemoConstants.EvPosition, { 1: [this.x, this.y] }, { interestGroup: this.game.useGroups ? this.group() : undefined });

        this.move(x, y);

    }
    raiseColorEvent() {
        this.raiseEvent(DemoConstants.EvColor, { 1: this.color }, { cache: Photon.LoadBalancing.Constants.EventCaching.AddToRoomCache });

    }
    private lastUpdateTime = Date.now();
    private _group = 1;
    public group() { return this._group; }

    private getGroupByPos() {
        var xp = Math.floor(this.x * DemoConstants.GroupsPerAxis / this.getRoom().gridSize());
        var yp = Math.floor(this.y * DemoConstants.GroupsPerAxis / this.getRoom().gridSize());
        return (1 + xp + yp * DemoConstants.GroupsPerAxis);
    }
}

class Util {
    static toRgbString(color: number) {
        var ucolor = ((0x100000000 + color) % 0x100000000);
//        var scolor = "rgba(" + ((ucolor >> 16) & 255) + "," + ((ucolor >> 8) & 255) + "," + (ucolor & 255) + "," + ((ucolor >> 24) & 255) + ")";
        var scolor = "rgba(" + ((ucolor >> 16) & 255) + "," + ((ucolor >> 8) & 255) + "," + (ucolor & 255) + ",255)";
        return scolor;
    }
    static randomColor(from: number = 0, to: number = 256) {
        //(255 << 24) + (255 << 16) + (200 << 8) + 200
        var rnd = () => Math.floor(from + (to - from)*Math.random());
        return (rnd() << 16) + (rnd() << 8) + rnd();
    }
}

var loadBalancingClient;
window.onload = () => {
    loadBalancingClient = new ParticleDemo(<HTMLCanvasElement>document.getElementById("canvas"));
    loadBalancingClient.start();
};