 'use strict';

    var callback = null;
    var apiKey = null;

    function uploadImg(img){
        $.ajax({
            url: 'https://api.imgur.com/3/image',
            type: 'POST',
            headers: {
                Authorization: 'Client-ID ' + apiKey,
                Accept: 'application/json'
            },
            data: {
                image: img,
                type: 'base64'
            },
            success: function(result) {
                var id = result.data.id;
                callback(id);
            }
        });
    }
    function pasteHandler(e){
        if (e.clipboardData) {
            var items = e.clipboardData.items;
            if (items) {
                for (var i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf("image") !== -1) {

                        var blob = items[i].getAsFile();
                        var reader = new FileReader();

                        reader.onload = function(event){
                            parseSoruce(event.target.result);
                        };

                        reader.readAsDataURL(blob);

                    }
                }
            }

        }
    }

    function parseSoruce(soruce){
        var a = soruce.replace(/^(\S+)base64,/, "");
        uploadImg(a);
    }
    function bindEvents(){
        window.addEventListener("paste", pasteHandler);
    }

    var setCallback =  function (c) {
        callback = c;
    };

    var setApiKey =  function(a){
        apiKey = a;
    };
    var init = function(){
        bindEvents();
    };


module.exports = {
    init: init,
    setCallback: setCallback,
    setApiKey: setApiKey
};
