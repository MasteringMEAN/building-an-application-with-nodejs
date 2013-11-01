
// app.js
//
// Packt Publishing - Build a Network Application with Node
// Event RSVP application using the Express + Mongoose

var express = require('express')
  , routes = require('./routes')
  , error_handlers = require('./lib/error_handlers')
  , http = require('http')
  , pkginfo = require('pkginfo')(module, 'title', 'description')
  , partials = require('express-partials')
  , fs = require("fs")
  , accessLog = fs.createWriteStream('./logs/access.log', { 'flags': 'a' })
  , dbConfig = require('./db_config.js')
  , db = require('./lib/db_connect.js')
  , models = require('./models/event.js')
  , RestAPI = require('./controllers/rest_api.js')
  , socketIO = require('socket.io');

var app = express();
var server = http.createServer(app);
var io = socketIO.listen(server);

restAPI = new RestAPI({ 'models': models });

app.locals.open = '{{';
app.locals.close = '}}';
app.use(partials());

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('pkginfo', { 'title': exports.title, 'description': exports.description });
app.set('view engine', 'ejs');
app.use(express.favicon(__dirname + '/public/favicon.ico', { maxAge: 2592000000 }));
app.use(express.logger({ 'format': 'dev', 'stream': accessLog }));
app.use(express.cookieParser('qp4ul8chs0crqe31'));
app.use(express.session({ 'secret': 'qp4ul8chs0crqe31' }));
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(__dirname + '/public'));

if ('development' == app.get('env')) {
  express.errorHandler.title = exports.title;
  app.use(express.errorHandler());
  io.set('loglevel', 3);
} else {
  io.set('loglevel', 0); 
}

app.get("/", routes.index);
app.get('/event/create', restAPI.create_event);
app.post('/event/create', restAPI.create_event);
app.get('/event/update/:id', restAPI.update_event);
app.put('/event/update/:id', restAPI.update_event);
app.get('/event/destroy/:id', restAPI.destroy_event);
app.get('/event/:id', restAPI.show_event);
app.get('/events', restAPI.list_events);
app.put('/response/create/:id', restAPI.update_event);
app.get('/response/destroy/:event_id/:response_id', restAPI.destroy_response);

app.use(error_handlers.pageNotFoundHandler);
app.use(error_handlers.logErrors);
app.use(error_handlers.errorHandler);

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
  db.connect(dbConfig, function(status) {
    if (status && status.message) console.log(status.message);
  });
});

io.sockets.on('connection', function (socket) {

  var eventId = null;

  socket.on("show event", function(msg) {
    eventId = msg.eventId;
  });

  restAPI.on("new response", function(msg) {
    if (msg.eventId !== eventId) return;
    socket.emit(msg.type);
  });

  restAPI.on("new event", function(msg) {
    socket.emit(msg.type);
  });
  
});

process.on("exit", function() {
  db.disconnect(function(status) {
    if (status && status.message) console.log(status.message);
  });  
});
