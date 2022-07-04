const path = require('path');
const log = require('electron-log');
log.transports.console.level = 'info';
log.transports.file.level = 'info';
log.transports.file.file = __dirname + '/..' + '/log/test.log';
log.info('test process...');

var util = require('../lib/utility.js')( log);

/*
var dcmFileDir = path.join(__dirname, '../', 'public', 'img', 'usr', 'dcm', 'test.dcm');
log.info('dcmFileDir=>' + dcmFileDir);

util.doUploadDicomOrthanc(dcmFileDir).then((uploadRes)=>{
  log.info('uploadRes=> ' + JSON.stringify(uploadRes));
})
*/
/*
util.doCallStudiesFromLocalOrthanc().then((studiesRes)=>{
  setTimeout(()=>{
    log.info('studiesRes=> ' + JSON.stringify(studiesRes));
    studiesRes.forEach((item, i) => {
      let studyId = item;
      //let studyId = studiesRes[0];
      util.doCallStudyFromLocalOrthanc(studyId).then((studyRes)=>{
        log.info('studyRes=> ' + JSON.stringify(studyRes));
        log.info('patientName=> ' + JSON.stringify(studyRes.PatientMainDicomTags.PatientName));
        log.info('StudyDate=> ' + studyRes.MainDicomTags.StudyDate);
        if (studyRes.MainDicomTags.StudyDate < '20210601'){
          log.info('DELETE=> yes');
          util.doCallDeleteStudyFromLocalOrthanc(studyId).then((deleteRes)=>{
            log.info('Delete Result=> ' + JSON.stringify(deleteRes));
          });
        } else {
          log.info('DELETE=> no');
        }
      });
      setTimeout(()=>{
        //
      }, 30000);
    });
  }, 3000);
})
*/

const fetch = require('node-fetch');
const {pipeline} = require('stream');
const {promisify} = require('util');
const { createReadStream, createWriteStream } = require('fs');

const FormData = require('form-data');
const streamPipeline = promisify(pipeline);

//const uploadUrl = 'https://radconnext.info/api/log/upload';
const hostTarget = 'http://202.28.68.28:8043';
const uploadUrl = hostTarget + '/instances';
const filepath = '/home/oodsoft/share/project/RadConnext/api/public/img/usr/pdf/00b927c4-e07d.dcm';
const stream = createReadStream(filepath);

/*
var data = new FormData();
data.append('type', 'text');
data.append('', createReadStream(filepath));
data.append('uploadby', 'oudsoft');
const options = {
  method: 'POST',
  body: data,
  headers: {
    ...data.getHeaders()
  },
}
fetch(uploadUrl, options).then(res => {
  log.info('res=> ' + JSON.stringify(res));
})
*/



var request = require('request');
var headers = {
  'content-type': 'application/json',
};
var auth = {
  'user': 'demo',
  'pass': 'demo'
};

var options = {
    url: uploadUrl,
    method: 'POST',
    headers: headers,
    auth: auth,
    body: stream,
    //json: true // Set this to parse the response to an object.
};

function callback(error, response, body) {
  //console.log(response);
  if (!error && response.statusCode == 200) {
    // Log the API output.
    console.log(body);
    var seriesID = JSON.parse(body).ParentSeries;
    var loadDicomDataUrl = hostTarget + '/series/' + seriesID;
    console.log(loadDicomDataUrl);
    request({url: loadDicomDataUrl, method: 'GET', auth: auth, headers: headers}, (err, res, dicom)=>{
      console.log(err);
      console.log(dicom);
    });
  } else {
    console.log(JSON.stringify(error))
  }
}

request(options, callback);
/*
var fetchOption = {
  method: 'POST',
  headers: headers,
  auth: auth,
  body: stream
}
fetch(uploadUrl, fetchOption).then(res => {
  log.info('res=> ' + JSON.stringify(res));
})
*/
