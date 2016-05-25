var _ = require('lodash');
var http = require('http');
var sockjs = require('sockjs');

var PORT = 9001;

var ConnectionHandler = (function() {
  var clients = [];

  function ConnectionHandler(connection) {
    connection.on('data', function(data) {
      var error, message = JSON.parse(data), payload = message.data;

      if (!message.type) return;

      switch (message.type) {
        case 'authentication':
          try {
            this.changeSession(payload.session);
            this.name = payload.name || 'unknown';
            this.type = payload.type || 'undefined';

            this.send(JSON.stringify({
              type: 'authentication.answer',
              data: { id: this.id, name: this.name, session: this.session, type: this.type }
            }));

            this.sendToSession(JSON.stringify({
              type: 'clients',
              data: { clients: this.createClientsArray(this.getClientsOfSession()) }
            }));
          } catch (error) {
            return;
          }
          break;
        case 'clients':
          this.send(JSON.stringify({
            type: 'clients',
            data: { clients: this.createClientsArray(this.getClientsOfSession()) }
          }));
          break;
        case 'message':
          this.sendToSession(data, null, false);
          break;
        case 'move-tile':
          this.sendToClient(payload.client, data);
          break;
        default:
          this.send(JSON.stringify({
            type: 'error',
            data: 'unkown command'
          }));
      }
    }.bind(this));

    connection.on('close', function() {
      console.log(' [*] Closed');
      this.close();
    }.bind(this));

    this.connection = connection;
    this.id = this.connection.id;
    this.name = this.session = null;

    clients.push(this);

    this.send(JSON.stringify({ type: 'authentication.request' }));
  }

  ConnectionHandler.prototype.changeSession = function(session) {
    if (this.session === session) return;

    this.sendToSession(JSON.stringify({
      type: 'clients',
      data: { clients: this.createClientsArray(this.getClientsOfSession(null, false)) }
    }), null, false);

    this.session = session;
  };

  ConnectionHandler.prototype.close = function() {
    if (this.connection.readyState < 3) {
      this.connection.close();
      return;
    }

    _.pull(clients, this);

    this.sendToSession(JSON.stringify({
      type: 'clients',
      data: { clients: this.createClientsArray(this.getClientsOfSession()) }
    }));

    this.connection = null;
    delete this.connection;
  };

  ConnectionHandler.prototype.send = function(message) {
    if (this.connection) this.connection.write(message);
  };

  ConnectionHandler.prototype.broadcast = function(clientList, message) {
    if (typeof clientList === 'string') {
      message = clientList;
      clientList = clients;
    }
    for (var i = 0, client; client = clientList[i]; i++) {
      client.send(message);
    }
  };

  ConnectionHandler.prototype.createClientsArray = function(clientList) {
    var clientsArray = [];
    for (var i = 0, client; client = clientList[i]; i++) {
      clientsArray.push({
        id:      client.id,
        name:    client.name,
        type:    client.type,
        session: client.session
      });
    }
    return clientsArray;
  };

  ConnectionHandler.prototype.getClientById = function(id) {
    return _.find(clients, { id: id });
  };

  ConnectionHandler.prototype.sendToClient = function(id, message) {
    var client = this.getClientById(id);
    if (client) client.send(message);
  };

  ConnectionHandler.prototype.getClientsOfSession = function(session, includeSelf) {
    if (includeSelf == null) includeSelf = true;
    var clientsOfSession = _.filter(clients, { session: session || this.session });
    if (!includeSelf) _.pull(clientsOfSession, this);
    return clientsOfSession;
  };

  ConnectionHandler.prototype.sendToSession = function(message, session, includeSelf) {
    if (includeSelf == null) includeSelf = true;
    this.broadcast(this.getClientsOfSession(session, includeSelf), message);
  };

  return ConnectionHandler;

})();

var server = http.createServer();

server.addListener('upgrade', function(req, res) { res.end(); });

var sockjs_server = sockjs.createServer({ sockjs_url: '//cdnjs.cloudflare.com/ajax/libs/sockjs-client/1.1.0/sockjs.min.js' });

sockjs_server.on('connection', function(connection) {
  console.log(' [*] Connection');
  new ConnectionHandler(connection);
});

sockjs_server.installHandlers(server);

console.log(' [*] Listening on Port ' + PORT);

server.listen(PORT);