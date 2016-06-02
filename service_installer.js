var Service = require('node-windows').Service;
var MashupChallengeServerService = new Service({
  name:'MashupChallengeServerService',
  script: 'C:\\inetpub\\mashupchallenge\\smartcomposition\\server.js',
  env: [{
    name: 'PORT',
    value: '8008',
  },{
    name: 'WWWROOT',
    value: 'C:/inetpub/mashupchallenge/',
  }]
});
var MashupChallengeMessagingServerService = new Service({
  name:'MashupChallengeMessagingServerService',
  script: 'C:\\inetpub\\mashupchallenge\\smartcomposition\\MessagingServer.js',
  env: {
    name: 'PORT',
    value: '9009',
  }
});
// install services
MashupChallengeServerService.install('./ServerService');
MashupChallengeMessagingServerService.install('./MessagingServerService');
// uninstall services
//MashupChallengeServerService._directory = './ServerService';
//MashupChallengeServerService.uninstall();
//MashupChallengeMessagingServerService._directory = './MessagingServerService';
//MashupChallengeMessagingServerService.uninstall();