"use strict";

function Crypt (){

    //var crypto = require('crypto-js');
    var crypto = require('crypto');
    var node_cryptojs = require('node-cryptojs-aes');
    var r_pass = null;
    var r_pass_base64 = null;
    var cryptoJS = node_cryptojs.CryptoJS;
    var JsonFormatter = node_cryptojs.JsonFormatter;
    generatePass();



    function generatePass(){
        r_pass = crypto.randomBytes(128);
        r_pass_base64 = r_pass.toString("base64");

    }

    function encypt(message){
        return cryptoJS.AES.encrypt(message, r_pass_base64, {format: JsonFormatter}).toString();

    }

    function decrypt(message){
        var decrytp = cryptoJS.AES.decrypt(message, r_pass_base64, { format: JsonFormatter });
        return cryptoJS.enc.Utf8.stringify(decrytp);
    }


    return {
        encrypt: encypt,
        decrypt: decrypt
    }

}


module.exports = Crypt;

