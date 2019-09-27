
function testPastebin() {
    var xhr = new XMLHttpRequest();
    let pastebinApiUrl = 'https://cors-anywhere.herokuapp.com/https://pastebin.com/api/api_post.php';
    xhr.open("POST", pastebinApiUrl, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.setRequestHeader('x-requested-with', 'https://palu3492.github.io/Art-Wars/');
    let requestBody = {
        api_dev_key: '26338589f548f136db10773ec3eecbed',
        api_option: 'paste',
        api_paste_code: 'Artwars', // Content of paste
        api_paste_name: 'Artwars test', // Title of paste
        api_paste_private: '1',
        api_user_key: '83f22f57b6e93b11a6964506361da438', // Login
    };
    xhr.send(JSON.stringify(requestBody));
    console.log(xhr);
    xhr.onload = function() {
        if (xhr.status != 200) { // analyze HTTP status of the response
            alert(`Error ${xhr.status}: ${xhr.statusText}`); // e.g. 404: Not Found
        } else { // show the result
            alert(`Done, got ${xhr.response.length} bytes`); // responseText is the server
        }
    };

    xhr.onprogress = function(event) {
        if (event.lengthComputable) {
            alert(`Received ${event.loaded} of ${event.total} bytes`);
        } else {
            alert(`Received ${event.loaded} bytes`); // no Content-Length
        }

    };

    xhr.onerror = function() {
        alert("Request failed");
    };
}