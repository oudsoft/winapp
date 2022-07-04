/*onnewdicom-worker.js*/
const log = require('electron-log');
log.transports.console.level = 'info';
log.transports.file.level = 'info';
log.transports.file.file = __dirname +  '/log/newdicom-log.log';

const exec = require('child_process').exec;
const path = require('path');
const fs = require('fs');
const url = require('url');
const request = require('request-promise');

const util = require('./lib/utility.js')( log);

const hospitalId = process.env.LOCAL_HOS_ID; /* 2 */
const username = process.env.LOCAL_NAME; /*'orthanc'*/
const radconApiUrl = process.env.RADCONNEXT_URL; /* 'https://radconnext.info'*/
const userId = process.env.LOCAL_USER_ID; /* 1 */

const doCallCreatePreviewSeries = function(seriesId, instanceList){
	return new Promise(async function(resolve, reject) {
		let params = {hospitalId: hospitalId, seriesId: seriesId, username: username, instanceList: instanceList};
		let apiurl = radconApiUrl + '/api/orthancproxy/create/preview';
		//let orthancRes = await apiconnector.doCallApi(apiurl, params)
		let rqParam = {method: 'post', url: apiurl, body: params};
    let orthancRes = await util.proxyRequest(rqParam);
		resolve(orthancRes);
	});
}

const doCallCreateZipInstance = function(seriesId, instanceId){
  return new Promise(async function(resolve, reject) {
    let params = {hospitalId: hospitalId, seriesId: seriesId, username: username, instanceId: instanceId};
    let apiurl = radconApiUrl + '/api/orthancproxy/create/zip/instance';
    //let orthancRes = await apiconnector.doCallApi(apiurl, params)
    let rqParam = {method: 'post', url: apiurl, body: params};
    let orthancRes = await util.proxyRequest(rqParam);
    resolve(orthancRes);
  });
}

const doCallSendAI = function(seriesId, instanceId, studyId, patientName){
  return new Promise(async function(resolve, reject) {
    let params = { hospitalId: hospitalId, seriesId: seriesId, instanceId: instanceId, studyId: studyId, patientName: patientName};
    let apiurl = radconApiUrl + '/api/orthancproxy/sendai';
    let rqParam = {method: 'post', url: apiurl, body: params};
    //let orthancRes = await apiconnector.doCallApi(apiurl, params)
    let orthancRes = await util.proxyRequest(rqParam);
    resolve(orthancRes);
  });
}

const doConvertAIResult = function(studyId, pdfcodes, modality){
	return new Promise(async function(resolve, reject) {
		let params = {hospitalId: hospitalId, username: username, studyId: studyId, pdfcodes: pdfcodes, modality: modality};
		let apiurl = radconApiUrl + '/api/orthancproxy/convert/ai/report';
		let rqParam = {method: 'post', url: apiurl, body: params};
		//let orthancRes = await apiconnector.doCallApi(apiurl, params)
		let orthancRes = await util.proxyRequest(rqParam);
		resolve(orthancRes);
	});
}

const isSendAICriteria = function(seriesLength, instancesLength, moda, bpex, adpd, ppsd){
  log.info('seriesLength, instancesLength => ' + seriesLength + ', ' + instancesLength );
  if ((seriesLength == 1) && (instancesLength == 1)) {
    log.info('moda, bpex, adpd, ppsd => ' + moda + ', ' + bpex + ', ' + adpd + ', ' + ppsd);
		/*
    if ((moda === 'CR') && (bpex === 'CHEST') && (adpd.indexOf('CHEST') >= 0) && (ppsd === 'Chest X-Ray (PP)')) {
      return true;
    } else {
      return false;
    }
		*/
		return true;
  } else {
		return false;
	}
}

const getAge = function(dateString) {
	var dob = dateString;
	var yy = dob.substr(0, 4);
	var mo = dob.substr(4, 2);
	var dd = dob.substr(6, 2);
	var dobf = yy + '-' + mo + '-' + dd;
	var today = new Date();
	var birthDate = new Date(dobf);
	var age = today.getFullYear() - birthDate.getFullYear();
	var ageTime = today.getTime() - birthDate.getTime();
	ageTime = new Date(ageTime);
	if (age > 0) {
		if ((ageTime.getMonth() > 0) || (ageTime.getDate() > 0)) {
			//age = (age + 1) + 'Y';
			age = (age + 1)
		} else {
			//age = age + 'Y';
			age = age
		}
	} else {
		if (ageTime.getMonth() > 0) {
			//age = ageTime.getMonth() + 'M';
			age = ageTime.getMonth()
		} else if (ageTime.getDate() > 0) {
			//age = ageTime.getDate() + 'D';
			age = ageTime.getDate()
		}
	}
	return age;
}

const doEventProcess = function(data){
  return new Promise(async(resolve, reject)=>{
		let patientBirthDate = data.dicom.PatientMainDicomTags.PatientBirthDate;
		let patientName = data.dicom.PatientMainDicomTags.PatientName;
		//log.info('patientBirthDate=>' + patientBirthDate);
		//if ((patientBirthDate) && (patientBirthDate.length == 8)) {
			let patientAge = getAge(patientBirthDate);
			log.info('patientAge=>' + patientAge);
			// if (patientAge > 15) {
				let moda = data.dicom.SamplingSeries.MainDicomTags.Modality;
				let bpex = data.dicom.SamplingSeries.MainDicomTags.BodyPartExamined;
				let adpd = data.dicom.SamplingSeries.MainDicomTags.AcquisitionDeviceProcessingDescription;
				let ppsd = data.dicom.SamplingSeries.MainDicomTags.PerformedProcedureStepDescription;
				let seriesLength = data.dicom.Series.length;
				let instancesLength = data.dicom.SamplingSeries.Instances.length;
				let isCriteriaAI = isSendAICriteria(seriesLength, instancesLength, moda, bpex, adpd, ppsd);
				log.info('isCriteriaAI=>' + isCriteriaAI);
				log.info('isCriteriaAI == true =>' + (isCriteriaAI == true));
		    if (isCriteriaAI == true){
		      let studyId = data.dicom.ID;
		      let seriesId = data.dicom.SamplingSeries.ID;
					let instanceList = data.dicom.SamplingSeries.Instances
		      let instanceId = instanceList[0];
					let callImage = await doCallCreatePreviewSeries(seriesId, instanceList);
		      let callZipRes = await doCallCreateZipInstance(seriesId, instanceId);
		      let callSendAIRes = await doCallSendAI(seriesId, instanceId, studyId, patientName);
					let aiResBody = JSON.parse(callSendAIRes.res.body);
		    	log.info('callSendAIRes=>' + JSON.stringify(aiResBody));
					let pdfcodes = aiResBody.result.pdfs;
					let callConvertAIResultRes = await doConvertAIResult(studyId, pdfcodes, moda);
					if (callConvertAIResultRes.status.code == 200) {
		      	resolve(callConvertAIResultRes);
					} else if (callConvertAIResultRes.status.code == 403) {
						reject(callConvertAIResultRes.output);
					}
		    } else {
		      resolve();
		    }
			// } else {
				// resolve();
			// }
		// } else {
			// resolve();
		// }
  });
}

module.exports = (input, callback) => {
	let data = input;
  try {
		doEventProcess(data).then((eventRes)=>{
			callback(eventRes);
		});
  } catch (error){
		log.error('NewDicomError=>' + JSON.stringify(error));
  }
}
