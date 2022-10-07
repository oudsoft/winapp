/* uploader.js */
const util = require('util');
const fs = require('fs');
const os = require('os');
const path = require('path');
const multer = require('multer');
const base64Img = require('base64-img');
const unzip = require('unzip');
const exec = require('child_process').exec;

//const express = require('express');
//const router = express.Router();

//const log = require('electron-log');
//log.transports.console.level = 'info';
//log.transports.file.level = 'info';
var log;

const USRUPLOAD_DIR = process.env.USRUPLOAD_DIR;
const USRUPLOAD_PATH = process.env.USRUPLOAD_PATH;

const zipPath = '/img/usr/zip';
const zipDir = path.normalize(__dirname + '/../public' + zipPath);

const maxUploadSize = 3000000000;
const archiveMaxUploadSize = 9000000000;
const tempZipDir = __dirname + '/..' + USRUPLOAD_DIR + '/zip';
const tempDicomDir = __dirname +  '/..' + USRUPLOAD_DIR + '/temp';
const importer = multer({dest: tempZipDir, limits: {fileSize: maxUploadSize}});
const transferZipper = multer({dest: zipDir, limits: {fileSize: archiveMaxUploadSize}});

const { promisify } = require('util');
const { resolve } = require('path');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const getFiles = async function(dir) {
	const subdirs = await readdir(dir);
	const files = await Promise.all(subdirs.map(async (subdir) => {
		const res = resolve(dir, subdir);
		return (await stat(res)).isDirectory() ? getFiles(res) : res;
	}));
	return files.reduce((a, f) => a.concat(f), []);
}

const formatStr = function (str) {
  var args = [].slice.call(arguments, 1),
      i = 0;
  return str.replace(/%s/g, () => args[i++]);
}

const genUniqueID = function () {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
	return s4() + s4() + '-' + s4();
}

const runcommand = function (command) {
	return new Promise(function(resolve, reject) {
		log.info('Exec Command => ' + command);
		exec(command, (error, stdout, stderr) => {
			if(error === null) {
				resolve(`${stdout}`);
			} else {
				reject(`${stderr}`);
			}
        });
	});
}

const getFileSize = function(filename) {
	  let stats = fs.statSync(filename);
	  let {size} = stats;
	  let i = Math.floor(Math.log(size) / Math.log(1024));
	  return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][i];
}

module.exports = (app, wsServer, wsClient, monitor) =>{
	log = monitor;
	var localSocket = wsServer;
	var cloudSocket = wsClient;

	//log.info('cloudSocket=>' + cloudSocket);

	app.post('/cloud/socket/status', function(req, res) {
		res.status(200).send({status: {code: 200}, socket: {status: cloudSocket.state}});
	});

	app.post('/cloud/socket/reconnect', function(req, res) {
		cloudSocket.reconnect();
		res.status(200).send({status: {code: 200}, socket: {status: cloudSocket.state}});
	});

	app.get('/cloud/socket/reconnect', function(req, res) {
		cloudSocket.reconnect();
		res.status(200).send({status: {code: 200}, socket: {status: cloudSocket.state}});
	});

	app.post('/portal/archiveupload', importer.single('archiveupload'), async function(req, res) {
		var filename = req.file.originalname;
		var fullnames = filename.split('.');
		var newFileName = genUniqueID() + '.zip';
		var archivePath = req.file.destination + '/' + req.file.filename;
		var newPath = req.file.destination + '/'  + newFileName;
		var readStream = fs.createReadStream(archivePath);
		var writeStream = fs.createWriteStream(newPath);
		var writerRes = await readStream.pipe(writeStream);
		//log.info('writerRes=> ' + JSON.stringify(writerRes));
		/*
		var command = formatStr('rm %s', archivePath);
		runcommand(command).then((stdout) => {
			var link =  USRUPLOAD_PATH + '/' + newFileName;
			res.status(200).send({status: {code: 200}, text: 'ok archive upload.', link: link, file: newFileName});
		}).catch((err) => {
			console.log('err: 500 >>', err);
			res.status(500).send({status: {code: 500}, error: err});
		});
		*/
		let rmTempRes = await fs.unlinkSync(archivePath);
		var link =  USRUPLOAD_PATH + '/' + newFileName;
		writeStream.on('finish', function() {
			res.status(200).send({status: {code: 200}, text: 'ok archive upload.', link: link, file: newFileName});
		})
	});

	app.post('/portal/importarchive', async function(req, res) {
		const usrUploadDir = path.join(__dirname, '/..', 'public', 'img', 'usr', 'upload', 'zip');
		const orthancUrl = 'http://localhost:8042';
		const orthancUser = 'demo';
		const orthancPass = 'demopassword';
		let archiveFileName = req.body.archivecode;
		//log.info('archiveCode=>' + archiveFileName);
		let pacsImportOption = req.body.pacsImportOption;
		log.info('option=>' + pacsImportOption);

		let archiveCodes = archiveFileName.split('.');
		let archiveCode = archiveCodes[0];

		let archiveDir = usrUploadDir + '/' + archiveCode;

		if (!fs.existsSync(archiveDir)) {
			fs.mkdirSync(archiveDir);
		}

		let archiveFile = archiveDir+'.zip';
		let stats = fs.statSync(archiveFile);
		log.info('archiveFileData => ' + JSON.stringify(stats));
		log.info('file size => ' + getFileSize(archiveFile));
		let archiveFileSize = stats.size;
		let archiveProgressSize = 0;
		let extracTime = 1;
		let archiveStreamReader = await fs.createReadStream(archiveFile);
		archiveStreamReader.on('data', function(chunk) {
			extracTime += 1;
			archiveProgressSize += chunk.length;
			let percent = ((archiveProgressSize) / archiveFileSize) * 100;
			localSocket.clients.forEach((ws) =>{
				ws.send(JSON.stringify({type: 'triggerunzipprogress', data: {archiveFileSize: archiveFileSize,  archiveProgressSize: archiveProgressSize}}));
			});
		});
		let archiveStreamWriter = await archiveStreamReader.pipe(unzip.Extract({ path: archiveDir }));
		archiveStreamWriter.on('close', function () {
			log.info('Unzip Archive Success, and start import for you.');
			getFiles(archiveDir).then((files) => {
				const delay = 2500;
				const importDicom = function(dicomFile, pos){
					return new Promise(async function(resolve, reject){
						let command = formatStr('curl -X POST --user %s:%s %s/instances --data-binary @"%s"', orthancUser, orthancPass, orthancUrl, dicomFile);
						let stdout = await runcommand(command);
						setTimeout(()=>{
							resolve(JSON.parse(stdout));
						}, 215);
					});
				};
				const doStorePACS = function(instanceId){
					return new Promise(async function(resolve, reject){
						let storeCommand = formatStr('curl -X POST --user %s:%s %s/modalities/pacs/store -d %s', orthancUser, orthancPass, orthancUrl, instanceId);
						runcommand(storeCommand).then((stdout) => {
							let resourceObj = JSON.parse(stdout);
							log.info('resourceObj=>'+ JSON.stringify(resourceObj));
							resolve(resourceObj);
						});
					});
				};

				let execResults = [];
				let promiseList = new Promise(async function(resolve2, reject2){
					let i = 0;
					while (i < files.length) {
						let item = files[i];
						//let pathFormat = item.split(' ').join('^ ');
						let pathFormat = item;
						let importRes = await importDicom(pathFormat, i);
						log.info('importRes=>'+ JSON.stringify(importRes));
						if (pacsImportOption == 'true') {
							let instanceId = importRes.ID;
							let pacsRes = await doStorePACS(instanceId);
							log.info('pacsRes=>'+ JSON.stringify(pacsRes));
						}
						localSocket.clients.forEach((ws) =>{
							ws.send(JSON.stringify({type: 'triggerimportprogress', data: {position: (i+1),  all: files.length}}));
						});
						if (i == (files.length-1)) {
							localSocket.clients.forEach((ws) =>{
								ws.send(JSON.stringify({type: 'triggerimportsuccess', data: importRes}));
							});
						}
						execResults.push(importRes);
						i++;
					}
					setTimeout(()=>{
						resolve2(execResults);
					}, delay);
				});
				//log.info('countt all Files => ' + files.length);
				//res.status(200).send({result: files});
				Promise.all([promiseList]).then(async (ob)=>{
					let instanceTag = ob[0][0];
					let importResult = {type: 'importresult', result: instanceTag};
					res.status(200).send({result: importResult});
				}).catch((error) => {
					log.error('Error=>'+ JSON.stringify(error));
					res.status(500).send({error: error});
				});
			});
		});
	});

	app.post('/transfer/archive', transferZipper.single('archiveupload'), function(req, res) {
		var filename = req.file.originalname;
		var archivePath = req.file.destination + '/' + req.file.filename;
		var newPath = req.file.destination + '/'  + filename;

		console.log('originalname=> ' + req.file.originalname);
		console.log('destination=> ' + req.file.destination);
		console.log('archivePath=>' + archivePath);
		console.log('newPath=>' + newPath);

		var readStream = fs.createReadStream(archivePath);
		var writeStream = fs.createWriteStream(newPath);
		readStream.pipe(writeStream);
		setTimeout(async()=>{
			let dest = zipDir + '/' + filename;
			var command = 'curl --list-only --user sasurean:drinking@min -T ' + dest + ' ftp://150.95.26.106/Radconnext/public' + zipPath + '/';
	    log.info('ftp command=>' + command);
			try {
		    var stdout = await runcommand(command);
				res.status(200).send({status: {code: 200}, archive: {name: filename, link: zipPath + '/' + filename}});
			} catch(error) {
				log.error(error);
				res.json({status: {code: 500}, error: error});
			}
		}, 1000);
	});

	return {
		formatStr,
		runcommand
	};
}
