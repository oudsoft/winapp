/*upload-worker.js*/
const logDir =  __dirname +  '/log';
const log = require('electron-log');
log.transports.console.level = 'info';
log.transports.file.level = 'info';
log.transports.file.file =logDir +  '/upload-log.log';

const path = require('path');
const fetch = require('node-fetch');
const {pipeline} = require('stream');
const {promisify} = require('util');
const { createReadStream, createWriteStream } = require('fs');

const FormData = require('form-data');
const streamPipeline = promisify(pipeline);

const uploadUrl = 'https://radconnext.info/api/log/upload'

const doEventProcess = function(filepath){
  var data = new FormData();
  data.append('type', 'text');
  data.append('log', createReadStream(filepath));
  data.append('uploadby', 'oudsoft');

  const options = {
    method: 'POST',
    body: data,
    headers: {
      ...data.getHeaders()
    },
  }
  return fetch(uploadUrl, options).then(res => {
    log.info('res=> ' + JSON.stringify(res));
    if (res) {
      return res.json()
    }
    throw new Error(res.statusText)
  });
}

module.exports = (input, callback) => {
	let data = input;
  try {
		doEventProcess(data).then((eventRes)=>{
			callback(eventRes);
		});
  } catch (error){
		log.error('UploadError=>' + JSON.stringify(error));
  }
}
