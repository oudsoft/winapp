var log = require('electron-log');
log.transports.console.level = 'info';
log.transports.file.level = 'info';

var formData = require('form-data');
var fetch = require('node-fetch');
var base64 = require('base-64');
var path = require('path');
var express = require('express');
var router = express.Router();
var { createReadStream, createWriteStream } = require('fs');

var util = require('../lib/utility.js')(log);

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
  /*
  const offset = 7;
  var d = new Date();
  let utc = d.getTime();
  d = new Date(utc + (3600000 * offset));
  */
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

var doDownloadStudyArchive = function(studyID){
  return new Promise(async function(resolve, reject){
    let promiseList = new Promise(async function(resolve2, reject2){
      var usrArchiveDir = path.normalize(__dirname + '/../public/img/usr/zip');
      var archiveFileName = studyID + '.zip';
      var archiveFilePath = usrArchiveDir + '/' + archiveFileName;
      var command = 'curl --user demo:demo http://localhost:8042/studies/' + studyID + '/archive > ' + archiveFilePath;
      var stdout = await util.runcommand(command);
      setTimeout(()=> {
        resolve2({archive: archiveFilePath, result: stdout});
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
router.post('/study/list/today', function(req, res, next) {
  let command = 'curl --user demo:demo http://localhost:8042/tools/find -d "{\\"Level\\":\\"Study\\",\\"Query\\":{\\"StudyDate\\": \\"' + formatTodayStr() + '-\\"}, \\"Expand\\":true}"';
  log.info('command=> ' + command);
  util.runcommand(command).then((stdout)=>{
    log.info('stdout=> ' + stdout);
    res.status(200).send({status: {code: 200}, result: JSON.parse(stdout)});
  });
});

router.post('/study/list/yesterday', function(req, res, next) {
  let command = 'curl --user demo:demo http://localhost:8042/tools/find -d "{\\"Level\\":\\"Study\\",\\"Query\\":{\\"StudyDate\\": \\"' + getYesterdayStr() + '\\"}, \\"Expand\\":true}"';
  log.info('command=> ' + command);
  util.runcommand(command).then((stdout)=>{
    log.info('stdout=> ' + stdout);
    res.status(200).send({status: {code: 200}, result: JSON.parse(stdout)});
  });
});

router.post('/study/count/instance', function(req, res, next) {
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

router.post('/study/send/cloud', async function(req, res, next) {
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

router.post('/reset/cloud', async function(req, res, next) {
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

router.post('/reset/local', async function(req, res, next) {
  let command = 'curl --user demo:demo -X POST http://localhost:8042/tools/reset';
  let stdout = await util.runcommand(command);
  log.info('stdout=> ' + stdout);
  res.status(200).send({status: {code: 200}, result: 'ok'});
});

router.post('/study/upload/archive', async function(req, res, next) {
  /*
  let studyID = req.body.studyID;
  let zipPath = await doDownloadStudyArchive(studyID);
  let uploadRes = await doUploadArchive(zipPath.archive);
  let importRes = await doCallImportDicomFromArchive(studyID);
  setTimeout(async()=>{
    let stdout = await doResetImageCounter(studyID);
    res.status(200).send({status: {code: 200}, result: {upload: uploadRes, dicomlog: stdout}});
  }, 1822);
  */
  let usrArchiveDir = path.normalize(__dirname + '/../public/img/usr/zip');
  let archiveFileName = 'multi2.zip';
  let archiveFilePath = usrArchiveDir + '/' + archiveFileName;

  let zipPath = {
    archive: archiveFilePath
  }
  let uploadRes = await doUploadArchive(zipPath.archive);
  res.status(200).send({status: {code: 200}, result: {upload: uploadRes}});
});

router.post('/reset/image/counter', async function(req, res) {
  let studyID = req.body.studyID;
  let stdout = await doResetImageCounter(studyID);
  res.status(200).send({status: {code: 200}, result: stdout});
});


module.exports = router;
