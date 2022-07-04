const fs = require('fs');
const path = require('path');
const request = require('request-promise');
const exec = require('child_process').exec;
const fetch = require('node-fetch');
const {pipeline} = require('stream');
const {promisify} = require('util');
const streamPipeline = promisify(pipeline);
const formData = require('form-data');
const base64 = require('base-64');

var log;

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

const proxyRequest = function(rqParam) {
	return new Promise(function(resolve, reject) {
		let rqBody = JSON.stringify(rqParam.body);
		let proxyParams = {
			method: rqParam.method,
			url: rqParam.url,
			auth: rqParam.auth,
			headers: {
				'Content-Type': 'application/json'
			},
			body: rqBody
		};
		if (rqParam.Authorization) {
			proxyParams.headers.Authorization = rqParam.Authorization;
		}
		log.info('proxyParams=>' + JSON.stringify(proxyParams));
		request(proxyParams, (err, res, body) => {
			if (!err) {
				resolve({status: {code: 200}, res: res});
			} else {
				log.error('your Request Error=>' + JSON.stringify(err));
				reject({status: {code: 500}, err: err});
			}
		});
	});
}

const formatStr = function (str) {
  var args = [].slice.call(arguments, 1);
  var i = 0;
  return str.replace(/%s/g, () => args[i++]);
}

const contains = function(needle) {
  // Per spec, the way to identify NaN is that it is not equal to itself
  var findNaN = needle !== needle;
  var indexOf;

  if(!findNaN && typeof Array.prototype.indexOf === 'function') {
    indexOf = Array.prototype.indexOf;
  } else {
    indexOf = function(needle) {
      var i = -1, index = -1;

      for(i = 0; i < this.length; i++) {
        var item = this[i];

        if((findNaN && item !== item) || item === needle) {
          index = i;
          break;
        }
      }

      return index;
    };
  }
  return indexOf.call(this, needle) > -1;
}

const genUniqueID = function () {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
	return s4() + s4() + '-' + s4();
}

const preciseMathDotRound = function(value, precision = 0) {
  return parseFloat(value.toFixed(precision));
}

const doDownloadFile = function(srcUrl, dest){
	return new Promise(async function(resolve, reject) {
    log.info("Downloading: ", srcUrl)
    const response = await fetch(srcUrl);
    if (!response.ok) {
      let downloadError = new Error(`unexpected response ${response.statusText}`);
      reject(downloadError);
    }
    await streamPipeline(response.body, fs.createWriteStream(dest));
    log.info("Download Done: ", dest);
    resolve(dest);
  });
}

const doUploadDicomOrthanc = function(dicomPath){
	return new Promise((resolve, reject)=>{
		//const orthancUrl = 'http://localhost:8042/instances';
		const orthancUrl = 'http://202.28.68.28:8043/instances';
		const userpass = "demo:demo";
		var uploadFormData = new formData();
		var data = fs.createReadStream(dicomPath);
		log.info('data=> ' + JSON.stringify(data));
		//uploadFormData.append("uploadby","oudsoft");
		uploadFormData.append("data", data, {type:"application/octet-stream"});
		//log.info('uploadFormData=> ' + JSON.stringify(uploadFormData));
		var uploadFormHeaders = uploadFormData.getHeaders();
		//log.info('uploadFormHeaders=> ' + JSON.stringify(uploadFormHeaders));
		uploadFormHeaders.Authorization = 'Basic ' + base64.encode(userpass);
		log.info('uploadFormHeaders=> ' + JSON.stringify(uploadFormHeaders));
		var options = {
	    method: 'POST',
	    body: uploadFormData,
	    headers: {
	      uploadFormHeaders
	    },
	  }
		return fetch(orthancUrl, options).then(res => {
			log.info('res=> ' + JSON.stringify(res));
	    if (res.ok) {
	      resolve(res.json());
	    } else {
	    	reject({error: new Error(res.statusText)});
			}
	  });
	});
}

const doCallStudiesFromLocalOrthanc = function(){
	return new Promise((resolve, reject)=>{
		const orthancUrl = 'http://localhost:8042/studies';
		const userpass = "demo:demo";
		var options = {
	    method: 'GET',
	    headers: {
				'Authorization': 'Basic ' + base64.encode(userpass)
	    }
	  }
		return fetch(orthancUrl, options).then(res => {
			log.info('res=> ' + JSON.stringify(res));
	    if (res.ok) {
	      resolve(res.json());
	    } else {
	    	reject({error: new Error(res.statusText)});
			}
	  });
	});
}

const doCallStudyFromLocalOrthanc = function(studyId){
	return new Promise((resolve, reject)=>{
		const orthancUrl = 'http://localhost:8042/studies/' + studyId;
		const userpass = "demo:demo";
		var options = {
	    method: 'GET',
	    headers: {
				'Authorization': 'Basic ' + base64.encode(userpass)
	    }
	  }
		return fetch(orthancUrl, options).then(res => {
			log.info('res=> ' + JSON.stringify(res));
	    if (res.ok) {
	      resolve(res.json());
	    } else {
	    	reject({error: new Error(res.statusText)});
			}
	  });
	});
}

const doCallDeleteStudyFromLocalOrthanc = function(studyId){
	return new Promise((resolve, reject)=>{
		const orthancUrl = 'http://localhost:8042/studies/' + studyId;
		const userpass = "demo:demo";
		var options = {
	    method: 'DELETE',
	    headers: {
				'Authorization': 'Basic ' + base64.encode(userpass)
	    }
	  }
		return fetch(orthancUrl, options).then(res => {
			log.info('res=> ' + JSON.stringify(res));
	    if (res.ok) {
	      resolve(res.json());
	    } else {
	    	reject({error: new Error(res.statusText)});
			}
	  });
	});
}

module.exports = (monitor) => {
	log = monitor;
  return {
		runcommand,
    proxyRequest,
		formatStr,
		contains,
		genUniqueID,
		preciseMathDotRound,
		doDownloadFile,
		doUploadDicomOrthanc,
		doCallStudiesFromLocalOrthanc,
		doCallStudyFromLocalOrthanc,
		doCallDeleteStudyFromLocalOrthanc
  }
}
