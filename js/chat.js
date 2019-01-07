
function sendChat() {
    if(!yourTurn && !photon.myActor().getCustomProperty('guessed')) {
        var chatInput = document.getElementById("chat-input");
        var msg = chatInput.value;
        if (msg) {
            chatInput.value = "";
            msg = photon.myActor().name + ": " + msg;
            addMsg(msg, true, false);
            if(!guessWord(msg)) {
                photon.raiseEvent(10, msg);
            }
        }
    }
}

function addMsg(msg, local, admin){
    var chatBox = document.getElementById("chat");
    var p = document.createElement("p");
    p.style.wordWrap = 'break-word';
    p.style.margin = "4px";
    p.style.marginLeft = "6px";
    p.style.color = "red";
    if(local){
        p.style.color = "green";
    } else if(admin){
        p.style.color = 'orange';
    }
    p.innerHTML = msg;
    chatBox.appendChild(p);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function notifyChat(msg){
    addMsg(msg, false, true);
}