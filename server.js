var url = require('url');
var request = require('request');

var wwwRoot = process.env.WWWROOT || './';
var googleCredentials = {};
var googleAccessToken = '';
var twitterAccessToken = '';

var getGoogleAccessToken = function() {
  request.post('https://accounts.google.com/o/oauth2/token', { form: googleCredentials }, function (error, response, body) {
    if (response.statusCode == 200) {
      var data = JSON.parse(body);
      googleAccessToken = data.access_token;
      setTimeout(getGoogleAccessToken, data.expires_in * 1000);
    }
  });
}

require('jsonfile').readFile(wwwRoot + 'oauth.json', function(err, obj) {
  if (err || obj == null) {
    console.log('No or invalid "oauth.json" file found. Please provide one in the following format:', JSON.stringify({ "google": { "client_id": "", "client_secret": "", "refresh_token": "", "grant_type": "refresh_token" }, "twitter": { "access_token": "" } }));
    return;
  }
  googleCredentials = obj.google;
  twitterAccessToken = obj.twitter.access_token;
  getGoogleAccessToken();
});

var serveStatic = require('serve-static')(wwwRoot, { 'index': ['index.html'] });
var blackList = [ '/oauth.json' ];

require('http').createServer(function(req, res){
  var reqUrl = url.parse(req.url, true);
  if (reqUrl.pathname == '/proxy/') {
    if (reqUrl.query.url) {
      var targetUrl = url.parse(reqUrl.query.url);
      req.headers.host = targetUrl.host;
      if (targetUrl.host == 'api.twitter.com') req.headers.Authorization = 'Bearer ' + twitterAccessToken;
      if (targetUrl.host == 'www.googleapis.com') req.headers.Authorization = 'Bearer ' + googleAccessToken;
      var options = { url: targetUrl, headers: req.headers, method: req.method };
      if (req.method == 'POST') {
        var body = [];
        req.on('data', function(chunk) {
          body.push(chunk);
        }).on('end', function() {
          options.form = Buffer.concat(body).toString();
          request(options).on('error', function(e) { res.end(e); }).pipe(res);
        });
      } else {
        request(options).on('error', function(e) { res.end(e); }).pipe(res);
      }
    } else {
      res.statusCode = 400;
      res.end('No "url" parameter found');
    }
  } else {
    if (blackList.indexOf(reqUrl.pathname) > -1) {
      res.statusCode = 404;
      res.end('File not found');
    }
    serveStatic(req, res, require('finalhandler')(req, res));
  }
}).listen(process.env.PORT || 80);