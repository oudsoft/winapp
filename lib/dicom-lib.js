const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const {pipeline} = require('stream');
const {promisify} = require('util');

var log, util;

const jpgPath = '/img/usr/jpg';
const bmpPath = '/img/usr/bmp';
const dcmPath = '/img/usr/dcm';
const zipPath = '/img/usr/zip';
const pdfPath = '/img/usr/pdf';
const jpgDir = path.normalize(__dirname + '/../public' + jpgPath);
const bmpDir = path.normalize(__dirname + '/../public' + bmpPath);
const dcmDir = path.normalize(__dirname + '/../public' + dcmPath);
const zipDir = path.normalize(__dirname + '/../public' + zipPath);
const pdfDir = path.normalize(__dirname + '/../public' + pdfPath);

var doDownloadHrPatientFiles = function(hrFiles){
	return new Promise(function(resolve, reject) {
		var hrPatientFiles = [];
		if (hrFiles.length > 0) {
			let promiseList = new Promise(async function(resolve2, reject2){
				await hrFiles.forEach((item, i) => {
		      let tempFrags = item.link.split('/');
					let tempFilename = tempFrags[tempFrags.length-1];
					tempFrags = tempFilename.split('.');
					let validImageTypes = ['gif', 'jpeg', 'jpg', 'png', 'bmp'];
					if (validImageTypes.includes(tempFrags[1].toLowerCase())) {
						let tempCode = tempFrags[0];
						let hrPatientFile = {link: item.link, file: tempFilename, code: tempCode};
			      hrPatientFiles.push(hrPatientFile);
					}
		    });

				for (let i=0; i < hrPatientFiles.length; i++) {
					let hrPatientFile = hrPatientFiles[i];
					let command = util.formatStr('curl %s --output %s', hrPatientFile.link, (jpgDir + '/' + hrPatientFile.file));
					let stdout = await util.runcommand(command);
				}
				setTimeout(()=> {
	        resolve2(hrPatientFiles);
	      },1200);
			});
			Promise.all([promiseList]).then((ob)=> {
				resolve(ob[0]);
			});
		} else {
			resolve(hrPatientFiles);
		}
	});
}

var doRemoveOldImages = function(oldImages, convertItems){
	return new Promise(function(resolve, reject) {
		let resultImages = [];
		let promiseList = new Promise(async function(resolve2, reject2){
			for (let i=0; i < oldImages.length; i++) {
				let dcm = oldImages[i];
				let oldFoundItems = await convertItems.filter((item, index)=>{
					if (item.link === dcm.link) {
						return item;
					}
				});

				log.info('oldFoundItems=>' + JSON.stringify(oldFoundItems));

				if (oldFoundItems.length == 0) {
					resultImages.push(dcm);
				}

				log.info('resultImages=>' + JSON.stringify(resultImages));

				if (resultImages.length > 0) {
					await resultImages.forEach(async (item, i) => {
						if (item.instanceId) {
							let command = util.formatStr('curl -X DELETE --user demo:demo http://localhost:8042/instances/%s', item.instanceId);
							log.info('command=> ' + command);
							let stdout = await util.runcommand(command);
							log.info('stdout=> ' + stdout);
						}
					});
				}
			}
			setTimeout(()=> {
        resolve2(resultImages);
      },1200);
		});
		Promise.all([promiseList]).then((ob)=> {
			resolve(ob[0]);
		});
	});
}

var doConvertJPG2DCM = function(hrPatientFiles, studyTags, oldImages) {
	return new Promise(function(resolve, reject) {
		let convertItems = [];
		let promiseList = new Promise(async function(resolve2, reject2){
			if (hrPatientFiles.length > 0) {
				for (let i=0; i < hrPatientFiles.length; i++) {
					if (!hrPatientFiles[i].instanceId) {
						let jpgFileName = hrPatientFiles[i].file;
						let temps = jpgFileName.split('.');
						let hrPictureType = temps[temps.length-1];
						let supportConvertTyps = ['jpg', 'jpeg', 'png', 'bmp'];
						if (supportConvertTyps.includes(hrPictureType)) {
							let bmpFileName = util.formatStr('%s.%s', hrPatientFiles[i].code, 'bmp');
							let dcmFileName = util.formatStr('%s.%s', hrPatientFiles[i].code, 'dcm');

							let mainDicomTags = Object.keys(studyTags.MainDicomTags);
							let patientMainTags = Object.keys(studyTags.PatientMainDicomTags);

							let modality = studyTags.SamplingSeries.MainDicomTags.Modality;

							let command = undefined;
							if (process.env.OS_NAME == 'LINUX') {
								command = util.formatStr('convert -verbose -density 150 -trim %s/%s', jpgDir, jpgFileName);
							} else {
								command = util.formatStr('magick -verbose -density 150 %s/%s', jpgDir, jpgFileName);
							}
							command += ' -define bmp:format=BMP3 -quality 100 -flatten -sharpen 0x1.0 ';
							command += util.formatStr(' %s/%s', bmpDir, bmpFileName);

							if (process.env.OS_NAME == 'LINUX') {
								command += util.formatStr(' && img2dcm -i BMP %s/%s %s/%s', bmpDir, bmpFileName, dcmDir, dcmFileName);
							} else {
								command += util.formatStr(' & img2dcm -i BMP %s/%s %s/%s', bmpDir, bmpFileName, dcmDir, dcmFileName);
							}

							await mainDicomTags.forEach((tag, i) => {
								let dcmKeyValue = Object.values(studyTags.MainDicomTags)[i];
								dcmKeyValue = dcmKeyValue.replace(/["']/g, "");
								command += util.formatStr(' -k "%s=%s"', tag, dcmKeyValue);
							});
							await patientMainTags.forEach((tag, i) => {
								if (tag !== 'OtherPatientIDs')	{
									command += util.formatStr(' -k "%s=%s"', tag, Object.values(studyTags.PatientMainDicomTags)[i]);
								}
							});

							command += util.formatStr(' -k "Modality=%s" -v', modality);

							log.info('command=> ' + command);
							let stdout = await util.runcommand(command);
							log.info('stdout=> ' + stdout);

							command = util.formatStr('curl -X POST --user demo:demo http://localhost:8042/instances --data-binary @%s/%s', dcmDir, dcmFileName);
							log.info('command=> ' + command);
							stdout = await util.runcommand(command);
							log.info('stdout=> ' + stdout);
							let newDicomProp = JSON.parse(stdout);
							log.info('newDicomProp=>' + JSON.stringify(newDicomProp));

							let hrRevise = {link: hrPatientFiles[i].link, instanceId: newDicomProp.ID};
							convertItems.push(hrRevise);
							log.info('OS_NAME=' + process.env.OS_NAME);
							if (process.env.OS_NAME === 'LINUX') {
								util.removeFileByScheduleTask(util.formatStr('rm %s/%s', jpgDir, jpgFileName));
								util.removeFileByScheduleTask(util.formatStr('rm %s/%s', bmpDir, bmpFileName));
								util.removeFileByScheduleTask(util.formatStr('rm %s/%s', dcmDir, dcmFileName));
							} else if (process.env.OS_NAME === 'WINDOWS') {
								util.removeFileByScheduleTask(util.formatStr('del %s\\%s', jpgDir, jpgFileName));
								util.removeFileByScheduleTask(util.formatStr('del %s\\%s', bmpDir, bmpFileName));
								util.removeFileByScheduleTask(util.formatStr('del %s\\%s', dcmDir, dcmFileName));
							}
						}
					} else {
						convertItems.push(hrPatientFiles[i]);
					}
				}
				if ((oldImages) && (oldImages.length > 0)) {
					await doRemoveOldImages(oldImages, convertItems)
				}
				setTimeout(()=> {
	        resolve2(convertItems);
	      },1200);
			} else {
				resolve2(convertItems);
			}
		});
		Promise.all([promiseList]).then(async(ob)=> {
			resolve(ob[0]);
		});
	});
}

var doTransferDicomZipFile = function(studyID, outputFilename){
	return new Promise(async function(resolve, reject) {
		let dest = zipDir + '/' + outputFilename;
		let downloadRes = await util.doDownloadStudiesFromLocalOrthanc(studyID, dest)
		//log.info('downloadRes=> ' + JSON.stringify(downloadRes));
		var command = 'curl --list-only --user sasurean:drinking@min -T ' + dest + ' ftp://150.95.26.106/Radconnext/public' + zipPath + '/ -v';
    log.info('ftp command=>' + command);
    var stdout = await util.runcommand(command);
    //log.info('command output=>' + stdout);
    setTimeout(()=> {
      resolve({result: stdout, link: zipPath + '/' + outputFilename});
    },1200);
	});
}

var doFetchDicomZipFile = function(studyID, outputFilename){
	return new Promise(async function(resolve, reject) {
		let dest = zipDir + '/' + outputFilename;
		let downloadRes = await util.doDownloadStudiesFromLocalOrthanc(studyID, dest)
		let downloadLink = '/img/usr/zip/' + outputFilename;
		const streamPipeline = promisify(pipeline);
		const https = require('https');
		const httpsAgent = new https.Agent({
		  rejectUnauthorized: false,
		});
		const uploadname = 'archiveupload';
		let uploadUrl = 'https://' + process.env.RADCONNEXT_DOMAIN + '/api/transfer/archive';
		let filepath = dest;

		const FormData = require('form-data');
		var data = new FormData();
	  data.append('type', 'archive');
	  data.append('name', uploadname);
	  data.append(uploadname, fs.createReadStream(filepath));
	  data.append('uploadby', 'oudsoft');

	  const options = {
	    method: 'POST',
	    body: data,
	    agent: httpsAgent,
	    headers: {
	      ...data.getHeaders()
	    },
	  }
	  fetch(uploadUrl, options).then(res => {
	    console.log(JSON.stringify(res));
	    if (res.ok) {
	      //resolve(res.json());
				resolve({link: downloadLink});
	    } else {
	    	reject(new Error(res.statusText));
			}
	  });
	});
}

var doFetchZipFile = function(zipSrcFile){
	return new Promise(async function(resolve, reject) {
		let downloadLink = '/img/usr/zip/' + zipSrcFile;
		const streamPipeline = promisify(pipeline);
		const https = require('https');
		const httpsAgent = new https.Agent({
		  rejectUnauthorized: false,
		});
		const uploadname = 'archiveupload';
		let uploadUrl = 'https://' + process.env.RADCONNEXT_DOMAIN + '/api/transfer/archive';
		let filepath = process.env.LOCAL_ATTACH_DIR + zipSrcFile;
		//log.info('Fetch Attach Path => ' + filepath);
		const FormData = require('form-data');
		let data = new FormData();
	  data.append('type', 'archive');
	  data.append('name', uploadname);
	  data.append(uploadname, fs.createReadStream(filepath));
	  data.append('uploadby', 'oudsoft');

	  const options = {
	    method: 'POST',
	    body: data,
	    agent: httpsAgent,
	    headers: {
	      ...data.getHeaders()
	    },
	  }
	  fetch(uploadUrl, options).then(res => {
	    console.log(JSON.stringify(res));
	    if (res.ok) {
				resolve({link: downloadLink});
	    } else {
	    	reject(new Error(res.statusText));
			}
	  });
	});
}

const onNewReportEventProcess = function(reportData){
  return new Promise(async(resolve, reject)=>{
		const newreportEvtWorker = require('worker-farm');
		const newreportEvtService = newreportEvtWorker(require.resolve('../onnewreport-worker.js'));
		try {
			log.info('== reportData of onNewReportEventProcess front ==');
			log.info(JSON.stringify(reportData));
			newreportEvtService(reportData, function (output) {
				let result = JSON.stringify(output);
				log.info('onNewReportEvent Result front =>' + result);
				resolve(result);
			});
		} catch (error){
			log.error('NewReportError=>' + JSON.stringify(error));
			reject(error);
		}
	});
}

const doSeekAttchFiles = function(){
	return new Promise(async(resolve, reject)=>{
		let dirCont = fs.readdirSync(process.env.LOCAL_ATTACH_DIR);
    let files = dirCont.filter((elm) => elm.match(/.*\.(zip?)|(rar?)/ig));
		resolve(files);
	});
}

const doChangeAttachFileName = function(oldFileName, patientNameEN, mark){
	return new Promise(async(resolve, reject)=>{
		const zipExt = 'zip';
		let tmps = oldFileName.split('.');
		if (tmps.length == 2) {
			let fileExt = tmps[1].toLowerCase();
			if ((fileExt === 'zip') || (fileExt === 'rar')){
				let fmtDT = util.doFormateDateTime();
				let yymmdd = fmtDT.YY + fmtDT.MM + fmtDT.DD;
				let hhmnss = fmtDT.HH + fmtDT.MN + fmtDT.SS;
				let patientName = undefined;
				if (patientNameEN.indexOf('^') >= 0) {
					patientName = patientNameEN.split('^').join('_');
				} else if (patientNameEN.indexOf(' ') >= 0) {
					patientName = patientNameEN.split(' ').join('_');
				} else {
					patientName = patientNameEN;
				}
				let command = util.formatStr('ren %s%s ATTACTFILE-%s-%s-%s-%s.%s', process.env.LOCAL_ATTACH_DIR, oldFileName, patientName, yymmdd, hhmnss, mark, zipExt);
				log.info('rename file with command =>' + command);
				let stdout = await util.runcommand(command);
				resolve(stdout);
			} else {
				reject({Error: 'File not zip type or rar'});
			}
		} else {
			reject({Error: 'File have not Extension'});
		}
	});
}

const doDeleteFile = function(filePath){
	return new Promise(async(resolve, reject)=>{
		fs.unlink(filePath, (arg)=>{
			//log.info('arg=>' + JSON.stringify(arg));
			resolve();
		});
	});
}

module.exports = (monitor) => {
	log = monitor;
	util = require('./utility.js')(monitor);
  return {
		doDownloadHrPatientFiles,
		doConvertJPG2DCM,
		doTransferDicomZipFile,
		doFetchDicomZipFile,
		doFetchZipFile,
		onNewReportEventProcess,
		doSeekAttchFiles,
		doChangeAttachFileName,
		doDeleteFile
  }
}
