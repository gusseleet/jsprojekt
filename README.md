## README

### What is gchat?
gchat is a chat application similar to IRC. It uses mainly JavaScript, node.js and socket.io.

### How to install
Before you do anything, be sure that you have node.js installed and working. You can use webpacks build-in webserver.


Clone this project and then run ``` npm install```. This command will download all dependencies. 
 
 You can run ```npm start``` to start the application in developer mode (this will also run ```webpack --watch ``` and ``` node ``` command).
  Or you can use ```npm run package``` to package everything for  production. 
  
### Dependencies

    "bootstrap3-dialog": "^1.35.3"
    "linkifyjs": "^2.1.3"
    "node-cryptojs-aes": "^0.4.0"
    "markdown": "^0.5.0"
    "socket.io": "^1.7.2"
    "showdown": "^1.5.5"
    "webpack": "^1.14.0"