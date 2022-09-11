/*onnewreport-worker.js*/
const log = require('electron-log');
log.transports.console.level = 'info';
log.transports.file.level = 'info';
log.transports.file.file = __dirname +  '/log/newreport-log.log';

const exec = require('child_process').exec;
const path = require('path');
const fs = require('fs');
const url = require('url');
const request = require('request-promise');
const requester = require('request');
const https = require('https');

const util = require('./lib/utility.js')( log);

const hospitalId = process.env.LOCAL_HOS_ID; /* 2 */
const username = process.env.LOCAL_NAME; /*'orthanc'*/
const radconApiUrl = process.env.RADCONNEXT_URL; /* 'https://radconnext.info'*/
const userId = process.env.LOCAL_USER_ID; /* 1 */
const tempDest = process.env.LOCAL_TEMP_DIR; /* D:\\Radconnext\\temp\\ */
const orthancUrl = 'http://localhost:8042';
const user = 'demo';
const pass = 'demo';

const doDownloadFile = function(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  https.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);
    });
  });
}

const doDeleteResultSeries = function(seriesIds){
  return new Promise(async function(resolve, reject) {
    let deleteReses = [];
    if ((seriesIds) && (seriesIds.length > 0)) {
      const promiseList = new Promise(async function(resolve2, reject2) {
        await seriesIds.forEach((item, i) => {
          let deleteUrl = orthancUrl + '/series/' + item
          let headers = {
            'content-type': 'application/json',
          };
          let auth = {
            user: user,
            pass: pass
          };
          let deleteOptions = {
            url: deleteUrl,
            method: 'DELETE',
            headers: headers,
            auth: auth,
          };
          requester(deleteOptions, (perr, pres, pbody)=>{
            if ((!perr) && (pbody) && (pbody !== '')) {
              let pBody = JSON.parse(pbody);
              deleteReses.push(pBody);
            }
          });
        });
        setTimeout(()=>{
          resolve2(deleteReses);
        }, 1000);
      });
      Promise.all([promiseList]).then((ob)=> {
        log.info('deleteResultSeriesReses => ' + JSON.stringify(ob[0]));
        resolve({deleteresult: ob[0]});
      })
    } else {
      resolve(deleteReses);
    }
  });
}

const doStoreDicomFile = function(dicomFile, orthancUrl, user, pass){
  return new Promise(async function(resolve, reject) {
    log.info('Store DICOM from local DCM file => ' + dicomFile);
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
      if (pbody) {
        log.info('Store DCM to local Orthanc pbody=> ' + JSON.stringify(pbody));
      }
      if (pres) {
        log.info('Store DCM to local Orthanc pres=> ' + JSON.stringify(pres));
      }
      if (perr) {
        log.info('Store DCM to local Orthanc perr=> ' + JSON.stringify(perr));
      }
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
        log.info('Send new Instance from Orthanc to PACS lbody=> ' + JSON.stringify(lbody));
        log.info('lres=> ' + JSON.stringify(lres));
        log.info('lerr=> ' + JSON.stringify(lerr));
        resolve(lbody);
      });
    });
  });
}

const doNewStoreProcess = function(dcmName){
  return new Promise((resolve, reject)=>{
    let downloadFileLink = radconApiUrl + '/img/usr/pdf/' + dcmName;
    let tempDestFile = tempDest + dcmName;
    const downloadCallback = async function(){
      let storeRes = await doStoreDicomFile(tempDestFile, orthancUrl, user, pass);
      resolve(storeRes);
    }
    doDownloadFile(downloadFileLink, tempDestFile, downloadCallback)
  });
}

const doConvertProcess = function(dcmName){
  return new Promise((resolve, reject)=>{
    let downloadCmd = 'curl -k ' + radconApiUrl + '/img/usr/pdf/' + dcmName + ' -o D:\\radcon\\tmp\\' + dcmName;
    log.info('Start Download Dicom with command=> ' + downloadCmd);
    util.runcommand(downloadCmd).then((result) => {
      log.info('Download dcm Result=> ' + result);
			let storeCmd = 'curl -X POST --user demo:demo http://localhost:8042/instances --data-binary @D:\\radcon\\tmp\\' +  dcmName;
      log.info('Start Store Dicom to local orthanc with command=> ' + storeCmd);
      util.runcommand(storeCmd).then((result2) => {
        log.info('Store Dicom Result=> ' + result2);
				let orthancRes = JSON.parse(result2);
				let moveCmd = 'curl --user demo:demo -X POST http://localhost:8042/modalities/pacs/store -d ' + orthancRes.ID;
				log.info('Start Send Dicom to pacs with command=> ' + moveCmd);
				util.runcommand(moveCmd).then((result3) => {
	        log.info('Send Dicom Result=> ' + result3);
					resolve(result3);
				}).catch((err3) => {
          log.error('Send Error=> ' + JSON.stringify(err3));
	        reject(err3);
	      });
      }).catch((err2) => {
        log.error('Store Error=> ' + JSON.stringify(err2));
        reject(err2);
      });
    }).catch((err1) => {
      log.error('Download Error=> ' + JSON.stringify(err1));
      reject(err1);
    });
  })
}

const doCopyDicomInstancToPacs = function(seriesInstanceUID){
  return new Promise(async(resolve, reject)=>{
    let rqBody = {
      Level : "Series",
      Resources : [
        { SeriesInstanceUID: seriesInstanceUID }
      ],
      TargetAet: "pacs",
      Timeout: 60
    };
    let auth = {
      user: 'demo',
      pass: 'demo'
    }
		let proxyParams = {
			method: 'POST',
			url: 'http://localhost:8042/modalities/cloud/move',
			auth: auth,
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(rqBody)
		};
		request(proxyParams, (err, res, body) => {
			if (!err) {
        log.info('proxyRes=>' + JSON.stringify(res));
        log.info('proxyResBody=>' + JSON.stringify(body));
				resolve({status: {code: 200}, res: res});
			} else {
				log.error('your Request Error=>' + JSON.stringify(err));
				reject({status: {code: 500}, err: err});
			}
		});

  });
}

const doEventProcess = function(data){
  return new Promise(async(resolve, reject)=>{
    //log.info('Data for me.=>'+ JSON.stringify(data));
    let convertReportReses = [];
    let promiseList = new Promise(async function(resolve2, reject2) {
      /*
      log.info('data.dicom.name=>'+ JSON.stringify(data.dicom.name));
      let pages = data.dicom.name.dicom.length;
      for (let i=0; i < (pages); i++) {
        let dcmName = data.dicom.name.dicom[i];
        let convertReportRes = await doConvertProcess(dcmName);
        log.info('convertReportRes=>'+ JSON.stringify(convertReportRes));
        convertReportReses.push(convertReportRes);
      }

      log.info('seriesInstanceUIDs=>'+ JSON.stringify(data.dicom.seriesInstanceUIDs));
      let pages = data.dicom.seriesInstanceUIDs.length;
      for (let i=0; i < (pages); i++) {
        let seriesInstanceUID = data.dicom.seriesInstanceUIDs[i];
        let copyReportRes = await doCopyDicomInstancToPacs(data.dicom.seriesInstanceUIDs);
        log.info('copyReportRes=>'+ JSON.stringify(copyReportRes));
        convertReportReses.push(copyReportRes);
      }
      */

      let seriesIds = data.dicom.seriesIds;
      if (seriesIds) {
        let deleteRes = await doDeleteResultSeries(seriesIds);
      }

      let pages = data.dicom.name.dicom.length;
      if (pages > 0) {
        for (let i=0; i < (pages); i++) {
          let dcmName = data.dicom.name.dicom[i];
          let convertReportRes = await doNewStoreProcess(dcmName);
          log.info('convertReportRes=>'+ JSON.stringify(convertReportRes));
          convertReportReses.push(convertReportRes);
        }
      }
      setTimeout(()=> {
        resolve2(convertReportReses);
      },1800);
    });
    Promise.all([promiseList]).then((ob)=> {
      log.info('ENVISION_URL => ' + process.env.ENVISION_URL);
      if (process.env.ENVISION_URL) {
        let rqParams = {
          body: data.risParams,
          /* Viruchsil */
          //url: 'http://192.168.1.108/EnvisionRIEGet3rdPartyDataAi/Service/GetResult',
          /* Taweesak */
          //url: 'http://172.16.5.100:9301/EnvisionRIEGet3rdPartyDataAi/Service/GetResult',
          url: process.env.ENVISION_URL,
          method: 'post'
        }
        util.proxyRequest(rqParams).then((proxyRes)=>{
      		log.info('proxyRes=>'+ JSON.stringify(proxyRes));
      		resolve(proxyRes);
      	});
      } else {
        resolve(ob[0]);
      }
    });
  });
}

module.exports = (input, callback) => {
	let data = input;
  try {
		doEventProcess(data).then((eventRes)=>{
			callback(eventRes);
		});
  } catch (error){
		log.error('NewReportError=>' + JSON.stringify(error));
  }
}
