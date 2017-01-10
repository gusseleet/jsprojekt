'use strict';

var app = require('http').createServer(handler);
var io = require('socket.io')(app);


app.listen(1337);

function handler(req, res) {
    fs.readFile(__dirname + 'index.php',
        function(err, data) {
            if (err) {
                res.writeHead(500);
                return res.end('Error loading index.php');
            }

            res.writeHead(200);
            res.end(data);
        });
}



var fs = require('fs');
var markdown = require('markdown').markdown;
var linkifyHtml = require('linkifyjs/html');
// // var Crypt = require('./crypt.js');
//
//
// var express = require('express');
// var app = express();
// var cookieParser = require('cookie-parser');
// var session = require('express-session');
//
//
// // app.use(express.static('public'));
// app.use("/", express.static(__dirname));
// app.use(cookieParser());
// app.use(session({
//     secret: 'keyboard cat',
//     resave: false,
//     saveUninitialized: true,
//     cookie: { maxAge: 60000, secure: true }
// }));
//
//
//
//
// app.get('/dbwebb/javascript/me/kmom10/public/', function (req, res) {
//     // Cookies that have not been signed
//     console.log('Cookies: ', req.cookies);
//
//     // Cookies that have been signed
//     console.log('Signed Cookies: ', req.signedCookies);
// });
//
// var server = app.listen(1337);
// var io = require('socket.io')(server);


/**
 *
 * @type {object} - Holds all users
 */
var users = {};

/**
 *
 * @type {Array} - Holds all rooms and all users in that room, 2D array
 */
var rooms = [];
var adminCommands = ['/kick'];

io.on('connection', function(socket) {
    // console.log(socket);

    socket.on('setupSocket', function(data) {
        data.username = handleUnieqName(data.username, data.channel);
        // console.log(socket);
        console.log(socket.handshake.headers.cookie);
        /**
         *
         * @type {Array} - Name of all initated pms
         */
        socket.pmSession = [];
        socket.pmSessionRoom = [];

        /**
         *
         * @type {Array} - Name of all rooms joined
         */
        socket.allRooms = [];
        socket.username = data.username;

        users[data.username] = {
            username: data.username,
            socket: socket
        };

        setupServerChannel();

        handleJoin(data.channel);
        handleHelp('#gel-server');
        setupSocketEmits();
        emitServerMessage('Psst, use the command /switch 0.');
    });

    function setupServerChannel() {
        socket.emit('new channel', '#gel-server');
        socket.allRooms.push('#gel-server');
    }

    function setupSocketEmits() {
        socket.on('message', handleMessage);
        socket.on('disconnect', disconnect);
        socket.on('leaveChannel', leaveChannel);
        socket.on('change channel', changeChannel);
        socket.on('img uploaded', imgHandler);
    }

    function imgHandler(data) {
        console.log(data);
        data = linkifyHtml(data);
        IOemitToCurrentChannel(data);
    }


    //Socket functions

    /**
     * Change the current channel via the socket
     * @param {object} data - Data with channel in it
     */

    function changeChannel(data) {
        socket.currentChannel = data.channel;

    }

    /**
     * @summary Removes all rooms connected to the socket
     *
     */

    function disconnect() {
        var i = socket.allRooms.length;

        while (i--) {
            if (socket.allRooms[i] !== "#gel-server")
                leaveChannel(socket.allRooms[i], channelMode(socket.allRooms[i]));
        }
        delete users[socket.username];
        socket.disconnect();

    }

    function handleMessage(data) {
        var message = parseMessage(data);

        var adminInfo = getAdminInfo(rooms[socket.currentChannel]);

        if (adminInfo !== false) {
            if (adminCommand(message.command, message.message, adminInfo, adminInfo) && message.serverCurrent === false)
                return;
        }

        userCommand(message.command, message.message, message.org, message.serverCurrent);
    }

    function parseMessage(data) {
        var command = '';
        var message = '';

        var serverCurrent = socket.currentChannel === '#gel-server';

        if (data.message.charAt(0) === '/') {
            var spaces = (data.message.match(/ /g) || []).length;
            if (spaces === 0) {
                command = data.message;
                message = '';
            } else {
                command = data.message.substring(0, data.message.indexOf(' '));
                message = data.message.substring(data.message.indexOf(' ') + 1, data.message.length);
            }
        } else {
            command = null;
            message = data.message;
        }

        message = linkifyHtml(message);

        return {
            command: command,
            message: message,
            org: data.message,
            serverCurrent: serverCurrent
        };

    }

    function adminCommand(command, message, adminInfo) {

        for (var i = 0; i < adminCommands.length; i++) {
            if (adminCommands[i] === command && adminInfo.admin === socket.username) {
                executeAdminCommand(command, message);
                return true;
            } else if (adminCommands[i] === command && adminInfo.admin !== socket.username) {
                emitServerMessage('You need to be admin to execute this command.');
                return true;
            }
        }

        return false;
    }

    //TODO: Fixa bugg om användaren enbart skriver /pm username och inte något meddelande
    //TODO: Lägg till switch
    function userCommand(command, message, data, server) {


        if (command !== null) {
            switch (command) {
                case '/help':
                    handleHelp();
                    break;
                case '/join':
                    handleJoin(message);
                    break;
                case '/pm':
                    handlePM(data, server);
                    break;
                case '/close':
                    handleClose(message);
                    break;
                case '/switch':
                    handleSwitch(message);
                    break;
                default:
                    emitServerMessage('There is no command like that');
                    break;
            }
        } else {
            IOemitToCurrentChannel(message);
        }

    }

    function handleSwitch(channelNumber) {
        var channelName = socket.allRooms[channelNumber];
        var currentTab = channelName === socket.currentChannel;

        if (currentTab) {
            emitServerMessage('You are already on this window');
            return;
        } else if (channelNumber < 0 || channelNumber >= socket.allRooms.length) {
            emitServerMessage('That is not a valid number');
            return;
        }

        socket.emit('switch channel', channelName);
    }

    //TODO: Fixa så att handleClose/leaveChannel kombineras på något sätt så att socket.emit('leavechannel') exekveras så att användaren som blir
    //kickad inte ser fönstret längre
    function handleClose(channelNumber, user) {
        var channelName = socket.allRooms[channelNumber];
        var currentTab = channelName === socket.currentChannel;

        user = user !== undefined ? user : socket;

        if (channelNumber == 0) {
            emitServerMessage('You cant close the server window.');
            return;
        } else if (socket.allRooms.length < 1) {
            emitServerMessage('You need to have at least one channel open.');
            return;
        } else if (channelNumber < 0 || channelNumber > socket.allRooms.length) {
            emitServerMessage('That is not a valid number');
            return;
        }

        leaveChannel(channelName, channelMode(channelName), user);

        user.emit('leave channel', {
            channelNumber: channelNumber,
            currentTab: currentTab,
            channelName: channelName
        });
    }

    function handleKick(username, by) {
        var userExists = checkStatus(username, rooms[socket.currentChannel]);
        var channelNumber = socket.allRooms.indexOf(socket.currentChannel);
        var user = null;

        if (userExists) {
            emitServerMessage('There is no user with that name in the channel.');
            return;
        }

        user = users[username].socket;

        handleClose(channelNumber, user);
        emitServerMessage(user.username + ' was kicked form the channel by ' + by);
        emitToSelf.call(user, 'You were kicked from ' + socket.currentChannel + ' by ' + by);

    }

    /**
     * @summary Handle when a user joins a channel, checks if user already is in that room.
     * @param {string} channel - Name of the channel
     */
    function handleJoin(channel) {
        channel = checkChannelName(channel);

        var status = inChannel(socket.username, rooms[channel]);
        console.log(rooms);
        console.log(status);

        switch (status) {
            case true:
                emitServerMessage('You are already in this channel');
                break;
            default:
                firstTimeJoin(channel);
                giveAdmin(channel, socket.username);
                userJoined(channel);
        }
    }

    /**
     *
     * Message functions
     */

    /**
     * Gets the user and the message from the PM command via RegEx checks if the user exists, or if chat already been started.
     * @param {string} data - Message
     * @param {boolean} server - If current channel is server
     */
    function handlePM(data, server) {

        var messageData = data.match(/^(\S+)\s(\S+)\s(.+)$/);

        if(messageData === null) {
            emitServerMessage('You need to type a message');
            return;
        }

        var user = messageData[2];
        var userExists = checkStatus(user, rooms[socket.currentChannel]);

        if (server) {
            emitServerMessage('There is no command like that');
            return;
        } else if (userExists === 1) {
            emitServerMessage('There is no user with that name in the current channel');
            return;
        } 

        var message = messageData[3];
        var status = checkStatus(user, socket.pmSession);

        switch (status) {
            case 0:
                emitServerMessage('You already started a chat with that person');
                break;
            case 2:
                emitServerMessage('You cant start a chat with yourself');
                break;
            default:
                firstTimePM(user, message);
        }

    }

    /**
     * Creates a unique name from socket id's and make both users join that room then emits the message
     * @param {string} user - Name of user
     * @param {string} message - Message from the user
     */

    function firstTimePM(user, message) {
        var uid = socket.id + users[user].socket.id;

        socket.join(uid);
        users[user].socket.join(uid);

        socket.emit('new channel', user, uid);
        users[user].socket.emit('new channel', socket.username, uid);

        socket.currentChannel = uid;
        users[user].socket.currentChannel = uid;

        socket.allRooms.push(uid);
        users[user].socket.allRooms.push(uid);

        socket.pmSession[uid] = {user: user, channel: uid};
        //socket.pmSession.push({user: user, channel: uid});
        users[user].socket.pmSession[uid] = {user: socket.username, channel: uid};

        io.in(uid).emit('new message', {
            message: message,
            username: socket.username,
            channel: uid
        });
    }

    /**
     *
     * Join help-functions
     *
     */

    /**
     *
     * @param {string} channelName - Name of the channel
     * @param {boolean} channelMode - True if channel, false if PM
     * @param {socket} user - Socket of the user
     */

    //TODO: Fixa så att någon annan får admin, samt ta bort admin
    function leaveChannel(channelName, channelMode, user) {
        var giveAdmin = true;
        user = user !== undefined ? user : socket;

        user.allRooms = removeElement(user.allRooms, channelName);
        if (channelMode) {
            rooms[channelName] = removeElement(rooms[channelName], user.username);

            if (rooms[channelName].length > 0 && hasProp.call(rooms[channelName], 'info')) {
                rooms[channelName].info.admin = rooms[channelName][0];
                giveAdmin = false;
            }

            user.broadcast.to(channelName).emit('user left', {
                user: socket.username,
                channel: channelName,
                giveAdmin: giveAdmin
            });

        } else {
            userLeftSession(user.pmSession, socket.username);
        }
    }

    function userLeftSession(allUsers, currentUser) {
        for (var key in allUsers) {
            if (allUsers.hasOwnProperty(key)) {

                var u = allUsers[key].user;

                users[u].socket.emit('new message', {
                    message: currentUser + 'left your chat. The window will be closed soon',
                    username: 'Server',
                    channel: allUsers[key].channel
                });
                var channelNumber = users[u].socket.allRooms.indexOf(allUsers[key].channel);
                var currentTab = allUsers[key].channel === users[u].socket.currentChannel;

                setTimeout(function (){
                    users[u].socket.emit('leave channel', {
                        channelNumber: channelNumber,
                        currentTab: currentTab,
                        channelName: allUsers[key].channel
                    });
                }, 10000);

            }

        }
    }

    /**
     * Push the channel name to a array
     * User joins the channel
     * Sets the current channel
     * Emits a new channel
     * Push the username in a 2d array
     * @param {string} channel - Name of the channel
     */
    function firstTimeJoin(channel) {
        socket.allRooms.push(channel);
        socket.join(channel);
        socket.currentChannel = channel;
        socket.emit('new channel', channel);

        rooms[channel] = rooms[channel] || [];
        rooms[channel].push(socket.username);

    }

    function userJoined(channel) {
        socket.emit('get users', {
            channel: rooms[channel],
            admin: rooms[channel].info.admin
        });
        socket.broadcast.to(channel).emit('user joined', {
            channel: [socket.username],
            admin: rooms[channel].info.admin
        });

    }

    //Admin helper-functions

    function giveAdmin(channel, user) {
        if (doesRoomExists(channel)) {
            return false;

        }
        rooms[channel].info = {};
        rooms[channel].info.admin = user;

        return true;

    }

    function getAdminInfo(channel) {
        if (channel !== undefined)
            return channel.info;

        return false;
    }

    function doesRoomExists(channel) {
        return rooms[channel].length > 1;

    }

    function executeAdminCommand(c, m) {
        if (c === '/kick') {
            handleKick(m, socket.username);

        }
    }

    //Emits

    function emitServerMessage(message) {
        socket.emit('new message', {
            message: message,
            username: 'Server',
            channel: socket.currentChannel
        });
    }

    function emitToChannelServer(message, channel){
        socket.emit('new message', {
            message: message,
            username: 'Server',
            channel: channel
        })
    }

    function broadcastServerMessage(message) {
        io.in(socket.current).emit('new message', {
            message: message,
            username: 'Server',
            channel: socket.currentChannel
        });
    }

    function SocketEmitToChannel(message, channel) {
        socket.broadcast.to(channel).emit('user joined', socket.username);
    }

    function IOemitToCurrentChannel(message) {
        io.in(socket.currentChannel).emit('new message', {
            message: message,
            username: socket.username,
            channel: socket.currentChannel
        });
    }

    function emitToSelf(message) {
        this.emit('new message', {
            message: message,
            username: 'Server',
            channel: '#gel-server'
        });
    }


    function handleUnieqName(user, channel) {
        var modUser = user;
        var firstTime = true;

        while (!isNameUnique(modUser, channel)) {
            modUser = maeNameUnique(modUser, firstTime);
            firstTime = false;
        }

        return modUser;
    }

    function isNameUnique(user, channel) {
        channel = checkChannelName(channel);

        return (rooms[channel] === undefined || checkStatus(user, rooms[channel]) === 1);
    }

    function maeNameUnique(name, firstTime) {
        if (firstTime)
            return name + '_1';

        var affix = name.match(/([^_]+)$/)[1];
        var newString = name.slice(0, name.length - (affix.length));
        var affixInt = parseInt(affix.substr(affix.length - 1));

        affixInt += 1;

        return newString + affixInt;

    }


    function handleHelp(channel) {

        channel = channel === undefined ? socket.currentChannel : channel;

        var breakline = "<br />";

        var helpMessage = "Welcome to gel-chat!" + breakline;
        helpMessage += breakline + "Available user commands: " + breakline;
        helpMessage += makeBold("/join [channelName]") + " -> Use to join a channel." + breakline;
        helpMessage += makeBold("/pm [username]") + " -> Use to initiate a chat with a user" + breakline;
        helpMessage += makeBold("/switch [channelNumber]") + " -> Use to change a tab/channel" + breakline;
        helpMessage += makeBold("/close [channelNumber]") + " -> Use to close a tab/channel" + breakline;
        helpMessage += breakline + "Available admin commands: " + breakline;
        helpMessage += makeBold("/kick [username]") + "Use to kick a user (Admin only)";

        emitToChannelServer(helpMessage, channel);
    }

    function makeBold(text) {
        return "<b>" + text + "</b>";
    }

    function checkChannelName(channelName) {
        if (channelName.charAt(0) === "#") {
            return channelName;
        } else {
            return '#' + channelName;
        }
    }

    function inChannel (username, channel){

        if(channel === undefined)
            return false;

        for (var i = 0; i < channel.length; i++) {
            if (channel[i] === username)
                return true;
        }

        return false;
    }
    function checkStatus(username, channel) {
        if (username === socket.username)
            return 2;

        for (var i = 0; i < channel.length; i++) {
            if (channel[i] === username)
                return 0;
        }

        return 1;
    }

    function removeElement(arr, value) {
        if (arr !== undefined) {
            var index = arr.indexOf(value);

            if (index > -1) {
                arr.splice(index, 1);
            }
        }

        return arr;
    }

    function channelMode(n) {
        return n.charAt(0) === "#";
    }

    function hasProp(prop) {
        for (prop in this) {
            if (this.hasOwnProperty(prop))
                return true;
        }
        return false;
    }

});