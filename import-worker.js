/* import-worker.js */
// This will run in forked processes
const log = require('electron-log');
log.transports.console.level = 'info';
log.transports.file.level = 'info';
log.transports.file.file = __dirname +  '/log/import-log.log';

const exec = require('child_process').exec;
const path = require('path');
const fs = require('fs');

const runcommand = function (command) {
	return new Promise(function(resolve, reject) {
		exec(command, (error, stdout, stderr) => {
			if(error === null) {
				resolve(`${stdout}`);
			} else {
				reject(`${stderr}`);
			}
		});
	});
}

const doDownloadFile = function(url){
	return new Promise(async function(resolve, reject){
		const currentDir = __dirname;
		const publicDir = path.normalize(currentDir + '/');
		const saveTarget = publicDir + 'public/img/usr/upload/temp';

		let urlPaths = url.split('/');
		let downloadFilename = urlPaths[urlPaths.length-1];
		let saveTo = saveTarget + '/' + downloadFilename;

		let pathFormat = url.split(' ').join('%20');
		let urlCallDownkoad = pathFormat;

		let downloadCommand = 'curl -k ' + urlCallDownkoad + ' -o ' + saveTo;
		log.info('Start Download with command=> ' + downloadCommand);
		runcommand(downloadCommand).then((stdout) => {
			log.info('Download result=> ' + stdout);
			resolve(saveTo);
		});
	});
}

const doStoreLocal = function(dcmFile) {
	return new Promise(async function(resolve, reject){
		let storeCommand = 'curl -X POST --user demo:demopassword http://localhost:8042/instances --data-binary @' + dcmFile;
		log.info('Start StoreSCU with command=> ' + storeCommand);
		runcommand(storeCommand).then((stdout) => {
			log.info('StoreSCU result=> ' + stdout);
			let instanceObj = JSON.parse(stdout);
			resolve(instanceObj);
		});
	});
}

const doStorePACS = function(instanceId){
	return new Promise(async function(resolve, reject){
		let storeCommand = 'curl -X POST --user demo:demopassword http://localhost:8042/modalities/pacs/store -d ' + instanceId;
		log.info('Send Dicom to PACS with command=> ' + storeCommand);
		runcommand(storeCommand).then((stdout) => {
			log.info('Send to PACS result=> ' + stdout);
			let resourceObj = JSON.parse(stdout);
			resolve(resourceObj);
		});
	});
}

const doRun = function(input){
	return new Promise(async function(resolve, reject){
		log.info('data input=>' + JSON.stringify(input));
		let dcmFile = await doDownloadFile(input.download.link);
		let storeRes = await doStoreLocal (dcmFile);
		let instanceId = storeRes.ID;
		let moveRes = await doStorePACS(instanceId);
		resolve(moveRes);
	});
}

module.exports = (input, callback) => {
	try {
		let data = input;
		doRun(data).then((storeRes)=>{
			log.info('output send back to main=>' + JSON.stringify(storeRes));
			callback(storeRes);
		});
	} catch (error){
		log.error('ImportError=>' + JSON.stringify(error));
    reject(error);
  }
}
