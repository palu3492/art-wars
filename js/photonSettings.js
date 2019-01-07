var appId = "08e64793-77ae-4af7-ae5f-4efaa5e7732f";
var appVersion = "1.0";
var connectOnStart = true;
var connectRegion = "us";
var protocol = ("https:" === document.location.protocol) ? Photon.ConnectionProtocol.Wss : Photon.ConnectionProtocol.Ws;
var photon = new GameLoadBalancing();
photon.start();
document.addEventListener("DOMContentLoaded", function(){
    photon.setupUI();
});