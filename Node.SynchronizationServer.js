// Generated by CoffeeScript 1.10.0
var ConnectionHandler, _, http, port, server, sockjs, sockjs_server;

_ = require('lodash');

http = require('http');

sockjs = require('sockjs');

port = 9001;

if (typeof String.prototype.startsWith !== 'function') {
  String.prototype.startsWith = function(str) {
    return this.slice(0, str.length) === str;
  };
}

ConnectionHandler = (function() {
  var NAMESPACE, clients;

  clients = [];

  NAMESPACE = 'SmartComposition.';

  function ConnectionHandler(connection1) {
    this.connection = connection1;
    this.name = this.session = this.delay = this.pingTime = null;
    this.id = this.connection.id;
    clients.push(this);
    this.connection.on('data', (function(_this) {
      return function(data) {
        var error, message;
        message = JSON.parse(data);
        if (!(message.type && message.type.startsWith(NAMESPACE))) {
          return;
        }
        switch (message.type.slice(NAMESPACE.length)) {
          case 'authentication':
            try {
              _this.changeSession(message.data.session);
              _this.name = message.data.name || 'unknown';
              _this.type = message.data.type || 'undefined';
              _this.send(JSON.stringify({
                type: NAMESPACE + 'authentication.answer',
                data: {
                  id: _this.id,
                  name: _this.name,
                  sesssion: _this.session
                }
              }));
              _this.sendToSession(JSON.stringify({
                type: NAMESPACE + 'clients',
                data: {
                  clients: _this.createClientsArray(_this.getClientsOfSession())
                }
              }));
            } catch (error) {
              return;
            }
            break;
          case 'clients':
            _this.send(JSON.stringify({
              type: NAMESPACE + 'clients',
              data: {
                clients: _this.createClientsArray(_this.getClientsOfSession())
              }
            }));
            break;
          case 'message':
            _this.sendToSession(data, null, false);
            break;
          case 'move-tile':
            _this.sendToClient(message.data.client, data);
            break;
          case 'pong':
            _this.delay = Math.floor(((new Date()).getTime() - _this.pingTime) / 2);
            break;
          default:
            _this.send(JSON.stringify({
              type: NAMESPACE + 'error',
              data: 'unkown command'
            }));
        }
      };
    })(this));
    this.connection.on('close', (function(_this) {
      return function() {
        console.log(' [*] Closed');
        _this.close();
      };
    })(this));
    this.send(JSON.stringify({
      type: NAMESPACE + 'authentication.request'
    }));
    this.pingInterval = setInterval((function(_this) {
      return function() {
        _this.pingTime = (new Date()).getTime();
        return _this.send(JSON.stringify({
          type: NAMESPACE + 'ping'
        }));
      };
    })(this), 2000);
  }

  ConnectionHandler.prototype.changeSession = function(session) {
    if (this.session === session) {
      return;
    }
    this.sendToSession(JSON.stringify({
      type: NAMESPACE + 'clients',
      data: {
        clients: this.createClientsArray(this.getClientsOfSession(null, false))
      }
    }), null, false);
    this.session = session;
  };

  ConnectionHandler.prototype.close = function() {
    if (this.connection.readyState < 3) {
      this.connection.close();
      return;
    }
    _.pull(clients, this);
    clearInterval(this.pingInterval);
    this.sendToSession(JSON.stringify({
      type: NAMESPACE + 'clients',
      data: {
        clients: this.createClientsArray(this.getClientsOfSession())
      }
    }));
    this.connection = null;
    delete this.connection;
  };

  ConnectionHandler.prototype.send = function(message) {
    if (this.connection) {
      this.connection.write(message);
    }
  };

  ConnectionHandler.prototype.broadcast = function(clientList, message) {
    var client, i, len;
    if (typeof clientList === 'string') {
      message = clientList;
      clientList = clients;
    }
    for (i = 0, len = clientList.length; i < len; i++) {
      client = clientList[i];
      client.send(message);
    }
  };

  ConnectionHandler.prototype.createClientsArray = function(clientList) {
    var client, clientsArray, i, len;
    clientsArray = [];
    for (i = 0, len = clientList.length; i < len; i++) {
      client = clientList[i];
      clientsArray.push({
        id: client.id,
        name: client.name,
        type: client.type,
        session: client.session
      });
    }
    return clientsArray;
  };

  ConnectionHandler.prototype.getClientById = function(id) {
    return _.find(clients, {
      id: id
    });
  };

  ConnectionHandler.prototype.sendToClient = function(id, message) {
    var client;
    client = this.getClientById(id);
    if (client) {
      return client.send(message);
    }
  };

  ConnectionHandler.prototype.getClientsOfSession = function(session, includeSelf) {
    var clientsOfSession;
    if (includeSelf == null) {
      includeSelf = true;
    }
    clientsOfSession = _.filter(clients, {
      session: session || this.session
    });
    if (!includeSelf) {
      _.pull(clientsOfSession, this);
    }
    return clientsOfSession;
  };

  ConnectionHandler.prototype.sendToSession = function(message, session, includeSelf) {
    if (includeSelf == null) {
      includeSelf = true;
    }
    this.broadcast(this.getClientsOfSession(session, includeSelf), message);
  };

  return ConnectionHandler;

})();

server = http.createServer();

server.addListener('upgrade', function(req, res) {
  res.end();
});

sockjs_server = sockjs.createServer({
  sockjs_url: '//cdnjs.cloudflare.com/ajax/libs/sockjs-client/1.1.0/sockjs.min.js'
});

sockjs_server.on('connection', function(connection) {
  console.log(' [*] Connection');
  new ConnectionHandler(connection);
});

sockjs_server.installHandlers(server);

console.log(' [*] Listening on Port ' + port);

server.listen(port);
