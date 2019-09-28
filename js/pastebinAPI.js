let serialize = function(obj) {
    var str = [];
    for (var p in obj)
        if (obj.hasOwnProperty(p)) {
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
        }
    return str.join("&");
};

function postToPastebin(content) {
    let currentdate = new Date();
    let dateAndTime = currentdate.getDate() + "/"
        + (currentdate.getMonth()+1)  + "/"
        + currentdate.getFullYear() + " @ "
        + currentdate.getHours() + ":"
        + currentdate.getMinutes() + ":"
        + currentdate.getSeconds();

    var xhr = new XMLHttpRequest();
    let pastebinApiUrl = 'https://cors-anywhere.herokuapp.com/https://pastebin.com/api/api_post.php';
    xhr.open("POST", pastebinApiUrl, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.setRequestHeader('x-requested-with', 'https://palu3492.github.io/Art-Wars/');
    let requestBody = {
        api_dev_key: '26338589f548f136db10773ec3eecbed',
        api_option: 'paste',
        api_paste_code: content, // Content of paste
        api_paste_name: 'Art Wars Drawing | '+ dateAndTime, // Title of paste
        api_paste_private: '1',
        api_user_key: '83f22f57b6e93b11a6964506361da438', // Login
    };
    xhr.send(serialize(requestBody));
}

function saveImageToPastebin(){
    var canvas = document.getElementById('draw');
    var uri = canvas.toDataURL("image/png");
    postToPastebin(uri);
}