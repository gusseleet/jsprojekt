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


    socket.on('setupSocket', function(data) {
        data.username = handleUnieqName(data.username);
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
        emitServerMessage('Type /help at anytime for more information about commands.');
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

        userCommand(message);
    }

    function parseMessage(data) {
        var parsed = data.split(/[ ]+/);
        var command = parsed[0] || null;
        var commandValue =  parsed[1] || null;
        var message = parsed.slice(2).join(" ") || null;
        var isCommand = command[0] === "/";

        message = linkifyHtml(message);

        return {command: command, commandValue: commandValue, message: message, isCommand: isCommand};

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

    function userCommand(message) {
        if(inServer() && message.command === '/pm') {
            emitServerMessage('There is no command like that');
            return;
        }

        if (message.isCommand) {
            switch (message.command) {
                case '/help':
                    handleHelp();
                    break;
                case '/join':
                    handleJoin(message.commandValue);
                    break;
                case '/pm':
                    handlePM(message);
                    break;
                case '/close':
                    handleClose(message);
                    break;
                case '/switch':
                    handleSwitch(message);
                    break;
                case '/whereis':
                    handleWhere(message);
                    break;
                default:
                    emitServerMessage('There is no command like that');
                    break;
            }
        }

            IOemitToCurrentChannel(message);

    }

    function inServer(){
        return socket.currentChannel === "#gel-server";
    }
    function handleWhere(m){
        var userDoesNotExists = userFound(m);

        if (userDoesNotExists) {
            emitServerMessage('There is no user with that name.');
            return;
        }

        var message = users[m].socket.username + ' is in: ';
        users[m].socket.allRooms.forEach(function(value){
            message+= '[' + value + '], ';

        });

        message = message.replace(/,([^,]*)$/, '$1');

        emitServerMessage(message);
    }

    function handleSwitch(data) {
        var channelName = socket.allRooms[data.commandValue];
        var currentTab = channelName === socket.currentChannel;

        if (currentTab) {
            emitServerMessage('You are already on this window');
            return;
        } else if (data.commandValue < 0 || data.commandValue >= socket.allRooms.length) {
            emitServerMessage('That is not a valid number');
            return;
        }

        socket.emit('switch channel', channelName);
    }

    function handleClose(data, user) {
        var channelName = socket.allRooms[data.commandValue];
        var currentTab = channelName === socket.currentChannel;

        user = user !== undefined ? user : socket;

        if (data.commandValue == 0) {
            emitServerMessage('You cant close the server window.');
            return;
        } else if (socket.allRooms.length < 1) {
            emitServerMessage('You need to have at least one channel open.');
            return;
        } else if (data.commandValue < 0 || data.commandValue > socket.allRooms.length - 1) {
            emitServerMessage('That is not a valid number');
            return;
        }

        leaveChannel(channelName, channelMode(channelName), user);

        user.emit('leave channel', {
            channelNumber: data.commandValue,
            currentTab: currentTab,
            channelName: channelName
        });
    }

    function handleKick(username, by) {
        var userDoesNotExists = checkStatus(username, rooms[socket.currentChannel]);
        var channelNumber = socket.allRooms.indexOf(socket.currentChannel);

        if (userDoesNotExists === 1) {
            emitServerMessage('There is no user with that name in the channel.');
            return;
        } else if(userDoesNotExists === 2){
            emitServerMessage('You cant chat with yourself');
            return;
        }

        var user = users[username].socket;

        handleClose(channelNumber, user);
        emitServerMessage(user.username + ' was kicked form the channel by ' + by);
        emitToSelf.call(user, 'You were kicked from ' + socket.currentChannel + ' by ' + by);

    }

    /**
     * @summary Handle when a user joins a channel, checks if user already is in that room.
     * @param {string} channel - Name of the channel
     */
    function handleJoin(channel) {
        channel = channel.replace(/\s/g, '').toLowerCase();
        channel = channel.replace(/[^a-z0-9]/gi,'');
        channel = checkChannelName(channel);

        var status = inChannel(socket.username, rooms[channel]);

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
     * @param {object} data - Message
     *
     */
    function handlePM(data) {

        if(data.message === null) {
            emitServerMessage('You need to type a message');
            return;
        } else if(socket.pmSession[socket.currentChannel] !== undefined){
            emitServerMessage('You already started a chat with that person');
            return;
        }

        var userExists = checkStatus(data.commandValue, rooms[socket.currentChannel]);

        if (userExists === 1) {
            emitServerMessage('There is no user with that name in the current channel');
            return;
        } else if(userExists == 2){
            emitServerMessage('You cant start a chat with yourself');
        }


        firstTimePM(data.commandValue, data.message);

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

        socket.emit('new channel', user, uid, {one: socket.id, two:users[user].socket.id});
        users[user].socket.emit('new channel', socket.username, uid, {one: socket.id, two:users[user].socket.id});

        socket.currentChannel = uid;
        users[user].socket.currentChannel = uid;

        socket.allRooms.push(uid);
        users[user].socket.allRooms.push(uid);

        socket.pmSession[uid] = {user: user, channel: uid};
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
        var giveAdmin = false;
        user = user !== undefined ? user : socket;

        user.allRooms = removeElement(user.allRooms, channelName);

        if (channelMode) {
            rooms[channelName] = removeElement(rooms[channelName], user.username);

            if (rooms[channelName].length > 0 && hasProp.call(rooms[channelName], 'info')) {
                rooms[channelName].info.admin = rooms[channelName][0];
                giveAdmin = true;
            }

            user.broadcast.to(channelName).emit('user left', {
                user: user.username,
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

                setTimeout(function (){
                    users[u].socket.emit('leave channel', {
                        channelNumber: channelNumber,
                        currentTab: allUsers[key].channel === users[u].socket.currentChannel,
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

    function userFound(username){

        return users[username] === undefined;
    }

    function handleUnieqName(user) {
        var firstTime = true;

        while (!userFound(user)) {
            user = makeNameUnique(user, firstTime);
            firstTime = false;
        }

        return user;
    }



    function makeNameUnique(name, firstTime) {
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
        helpMessage += makeBold("/pm [username]") + " -> Use to initiate a chat with a user." + breakline;
        helpMessage += makeBold("/switch [channelNumber]") + " -> Use to change a tab/channel." + breakline;
        helpMessage += makeBold("/close [channelNumber]") + " -> Use to close a tab/channel." + breakline;
        helpMessage += makeBold("/whereis [username]") + " -> Use to find where a user is." + breakline;
        helpMessage += breakline + "Available admin commands: " + breakline;
        helpMessage += makeBold("/kick [username]") + " -> Use to kick a user.";

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