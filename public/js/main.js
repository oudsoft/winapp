const maxSizeDef = 1000000000;

const doCallApi = function(url, params) {
	return new Promise(function(resolve, reject) {
		$.post(url, params, function(data){
			resolve(data);
		}).fail(function(error) {
			reject(error);
		});
	});
}

let ws = undefined;

function doConnectWebsocketLocal(username) {
	const hostname = window.location.hostname;
	const port = window.location.port;
	const paths = window.location.pathname.split('/');
	const rootname = paths[1];
	let wsUrl = 'ws://' + hostname + ':' + port + '/' + rootname + '/' + username + '?type=test';
	ws = new WebSocket(wsUrl);
	ws.onopen = function () {
		console.log('Websocket is connected to the signaling server')
	};

	ws.onmessage = function (msgEvt) {
		let data = JSON.parse(msgEvt.data);
		console.log(data);
		if (data.type == 'test') {
			$.notify(data.message, "success");
		} else if (data.type == 'trigger') {
			$.notify(data.message, "success");
		} else if (data.type == 'notify') {
			$.notify(data.message, "warnning");
		} else if (data.type == 'triggerunzipprogress') {
			let eventName = 'triggerunzipprogress'
			let triggerData = data.data;
			let event = new CustomEvent(eventName, {"detail": {eventname: eventName, data: triggerData}});
			document.dispatchEvent(event);
		} else if (data.type == 'triggerimportprogress') {
			let eventName = 'triggerimportprogress'
			let triggerData = data.data;
			let event = new CustomEvent(eventName, {"detail": {eventname: eventName, data: triggerData}});
			document.dispatchEvent(event);
		} else if (data.type == 'triggerimportsuccess') {
			let eventName = 'triggerimportsuccess'
			let triggerData = data.data;
			let event = new CustomEvent(eventName, {"detail": {eventname: eventName, data: triggerData}});
			document.dispatchEvent(event);
		} else if (data.type == 'dicombinary-result') {
			alert('OK');
		} else if (data.type == 'server-api-result') {
			console.log(JSON.parse(data.result.res.body));
			console.log(JSON.parse(data.result.res.request));
		}
	};

	ws.onclose = function(event) {
		console.log("WebSocket is closed now. with  event:=> ", event);
	};

	ws.onerror = function (err) {
		console.log("WS Got error", err);
	};
}

$( document ).ready(function() {
	const initPage = function() {
		document.addEventListener("triggerunzipprogress", onUnzipProgress);
		document.addEventListener("triggerimportprogress", onImportProgress);
		document.addEventListener("triggerimportsuccess", onImportSuccess);
		doConnectWebsocketLocal('admin');
	};

	initPage();

	$('#loacal-import-cmd').on('click', (evt)=>{
		$('#portal-import-div').empty();
		let importForm = doCreateLocalImportForm(evt);
		$('#portal-import-div').append($(importForm));
		$('#portal-cmd-div, #portal-import-div').toggle();
	});

	$('#cloud-import-cmd').on('click', async (evt)=>{
		$('#portal-import-div').empty();
		let importForm = await doCreateCloudImportForm(evt);
		$('#portal-import-div').append($(importForm));
		$('#portal-cmd-div, #portal-import-div').toggle();
	});

	//doLoadStudyToday();
	doLoadTestUploadFTP();
	doLoadTestCallApi();

	setTimeout(()=>{
		doCreateWebSocketClientStatusBox();

		//ws.send(JSON.stringify({type: 'client-sendbinary'}));
	}, 3000);
});
/**************************************************/
//Websocket Client status
const doCreateWebSocketClientStatusBox = function(){
	doCallApi('/api/cloud/socket/status', {}).then((callRes)=>{
		console.log(callRes);
		let statusBox = $('<div id="ClientWebsocketStateBox"></div>');
		let statusIndicator = $('<div class="status-indicator"></div>');
		const statusIndicatorClickEvt = (evt)=>{
			$(statusBox).remove();
			doCallApi('/api/cloud/socket/reconnect', {}).then((callRes)=>{
				setTimeout(()=>{
					doCreateWebSocketClientStatusBox();
				}, 3000);
			});
		}

		$(statusBox).append($(statusIndicator));
		if (callRes.socket.status == true) {
			$(statusIndicator).css({'background-color': 'green', 'cursor': 'pointer'});
			$(statusIndicator).on('click', statusIndicatorClickEvt);
		} else {
			$(statusIndicator).css({'background-color': 'grey', 'cursor': 'pointer'});
			$(statusIndicator).on('click', statusIndicatorClickEvt);
		}

		$('body').append($(statusBox));

	});
}

const onClientSocketStatusEvent = function(evt){
	let stateData = evt.detail.data;
	console.log(stateData);
	if ((stateData == 0) || (stateData == 1)) {
		$('.status-indicator').css({'background-color': 'green'});
	} else {
		$('.status-indicator').css({'background-color': 'grey'});
	}
}

/**************************************************/
const doLoadTestUploadFTP = function(){
	let uploadZipCmd = $('<input type="button" value=" ฮัพโหลดซิปไฟล์ " class="dicom-cmd"></input>');
	$(uploadZipCmd).on('click', async(evt)=>{
		let uploadRes = await doCallApi('/api/orthanc/study/upload/archive', {studyID: 'multi.zip'});
		console.log(uploadRes);
		if (uploadRes.status.code == 200) {
			//
		} else {
			alert('เกิดขัดข้องฮัพโหลดซิปไฟล์ไม่สำเร็จ');
		}
	});
	$('#local-today-div').append($(uploadZipCmd));
}

const doLoadTestCallApi = function(){
	let testApiCmd = $('<input type="button" value=" Test Login " class="dicom-cmd"></input>');
	$(testApiCmd).on('click', async(evt)=>{
		ws.send(JSON.stringify({type: 'call-server-api', url: '/api/login/', method: 'POST', params: {username: 'test0003', password: 'test0003'}}));
	});
	$('#local-today-div').append($(testApiCmd));
}

const doLoadStudyToday = function(){
	doCallApi('/api/orthanc/study/list/today', {}).then(async(callRes)=>{
		console.log(callRes);
		$('#local-today-div').empty();
		$('#local-today-div').append($('<h2>รายการภาพของวันนี้</h2>').css({'display': 'inline-block'}));
		let loadStudyYesterdayCmd = $('<h2>รายการภาพของเมื่อวาน</h2>').css({'display': 'inline-block', 'margin-left': '20px', 'cursor': 'pointer', 'color': 'blue'});
		$('#local-today-div').append($(loadStudyYesterdayCmd));
		let resetCloudCmd = $('<h2>รีเซ็ตเส้นทางส่งภาพ</h2>').css({'display': 'inline-block', 'margin-left': '20px', 'cursor': 'pointer', 'color': 'blue'});
		$('#local-today-div').append($(resetCloudCmd));
		let resetLocalCmd = $('<h2>รีเซ็ตระบบส่งภาพ</h2>').css({'display': 'inline-block', 'margin-left': '20px', 'cursor': 'pointer', 'color': 'blue'});
		$('#local-today-div').append($(resetLocalCmd));

		//let dicomListBox = $('<ul></ul>');
		//$('#local-today-div').append($(dicomListBox));
		await doShowDicomList(callRes.result);
		/*
		for (let i=0; i < callRes.result.length; i++) {
			let item = callRes.result[i];
			let imageCountRes = await doCallApi('/api/orthanc/study/count/instance', {accessionNumber: item.MainDicomTags.AccessionNumber});
			let dicomItem = $('<li></li>').css({'display': 'table-row'});
			let idCell = $('<span>' + item.ID + '</span>').css({'display': 'table-cell', 'margin-left': '30px', 'border': '1px solid grey', 'width': '400px'});
			let patientNameCell = $('<span>' + item.PatientMainDicomTags.PatientName + '</span>').css({'display': 'table-cell', 'width': '160px'});
			let patientHNCell = $('<span>' + item.PatientMainDicomTags.PatientID + '</span>').css({'display': 'table-cell', 'width': '80px'});
			let seriesCountCell = $('<span>' + item.Series.length + '</span>').css({'display': 'table-cell', 'border': '1px solid grey', 'width': '40px'});
			let imageCountCell = $('<span>' + imageCountRes.result  + '</span>').css({'display': 'table-cell', 'border': '1px solid grey', 'width': '40px'});
			let commandCell = $('<span></span>').css({'display': 'table-cell', 'width': '120px', 'text-align': 'center'});
			let sendCloudCmd = $('<input type="button" value=" ส่งภาพเข้าระบบ " class="dicom-cmd"></input>');
			$(commandCell).append($(sendCloudCmd));
			$(dicomItem).append($(idCell)).append($(patientNameCell)).append($(patientHNCell)).append($(seriesCountCell)).append($(imageCountCell)).append($(commandCell));
			$(dicomListBox).append($(dicomItem));

			$(sendCloudCmd).on('click', async(evt)=>{
				$('.dicom-cmd').attr('disabled', true);
				let sendRes = await doCallApi('/api/orthanc/study/send/cloud', {studyID: item.ID});
				console.log(sendRes);
				if (sendRes.status.code == 200) {
					$('.dicom-cmd').attr('disabled', false);
				} else {
					alert('เกิดขัดข้องเรื่องการส่งภาพระหว่างเครื่อง Local กับ Cloud\nโปรดปิดเครื่องทิ้งไว้สักครู่แล้วเริ่มส่งใหม่\nหรือแจ้งผู้ดูแลระบบให้เปลี่ยนเส้นทางลำเลีบงภาพ');
				}
			});
		}
		*/

		$(loadStudyYesterdayCmd).on('click', (evt)=>{
			doLoadStudyYesterday();
		});
		$(resetCloudCmd).on('click', async(evt)=>{
			let resetRes = await doCallApi('/api/orthanc/reset/cloud');
			if (resetRes.status.code == 200) {
				alert('รีเซ็ตเส้นทางสำเร็จ')
			}
		});
		$(resetLocalCmd).on('click', async(evt)=>{
			let resetRes = await doCallApi('/api/orthanc/reset/local');
			if (resetRes.status.code == 200) {
				alert('รีเซ็ตระบบส่งภาพสำเร็จ')
			}
		});
	});
}

const doLoadStudyYesterday = function(){
	doCallApi('/api/orthanc/study/list/yesterday', {}).then(async(callRes)=>{
		console.log(callRes);
		$('#local-today-div').empty();
		let loadStudyTodayCmd = $('<h2>รายการภาพของวันนี้</h2>').css({'display': 'inline-block', 'cursor': 'pointer', 'color': 'blue'});
		$('#local-today-div').append($(loadStudyTodayCmd));
		$('#local-today-div').append($('<h2>รายการภาพของเมื่อวาน</h2>').css({'display': 'inline-block', 'margin-left': '20px'}));
		let resetCloudCmd = $('<h2>รีเซ็ตเส้นทางส่งภาพ</h2>').css({'display': 'inline-block', 'margin-left': '20px', 'cursor': 'pointer', 'color': 'blue'});
		$('#local-today-div').append($(resetCloudCmd));
		let resetLocalCmd = $('<h2>รีเซ็ตระบบส่งภาพ</h2>').css({'display': 'inline-block', 'margin-left': '20px', 'cursor': 'pointer', 'color': 'blue'});
		$('#local-today-div').append($(resetLocalCmd));

		await doShowDicomList(callRes.result);
		$(loadStudyTodayCmd).on('click', (evt)=>{
			doLoadStudyToday();
		});
		$(resetCloudCmd).on('click', async(evt)=>{
			let resetRes = await doCallApi('/api/orthanc/reset/cloud');
			if (resetRes.status.code == 200) {
				alert('รีเซ็ตเส้นทางสำเร็จ')
			}
		});
		$(resetLocalCmd).on('click', async(evt)=>{
			let resetRes = await doCallApi('/api/orthanc/reset/local');
			if (resetRes.status.code == 200) {
				alert('รีเซ็ตระบบส่งภาพสำเร็จ')
			}
		});
	});
}

const doShowDicomList = function(dicoms){
	return new Promise(async function(resolve, reject){
		const promiseList = new Promise(async function(resolve2, reject2){
			let dicomListBox = $('<ul></ul>');
			$('#local-today-div').append($(dicomListBox));
			for (let i=0; i < dicoms.length; i++) {
				let item = dicoms[i];
				let imageCountRes = await doCallApi('/api/orthanc/study/count/instance', {accessionNumber: item.MainDicomTags.AccessionNumber});
				let dicomItem = $('<li></li>').css({'display': 'table-row'});
				let idCell = $('<span>' + item.ID + '</span>').css({'display': 'table-cell', 'margin-left': '30px', 'border': '1px solid grey', 'width': '400px'});
				let patientNameCell = $('<span>' + item.PatientMainDicomTags.PatientName + '</span>').css({'display': 'table-cell', 'width': '160px'});
				let patientHNCell = $('<span>' + item.PatientMainDicomTags.PatientID + '</span>').css({'display': 'table-cell', 'width': '80px'});
				let seriesCountCell = $('<span>' + item.Series.length + '</span>').css({'display': 'table-cell', 'border': '1px solid grey', 'width': '40px'});
				let imageCountCell = $('<span>' + imageCountRes.result  + '</span>').css({'display': 'table-cell', 'border': '1px solid grey', 'width': '40px'});
				let commandCell1 = $('<span></span>').css({'display': 'table-cell', 'width': '120px', 'text-align': 'center'});
				let commandCell2 = $('<span></span>').css({'display': 'table-cell', 'width': '120px', 'text-align': 'center'});
				let commandCell3 = $('<span></span>').css({'display': 'table-cell', 'width': '120px', 'text-align': 'center'});
				let resetCounterCmd = $('<input type="button" value=" สรุปจำนวนภาพ " class="dicom-cmd"></input>');
				let sendCloudCmd = $('<input type="button" value=" ส่งภาพเข้าระบบ " class="dicom-cmd"></input>');
				let uploadZipCmd = $('<input type="button" value=" ฮัพโหลดซิปไฟล์ " class="dicom-cmd"></input>');
				$(commandCell1).append($(resetCounterCmd));
				$(commandCell2).append($(sendCloudCmd));
				$(commandCell3).append($(uploadZipCmd));
				$(dicomItem).append($(idCell)).append($(patientNameCell)).append($(patientHNCell)).append($(seriesCountCell)).append($(imageCountCell));
				$(dicomItem).append($(commandCell1)).append($(commandCell2)).append($(commandCell3));;
				$(dicomListBox).append($(dicomItem));

				$(resetCounterCmd).on('click', async(evt)=>{
					$('.dicom-cmd').attr('disabled', true);
					let sendRes = await doCallApi('/api/orthanc/reset/image/counter', {studyID: item.ID});
					console.log(sendRes);
					if (sendRes.status.code == 200) {
						$('.dicom-cmd').attr('disabled', false);
					} else {
						alert('เกิดขัดข้องไม่สามารถสรุปจำนวนภาพ/ซีรีส์ได้ตอนนี้');
					}
				});
				$(sendCloudCmd).on('click', async(evt)=>{
					$('.dicom-cmd').attr('disabled', true);
					let sendRes = await doCallApi('/api/orthanc/study/send/cloud', {studyID: item.ID});
					console.log(sendRes);
					if (sendRes.status.code == 200) {
						$('.dicom-cmd').attr('disabled', false);
					} else {
						alert('เกิดขัดข้องเรื่องการส่งภาพระหว่างเครื่อง Local กับ Cloud\nโปรดปิดเครื่องทิ้งไว้สักครู่แล้วเริ่มส่งใหม่\nหรือแจ้งผู้ดูแลระบบให้เปลี่ยนเส้นทางลำเลีบงภาพ');
					}
				});
				$(uploadZipCmd).on('click', async(evt)=>{
					$('.dicom-cmd').attr('disabled', true);
					let uploadRes = await doCallApi('/api/orthanc/study/upload/archive', {studyID: item.ID});
					console.log(uploadRes);
					if (uploadRes.status.code == 200) {
						$('.dicom-cmd').attr('disabled', false);
					} else {
						alert('เกิดขัดข้องฮัพโหลดซิปไฟล์ไม่สำเร็จ');
					}
				});
			}
			setTimeout(()=> {
				resolve2();
			}, 500);
		});
		Promise.all([promiseList]).then((ob)=>{
			resolve();
		});
	});
}

/**************************************************/
const doCreateLocalManualGuide = function(){
	let guideBox = $('<div style="width: 100%; position: relative; padding: 10px; text-align: left;"></div>');
	let guideStyleClass = {'font-family': 'EkkamaiStandard-Light', 'font-size': '20px', 'background-color': 'green', 'color': 'white'};
	$(guideBox).css(guideStyleClass);
	$(guideBox).append('<p style="line-height: 22px;">การนำภาพทางการแพทย์เข้าระบบฯ ด้วยวิธีนี้ จะอนุญาตให้ใช้ไฟล์ภาพ Dicom หลายๆ ภาพ มาเข้า zip รวมกัน กลายเป็น zip file 1 ไฟล์ สำหรับอัพโหลด 1 ครั้ง</p>');
	$(guideBox).append('<p style="line-height: 22px;">ขนาด zip file สูงสุดไม่เกิน 3 GB</p>');

	$(guideBox).append('<p style="line-height: 22px;">ในกรณีต้องการนำภาพเข้าเก็บที่ PACS ของโรงพยาบาล โปรดเลือกอ็อปชั่นนี้ด้วยการเปิดสวิชด้านบนปุ่ม Upload</p>');
	$(guideBox).append('<p style="line-height: 22px;">หากเตรียมไฟล์สำหรับอัพโหลดพร้อมแล้ว คลิกปุ่ม <b>Upload</b> เพื่อเริ่มอัพโหลดไฟล์</p>');
	return $(guideBox);
}

const doCreateLocalImportForm = function(evt){
	let formBox = $('<div style="position: relative; width: 100%; margin-top: 10px; text-align: center;"></div>');
	$(formBox).append($('<div class="accorhead"><b>นำเข้าภาพทางการแพทย์จาก CD/File</b></div>'));
	let guideBox = doCreateLocalManualGuide();
	let cmdBox = $('<div style="position: relative; width: 100%; margin-top: 10px; text-align: center;"></div>');
  	let importOptionBox = $('<div style="position: relative; width: 100%; margin-top: 10px; text-align: right;"></div>');
  	$(importOptionBox).appendTo($(cmdBox));
	let pacsImportSwitchBox = $('<div id="ReadyState" style="float: right; margin-right: 4px;"></div>');
	let pacsImportOption = {
		onActionCallback : function() {console.log('option on');},
		offActionCallback : function() {console.log('option off');}
	};
	let pacsImportSwitch = $(pacsImportSwitchBox).readystate(pacsImportOption);
	$(pacsImportSwitchBox).appendTo($(importOptionBox));
	$(importOptionBox).append($('<span style="margin-right: 5px;">ให้นำภาพมาเก็บที่ PACS ของโรงพยาบาลด้วย</span>'));

	let uploadCmd = $('<button id="UploadCmd" style="width: 100%; margin-top: 10px;">Upload</button>');
	$(uploadCmd).appendTo($(cmdBox));
	$(uploadCmd).on('click', (evt)=>{
    let pacsImport = pacsImportSwitch.getState();
    doOpenSelectFile(evt, pacsImport);
    //doOpenSelectMultipleFile(evt, pacsImport);
	});
	let backCmd = $('<input type="button" value=" Back " id="BackCmd" style="margin-top: 10px;"/>');
	$(backCmd).on('click', (evt)=>{
		$('#portal-cmd-div, #portal-import-div').toggle();
	});
	$(backCmd).appendTo($(cmdBox));

	return $(formBox).append($(guideBox)).append($(cmdBox));;
}

const doOpenSelectFile = function(evt, pacsImportOpt){
	let openFileCmd = evt.currentTarget;
	let fileBrowser = $('<input type="file" name="archiveupload" style="display: none;"/>');
	let stepProgressBar = $('<div id="StepProgressBar" style="position: relative;  width: 100%; "></div>');
	let simpleProgressBar = $('<div id="SimpleProgressBar" style="position: relative; border: 2px solid black; width: 100%; min-height: 20px; background-color: white;"></div>');
	let indicator = $('<div id="Indicator" style="position: relative; width: 0px; padding: 0px; background-color: blue; min-height: 18px; text-align: center; color: white;"></div>');
	$(indicator).appendTo($(simpleProgressBar))
	$(fileBrowser).on('change', (evt) =>{
		console.log(evt.currentTarget.files);
		var fileSize = evt.currentTarget.files[0].size;
		var fileType = evt.currentTarget.files[0].type;
		console.log(fileSize);
		console.log(fileType);
		if (fileSize <= maxSizeDef) {
			if ((fileType === 'application/zip') || (fileType === 'application/x-zip-compressed')) {
				let uploadUrl = '/api/portal/archiveupload';
				let uploadCmd = $('#portal-import-div').find('#UploadCmd');
				let backCmd = $('#portal-import-div').find('#BackCmd');
				$(fileBrowser).simpleUpload(uploadUrl, {
					start: function(file){
						$(stepProgressBar).append($('<span>Uploading Zip File</span>'));
						$(indicator).css({'width': '0px', 'background-color': 'blue'});
						$(uploadCmd).prop('disabled', true);
						$(backCmd).prop('disabled', true);
					},
					progress: function(progress){
						let percentageValue = Math.round(progress);
						$(indicator).css({'width': percentageValue + '%'});
						$(indicator).text(percentageValue + '%');
					},
					success: function(data){
						$(fileBrowser).remove();
						//$(simpleProgressBar).remove();
						doStartImport(data, pacsImportOpt);
					},
					error: function(error){
						$(indicator).css({'width': '100%', 'background-color': 'red'});
						$(indicator).text('Upload Fail => ' + JSON.stringify(error));
					}
				});
			} else {
				$(indicator).css({'width': '100%', 'background-color': 'red'});
				$(indicator).text('Upload File type not support, Please remind that use zip file only.');
			}
		} else {
			$(indicator).css({'width': '100%', 'background-color': 'red'});
			$(indicator).text('Upload File size Exceed => ' + maxSizeDef + ' bytes.');
		}
	});
	$(openFileCmd).parent().append($(fileBrowser));
	$(openFileCmd).parent().append($(stepProgressBar));
	$(openFileCmd).parent().append($(simpleProgressBar));
	$(fileBrowser).click();
}

const doStartImport = function(data, pacsImportOpt){
	return new Promise(async function(resolve, reject) {
		$.notify('เริ่มกระบวนการเข้าไฟล์ภาพ โปรดรอจนเสร็จสิ้นกระบวนการ', "info");
		let importApiUrl = '/api/portal/importarchive';
		let params = {archivecode: data.file, pacsImportOption: pacsImportOpt};
		setTimeout(async () => {
			let importRes = await doCallApi(importApiUrl, params);
			console.log(importRes);
			//$('body').loading('start');
		}, 5000);
	});
}

const onUnzipProgress = function(evt) {
	let trigerData = evt.detail.data;
	console.log(trigerData);
	let archiveFileSize = trigerData.archiveFileSize;
	let archiveProgressSize = trigerData.archiveProgressSize;
	let percentageValue = Number((archiveProgressSize/archiveFileSize) * 100).toFixed(2);
	let indicator = $('#portal-import-div').find('#Indicator');
	let stepProgressBar = $('#portal-import-div').find('#StepProgressBar');
	$(stepProgressBar).empty().append($('<span>Unzip File</span>'));
	$(indicator).css({'width': percentageValue + '%'});
	$(indicator).text(percentageValue + '%');
}

const onImportProgress = function(evt) {
	let trigerData = evt.detail.data;
	console.log(trigerData);
	let position = trigerData.position;
	let all = trigerData.all;
	let percentageValue = Number((position/all) * 100).toFixed(2);
	let indicator = $('#portal-import-div').find('#Indicator');
	let stepProgressBar = $('#portal-import-div').find('#StepProgressBar');
	$(stepProgressBar).empty().append($('<span>Import Dicom Study [' + (position) + '/' + all   + ']</span>'));
	$(indicator).css({'width': percentageValue + '%'});
	$(indicator).text(percentageValue + '%');
}

const onImportSuccess = function(evt) {
	let trigerData = evt.detail.data;
	console.log(trigerData);
	let uploadCmd = $('#portal-import-div').find('#UploadCmd');
	let backCmd = $('#portal-import-div').find('#BackCmd');
	$(uploadCmd).prop('disabled', false);
	$(backCmd).prop('disabled', false);
	let indicator = $('#portal-import-div').find('#Indicator');
	$(indicator).css({'backgroud-color': 'green', 'color': 'white'});
	$(indicator).empty().append('<span>Success.</span>');
	let simpleProgressBar = $('#portal-import-div').find('#SimpleProgressBar');
	let stepProgressBar = $('#portal-import-div').find('#StepProgressBar');

	setTimeout(()=>{
		$(simpleProgressBar).remove();
		$(stepProgressBar).remove();
	}, 5000);
}

/**************************************************/
const doCreateCloudManualGuide = function(){
	let guideBox = $('<div style="width: 100%; position: relative; padding: 10px; text-align: left;"></div>');
	let guideStyleClass = {'font-family': 'EkkamaiStandard-Light', 'font-size': '20px', 'background-color': 'green', 'color': 'white'};
	$(guideBox).css(guideStyleClass);
	$(guideBox).append('<p style="line-height: 22px;">โปรดกรอก เลขประจำตัวประชาชน	ผู้ป่วย และ รหัสเคสแล้วคลิกปุ่ม <b>Submit</b></p>');
	$(guideBox).append('<p style="line-height: 22px;">หากระบบฯ ค้นหาข้อมูลเจอ ระบบฯ จะส่งรหัส OTP ไปให้ท่านทาง SMS เพื่อนำไปกรอกลงในช่อง OTP สำหรับการยืนยันตัวตนของผู้ป่วย</p>');
	$(guideBox).append('<p style="line-height: 20px;"></p>');
	return $(guideBox);
}

const doCreateHistoryView = function(caseItems) {
	return new Promise(async function(resolve, reject){
		let historyView = $('<div style="display: table; width: 99%; border-collapse: collapse;"></div>');
		let historyHeader = $('<div style="display: table-row; width: 100%;"></div>');
		$(historyHeader).appendTo($(historyView));
		$(historyHeader).append($('<span style="display: table-cell; text-align: center;" class="header-cell">#</span>'));
		$(historyHeader).append($('<span style="display: table-cell; text-align: center;" class="header-cell">วันที่</span>'));
		$(historyHeader).append($('<span style="display: table-cell; text-align: center;" class="header-cell">ส่วนที่สแกน</span>'));
		$(historyHeader).append($('<span style="display: table-cell; text-align: center;" class="header-cell">โรงพยาบาล</span>'));
		const promiseList = new Promise(async function(resolve2, reject2){
			for (let i=0; i < caseItems.length; i++) {

			}
			setTimeout(()=> {
				resolve2($(historyView));
			}, 500);
		});
		Promise.all([promiseList]).then((ob)=>{
			resolve(ob[0]);
		});
	});
}

const doCreateCloudImport = function(){
	return new Promise(async function(resolve, reject){
		let cloudBox = $('<div></div>');
		let cloudInputForm = $('<div class="accorcont" style="padding: 10px; background-color: white;"></div>');
		$(cloudBox).append($(cloudInputForm));

		let cloudApproachGuideBox = $('<div></div>');
		$(cloudApproachGuideBox).appendTo($(cloudInputForm));
		$(cloudApproachGuideBox).append('<p></p>')

		let cloudApproachFormBox = $('<div style="position: relative; display: table; width: 50%; margin-left: calc(30% - 0px);"></div>');
		$(cloudApproachFormBox).appendTo($(cloudInputForm));

		let citizenIDBox = $('<div style="display: table-row; width: 100%;"></div>');
		$(citizenIDBox).append('<div style="display: table-cell; padding: 5px;"><span>เลขประจำตัวประชาชน</span></div>');
		let citizenIDCell = $('<div style="display: table-cell; padding: 5px;"></div.');
		let citizenID = $('<input type="number"/>');
		$(citizenID).appendTo($(citizenIDCell));
		$(citizenIDCell).appendTo($(citizenIDBox));
		$(citizenIDBox).appendTo($(cloudApproachFormBox));

		let caseIDBox = $('<div style="display: table-row; width: 100%;"></div>');
		$(caseIDBox).append('<div style="display: table-cell; padding: 5px;"><span>รหัสเคส</span></div>');
		let caseIDCell = $('<div style="display: table-cell; padding: 5px;"></div>');
		let caseID = $('<input type="number"/>');
		$(caseID).appendTo($(caseIDCell));
		$(caseIDCell).appendTo($(caseIDBox));
		$(caseIDBox).appendTo($(cloudApproachFormBox));

		let otpBox = $('<div style="display: table-row; width: 100%;"></div>');
		$(otpBox).append('<div style="display: table-cell; padding: 5px;"><span>OTP</span></div>');
		let otpCell = $('<div style="display: table-cell; padding: 5px;"></div>');
		let otp = $('<input type="number"/>');
		$(otp).appendTo($(otpCell));
		$(otpCell).appendTo($(otpBox));
		$(otpBox).appendTo($(cloudApproachFormBox));

		let submitCmd = $('<button style="width: 100%">Submit</button>');
		$(submitCmd).appendTo($(cloudInputForm));

		$(submitCmd).on('click', (evt)=>{

		});

		let cloudApproachHistoryBox = $('<div style="padding: 4px; width: 100%; margin-top: 8px;"></div>');
		$(cloudApproachHistoryBox).appendTo($(cloudInputForm));

		let historyView = await doCreateHistoryView([]);
		$(historyView).appendTo($(cloudApproachHistoryBox));

		let approachControlBar = $('<div style="padding: 4px; width: 100%; margin-top: 8px; text-align: center;"></div>');
		$(approachControlBar).appendTo($(cloudInputForm));

		let openWebViewDicomCmd = $('<input type="button" value=" เปิดภาพ/ผลอ่าน "/>');
		$(openWebViewDicomCmd).appendTo($(approachControlBar));
		$(openWebViewDicomCmd).on('click', (evt)=>{

		});
		$(approachControlBar).append('<span>  </span>');

		let contactImageOwnerCmd = $('<input type="button" value=" ติดต่อผู้ป่วย/โรงพยาบาล เจ้าของภาพ "/>');
		$(contactImageOwnerCmd).appendTo($(approachControlBar));
		$(contactImageOwnerCmd).on('click', (evt)=>{

		});
		$(approachControlBar).append('<span>  </span>');

		let editOTPCmd = $('<input type="button" value=" แก้ไข OTP "/>');
		$(editOTPCmd).appendTo($(approachControlBar));
		$(editOTPCmd).on('click', (evt)=>{

		});
		$(approachControlBar).append('<span>  </span>');

		let importFromCloudCmd = $('<input type="button" value=" Import From Cloud "/>');
		$(importFromCloudCmd).appendTo($(approachControlBar));
		$(importFromCloudCmd).on('click', (evt)=>{

		});

		resolve($(cloudBox));
	});
}

const doCreateCloudImportForm = function(evt){
	return new Promise(async function(resolve, reject){
		let formBox = $('<div style="position: relative; width: 100%; margin-top: 10px; text-align: center;"></div>');
		$(formBox).append($('<div class="accorhead"><b>นำเข้าภาพทางการแพทย์จาก Cloud</b></div>'));
		let guideBox = doCreateCloudManualGuide();
		let cloudBox = await doCreateCloudImport();
		let backCmd = $('<input type="button" value=" Back " id="BackCmd" style="margin-top: 10px;"/>');
		$(backCmd).on('click', (evt)=>{
			$('#portal-cmd-div, #portal-import-div').toggle();
		});

		$(formBox).append($(guideBox)).append($(cloudBox)).append($(backCmd));
		resolve($(formBox));
	});
}
