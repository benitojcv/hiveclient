/**
 * New node file
 */
var rec = require('../services/records.js');

exports.getRecords = function (req, res) {
	  rec.getRecordsDao(function(resp) {
		  res.send(resp);		  
	  });
}