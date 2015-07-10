var path = require('path');
var rc = require('./controllers/recordsController.js');
var express = require('express');
var app = express();

app.use(express.static(path.join(__dirname, 'webapp')));

app.get('/records', rc.getRecords);

var server = app.listen(3000, function () {
	  var host = server.address().address;
	  var port = server.address().port;

	  console.log('Example app listening at http://%s:%s', host, port);
});