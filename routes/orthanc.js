var formData = require('form-data');
var fetch = require('node-fetch');
var base64 = require('base-64');
var path = require('path');

var { createReadStream, createWriteStream } = require('fs');

var log, util, dicom, webSocketServer, webSocketClient;

var formatTodayStr = function(){
  /*
  const offset = 7;
  let d = new Date();
  let utc = d.getTime();
  d = new Date(utc + (3600000 * offset));
  */
  let d = new Date();
  var yy, mm, dd, hh;
  yy = d.getFullYear();
  if (d.getMonth() + 1 < 10) {
    mm = '0' + (d.getMonth() + 1);
  } else {
    mm = '' + (d.getMonth() + 1);
  }
  if (d.getDate() < 10) {
    dd = '0' + d.getDate();
  } else {
    dd = '' + d.getDate();
  }
  return `${yy}${mm}${dd}`;
}

var getYesterdayStr = function(){
  var d = new Date();
  d.setDate(d.getDate() - 1);
  var yy, mm, dd, hh;
  yy = d.getFullYear();
  if (d.getMonth() + 1 < 10) {
    mm = '0' + (d.getMonth() + 1);
  } else {
    mm = '' + (d.getMonth() + 1);
  }
  if (d.getDate() < 10) {
    dd = '0' + d.getDate();
  } else {
    dd = '' + d.getDate();
  }
  return `${yy}${mm}${dd}`;
}

var getLastMonthStr = function(){
  var d = new Date();
  //d.setDate(d.getMonth() - 1);
  d.setDate(d.getDate() - process.env.LASTDAYNUMBER);
  var yy, mm, dd, hh;
  yy = d.getFullYear();
  if (d.getMonth() + 1 < 10) {
    mm = '0' + (d.getMonth() + 1);
  } else {
    mm = '' + (d.getMonth() + 1);
  }
  if (d.getDate() < 10) {
    dd = '0' + d.getDate();
  } else {
    dd = '' + d.getDate();
  }
  return `${yy}${mm}${dd}`;
}

var doDownloadStudyArchive = function(studyID, usrArchiveFileName){
  return new Promise(async function(resolve, reject){
    let promiseList = new Promise(async function(resolve2, reject2){
      const zipPath = '/img/usr/zip';
      var usrArchiveDir = path.normalize(__dirname + '/../public' + zipPath);
      var archiveFileName = studyID + '.zip';
      if (usrArchiveFileName) {
        archiveFileName = usrArchiveFileName;
      }
      var archiveFilePath = usrArchiveDir + '/' + archiveFileName;
      var command = 'curl --user demo:demo http://localhost:8042/studies/' + studyID + '/archive > ' + archiveFilePath;
      var stdout = await util.runcommand(command);
      setTimeout(()=> {
        resolve2({archive: zipPath + '/' + archiveFileName, result: stdout});
      },1200);
    });
    Promise.all([promiseList]).then((ob)=>{
      resolve(ob[0]);
    })
  });
}

var doUploadArchive = function (filepath, type) {
  log.info('upload filepath=>' + filepath);
  /*
  var data = new formData();
  data.append('type', 'zip');
  data.append('archive', createReadStream(filepath));
  data.append('uploadby', 'rpp');
  var uploadArchiveUrl = 'https://radconnext.info/api/upload/dicom/archive'
  const options = {
    method: 'POST',
    body: data,
    headers: {
      ...data.getHeaders()
    },
  }
  return fetch(uploadArchiveUrl, options).then(res => {
    if (res.ok) {
      return res.json()
    }
    throw new Error(res.statusText)
  });
  */
  return new Promise(async function(resolve, reject){
    var command = 'curl --list-only --user sasurean:drinking@min -T ' + filepath + ' ftp://150.95.26.106/Radconnext/public/img/usr/upload/temp/  -v';
    log.info('ftp command=>' + command);
    var stdout = await util.runcommand(command);
    log.info('command output=>' + stdout);
    setTimeout(()=> {
      resolve({result: stdout});
    },1200);
  });
}

var doCallImportDicomFromArchive = function (studyID) {
  return new Promise(async function(resolve, reject){
    let command = 'curl -k -X POST https://radconnext.info/api/orthancproxy/importarchive/5/' + studyID + '/rpp';
    log.info('command=> ' + command);
    util.runcommand(command).then((stdout)=>{
      log.info('stdout=> ' + stdout);
      resolve({result: stdout});
    });
  });
}

var doCallSeries = function(seriesId) {
  return new Promise(async function(resolve, reject){
    let command = 'curl --user demo:demo http://localhost:8042/series/' + seriesId;
    util.runcommand(command).then(async(stdout)=>{
      let seriesJSON = JSON.parse(stdout);
      resolve(seriesJSON);
    });
  });
}

var doCallStudy = function(studyId) {
  return new Promise(async function(resolve, reject){
    let command = 'curl --user demo:demo http://localhost:8042/studies/' + studyId;
    util.runcommand(command).then(async(stdout)=>{
      let studyJSON = JSON.parse(stdout);
      resolve(studyJSON);
    });
  });
}

var doResetImageCounter = function(studyID){
  return new Promise(async function(resolve, reject){
    let addNewDicomParams = '{\\"hospitalId\\": \\"5\\", \\"resourceType\\": \\"study\\", \\"resourceId\\": \\"' + studyID + '\\"}';
    let command = 'curl -k -H "Content-Type: application/json" -X POST https://radconnext.info/api/dicomtransferlog/add -d "' + addNewDicomParams + '"';
    log.info('add new command=> ' + command);
    let stdout = await util.runcommand(command);
    log.info('stdout=> ' + stdout);
    //let resJSON = JSON.parse(stdout);
    resolve(stdout);
  });
}

var doCountImageInstance = function(studyID){
  return new Promise(async function(resolve, reject){
    let studyDicom = await doCallStudy(studyID);
    let seriesList = studyDicom.Series;
    let dicomImgCount = 0;
    let promiseList = new Promise(function(resolve2, reject2){
      seriesList.forEach(async (seriesId) => {
        let seriesDicom = await doCallSeries(seriesId);
        dicomImgCount += seriesDicom.Instances.length;
      });
      setTimeout(()=> {
        resolve2(dicomImgCount);
      },1000);
    });
    Promise.all([promiseList]).then((ob)=>{
      resolve(ob[0]);
    });
  });
}

module.exports = (app, wsServer, wsClient, monitor) => {
  log = monitor;
  webSocketServer = wsServer;
  webSocketClient = wsClient;

  util = require('../lib/utility.js')(monitor);
  dicom = require('../lib/dicom-lib.js')(monitor);

  app.post('/orthanc/study/list/today', function(req, res, next) {
    let command = 'curl --user demo:demo http://localhost:8042/tools/find -d "{\\"Level\\":\\"Study\\",\\"Query\\":{\\"StudyDate\\": \\"' + formatTodayStr() + '-\\"}, \\"Expand\\":true}"';
    log.info('command=> ' + command);
    util.runcommand(command).then((stdout)=>{
      log.info('stdout=> ' + stdout);
      res.status(200).send({status: {code: 200}, result: JSON.parse(stdout)});
    });
  });

  app.post('/orthanc/study/list/yesterday', function(req, res, next) {
    let command = 'curl --user demo:demo http://localhost:8042/tools/find -d "{\\"Level\\":\\"Study\\",\\"Query\\":{\\"StudyDate\\": \\"' + getYesterdayStr() + '\\"}, \\"Expand\\":true}"';
    log.info('command=> ' + command);
    util.runcommand(command).then((stdout)=>{
      log.info('stdout=> ' + stdout);
      res.status(200).send({status: {code: 200}, result: JSON.parse(stdout)});
    });
  });

  app.post('/orthanc/study/list/lastmonth', function(req, res, next) {
    let command = 'curl --user demo:demo http://localhost:8042/tools/find -d "{\\"Level\\":\\"Study\\",\\"Query\\":{\\"StudyDate\\": \\"' + getLastMonthStr() + '-\\"}, \\"Expand\\":true}"';
    //log.info('command=> ' + command);
    util.runcommand(command).then((stdout)=>{
      //log.info('stdout=> ' + stdout);
      let studies = JSON.parse(stdout);
      const promiseList = new Promise(async function(resolve2, reject2) {
        for (let i=0; i < studies.length; i++) {
          for (let j=0; j < studies[i].Series.length; j++) {
            let seriesJSON = await doCallSeries(studies[i].Series[j]);
            if ((seriesJSON.MainDicomTags.SeriesDate) || (seriesJSON.MainDicomTags.SeriesDescription)) {
              studies[i].SamplingSeries = seriesJSON;
              break;
            }
          }
        }
        setTimeout(()=> {
          resolve2(studies);
        },500);
      });
      Promise.all([promiseList]).then(async(ob)=> {
        res.status(200).send({status: {code: 200}, result: ob[0]});
      }).catch((err)=>{
        res.status(400).send({status: {code: 400}, error: err});
      });
    });
  });

  app.post('/orthanc/select/study/(:studyId)', function(req, res, next) {
    let studyId = req.params.studyId;
    doCallStudy(studyId).then((studyJSON)=>{
      res.status(200).send({status: {code: 200}, result: studyJSON});
    })
  });

  app.post('/orthanc/delete/study', async function(req, res, next) {
    let studyID = req.body.StudyID;
    let command = 'curl --user demo:demo -X DELETE http://localhost:8042/studies/' + studyID;
    let stdout = await util.runcommand(command);
    res.status(200).send({status: {code: 200}, result: JSON.parse(stdout)});
  });

  app.post('/orthanc/select/series/(:seriesId)', function(req, res, next) {
    let seriesId = req.params.seriesId;
    doCallSeries(seriesId).then((seriesJSON)=>{
      res.status(200).send({status: {code: 200}, result: seriesJSON});
    })
  });

  app.post('/orthanc/study/count/instance', function(req, res, next) {
    let accessionNumber = req.body.accessionNumber
    let dicomImgCount = 0;
    let promiseList = new Promise(function(resolve2, reject2){
      let command = 'curl --user demo:demo http://localhost:8042/tools/find -d "{\\"Level\\":\\"Series\\",\\"Query\\":{\\"AccessionNumber\\": \\"' + accessionNumber + '\\"}, \\"Expand\\":true}"';
      util.runcommand(command).then(async(stdout)=>{
        let seriesJSON = JSON.parse(stdout);
        await seriesJSON.forEach((item, i) => {
          dicomImgCount += Number(item.Instances.length);
        });
      });

      setTimeout(()=> {
        resolve2(dicomImgCount);
      },1200);
    });
    Promise.all([promiseList]).then((ob)=>{
      res.status(200).send({status: {code: 200}, result: ob[0]});
    });
  });

  app.post('/orthanc/study/send/cloud', async function(req, res, next) {
    let studyID = req.body.studyID;
    let command = 'curl --user demo:demo -X DELETE http://150.95.26.106:9043/studies/' + studyID;
    //let stdout = await util.runcommand(command);
    command = 'curl --user demo:demo -X POST http://localhost:8042/modalities/cloud/store -d ' + studyID;
    log.info('resend command=> ' + command);
    let stdout = await util.runcommand(command);
    log.info('resend output=> ' + stdout);
    let resJSON = JSON.parse(stdout);
    if ((resJSON.HttpStatus) && (resJSON.HttpStatus == 500) && (resJSON.HttpError)) {
      log.info('Start change image Routing=> ' + stdout);
      command = 'curl --user demo:demo http://localhost:8042/modalities?expand';
      stdout = await util.runcommand(command);
      resJSON = JSON.parse(stdout);
      let cloudHost = resJSON.cloud.Host;
      let newCloudHost = undefined;
      if (cloudHost == '150.95.26.106'){
        newCloudHost = '202.28.68.28';
      } else {
        newCloudHost = '150.95.26.106'
      }
      let cloudAET = resJSON.cloud.AET;
      let cloudPort = resJSON.cloud.Port;
      log.info('Start change image Routing to => ' + newCloudHost);
      command = 'curl --user demo:demo -X PUT http://localhost:8042/modalities/cloud -d "{\\"AET\\" : \\"' + cloudAET + '\\", \\"Host\\": \\"' + newCloudHost +'\\", \\"Port\\": ' + cloudPort + '}"';
      stdout = await util.runcommand(command);
      setTimeout(async()=>{
        command = 'curl --user demo:demo -X POST http://localhost:8042/modalities/cloud/store -d ' + studyID;
        log.info('resend command=> ' + command);
        let stdout = await util.runcommand(command);
        log.info('resend output=> ' + stdout);
        let resJSON = JSON.parse(stdout);
        setTimeout(async()=>{
          let addNewDicomParams = '{\\"hospitalId\\": \\"5\\", \\"resourceType\\": \\"study\\", \\"resourceId\\": \\"' + studyID + '\\"}';
          command = 'curl -k -H "Content-Type: application/json" -X POST https://radconnext.info/api/dicomtransferlog/add -d "' + addNewDicomParams + '"';
          log.info('add new command=> ' + command);
          stdout = await util.runcommand(command);
          log.info('stdout=> ' + stdout);
          resJSON = JSON.parse(stdout);
          res.status(200).send({status: {code: 200}, result: resJSON});
        }, 6200)
      }, 6200)
      //res.status(500).send({status: {code: 500}, result: resJSON});
    } else {
      let addNewDicomParams = '{\\"hospitalId\\": \\"5\\", \\"resourceType\\": \\"study\\", \\"resourceId\\": \\"' + studyID + '\\"}';
      command = 'curl -k -H "Content-Type: application/json" -X POST https://radconnext.info/api/dicomtransferlog/add -d "' + addNewDicomParams + '"';
      log.info('add new command=> ' + command);
      stdout = await util.runcommand(command);
      log.info('stdout=> ' + stdout);
      resJSON = JSON.parse(stdout);
      res.status(200).send({status: {code: 200}, result: resJSON});
    }
  });

  app.post('/orthanc/reset/cloud', async function(req, res, next) {
    let command = 'curl --user demo:demo -X POST http://150.95.26.106:9043/tools/reset';
    let stdout = await util.runcommand(command);
    log.info('stdout=> ' + stdout);
    setTimeout(async()=>{
      command = 'curl --user demo:demo -X POST http://202.28.68.28:9043/tools/reset';
      stdout = await util.runcommand(command);
      log.info('stdout=> ' + stdout);
      //resJSON = JSON.parse(stdout);
      res.status(200).send({status: {code: 200}, result: 'ok'});
    }, 1200)
  });

  app.post('/orthanc/reset/local', async function(req, res, next) {
    let command = 'curl --user demo:demo -X POST http://localhost:8042/tools/reset';
    let stdout = await util.runcommand(command);
    log.info('stdout=> ' + stdout);
    res.status(200).send({status: {code: 200}, result: 'ok'});
  });

  app.post('/orthanc/study/upload/archive', async function(req, res, next) {
    let usrArchiveDir = path.normalize(__dirname + '/../public/img/usr/zip');
    let archiveFileName = 'multi2.zip';
    let archiveFilePath = usrArchiveDir + '/' + archiveFileName;

    let zipPath = {
      archive: archiveFilePath
    }
    let uploadRes = await doUploadArchive(zipPath.archive);
    res.status(200).send({status: {code: 200}, result: {upload: uploadRes}});
  });

  app.post('/orthanc/download/dicom/archive', async function(req, res) {
    let studyID = req.body.StudyID
    let usrArchiveFileName = req.body.UsrArchiveFileName
    let downloadRes = await doDownloadStudyArchive(studyID, usrArchiveFileName);
    res.status(200).send({status: {code: 200}, result: downloadRes});
  });

  app.post('/orthanc/reset/image/counter', async function(req, res) {
    let studyID = req.body.studyID;
    let stdout = await doResetImageCounter(studyID);
    res.status(200).send({status: {code: 200}, result: stdout});
  });

  app.post('/orthanc/study/count/instances', async function(req, res) {
    let studyID = req.body.StudyID;
    let result = await doCountImageInstance(studyID);
    res.status(200).send({status: {code: 200}, result: result});
  });

  app.post('/orthanc/transfer/dicom', async function(req, res) {
    let studyTags = req.body.StudyTags;
    let hrPatientFiles = req.body.HrPatientFiles;
    let dicomZipFileName = req.body.DicomZipFileName;
    let oldHrPatientFiles = req.body.OldHrPatientFiles;
    let studyID = studyTags.ID;
    let newHrPatientFiles = await dicom.doDownloadHrPatientFiles(hrPatientFiles);
    let result1 = await dicom.doConvertJPG2DCM(newHrPatientFiles, studyTags, oldHrPatientFiles);
    res.status(200).send({status: {code: 200}, result: {HrPatientFiles: newHrPatientFiles, convert: result1}});
    setTimeout(async()=>{
      //let result2 = await dicom.doTransferDicomZipFile(studyID, dicomZipFileName);
      let result2 = await dicom.doFetchDicomZipFile(studyID, dicomZipFileName);
      log.info("Study Archive Upload from local to cloud done: " + "https://radconnext.info" + result2.link);

      if (oldHrPatientFiles) {
        let isChangeRadio = req.body.ChangeRadioOption;
        let caseId = req.body.caseId;
        let triggerRadioParams = {studyID: studyID, caseId: caseId, isChangeRadio: isChangeRadio};
        let rqParams = {
          body: triggerRadioParams,
          url: 'https://radconnext.info/api/cases/updatecase/trigger',
          method: 'post'
        }
        util.proxyRequest(rqParams).then(async(proxyRes)=>{
          log.info('proxyRes=>'+ JSON.stringify(proxyRes));
          let socketTrigger = {type: 'updatedicom', dicom: studyTags, caseId: caseId, isChangeRadio: isChangeRadio};
          let result = await webSocketServer.sendNotify(socketTrigger);
        });
      } else {
        let triggerRadioParams = {studyID: studyID};
        let rqParams = {
          body: triggerRadioParams,
          url: 'https://radconnext.info/api/cases/newcase/trigger',
          method: 'post'
        }
        util.proxyRequest(rqParams).then(async(proxyRes)=>{
          log.info('proxyRes=>'+ JSON.stringify(proxyRes));
          let socketTrigger = {type: 'newdicom', dicom: studyTags};
          let result = await webSocketServer.sendNotify(socketTrigger);
        });
      }
    }, 1100)
  });

  app.post('/orthanc/store/dicom', async function(req, res) {
    let storeParams = req.body;
    let processRes = await dicom.onNewReportEventProcess(storeParams);
    res.status(200).send({status: {code: 200}, result: processRes});
  });

  app.post('/orthanc/rezip/dicom', async function(req, res) {
    let rezipParams = req.body;
    let studyID = req.body.studyID;
    log.info('studyID=>'+ studyID);
    let dicomZipFilename = req.body.dicomZipFilename;
    log.info('dicomZipFilename=>'+ dicomZipFilename);
    res.status(200).send({status: {code: 200}, result: 'Start Fecth to cloud.'});
    //let result = await dicom.doTransferDicomZipFile(studyID, dicomZipFilename);
    let result = await dicom.doFetchDicomZipFile(studyID, dicomZipFilename);
    log.info('FetchDicomZipFile Result=>'+ JSON.stringify(result));
    //res.status(200).send({status: {code: 200}, result: result});
  });

  return {
    doCallStudy,
    doCallSeries
  };
}
