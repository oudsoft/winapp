/*convert-worker.js*/
const log = require('electron-log');
log.transports.console.level = 'info';
log.transports.file.level = 'info';
log.transports.file.file = __dirname +  '/log/convert-log.log';

const exec = require('child_process').exec;
const path = require('path');
const fs = require('fs');

const util = require('./lib/utility.js')( log);

const runcommand = function (command) {
	return new Promise(function(resolve, reject) {
		log.info("Exec Command=>" + command);
		exec(command, (error, stdout, stderr) => {
			if(error === null) {
				resolve(`${stdout}`);
			} else {
				log.info('Error Exec => ' + error)
				reject(`${stderr}`);
			}
		});
	});
}

const doConvertProcess = function(data){
  return new Promise((resolve, reject)=>{
		let dcmcodes = data.dcmcodes;
		setTimeout(()=>{
			dcmcodes.forEach((item, i) => {
				let srcUrl = 'https://' + data.hostname + '/img/usr/pdf/' + item + '.dcm';
				let dest = 'D:\\Radconnext\\tmp\\' + item + '.dcm';
		    //let downloadCmd = 'curl -k ' + srcUrl + ' -o ' + dest;
		    //log.info('Start Download Dicom with command=> ' + downloadCmd);
		    //runcommand(downloadCmd).then((result) => {
				util.doDownloadFile(srcUrl, dest).then((downloadRes)=>{
		      log.info('Download dcm Result=> ' + downloadRes);
		      //let storeCmd = 'storescu localhost 4242 D:\\RadConnext\\tmp\\'  +  item + ' -v';
					let storeCmd = 'curl -X POST --user demo:demopassword http://localhost:8042/instances --data-binary @D:\\Radconnext\\tmp\\' +  item + '.dcm';
		      log.info('Start Store Dicom to local orthanc with command=> ' + storeCmd);
		      runcommand(storeCmd).then((result2) => {
		        log.info('Store Dicom Result=> ' + result2);
						let orthancRes = JSON.parse(result2);
						let moveCmd = 'curl --user demo:demopassword -X POST http://localhost:8042/modalities/pacs/store -d ' + orthancRes.ID;
						log.info('Start Send Dicom to pacs with command=> ' + moveCmd);
						runcommand(moveCmd).then((result3) => {
			        log.info('Send Dicom Result=> ' + result3);
							resolve(result3);
						}).catch((err3) => {
			        reject(err3);
			      });
		      }).catch((err2) => {
		        reject(err2);
		      });
		    }).catch((err1) => {
		      reject(err1);
		    });
			});
		},7500);
  })
}

module.exports = (input, callback) => {
	return new Promise(async function(resolve, reject){
		let data = input;
    try {
  		let convertRes = await doConvertProcess(data);
  		callback(convertRes);
  		resolve(convertRes);
    } catch (error){
  		log.error('ConvertError=>' + JSON.stringify(error));
      reject(error);
    }
	});
}
