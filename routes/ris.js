const path = require('path');
var log = require('electron-log');
log.transports.console.level = 'info';
log.transports.file.level = 'info';
log.transports.file.file = path.normalize(__dirname + '/../log/ris-log.log');;


var express = require('express');
var router = express.Router();

const productName = require('../package.json').productName;
/* GET home page. */
router.get('/', function(req, res, next) {
    log.info('serving home page...');
    res.render('ris', { title: productName });
});

router.get('/prove', function(req, res) {
	res.status(200).send({status: {code: 200}, text: 'ok say yes.'});
});

module.exports = router;
