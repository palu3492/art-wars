
function testPastebin() {
    var xhr = new XMLHttpRequest();
    let pastebinApiUrl = 'https://pastebin.com/api/api_post.php';
    xhr.open("POST", pastebinApiUrl, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
    let requestBody = {
        api_dev_key: '26338589f548f136db10773ec3eecbed',
        api_option: 'paste',
        api_paste_code: 'Artwars', // Content of paste
        api_paste_name: 'Artwars test', // Title of paste
        api_paste_private: '1',
        api_user_key: '83f22f57b6e93b11a6964506361da438', // Login
    };
    xhr.send(JSON.stringify(requestBody));
}