(function() {
  'use strict';

  if (typeof window.SynchronizationService === 'object') {
    return;
  }

  var DeviceInfo = {

    getVersion : function(name) {
      if (name.toLowerCase() === 'safari') name = 'version';
      if (name) {
        return new RegExp(name + '[\\/ ]([\\d\\w\\.-]+)', 'i').exec(navigator.replace(/Trident\/7\.0;/i, 'Trident/7.0; MSIE/11.0;').userAgent) && RegExp.$1 || '';
      } else {
        var m = navigator.userAgent.match(/version[\/ ]([\d\w\.]+)/i);
        return m && m.length > 1 ? m[1] : '';
      }
    },

    getOs : function() {
      var operatingSystems = {
        'iPad': /ipad/i,
        'iPhone': /iphone/i,
        'Windows Vista': /windows nt 6\.0/i,
        'Windows 7/8': /windows nt 6\.\d+/i,
        'Windows 2003': /windows nt 5\.2+/i,
        'Windows XP': /windows nt 5\.1+/i,
        'Windows 2000': /windows nt 5\.0+/i,
        'OS X $1.$2': /os x (\d+)[._](\d+)/i,
        'Android': /android/i,
        'Linux': /linux/i,
        'Googlebot': /googlebot/i
      };
      var osNames = Object.keys(operatingSystems);
      var captures;
      for (var i = 0, len = osNames.length; i < len; ++i) {
        if (captures = operatingSystems[osNames[i]].exec(navigator.userAgent)) {
          return ~osNames[i].indexOf('$1') ? osNames[i].replace(/\$(\d+)/g, function(_, n) { return captures[n]; }) : osNames[i];
        }
      }
      return '';
    },

    getName : function() {
      var names = ['Opera', 'Konqueror', 'Firefox', 'Chrome', 'Epiphany', 'Safari', 'MSIE', 'cURL', 'Maxthon'];
      for (var i = 0, len = names.length; i < len; ++i) {
        if (~navigator.userAgent.replace(/Trident\/7\.0;/i, 'Trident/7.0; MSIE/11.0;').toLowerCase().indexOf(names[i].toLowerCase())) return names[i];
      }
      return '';
    },

    getDeviceType : function() {
      var devices = {
        tv: "TV",
        tablet: "Tablet",
        phone: "Phone",
        desktop: "Desktop"
      };

      var options = {
        emptyUserAgentDeviceType: devices.desktop,
        unknownUserAgentDeviceType: 'Unknown'
      };

      var ua = navigator.userAgent;

      if (!ua || ua === '') {
        return options.emptyUserAgentDeviceType;
      }

      if (ua.match(/Xbox|PLAYSTATION 3|Wii|GoogleTV|SmartTV|Internet TV|NetCast|NETTV|AppleTV|boxee|Kylo|Roku|DLNADOC|CE\-HTML/i)) {
        return devices.tv;
      } else if (ua.match(/iP(a|o)d/i) || (ua.match(/tablet/i) && !ua.match(/RX-34/i)) || ua.match(/FOLIO/i)) {
        return devices.tablet;
      } else if (ua.match(/Linux/i) && ua.match(/Android/i) && !ua.match(/Fennec|mobi|HTC Magic|HTCX06HT|Nexus One|SC-02B|fone 945/i)) {
        return devices.tablet;
      } else if (ua.match(/Kindle/i) || (ua.match(/Mac OS/i) && ua.match(/Silk/i))) {
        return devices.tablet;
      } else if (ua.match(/GT-P10|SC-01C|SHW-M180S|SGH-T849|SCH-I800|SHW-M180L|SPH-P100|SGH-I987|zt180|HTC( Flyer|_Flyer)|Sprint ATP51|ViewPad7|pandigital(sprnova|nova)|Ideos S7|Dell Streak 7|Advent Vega|A101IT|A70BHT|MID7015|Next2|nook/i) || (ua.match(/MB511/i) && ua.match(/RUTEM/i))) {
        return devices.tablet;
      } else if (ua.match(/BOLT|Fennec|Iris|Maemo|Minimo|Mobi|mowser|NetFront|Novarra|Prism|RX-34|Skyfire|Tear|XV6875|XV6975|Google Wireless Transcoder/i)) {
        return devices.phone;
      } else if (ua.match(/Opera/i) && ua.match(/Windows NT 5/i) && ua.match(/HTC|Xda|Mini|Vario|SAMSUNG\-GT\-i8000|SAMSUNG\-SGH\-i9/i)) {
        return devices.phone;
      } else if ((ua.match(/Windows (NT|XP|ME|9)/) && !ua.match(/Phone/i)) && !ua.match(/Bot|Spider|ia_archiver|NewsGator/i) || ua.match(/Win( ?9|NT)/i)) {
        return devices.desktop;
      } else if (ua.match(/Macintosh|PowerPC/i) && !ua.match(/Silk/i)) {
        return devices.desktop;
      } else if (ua.match(/Linux/i) && ua.match(/X11/i) && !ua.match(/Charlotte/i)) {
        return devices.desktop;
      } else if (ua.match(/CrOS|Solaris|SunOS|BSD/i)) {
        return devices.desktop;
      }

      return options.unknownUserAgentDeviceType;
    }

  };

  if (typeof String.prototype.startsWith !== 'function') {
    String.prototype.startsWith = function(str) {
      return this.slice(0, str.length) === str;
    };
  }

  if (typeof window.loadScript !== 'function') {
    window.loadScript = function(src, callback) {
      if (document.querySelector('script[src="' + src + '"]')) return;
      var script = document.createElement('script');
      script.async = 1;
      script.defer = 1;
      script.src = src;
      if (callback) script.onload = callback;
      document.body.appendChild(script);
    };
  }

  if (!window.location.origin) {
    window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port : '');
  }

  var SynchronizationService = (function() {

    var NAMESPACE = 'SmartComposition.';

    function SynchronizationService() {

      var _this = this;

      (function(){
        var name = '', session = '';
        Object.defineProperties(_this, {
          'Session': {
            get: function() { return session; },
            set: function(val) {
              if (session === val) return;
              session = val;
              this.authenticate();
            }
          },
          'Name': {
            get: function() { return name; },
            set: function(val) {
              if (name === val) return;
              name = val;
              this.authenticate();
            }
          }
        });
      })();

      this.Id = '';
      this.Name = DeviceInfo.getName() + ' on ' + DeviceInfo.getOs();
      this.Session = window.location.hostname;

      this.Endpoint = typeof SynchronizationServiceEndpoint === 'undefined' ? 'http://apfel.informatik.tu-chemnitz.de:9000' : SynchronizationServiceEndpoint;
      this.ClientLibPath = '//cdnjs.cloudflare.com/ajax/libs/sockjs-client/0.3.4/sockjs.min.js';

      this.Clients = [];
      this.RetryTime = 1000;

      this.Type = DeviceInfo.getDeviceType();

      window.addEventListener('pubsub', function(evt) {
        var message = evt.detail;
        if (!message.type || !message.type.startsWith(NAMESPACE) || message.origin === _this.Id) return;
        _this.sendMessage(message.type.slice(NAMESPACE.length), message.data, message.token);
      });

      this.initSocket();
    }

    SynchronizationService.prototype.initSocket = function() {
      var _this = this;

      if (typeof this.Endpoint !== 'string' || (this.Socket && this.Socket.readyState === 1)) return;

      if (this.Endpoint.startsWith('ws://') && typeof WebSocket === 'function') {
        console.log('Using WebSocket');
        this.Socket = new WebSocket(this.Endpoint);
      } else if (typeof SockJS === 'function') {
        console.log('Using SockJS');
        this.Socket = new SockJS(this.Endpoint);
      } else {
        console.log('No Socket support. Loading SockJS library.');
        window.loadScript(this.ClientLibPath, function() { window.SynchronizationService.initSocket(); });
        return;
      }

      this.Socket.onopen = function() {
        _this.RetryTime = 1000;
      };
      this.Socket.onclose = function() {
        console.log('Connection closed');
        _this.Clients = [];
        _this.RetryTime = _this.RetryTime < 60000 ? _this.RetryTime * 2 : _this.RetryTime;
        setTimeout(function() { _this.initSocket(); }, _this.RetryTime);
      };
      this.Socket.onmessage = function(message) {
        try {
          _this.handleMessage(JSON.parse(message.data));
        } catch (error) {
          console.log(error);
        }
      };
      this.Socket.onerror = function(error) {
        console.log(error);
      };
    };

    SynchronizationService.prototype.handleMessage = function(message) {
      if (!message.type.startsWith(NAMESPACE)) return;
      switch (message.type.slice(NAMESPACE.length)) {
        case 'authentication.request':
          this.authenticate();
          break;
        case 'authentication.answer':
          this.Id = message.data.id;
          if (message.data.name) this.Name = message.data.name;
          if (message.data.session) this.Session = message.data.session;
          break;
        case 'clients':
          this.Clients = message.data.clients;
          break;
        case 'message':
          message.origin = this.Id;
          var topicParts = ['pubsub'];
          window.dispatchEvent(new CustomEvent('pubsub', { detail: message }));
          message.data.topic.split('.').filter(function(n) { return n != ''; }).forEach(function(t) {
            topicParts.push(t);
            message.data.topic = topicParts.slice(1).join('.');
            window.dispatchEvent(new CustomEvent(topicParts.join('.'), { detail: message }));
          });
          break;
        case 'move-tile':
          var nt = document.createElement(message.data.type);
          if (message.data.content) nt.innerHTML = message.data.content;
          if (message.data.state) nt.setState(message.data.state);
          nt.style.width  = message.data.width || '200px';
          nt.style.height = message.data.height || '200px';
          // nt.style.position = 'absolute';
          // nt.style.left = 'calc(50% - 150px)';
          // nt.style.top  = 'calc(50% - 150px)';
          document.body.appendChild(nt);
          break;
        case 'ping':
          this.sendMessage('pong');
          break;
        case 'error':
          console.log(message.data);
          break;
        default:
          break;
      }
    };

    SynchronizationService.prototype.sendMessage = function(type, message, token) {
      if (!this.Socket || this.Socket.readyState !== 1) return;
      message = typeof message === 'undefined' ? null : message;
      if (message) {
        this.Socket.send(JSON.stringify({ type: NAMESPACE + type, data: message, token: token }));
      } else {
        this.Socket.send(JSON.stringify({ type: NAMESPACE + type }));
      }
    };

    SynchronizationService.prototype.authenticate = function() {
      this.sendMessage('authentication', { id: this.Id, name: this.Name, session: this.Session, type: this.Type });
    };

    return SynchronizationService;

  })();

  window.SynchronizationService = new SynchronizationService();

})();