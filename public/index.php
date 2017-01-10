<!DOCTYPE html>
<html lang='en'>
<head>
    <meta charset='utf-8'>
    <title>chatt</title>
    <link href='css/style.css' rel='stylesheet' type='text/css'>
    <link href="../lib/css/bootstrap.css" rel='stylesheet' type='text/css'><!---<link href="//netdna.bootstrapcdn.com/twitter-bootstrap/2.3.2/css/bootstrap-combined.no-icons.min.css" rel="stylesheet">-->
    <link href="../lib/font-awesome-4.7.0/css/font-awesome.min.css" rel="stylesheet"><!---<script src="lib/js/less.min.js"></script>-->
    <link href="../node_modules/bootstrap3-dialog/dist/css/bootstrap-dialog.min.css" rel="stylesheet" type="text/css" />


    <script src="../lib/js/jquery-3.1.1.js">
    </script>
    <script src="../lib/js/modernizr.js">
    </script>
    <script src="../lib/js/bootstrap.js">
    </script>
    <script src="../lib/js/mustache.js">
    </script>

    <script src="https://cdn.socket.io/socket.io-1.4.5.js"></script>

    <script src="../node_modules/bootstrap3-dialog/dist/js/bootstrap-dialog.min.js">
    </script>
</head>
<body>


<div class="error" style="display: none">
    <div class="error-code m-b-10 m-t-20">Error <i class="fa fa-warning"></i></div>
    <h3 class="font-bold">We couldn't find a connection to node server...</h3>

    <div class="error-desc">
        Sorry, but the service is down at the time. <br/>
        Try refreshing the page or click the button below to browse reddit. <br />
        <div>
            <a class=" login-detail-panel-button btn" href="http://www.reddit.com/">
                <i class="fa fa-arrow-left"></i>
                Reddit!
            </a>
        </div>
    </div>
</div>


<div class="fullscreen_bg" id="fullscreen_bg" style="">
    <div class="container">
        <form class="form-signin" id="initate" name="initate">
            <h1 class="form-signin-heading">Join a channel</h1><input autofocus="" class="form-control" id="username" placeholder="Nickname" required="" type="text"> <input class="form-control" id="channel" placeholder="Channel" required="" type="text"> <button class="btn btn-lg btn-primary btn-block" type="submit">Start chatting</button>
        </form>
    </div>
</div>



<div id="chatContent" style="display: none">
    <div class="container-fluid">

        <div class="row">
            <div class="col-md-12">
                <div class="affix-top">
                    <ul class="nav nav-tabs" id="allRooms"></ul>
                </div>
            </div>
        </div>


        <div class="row">
            <div class="col-md-11">
                <div id="conversation"></div>
            </div>
            <div class="col-md-1 marginTop">
                 <div class="sidebar-nav-fixed pull-right" id="users"></div>
            </div>

    </div>

</div>
    <div class="container" id="containerMessage">
        <div class="row">
            <div class="col-md-12 paddingClass">
                <form action="" id="messageForm" name="messageForm">
                    <input autocomplete="off" class="form-control input-lg" id="messageText" placeholder="Send message..." type="text">
                </form>
            </div>
        </div>

    </div>

<script src="gchat.min.js">
</script>
</body>
</html>