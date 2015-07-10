'use strict';

process.env.DEBUG = 'jshs2:*';

var fs = require('fs');
var co = require('co');
var debug = require('debug')('jshs2:test');
var _ = require('lodash');
var hs2util = require('../node_modules/jshs2/lib/Common/HS2Util.js');
var jshs2 = require('jshs2');
var EventEmitter = require('events').EventEmitter;

var Connection = jshs2.PConnection;
var Configuration = jshs2.Configuration;

var resultado = {};

function waitAndLog (_cursor) {
  var cursor = _cursor;
 
  return new Promise(function (resolve, reject) {
    var ee = new EventEmitter();
 
    ee.waitCount = 0;
 
    ee.on('wait', function () {
      co(function* () {
        var status = yield cursor.getOperationStatus();
        var log = yield cursor.getLog();
        var serviceType = cursor.getConfigure().getServiceType();
 
        debug('wait, status -> ', hs2util.getState(serviceType, status));
        debug('wait, log -> ', log);
 
        ee.waitCount = ee.waitCount + 1;
 
        if (status !== serviceType.TOperationState.FINISHED_STATE) {
          setTimeout(function () {
            ee.emit('wait');
          }, 2000);
        } else if (ee.waitCount > 100) {
          ee.emit('error', new Error('Over exceed timeout'));
        } else {
          ee.emit('finish');
        }
      }).catch(function (err) {
        setImmediate(function () {
          ee.emit('error', err);
        });
      });
    });
 
    ee.on('finish', function () {
      resolve(true);
    });
 
    ee.on('error', function (err) {
      reject(err);
    });
 
    ee.emit('wait');
  });
}

exports.getRecordsDao = function(callback) {
	
	co(function* () {
	
		var config = JSON.parse(yield new Promise(function(fulfill, reject) {
			fs.readFile('./cluster.json', function(err, data) {
				if (err) {
					reject(err);
				} else {
					fulfill(data);
				}
			});
		}));
		
		console.log(config);
		
		var options = {};
	
		options.auth = 'NOSASL';
		options.host = _.first(config.Hive.Servers);
		options.port = config.Hive.Port;
		options.timeout = config.Hive.LoginTimeout;
		options.username = config.Hive.username;
		options.hiveVer = '1.1.0';
		options.thriftVer = '0.9.2';
		options.hiveType = hs2util.HIVE_TYPE.HIVE;
		// options.hiveType = hs2util.HIVE_TYPE.CDH;
		
		// maybe if you need chdVer below after line
		// options.cdhVer = '5.4.2';
		
		options.maxRows = 5120;
		options.nullStr = 'NULL';
	
		
		console.log(options);
		var configuration = new Configuration(options);	
		yield configuration.initialize(); // yield?
		
		var connection = new Connection(configuration);
		var cursor = yield connection.connect();
		
		yield cursor.execute(config.Hive.query);
		yield waitAndLog(cursor);
		
		var schema = yield cursor.getSchema();
	 
		//debug('schema -> ', schema);
	 
		var result = yield cursor.fetchBlock();
	 
		debug('rows ->', result.rows.length);
		// debug('rows ->', result.hasMoreRows);
		
		resultado = result.rows;
	 
		yield cursor.close();
	 
		yield connection.close();	
			
	}).then(function (res) {
		console.log("done");
		callback(resultado);
	}).catch(function (err) {
		console.error("ERROR: " + err.message);
		console.error(err.stack);
	});
}