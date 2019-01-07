

document.addEventListener("DOMContentLoaded", function(){


    var nameInput = document.getElementById("name");
    nameInput.addEventListener("keyup", function(event) {
        event.preventDefault();
        if (event.key === "Enter") {
            document.getElementById("play").click();
        }
    });

    var chatInput = document.getElementById("chat-input");
    chatInput.addEventListener("keyup", function(event) {
        event.preventDefault();
        if (event.key === "Enter") {
            document.getElementById("send").click();
        }
    });
    createAvatars();
    changeAvatarImages();

    var name = getCookie('name');
    if(name){
        document.getElementById("name").innerHTML = name;
    }
});

function changeAvatar(el){
    var av = document.getElementById("avatar-selected");
    av.style.backgroundImage = el.style.backgroundImage;
    hideAvatar();
}

function changeAvatarBox(){
    var avatarSelect = document.getElementById("avatar-select");
    avatarSelect.style.display = 'block';
}

function hideAvatar(){
    var avatarSelect = document.getElementById("avatar-select");
    avatarSelect.style.display = 'none';
}

function createAvatars(){
    var avatars = document.getElementById("avatar-select");
    var html = "<div class='avatar avatar-all'></div>";
    for(var i=1; i<31; i++){
        var el = createElementFromHTML(html);
        if(i%6 === 0){
            el.style.marginRight = 0;
        }
        if(i < 7){
            el.style.marginTop = 0;
        }
        avatars.appendChild(el);
    }
}
function changeAvatarImages(){
    var avatars = document.getElementById("avatar-select").childNodes;
    var urls = ['panda.png', 'bear.png', 'buffalo.png', 'chick.png', 'chicken.png', 'cow.png', 'crocodile.png', 'dog.png', 'duck.png', 'elephant.png', 'frog.png', 'giraffe.png', 'goat.png', 'gorilla.png', 'hippo.png', 'horse.png', 'monkey.png', 'moose.png', 'narwhal.png', 'owl.png', 'parrot.png', 'penguin.png', 'pig.png', 'rabbit.png', 'rhino.png', 'sloth.png', 'snake.png', 'walrus.png', 'whale.png', 'zebra.png'];
    var w = 0;
    for(var i=0; i<avatars.length; i++){
        var av = avatars[i];
        if(av.tagName === 'DIV'){
            var url = "url('assets/avatars/final/" + urls[w++] + "')";
            av.style.backgroundImage = url;
            av.addEventListener('click', function() { changeAvatar(this) }, false);
        }
    }
}

function createElementFromHTML(htmlString) {
    var div = document.createElement('div');
    div.innerHTML = htmlString.trim();
    //  div.childNodes
    return div.firstChild;
}

function getCookie(cname) {
    var ca = document.cookie.split('=');
    var value = "";
    if(ca[0]){
        value = ca[1];
    }
    return value;
}
function setCookie(cname, cvalue) {
    document.cookie = cname + "=" + cvalue;
}