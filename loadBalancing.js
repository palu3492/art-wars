class GameLoadBalancing extends Photon.LoadBalancing.LoadBalancingClient {
    constructor() {
        super(protocol, appId, appVersion);
    }

    start() {
        if (connectOnStart) {
            this.connectToRegionMaster(connectRegion);
        }
    }

    onError (errorCode, errorMsg) {
        console.log("Error " + errorCode + ": " + errorMsg);
    };

    setupUI() {

        var _this = this;

        var playButton = document.getElementById("play");
        playButton.onclick = function () {
            var name = document.getElementById('name').value;
            // var name = "Alex";
            if (name && name.length < 13 &&_this.isInLobby() && (_this.availableRooms().length === 0 || _this.availableRooms()[0].playerCount < 20)) {
                setCookie('name', name);
                _this.myActor().setName(name);
                var av = document.getElementById('avatar-selected').style.backgroundImage;
                _this.myActor().setCustomProperty('avatar', av);
                if (_this.availableRooms().length > 0) {
                    _this.joinRandomRoom();
                } else {
                    _this.createRoom();
                }
                document.getElementById("main").style.display = "grid";
                document.getElementById("choose-name").style.display = "none";
                setupCanvas();
            }
        };
    }

    onActorJoin(actor){
        actorJoined(actor);
    }

    onActorLeave(actor){
        actorLeft(actor);
    }
}