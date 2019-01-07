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
//    StartAddress: "start server address:port",
//    AppId: "your app id",
//    AppVersion: "your app version",
//}
// fetching app info global variable while in global context
var DemoWss = this["AppInfo"] && this["AppInfo"]["Wss"];
var DemoAppId = this["AppInfo"] && this["AppInfo"]["AppId"] ? this["AppInfo"]["AppId"] : "<no-app-id>";
var DemoAppVersion = this["AppInfo"] && this["AppInfo"]["AppVersion"] ? this["AppInfo"]["AppVersion"] : "1.0";
var UserCount = 10;
var DemoConstants = {
    ChannelsToSubscribe: ["a", "b", "c"],
    ChannelsToUnsubscribe: ["a", "b", "c", "z"],
    InitialUserId: "user" + Math.floor(UserCount * Math.random()),
    FriendList: function () {
        var res = [];
        for (var i = 0; i < UserCount; i++)
            res.push("user" + i);
        return res;
    }(),
    LogLevel: Exitgames.Common.Logger.Level.INFO
};
var ChatDemo = /** @class */ (function (_super) {
    __extends(ChatDemo, _super);
    function ChatDemo(canvas) {
        var _this = _super.call(this, DemoWss ? Photon.ConnectionProtocol.Wss : Photon.ConnectionProtocol.Ws, DemoAppId, DemoAppVersion) || this;
        _this.canvas = canvas;
        _this.logger = new Exitgames.Common.Logger("Demo:", DemoConstants.LogLevel);
        _this.prevChannelsIds = {};
        // uncomment to use Custom Authentication
        // this.setCustomAuthentication("username=" + "yes" + "&token=" + "yes");
        Output.log("[i]", "Init", _this.getNameServerAddress(), DemoAppId, DemoAppVersion);
        _this.logger.info("Init", _this.getNameServerAddress(), DemoAppId, DemoAppVersion);
        _this.setLogLevel(DemoConstants.LogLevel);
        return _this;
    }
    // overrides
    ChatDemo.prototype.onError = function (errorCode, errorMsg) {
        if (errorCode == Photon.Chat.ChatClient.ChatPeerErrorCode.FrontEndAuthenticationFailed) {
            errorMsg = errorMsg + " with appId = " + DemoAppId;
        }
        this.logger.error(errorCode, errorMsg);
        Output.log("[i]", "Error", errorCode, errorMsg);
    };
    ChatDemo.prototype.onStateChange = function (state) {
        this.logger.info("State: ", state);
        var stateText = document.getElementById("statetxt");
        stateText.textContent = Photon.Chat.ChatClient.StateToName(state);
        var ChatClientState = Photon.Chat.ChatClient.ChatState;
        if (state == ChatClientState.ConnectedToFrontEnd) {
            Output.log("[i]", "---- connected to Front End\n", "[Subscribe] for public channels or type in 'userid@message' and press 'Send' for private");
        }
        var disconnected = state == ChatClientState.Uninitialized || state == ChatClientState.Disconnected;
        if (disconnected) {
            Output.log("[i]", "type in user id and press [Connect]");
        }
    };
    ChatDemo.prototype.onChatMessages = function (channelName, messages) {
        for (var i in messages) {
            var m = messages[i];
            var sender = m.getSender();
            if (sender == this.getUserId()) {
                sender = "me";
            }
            Output.log('[' + channelName + ':' + sender + ']', m.getContent());
        }
        var ch = chatClient.getPublicChannels()[channelName];
        this.prevChannelsIds[channelName] = ch.getLastId();
    };
    ChatDemo.prototype.onPrivateMessage = function (channelName, m) {
        var sender = m.getSender();
        if (sender == this.getUserId()) {
            sender = "me";
        }
        Output.log('[' + channelName + '@' + sender + ']', m.getContent());
    };
    ChatDemo.prototype.onUserStatusUpdate = function (userId, status, gotMessage, statusMessage) {
        var msg = statusMessage;
        if (!gotMessage) {
            msg = "[message skipped]";
        }
        Output.log("[i]", userId + ": " + Photon.Chat.Constants.UserStatusToName(status) + "(" + status + ") / " + msg);
    };
    ChatDemo.prototype.onSubscribeResult = function (results) {
        this.logger.info("onSubscribeResult", results);
        var m = "---- subscribed to ";
        for (var ch in results) {
            this.logger.info("    ", ch, results[ch]);
            if (results[ch]) {
                m = m + "'" + ch + "', ";
            }
        }
        Output.log("[i]", m, "\ntype in 'channel:message' and press 'Send' to publish");
    };
    ChatDemo.prototype.onUnsubscribeResult = function (results) {
        this.logger.info("onUnsubscribeResult", results);
        var m = "unsubscribed from ";
        for (var ch in results) {
            this.logger.info("    ", ch, results[ch]);
            m = m + "'" + ch + "', ";
        }
        Output.log("[i]", m);
    };
    ChatDemo.prototype.onOperationResponse = function (errorCode, errorMsg, code, content) {
        if (errorCode != 0) {
            Output.log('[i]', "error: " + errorMsg + '(op ' + code + ')');
        }
    };
    ChatDemo.prototype.demoConnect = function () {
        var userid = document.getElementById("userid").value;
        this.setUserId(userid);
        this.connectToRegionFrontEnd('EU');
    };
    ChatDemo.prototype.demoSubscribe = function () {
        var pc = this.prevChannelsIds;
        var ids = DemoConstants.ChannelsToSubscribe.map(function (x) { return pc[x] || 0; });
        if (chatClient.subscribe(DemoConstants.ChannelsToSubscribe, { /* historyLength: 10 ,*/ lastIds: ids })) {
            Output.log("[i]", "subscribing...");
            if (this.addFriends(DemoConstants.FriendList)) {
                Output.log("[i]", "adding friends:" + DemoConstants.FriendList.join(","));
            }
        }
        else {
            Output.log("[i]", "error: subscribe send failed. [Connect] first?");
        }
    };
    ChatDemo.prototype.demoUnsubscribe = function () {
        if (chatClient.unsubscribe(DemoConstants.ChannelsToUnsubscribe)) {
            Output.log("[i]", "unsubscribing...");
            if (this.removeFriends(DemoConstants.FriendList)) {
                Output.log("[i]", "clearing friends:" + DemoConstants.FriendList.join(","));
            }
        }
    };
    ChatDemo.prototype.demoSendMessage = function () {
        var input = document.getElementById("input");
        var text = input.value;
        var chDelim = text.indexOf(":");
        var userDelim = text.indexOf("@");
        if (chDelim != -1) {
            var ch = text.substring(0, chDelim);
            var t = text.substring(chDelim + 1);
            this.publishMessage(ch, t);
            this.logger.info("publish: ", ch, t);
        }
        else if (userDelim != -1) {
            var u = text.substring(0, userDelim);
            var t = text.substring(userDelim + 1);
            this.sendPrivateMessage(u, t);
            this.logger.info("send private: ", u, t);
        }
        else {
            var exists = false;
            for (var chName in this.getPublicChannels()) {
                this.publishMessage(chName, text);
                this.logger.info("publish: ", chName, text);
                exists = true;
                break;
            }
            if (!exists) {
                Output.log("[i]", "error: no subscribed channels");
            }
        }
    };
    return ChatDemo;
}(Photon.Chat.ChatClient));
var Output = /** @class */ (function () {
    function Output() {
    }
    Output.log = function (str) {
        var op = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            op[_i - 1] = arguments[_i];
        }
        var log = document.getElementById("log");
        var formatted = this.logger.formatArr(str, op);
        var newLine = document.createElement('div');
        newLine.textContent = formatted;
        log.appendChild(newLine);
        log.scrollTop = log.scrollHeight;
    };
    Output.logger = new Exitgames.Common.Logger();
    return Output;
}());
var chatClient;
window.onload = function () {
    chatClient = new ChatDemo(document.getElementById("canvas"));
    chatClient.onStateChange(Photon.Chat.ChatClient.ChatState.Uninitialized);
    var userid = document.getElementById("userid");
    userid.value = DemoConstants.InitialUserId;
    var s = Photon.Chat.Constants.UserStatus.Offline;
    var setuserstatus = document.getElementById("setuserstatus");
    while (true) {
        var n = Photon.Chat.Constants.UserStatusToName(s);
        if (n === undefined)
            break;
        var b = document.createElement("button");
        setuserstatus.appendChild(b);
        b.textContent = n;
        b.addEventListener("click", (function (s, n) {
            return function (ev) {
                if (!chatClient.setUserStatus(s, "hey, i'm " + n)) {
                    //                if (!chatClient.setUserStatus(s, null, true) { // skip message
                    //                if (!chatClient.setUserStatus(s) { // clear message
                    Output.log("[i]", "error: status send failed. [Connect] first?");
                }
                else
                    Output.log("[i]", "my status sent: " + n);
            };
        })(s, n));
        s = s + 1;
    }
};
