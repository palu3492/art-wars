/// <reference path="Photon/Photon-Javascript_SDK.d.ts"/> 
// Game logic runs on one of the conected clients - master client~
// Server Lua Extension Scripts port (see demo-pairs)
// map and mapProgress arrays start for 1 because of lua origial source (and may be compatibility)
var GameProperties = {
    variety: 8,
    columnCount: 4,
    cardShowTimeout: 1000,
    moveTimeoutSec: 10,
    icons: [
        "resources/game-icons/angler-fish.png",
        "resources/game-icons/crown.png",
        "resources/game-icons/drink-me.png",
        "resources/game-icons/fishbone.png",
        "resources/game-icons/glass-heart.png",
        "resources/game-icons/horse-head.png",
        "resources/game-icons/robe.png",
        "resources/game-icons/rocket.png",
    ]
};
var MasterClient = /** @class */ (function () {
    function MasterClient(client) {
        this.client = client;
        this.logger = new Exitgames.Common.Logger("MC:", Exitgames.Common.Logger.Level.DEBUG);
        this.flushPropsFlag = false; // set this flag to send props update
        this.logger.info("Created");
    }
    // Master is client with smallest actorNr
    // TODO: cache it and update only on changes
    MasterClient.prototype.isMaster = function () {
        var myActorNr = this.client.myActor().actorNr;
        for (var i in this.client.myRoomActors()) {
            if (parseInt(i) < myActorNr) {
                return false;
            }
        }
        return true;
    };
    // sends to all including itself
    MasterClient.prototype.broadcast = function (eventCode, data, options) {
        this.logger.debug("broadcast", eventCode);
        this.client.raiseEventAll(eventCode, data, options);
    };
    MasterClient.prototype.cacheProps = function () {
        var room = this.client.myRoom();
        this.flushPropsFlag = false;
        this.game = room.getCustomProperty("game");
        this.state = room.getCustomProperty("state") || {};
        // websocket empty object send bug workaround
        // TODO: remove after fix
        this.state = this.state || {};
        if (this.game) {
            this.game.players = this.game.players || new Array();
            this.game.playersData = this.game.playersData || {};
            this.game.mapProgress = this.game.mapProgress || new Array();
        }
        //
    };
    MasterClient.prototype.flushProps = function () {
        // websocket empty object send bug workaround
        // TODO: remove after fix
        if (this.state && Object.keys(this.state).length == 0)
            this.state = null;
        if (this.game) {
            if (Object.keys(this.game).length == 0)
                this.game = null;
            else {
                if (this.game.players && Object.keys(this.game.players).length == 0)
                    this.game.players = null;
                if (this.game.playersData && Object.keys(this.game.playersData).length == 0)
                    this.game.playersData = null;
                if (this.game.mapProgress && Object.keys(this.game.mapProgress).length == 0)
                    this.game.mapProgress = null;
            }
        }
        //        
        if (this.flushPropsFlag) {
            var room = this.client.myRoom();
            room.setCustomProperty("game", this.game);
            room.setCustomProperty("state", this.state);
        }
    };
    MasterClient.prototype.onJoinRoom = function () {
        if (!this.isMaster())
            return;
        this.logger.debug("onJoinRoom");
        this.cacheProps();
        if (!this.game) {
            this.logger.info("Creating new game...");
            this.InitGame();
        }
        // handle client's actor join same way as others
        this.onPlayerJoin(this.client.myActor());
        this.flushProps();
    };
    MasterClient.prototype.onActorJoin = function (actor) {
        if (!this.isMaster())
            return;
        this.logger.debug("onActorJoin", actor.actorNr);
        this.cacheProps();
        this.onPlayerJoin(actor);
        this.flushProps();
    };
    MasterClient.prototype.onActorLeave = function (actor) {
        if (!this.isMaster())
            return;
        this.logger.debug("onActorLeave", actor.actorNr);
        this.cacheProps();
        var room = this.client.myRoom();
        this.flushPropsFlag = false;
        var id = actor.getCustomProperty("id");
        this.logger.info("Next:", id, this.game.nextPlayer);
        if (id == this.game.nextPlayer) {
            this.ResetShownCards();
        }
        this.NextPlayer(0);
        this.flushProps();
    };
    MasterClient.prototype.onPlayerJoin = function (actor) {
        if (!this.isMaster())
            return;
        this.logger.debug("onPlayerJoin", actor.actorNr);
        var actorInfo = { name: actor.getCustomProperty("name") };
        var id = actor.getCustomProperty("id");
        var actors = this.client.myRoomActors();
        for (var n in actors) {
            var a = actors[n];
            if (a.actorNr !== actor.actorNr && a.getCustomProperty("id") === id) {
                var msg = "Player " + id + " already connected";
                this.broadcast(DemoConstants.EvDisconnectOnAlreadyConnected, null, { targetActors: [actor.actorNr] });
                this.logger.info("onPlayerJoin", msg);
                return;
            }
        }
        // TODO: player load
        var returning = false;
        for (var i in this.game.players) {
            var iid = this.game.players[i];
            if (id == iid) {
                returning = true;
                break;
            }
        }
        if (!returning) {
            this.logger.info("Player ", id, " added to game");
            this.game.players.push(id);
            this.GamePlayerDataInit(id, actorInfo);
        }
        else {
            this.logger.info("Player ", id, " returned to game");
            this.GamePlayerDataUpdate(id, actorInfo);
        }
        this.NextPlayer(0);
        this.flushPropsFlag = true;
    };
    MasterClient.prototype.onEvent = function (code, content, actorNr) {
        if (!this.isMaster())
            return;
        this.cacheProps();
        switch (code) {
            case DemoConstants.EvClick:
                this.OnMoveEvent(actorNr, code, content);
                break;
            case DemoConstants.EvNewGame:
                this.OnNewGameEvent(actorNr, code, content);
                break;
        }
        this.flushProps();
    };
    MasterClient.prototype.onStateChange = function (state) {
        if (!this.isMaster())
            return;
    };
    MasterClient.prototype.onOperationResponse = function (errorCode, errorMsg, code, content) {
        if (!this.isMaster())
            return;
    };
    MasterClient.prototype.OnMoveEvent = function (actorNr, evCode, inData) {
        this.logger.debug("OnMoveEvent");
        var id = this.client.myRoomActors()[actorNr].getCustomProperty("id");
        if (this.game.nextPlayer == id) {
            var card = inData["card"];
            if (card >= 1 && card <= GameProperties.variety * 2) {
                if (!this.game.mapProgress[card]) {
                    if (this.state.click1 != card) {
                        this.game.moveCount = this.game.moveCount + 1;
                        var icon = this.game.map[card];
                        var tmp = {};
                        tmp[card] = icon;
                        var data = new Object;
                        data["cards"] = tmp;
                        data["match"] = false;
                        if (this.state.click1 && this.state.click2) {
                            this.ResetShownCards(card);
                        }
                        else if (this.state.click1 && this.game.map[this.state.click1] == this.game.map[card]) {
                            data["match"] = true;
                            this.logger.info("Match");
                            this.game.playersData[id].hitCount = this.game.playersData[id].hitCount + 1;
                            this.game.mapProgress[card] = icon;
                            this.game.mapProgress[this.state.click1] = icon;
                            //					        timer.stop(user.clickTimer)
                            this.state.clickTimer = null;
                            this.state.click1 = null;
                            var tot = 0;
                            for (var i = 1; i <= GameProperties.variety * 2; ++i) {
                                if (this.game.mapProgress[i]) {
                                    tot = tot + 1;
                                }
                            }
                            if (tot == GameProperties.variety * 2) {
                                this.logger.info("Game complete", tot, this.game.mapProgress);
                                for (var ii in this.game.mapProgress) {
                                    this.logger.info("[" + ii + "]=" + this.game.mapProgress[ii]);
                                }
                                this.OnGameComplete();
                            }
                            else {
                                this.logger.info("Game to go", tot, GameProperties.variety * 2);
                            }
                            this.ResetMoveTimer(id);
                        }
                        else if (this.state.click1) {
                            this.state.click2 = card;
                            this.game.playersData[id].missCount = this.game.playersData[id].missCount + 1;
                            data["resetShown"] = { cards: [this.state.click1, this.state.click2] };
                            this.NextPlayer(1);
                            //                            this.state.clickTimer = timer.create(
                            //                                this.ResetShownCards,
                            //                                GameProperties.cardShowTimeout
                            //                            )
                        }
                        else {
                            this.state.click1 = card;
                        }
                        this.broadcast(DemoConstants.EvShowCards, data);
                        this.flushPropsFlag = true;
                    }
                    else {
                        this.broadcast(DemoConstants.EvClickDebug, { msg: "Card " + card + " is shown currently" }, { targetActors: [actorNr] });
                    }
                }
                else {
                    this.broadcast(DemoConstants.EvClickDebug, { msg: "Card " + card + " already opened" }, { targetActors: [actorNr] });
                }
            }
            else {
                this.broadcast(DemoConstants.EvClickDebug, { msg: "Card " + card + " is out of range" }, { targetActors: [actorNr] });
            }
        }
        else {
            this.broadcast(DemoConstants.EvClickDebug, { msg: "Not your turn" }, { targetActors: [actorNr] });
        }
    };
    MasterClient.prototype.ResetShownCards = function (click1) {
        //timer.stop(user.clickTimer)
        //this.state.clickTimer = nil
        this.broadcast(DemoConstants.EvHideCards, { cards: [this.state.click1, this.state.click2] });
        this.state.click1 = click1;
        this.state.click2 = null;
    };
    MasterClient.prototype.OnGameComplete = function () {
        var room = this.client.myRoom();
        var playersStats = room.getCustomProperty("playersStats") || {};
        var playersData = this.game.playersData;
        for (var i in this.game.players) {
            var id = this.game.players[i];
            this.logger.info("Updating player", id, "stats");
            this.UpdatePlayerStats(id, playersStats, playersData);
        }
        room.setCustomProperty("playersStats", playersStats);
    };
    MasterClient.prototype.UpdatePlayerStats = function (id, playersStats, playersData) {
        if (!playersStats[id]) {
            playersStats[id] = {};
        }
        var stats = playersStats[id];
        stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
        stats.hitCount = (stats.hitCount || 0) + playersData[id].hitCount;
        stats.missCount = (stats.missCount || 0) + playersData[id].missCount;
        var data = {};
        data["id"] = id;
        data["gamesPlayed"] = stats.gamesPlayed;
        data["hitCount"] = stats.hitCount;
        data["missCount"] = stats.missCount;
        // SavePlayer
    };
    MasterClient.prototype.ResetMoveTimer = function (nextPlayer) {
        //TODO
    };
    MasterClient.prototype.NextPlayer = function (turns) {
        var onlineIds = {};
        for (var actorNr in this.client.myRoomActors()) {
            var actor = this.client.myRoomActors()[actorNr];
            var id = actor.getCustomProperty("id");
            onlineIds[id] = true;
        }
        var players = this.game.players;
        var count = players.length;
        var current = 0;
        for (var i = 0; i < players.length; ++i) {
            if (this.game.nextPlayer == players[i]) {
                current = i;
                this.logger.debug("NextPlayer", "current=", current);
                break;
            }
        }
        this.game.nextPlayer = null;
        this.game.nextPlayerList = new Array();
        var first = true;
        for (var i = 0; i < players.length; ++i) {
            var ii = (current + turns + i) % count;
            if (onlineIds[players[ii]]) {
                if (first) {
                    first = false;
                    this.game.nextPlayer = players[ii];
                }
                this.game.nextPlayerList.push(players[ii]);
            }
            this.logger.info("Next Player:", this.game.nextPlayer, ", next player list:", this.game.nextPlayerList.join(","));
            this.ResetMoveTimer(this.game.nextPlayer);
        }
    };
    MasterClient.prototype.OnNewGameEvent = function (actorNr, evCode, data) {
        this.logger.debug("OnNewGameEvent");
        var actors = this.client.myRoomActors();
        var id = actors[actorNr].getCustomProperty("id");
        this.logger.info("New Game request from " + id);
        var trivial = data && data.trivial;
        this.broadcast(DemoConstants.EvHideCards, { all: true }); // hide cards
        // put all online players in game
        var players = new Array();
        for (var a in actors) {
            players.push(actors[a].getId());
        }
        this.InitGame(trivial, players);
        this.ResetShownCards();
    };
    MasterClient.prototype.InitGame = function (trivial, players) {
        this.logger.info("Game Init");
        var prevPlayersData = this.game && this.game.playersData || {};
        this.game = {};
        this.state = {};
        this.game.id = "TheOnlyGame";
        this.game.players = players || new Array();
        this.game.playersData = {};
        for (var i in this.game.players) {
            var id = this.game.players[i];
            this.GamePlayerDataInit(id, prevPlayersData[id]);
        }
        this.game.moveCount = 0;
        this.game.map = this.GenerateMap(trivial);
        this.game.mapProgress = new Array();
        this.NextPlayer(0);
        // wait until animation ends
        //        this.state.ignoreClientEvents = true
        //timer.create(
        //    function () user.ignoreClientEvents = nil end,
        //    3000
        //    )
        //// show and hide all cards at once
        //room.broadcast(105, { cards = user.this.game.map })
        //timer.create(
        //                function () room.broadcast(106, {all = true }) end,
        //                1500
        //                )
        //// show and hide all cards one by one
        //for i = 1, user.GameProperties().variety * 2 do
        //            timer.create(
        //                function () room.broadcast(105, {cards = {[i] = user.this.game.map[i] }}) end,
        //		500 + i*50
        //	)
        //	timer.create( 
        //		function() room.broadcast(106, { cards = {i }}) end,
        //500 + i * 50 + 1500
        //	)
        //end	
        this.flushPropsFlag = true;
    };
    MasterClient.prototype.GenerateMap = function (trivial) {
        this.logger.info("Generating map...", trivial);
        var m = {};
        var put = {};
        var nCards = GameProperties.variety * 2;
        var todo = new Array();
        for (var i = 1; i <= nCards; ++i) {
            todo[i] = i;
        }
        for (var i = 1; i <= nCards; ++i) {
            var j;
            if (trivial) {
                j = 1;
            }
            else {
                j = Math.floor(Math.random() * (nCards - i + 1)) + 1;
            }
            m[i] = Math.floor((todo[j] + 1) / 2); // project to pairs
            todo.splice(j, 1);
        }
        this.logger.info("Map generated:");
        for (var k in m) {
            this.logger.info(k, m[k]);
        }
        return m;
    };
    MasterClient.prototype.GamePlayerDataInit = function (id, data) {
        this.game.playersData[id] = {
            id: id, name: data && data.name,
            hitCount: 0,
            missCount: 0
        };
    };
    MasterClient.prototype.GamePlayerDataUpdate = function (id, data) {
        this.game.playersData[id].name = data && data.name;
    };
    return MasterClient;
}());
