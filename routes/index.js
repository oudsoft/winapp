/*
 * Copyright (C) 2017 Jason Henderson
 *
 * This software may be modified and distributed under the terms
 * of the MIT license.  See the LICENSE file for details.
 */

// Another example of logging out within the child process
var log = require('electron-log');
log.transports.console.level = 'info';
log.transports.file.level = 'info';

var express = require('express');
var router = express.Router();

const productName = require('../package.json').productName;
/* GET home page. */
router.get('/', function(req, res, next) {
    log.info('serving home page...');
    res.render('index', { title: productName });
});

router.get('/prove', function(req, res) {
	res.status(200).send({status: {code: 200}, text: 'ok say yes.'});
});

module.exports = router;
