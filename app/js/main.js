$(document).ready(function() {
    'use strict';
    //http://163.172.176.9
    var socket = io.connect('http://163.172.176.9:1337');





    /**
     *
     * jQuery stuff
     */

        //TODO: Fixa design (users, send message, scrollbaren, padding på meddelande)

    var $initate = $('#initate');
    var $startpage = $('#fullscreen_bg');
    var $mainpage = $('#chatContent');
    var $roomtab = $('#allRooms');
    var $messageinput = $('#messageText');
    var $messageform = $('#messageForm');
    var $conversation = $('#conversation');
    var $users = $('#users');
    var $error = $('.error');
    var uploadHandler = require('./imgupload');
    var crypt = require('./crypt')();



    var currentChannel = null;

    console.log(document.cookie);

    socket.on('new message', appendMessage);
    socket.on('new channel', joinChanel);
    socket.on('get users', appendUser);
    socket.on('user joined', appendUser);
    socket.on('user left', removeUser);
    socket.on('leave channel', removeChannelTest);
    socket.on('switch channel', changeChannelTest);
    socket.on('connect_error', handleError);
    socket.on('picture', handlePicture);


    function handlePicture(){

    }

    function handleError(err) {
        socket.disconnect();
        $mainpage.css('display', 'none');
        $startpage.css('display', 'none');
        $error.css('display', '');
    }

    function imgDone(id) {
        var url = "https://imgur.com/gallery/" + id;
        socket.emit('img uploaded', url);
    }

    function removeUser(data) {
        console.log(data);
        var username = '';
        var $user = null;

        var $ul = getElement({
            name: data.channel,
            type: 'ul',
            byClass: false
        });

        $ul.children('li').each(function() {
            $user = $(this);
            username = $user.html();

            if ($user.html().charAt(0) === '@')
                username = $user.html().replace(/@/gi, '');

            if (username === data.user) {
                if(data.giveAdmin)
                    $user.next().html('@' + $user.next().html());

                $user.remove();
                return false;
            }
        });
    }

    function removeEverything(name) {
        var escape = channelMode(name) ? '\\' : '';

        var $id = $('#' + escape + name);
        var $class = $('.' + escape + name);

        $class.each(function() {
            $(this).remove();
        });

        $id.each(function() {
            $(this).remove();
        });
    }

    function appendUser(data) {
        var $ul = createElement({
            element: 'ul',
            id: currentChannel,
            classname: 'list-group',
            type: '#'
        });

        data.channel.forEach(function(element) {
            var $li = $('<li class="list-group-item"></li>');
            if (data.admin === element)
                element = '@' + element;

            $li.text(element);
            $ul.append($li);

        });

        $users.append($ul);
    }

    function start(event) {
        event.preventDefault();
        $startpage.css('display', 'none');
        var username = $('#username').val();
        var channel = $('#channel').val();



        uploadHandler.init();
        uploadHandler.setApiKey('5078e21bf9c8a01');
        uploadHandler.setCallback(imgDone);

        socket.emit('setupSocket', {
            username: username,
            channel: channel
        });

        $mainpage.css('display', '');
        $('#messageForm input').focus();
    }

    function joinChanel(channel, id) {
        id = id !== undefined ? id : channel;

        if (!firstChannel()) {
            getElement({
                name: currentChannel,
                type: 'div',
                byClass: true
            }).css('display', 'none');
            getElement({
                name: currentChannel,
                type: 'li',
                byClass: true
            }).removeClass('active');
            getElement({
                name: currentChannel,
                type: 'ul',
                byClass: false
            }).css('display', 'none');

        }

        currentChannel = id;

        createChannel(id);
        createTab(channel, id);

    }

    function createTab(channel, id) {

        var i = $('<i class="fa fa-times fa-fw"></i>');
        var li = $('<li></li>');
        var a = $('<a href="#">' + channel + '</a></li>');

        i.hover(over, out);
        a.append(i);
        li.append(a);
        $roomtab.append(li);


        li.addClass('active');
        li.addClass(id);

    }

    function firstChannel() {
        return currentChannel === null;
    }

    function changeChannelTest(data) {
        changeChannelEvent();
        changeChannelDefault(data);
    }

    function changeChannelEvent() {
        getElement({
            name: currentChannel,
            type: 'div',
            byClass: true
        }).css('display', 'none');

        getElement({
            name: currentChannel,
            type: 'li',
            byClass: true
        }).removeClass('active');

        getElement({
            name: currentChannel,
            type: 'ul',
            byClass: false
        }).css('display', 'none');

    }

    function changeChannelDefault(channelName) {
        socket.emit('change channel', {
            channel: channelName
        });

        if (!channelMode(channelName) || channelName === '#gel-server') {
            $users.css('display', 'none');
        } else {
            $users.css('display', '');
        }

        getElement({
            name: channelName,
            type: 'div',
            byClass: true
        }).css('display', '');

        getElement({
            name: channelName,
            type: 'li',
            byClass: true
        }).addClass('active');

        getElement({
            name: channelName,
            type: 'ul',
            byClass: false
        }).css('display', '');

        currentChannel = channelName;

        notification(channelName);

    }


    function removeChannelTest(data) {
        var $closedTabLi = $("#allRooms li").eq(data.channelNumber);
        var closedTabName = data.channelName;

        if (data.currentTab) {
            var $leftTabLi = $closedTabLi.prev();
            var leftTabName = $leftTabLi.attr('class');
            changeChannelDefault(leftTabName);
        }

        removeEverything(closedTabName);

    }

    function over() {
        $(this).css('color', 'red');
    }

    function out() {
        $(this).css('color', '');
    }

    function appendMessage(data) {
        var $channelDiv = getElement({
            name: data.channel,
            type: 'div',
            byClass: true
        });


        var $b = $('<b>' + data.username + ': </b>');
        var $p = $('<p></p>');

        $p.html(data.message);
        $p.prepend($b);

        $channelDiv.append($p);
        updateScroll();
        notification(data.channel);
    }

    function notification(channelName) {
        var $channelTab = getElement({
            name: channelName,
            type: 'li',
            byClass: true
        });


        var $a = $channelTab.find("a");
        var $span = $a.find("span");

        if (channelName !== currentChannel) {
            if ($span.length > 0) {
                $span.html(parseInt($span.html()) + 1);
            } else {
                $a.append('<span class="badge">1</span>');
            }
        } else {
            if ($span.length > 0) {
                $span.remove();
            }
        }
    }

    function getElement(data) {
        var escape = channelMode(data.name) ? '\\' : '';
        var char = data.byClass ? '.' : '#';

        return $(data.type + char + escape + data.name);

    }

    function createChannel(channel) {
        $users.css('display', '');

        var $div = createElement({
            element: 'div',
            classname: channel,
            type: '.'
        });
        $conversation.append($div);

    }

    function createElement(data) {
        var char = channelMode(data.type) ? '\\' : '';
        var $element = $(data.element + data.type + char + data.id);

        if ($element.length > 0)
            return $element;
        else {
            $element = $('<' + data.element + '></' + data.element + '>');

            if (data.id !== undefined)
                $element.attr('id', data.id);
            if (data.classname !== undefined)
                $element.addClass(data.classname);
            if (data.html !== undefined)
                $element.html(data.html);
            if (data.appendElement !== undefined)
                $element.append(data.appendElement);

            return $element;
        }
    }

    function sendMessage(e) {
        var message = $messageinput.val();
        $messageinput.val('');

        socket.emit('message', {
            message: message
        });

        e.stopPropagation();
        e.preventDefault();
    }

    function keyPress(event) {
        if (event.which === 13) {
            $(this).blur();
            $messageinput.focus().click();
            $messageform.off().submit(sendMessage);
        }
    }

    function channelMode(n) {
        return n.charAt(0) === "#";
    }

    function updateScroll() {
        $conversation[0].scrollTop = $conversation[0].scrollHeight;
    }

    function checkChrome(){
        if (!(!!window.chrome && !!window.chrome.webstore)){
                BootstrapDialog.show({
                    title: 'Information',
                    message: 'We strongly recommend that you use the latest version of chrome for the best expedience.',
                    buttons: [{
                        label: 'Close',
                        action: function(self){
                            self.close();
                        }
                    }]
                });

        }
    }

    checkChrome();
    $initate.submit(start);
    $messageinput.keypress(keyPress);

    // $messageinput.focus();


});