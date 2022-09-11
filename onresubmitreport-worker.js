/*onresubmitreport-worker.js*/
const log = require('electron-log');
log.transports.console.level = 'info';
log.transports.file.level = 'info';
log.transports.file.file = __dirname +  '/log/resubmitreport-log.log';

const exec = require('child_process').exec;
const path = require('path');
const fs = require('fs');
const url = require('url');
const request = require('request-promise');
const requester = require('request');
const http = require('http');

const util = require('./lib/utility.js')( log);

const hospitalId = process.env.LOCAL_HOS_ID; /* 2 */
const username = process.env.LOCAL_NAME; /*'orthanc'*/
const radconApiUrl = process.env.RADCONNEXT_URL; /* 'https://radconnext.info'*/
const userId = process.env.LOCAL_USER_ID; /* 1 */
const tempDest = process.env.LOCAL_TEMP_DIR; /* D:\\Radconnext\\temp\\ */
const orthancLocalUrl = 'http://localhost:8042';
const orthancCloudUrl = 'http://202.28.68.28:9044';
const user = 'demo';
const pass = 'demo';

const doCallInstances = function(sereisID){
  return new Promise(function(resolve, reject) {
    let callUrl = orthancCloudUrl + '/series/' + seriesID;
    let headers = {
      'content-type': 'application/json',
    };
    let auth = {
      user: user,
      pass: pass
    };
    let callOptions = {
      url: callUrl,
      method: 'GET',
      headers: headers,
      auth: auth,
    };

    requester(callOptions, (perr, pres, pbody)=>{
      log.info('pbody=> ' + pbody);
      let instances = JSON.parse(pbody).Instances;
      resolve(instances);
    });
  });
}

const doDownloadInstanceToDcmFile = function(instanceID, dest, cb) {
  let file = fs.createWriteStream(dest);
  let callUrl = orthancCloudUrl + '/instances/' + instanceID + '/file';
  let auth = {
    user: user,
    pass: pass
  };
  let callOptions = {
    url: callUrl,
    method: 'GET',
    auth: auth,
  };

  requester(callOptions, (perr, pres, pbody)=>{
  //http.get(url, function(response) {
    pres.pipe(file);
    file.on('finish', function() {
      file.close(cb);
    });
  });
}

const doStoreDicomFile = function(dicomFile, orthancUrl, user, pass){
  return new Promise(async function(resolve, reject) {
    let postToUrl = orthancUrl + '/instances'
    let stream = fs.createReadStream(dicomFile);
    let headers = {
      'content-type': 'application/json',
    };
    let auth = {
      user: user,
      pass: pass
    };
    let postOptions = {
      url: postToUrl,
      method: 'POST',
      headers: headers,
      auth: auth,
      body: stream,
    };

    requester(postOptions, (perr, pres, pbody)=>{
      log.info('pbody=> ' + pbody);
      let instanceID = JSON.parse(pbody).ID;
      let storeDicomUrl = orthancUrl + '/modalities/pacs/store';
      let storeDicomOptions = {
        url: storeDicomUrl,
        method: 'POST',
        headers: headers,
        auth: auth,
        body: instanceID
      }
      requester(storeDicomOptions, (lerr, lres, lbody)=>{
        resolve(lbody);
      });
    });
  });
}

const doReStoreProcess = function(series){
  return new Promise((resolve, reject)=>{
    const promiseList = new Promise(async function(resolve2, reject2) {
      let storeResults = [];
      for (i=0; i < series.length; i++){
        let seriesID = series[i];
        let instances = await doCallInstances(sereisID);
        let instanceID = instances[0];
        let destFile = tempDest + instanceID + '.dcm';

        doDownloadInstanceToDcmFile(instanceID, destFile, downloadCallback)
      }
      const downloadCallback = async function(){
        let storeRes = await doStoreDicomFile(tempDestFile, orthancLocalUrl, user, pass);
        storeResults.push(storeRes);
      }
      setTimeout(()=>{
        resolve2(storeResults)
      }, 1800);
    });
    Promise.all([promiseList]).then((ob)=> {
      let rqParams = {
        body: data.risParams,
        /* Viruchsil */
        //url: 'http://192.168.1.108/EnvisionRIEGet3rdPartyDataAi/Service/GetResult',
        /* Taweesak */
        url: 'http://172.16.5.100:9301/EnvisionRIEGet3rdPartyDataAi/Service/GetResult',
        method: 'post'
      }
      util.proxyRequest(rqParams).then((proxyRes)=>{
    		log.info('proxyRes=>'+ JSON.stringify(proxyRes));
    		resolve(proxyRes);
    	});
    });
  });
}

module.exports = (input, callback) => {
	let data = input;
  try {
    let seriesIds = data.pdfDicomSeriesIds;
		doReStoreProcess(seriesIds).then((eventRes)=>{
			callback(eventRes);
		});
  } catch (error){
		log.error('ResubmitReportError=>' + JSON.stringify(error));
  }
}
