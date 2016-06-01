var url = require('url');
var request = require('request');

var googleAccessToken = '';
var twitterAccessToken = '';

require('jsonfile').readFile('oauth.json', function(err, obj) {
  if (err || obj == null) {
    console.log('No or invalid "oauth.json" file found. Please provide one in the following format:', JSON.stringify({ "google": { "client_id": "", "client_secret": "", "refresh_token": "", "grant_type": "refresh_token" }, "twitter": { "access_token": "" } }));
    return;
  }
  twitterAccessToken = obj.twitter.access_token;
  request.post('https://accounts.google.com/o/oauth2/token', { form: obj.google }, function (error, response, body) {
    if (response.statusCode == 200) googleAccessToken = JSON.parse(body).access_token;
  });
});

var serveStatic = require('serve-static')('./', { 'index': ['index.html'] });

require('http').createServer(function(req, res){
  var reqUrl = url.parse(req.url, true);
  if (reqUrl.pathname == '/proxy/') {
    if (reqUrl.query.url) {
      var targetUrl = url.parse(reqUrl.query.url);
      req.headers.host = targetUrl.host;
      if (targetUrl.host == 'api.twitter.com') req.headers.Authorization = 'Bearer ' + twitterAccessToken;
      if (targetUrl.host == 'www.googleapis.com') req.headers.Authorization = 'Bearer ' + googleAccessToken;
      var options = { url: targetUrl,  headers: req.headers,  method: req.method };
      request(options).on('error', function(e) { res.end(e); }).pipe(res);
    } else {
      res.end('No "url" parameter found.');
    }
  } else {
    serveStatic(req, res, require('finalhandler')(req, res));
  }
}).listen(process.env.PORT || 80);