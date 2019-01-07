/// <reference path="Photon/Photon-Javascript_SDK.d.ts"/> 
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
// For Photon Cloud Application access create cloud-app-info.js file in the root directory (next to default.html) and place next lines in it:
//var AppInfo = {
//    MasterAddress: "master server address:port",
//    AppId: "your app id",
//    AppVersion: "your app version",
//}
// fetching app info global variable while in global context
var DemoWss = this["AppInfo"] && this["AppInfo"]["Wss"];
var DemoAppId = this["AppInfo"] && this["AppInfo"]["AppId"] ? this["AppInfo"]["AppId"] : "<no-app-id>";
var DemoAppVersion = this["AppInfo"] && this["AppInfo"]["AppVersion"] ? this["AppInfo"]["AppVersion"] : "1.0";
var DemoMasterServer = this["AppInfo"] && this["AppInfo"]["MasterServer"];
var DemoFbAppId = this["AppInfo"] && this["AppInfo"]["FbAppId"];
var ConnectOnStart = false;
var DemoLoadBalancing = /** @class */ (function (_super) {
    __extends(DemoLoadBalancing, _super);
    function DemoLoadBalancing() {
        var _this = _super.call(this, DemoWss ? Photon.ConnectionProtocol.Wss : Photon.ConnectionProtocol.Ws, DemoAppId, DemoAppVersion) || this;
        _this.logger = new Exitgames.Common.Logger("Demo:");
        _this.USERCOLORS = ["#FF0000", "#00AA00", "#0000FF", "#FFFF00", "#00FFFF", "#FF00FF"];
        // uncomment to use Custom Authentication
        // this.setCustomAuthentication("username=" + "yes" + "&token=" + "yes");
        _this.output(_this.logger.format("Init", _this.getNameServerAddress(), DemoAppId, DemoAppVersion));
        _this.logger.info("Init", _this.getNameServerAddress(), DemoAppId, DemoAppVersion);
        _this.setLogLevel(Exitgames.Common.Logger.Level.INFO);
        _this.myActor().setCustomProperty("color", _this.USERCOLORS[0]);
        return _this;
    }
    DemoLoadBalancing.prototype.start = function () {
        this.setupUI();
        // connect if no fb auth required 
        if (ConnectOnStart) {
            if (DemoMasterServer) {
                this.setMasterServerAddress(DemoMasterServer);
                this.connect();
            }
            else {
                this.connectToRegionMaster("EU");
            }
        }
    };
    DemoLoadBalancing.prototype.onError = function (errorCode, errorMsg) {
        this.output("Error " + errorCode + ": " + errorMsg);
    };
    DemoLoadBalancing.prototype.onEvent = function (code, content, actorNr) {
        switch (code) {
            case 1:
                var mess = content.message;
                var sender = content.senderName;
                if (actorNr)
                    this.output(sender + ": " + mess, this.myRoomActors()[actorNr].getCustomProperty("color"));
                else
                    this.output(sender + ": " + mess);
                break;
            default:
        }
        this.logger.debug("onEvent", code, "content:", content, "actor:", actorNr);
    };
    DemoLoadBalancing.prototype.onStateChange = function (state) {
        // "namespace" import for static members shorter acceess
        var LBC = Photon.LoadBalancing.LoadBalancingClient;
        var stateText = document.getElementById("statetxt");
        stateText.textContent = LBC.StateToName(state);
        this.updateRoomButtons();
        this.updateRoomInfo();
    };
    DemoLoadBalancing.prototype.objToStr = function (x) {
        var res = "";
        for (var i in x) {
            res += (res == "" ? "" : " ,") + i + "=" + x[i];
        }
        return res;
    };
    DemoLoadBalancing.prototype.updateRoomInfo = function () {
        var stateText = document.getElementById("roominfo");
        stateText.innerHTML = "room: " + this.myRoom().name + " [" + this.objToStr(this.myRoom()._customProperties) + "]";
        stateText.innerHTML = stateText.innerHTML + "<br>";
        stateText.innerHTML += " actors: ";
        stateText.innerHTML = stateText.innerHTML + "<br>";
        for (var nr in this.myRoomActors()) {
            var a = this.myRoomActors()[nr];
            stateText.innerHTML += " " + nr + " " + a.name + " [" + this.objToStr(a.customProperties) + "]";
            stateText.innerHTML = stateText.innerHTML + "<br>";
        }
        this.updateRoomButtons();
    };
    DemoLoadBalancing.prototype.onActorPropertiesChange = function (actor) {
        this.updateRoomInfo();
    };
    DemoLoadBalancing.prototype.onMyRoomPropertiesChange = function () {
        this.updateRoomInfo();
    };
    DemoLoadBalancing.prototype.onRoomListUpdate = function (rooms, roomsUpdated, roomsAdded, roomsRemoved) {
        this.logger.info("Demo: onRoomListUpdate", rooms, roomsUpdated, roomsAdded, roomsRemoved);
        this.output("Demo: Rooms update: " + roomsUpdated.length + " updated, " + roomsAdded.length + " added, " + roomsRemoved.length + " removed");
        this.onRoomList(rooms);
        this.updateRoomButtons(); // join btn state can be changed
    };
    DemoLoadBalancing.prototype.onRoomList = function (rooms) {
        var menu = document.getElementById("gamelist");
        while (menu.firstChild) {
            menu.removeChild(menu.firstChild);
        }
        var selectedIndex = 0;
        for (var i = 0; i < rooms.length; ++i) {
            var r = rooms[i];
            var item = document.createElement("option");
            item.attributes["value"] = r.name;
            item.textContent = r.name;
            menu.appendChild(item);
            if (this.myRoom().name == r.name) {
                selectedIndex = i;
            }
        }
        menu.selectedIndex = selectedIndex;
        this.output("Demo: Rooms total: " + rooms.length);
        this.updateRoomButtons();
    };
    DemoLoadBalancing.prototype.onJoinRoom = function () {
        this.output("Game " + this.myRoom().name + " joined");
        this.updateRoomInfo();
    };
    DemoLoadBalancing.prototype.onActorJoin = function (actor) {
        this.output("actor " + actor.actorNr + " joined");
        this.updateRoomInfo();
    };
    DemoLoadBalancing.prototype.onActorLeave = function (actor) {
        this.output("actor " + actor.actorNr + " left");
        this.updateRoomInfo();
    };
    DemoLoadBalancing.prototype.sendMessage = function (message) {
        try {
            this.raiseEvent(1, { message: message, senderName: "user" + this.myActor().actorNr });
            this.output('me[' + this.myActor().actorNr + ']: ' + message, this.myActor().getCustomProperty("color"));
        }
        catch (err) {
            this.output("error: " + err.message);
        }
    };
    DemoLoadBalancing.prototype.setupUI = function () {
        var _this = this;
        this.logger.info("Setting up UI.");
        var input = document.getElementById("input");
        input.value = 'hello';
        input.focus();
        var btnJoin = document.getElementById("joingamebtn");
        btnJoin.onclick = function (ev) {
            if (_this.isInLobby()) {
                var menu = document.getElementById("gamelist");
                var gameId = menu.children[menu.selectedIndex].textContent;
                _this.output(gameId);
                _this.joinRoom(gameId);
            }
            else {
                _this.output("Reload page to connect to Master");
            }
            return false;
        };
        var btnJoin = document.getElementById("joinrandomgamebtn");
        btnJoin.onclick = function (ev) {
            if (_this.isInLobby()) {
                _this.output("Random Game...");
                _this.joinRandomRoom();
            }
            else {
                _this.output("Reload page to connect to Master");
            }
            return false;
        };
        var btnNew = document.getElementById("newgamebtn");
        btnNew.onclick = function (ev) {
            if (_this.isInLobby()) {
                var name = document.getElementById("newgamename");
                _this.output("New Game");
                _this.createRoom(name.value.length > 0 ? name.value : undefined);
            }
            else {
                _this.output("Reload page to connect to Master");
            }
            return false;
        };
        var form = document.getElementById("mainfrm");
        form.onsubmit = function () {
            if (_this.isJoinedToRoom()) {
                var input = document.getElementById("input");
                _this.sendMessage(input.value);
                input.value = '';
                input.focus();
            }
            else {
                if (_this.isInLobby()) {
                    _this.output("Press Join or New Game to connect to Game");
                }
                else {
                    _this.output("Reload page to connect to Master");
                }
            }
            return false;
        };
        var btn = document.getElementById("leavebtn");
        btn.onclick = function (ev) {
            _this.leaveRoom();
            return false;
        };
        btn = document.getElementById("colorbtn");
        btn.onclick = function (ev) {
            var ind = Math.floor(Math.random() * _this.USERCOLORS.length);
            var color = _this.USERCOLORS[ind];
            _this.myActor().setCustomProperty("color", color);
            _this.sendMessage("... changed his / her color!");
        };
        this.updateRoomButtons();
    };
    DemoLoadBalancing.prototype.output = function (str, color) {
        var log = document.getElementById("theDialogue");
        var escaped = str.replace(/&/, "&amp;").replace(/</, "&lt;").
            replace(/>/, "&gt;").replace(/"/, "&quot;");
        if (color) {
            escaped = "<FONT COLOR='" + color + "'>" + escaped + "</FONT>";
        }
        log.innerHTML = log.innerHTML + escaped + "<br>";
        log.scrollTop = log.scrollHeight;
    };
    DemoLoadBalancing.prototype.updateRoomButtons = function () {
        var btn;
        btn = document.getElementById("newgamebtn");
        btn.disabled = !(this.isInLobby() && !this.isJoinedToRoom());
        var canJoin = this.isInLobby() && !this.isJoinedToRoom() && this.availableRooms().length > 0;
        btn = document.getElementById("joingamebtn");
        btn.disabled = !canJoin;
        btn = document.getElementById("joinrandomgamebtn");
        btn.disabled = !canJoin;
        btn = document.getElementById("leavebtn");
        btn.disabled = !(this.isJoinedToRoom());
    };
    return DemoLoadBalancing;
}(Photon.LoadBalancing.LoadBalancingClient));
var demo;
window.onload = function () {
    demo = new DemoLoadBalancing();
    demo.start();
};
