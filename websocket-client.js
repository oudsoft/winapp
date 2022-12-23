/*websocket-client.js */
const fs = require('fs');
const path = require('path');
const splitFile = require('split-file');

function RadconWebSocketClient (arg, log) {
	const $this = this;
	this.connectUrl = arg;
	this.state = false;
	this.localWebsocketServer = undefined;

	const logDir =  __dirname +  '/log';
	const uploadEvtWorker = require('worker-farm');
	const uploadEvtService = uploadEvtWorker(require.resolve('./upload-worker.js'));

	const exec = require('child_process').exec;
	const webSocketClient = require('websocket').client;

	const client = new webSocketClient();

	this.socket = client;

	client.on('connectFailed', function(error) {
		log.info('Connect Error: ' + error.toString());
		$this.state = false;
	});

	client.on('connect', async function(connection) {
		$this.connection = connection;
		log.info('WebSocket Client Connected to Cloud Success.');
		$this.state = connection.connected;
		$this.counterping = 0;
		connection.on('error', function(error) {
			log.error("WebSocket Client Connection Error: " + error.toString());
		});
		connection.on('close', function() {
			log.info('WebSocket Client Connection Closed');
			setTimeout(()=>{
				client.connect($this.connectUrl /*, 're-connect'*/);
			}, 51000)
		});
		connection.on('message', async function(message) {
			if (message.type === 'utf8') {
				var data;
				try {
					data = JSON.parse(message.utf8Data);
				} catch (e) {
					log.error("Invalid JSON");
					data = {};
				}

				log.info('data in=> '+JSON.stringify(data));

				if (data.type) {
					switch (data.type) {
						case "ping":
							$this.counterping = data.counterping;
							let modPingCounter = Number(data.counterping) % 10;
							if (modPingCounter == 0) {
								connection.send(JSON.stringify({type: 'pong', myconnection: $this.connectUrl}));
							}
						break;
						case "import":
						/*
						??? uplad ???? home/portal ?????? ??????????? route/uploader.js
						*/
					    let importData = {download: {link: data.download.link}};
							const workerFarm = require('worker-farm');
							//const importService = workerFarm(require.resolve('./import-worker.js'));
							const importService = workerFarm(require.resolve('./import-worker.js'));
					    await importService(importData, function (output) {
								log.info('Import Result=>' + JSON.stringify(output));
					    });
						break;
						/*
							??? Convert ???????????? ?????? process ???????? onNewReport
							??? Convert ????????? AI ?????? process trigger => convert-worker.js
						*/
						case "trigger":
							let convertData = data;
							const convertWorker = require('worker-farm');
							const convertService = convertWorker(require.resolve('./convert-worker.js'));
						  await convertService(convertData, function (output) {
 								log.info('Convert Process Result=>' + JSON.stringify(output));
							});
						break;
						case "newdicom":
							let eventData = {dicom: data.dicom};
							const newdicomEvtWorker = require('worker-farm');
							const newdicomEvtService = newdicomEvtWorker(require.resolve('./onnewdicom-worker.js'));
							try {
								newdicomEvtService(eventData, function (output) {
									log.info('onNewDicomEvent Result=>' + JSON.stringify(output));
								});
							} catch (error){
								log.error('NewDicomError=>' + JSON.stringify(error));
						  }
						break;
						case "newreport":
							let reportData = data;
							const newreportEvtWorker = require('worker-farm');
							const newreportEvtService = newreportEvtWorker(require.resolve('./onnewreport-worker.js'));
							try {
								log.info('== reportData of onNewReportEventProcess back ==');
						    log.info(JSON.stringify(reportData));
								newreportEvtService(reportData, function (output) {
									log.info('onNewReportEvent Result back =>' + JSON.stringify(output));
									if (data.radioProfile) {
										connection.send(JSON.stringify({type: 'newreportlocalresult', result: output, sendto: data.radioProfile.username, from: 'localorthanc', hospitalId: data.hospitalId, caseId: data.caseId, patientFullName: data.patientFullName}));
									} else {
										//
									}
								});
							} catch (error){
								log.error('NewReportError=>' + JSON.stringify(error));
						  }
						break;
						case "resubmitreport":
							let resubmitData = data;
							const resubmitreportEvtWorker = require('worker-farm');
							const resubmitreportEvtService = resubmitreportEvtWorker(require.resolve('./onresubmitreport-worker.js'));
							try {
								resubmitreportEvtService(resubmitData, function (output) {
									log.info('onResubmitReportEvent Result=>' + JSON.stringify(output));
								});
							} catch (error){
								log.error('ResubmitReportError=>' + JSON.stringify(error));
						  }
						break;

						case "exec":

						break;
						case "message":

						break;
						case "run":
							let hospitalId = data.hospitalId;
							let sender = data.sender;
							let commandType = data.commandType;
							let outputs = [];
							let yourCommands = data.commands;
							const promiseList = new Promise(async function(resolve2, reject2) {
								for (let x=0; x < yourCommands.length; x++) {
									let output = await $this.runCommand(yourCommands[x]);
									outputs.push(output);
								}
								setTimeout(()=> {
									resolve2(outputs);
								},500);
							});
							Promise.all([promiseList]).then((ob)=> {
								let result = {type: 'clientresult', results: ob[0], hospitalId: hospitalId, sender: sender, commandType: commandType, from: $this.connectUrl};
								connection.send(JSON.stringify(result));
							});
						break;
						case "echo":
							let echoHospitalId = data.hospitalId;
							let echoSender = data.sender;
							connection.send(JSON.stringify({type: 'echoreturn', myconnection: $this.connectUrl, hospitalId: echoHospitalId, sender: echoSender}));
						break;
						case "log":
							let logfilePath = logDir + '/log.log';
							try {
								uploadEvtService(logfilePath, function (output) {
									log.info('uploadEvent Result=>' + JSON.stringify(output));
									connection.send(JSON.stringify({type: 'logreturn', result: output, hospitalId: data.hospitalId, sender: data.sender}));
								});
							} catch (error){
								log.error('UploadError=>' + JSON.stringify(error));
								connection.send(JSON.stringify({type: 'logreturn', result: {error: error}}));
						  }
						break;
						case "dicomlog":
							let dicomLogFilePath = logDir + '/newdicom-log.log';
							try {
								uploadEvtService(dicomLogFilePath, function (output) {
									log.info('uploadEvent Result=>' + JSON.stringify(output));
									connection.send(JSON.stringify({type: 'dicomlogreturn', result: output, hospitalId: data.hospitalId, sender: data.sender}));
								});
							} catch (error){
								log.error('UploadError=>' + JSON.stringify(error));
								connection.send(JSON.stringify({type: 'dicomlogreturn', result: {error: error}}));
						  }
						break;
						case "reportlog":
							let reportLogFilePath = logDir + '/newreport-log.log';
							try {
								uploadEvtService(reportLogFilePath, function (output) {
									log.info('uploadEvent Result=>' + JSON.stringify(output));
									connection.send(JSON.stringify({type: 'reportlogreturn', result: output, hospitalId: data.hospitalId, sender: data.sender}));
								});
							} catch (error){
								log.error('UploadError=>' + JSON.stringify(error));
								connection.send(JSON.stringify({type: 'reportlogreturn', result: {error: error}}));
						  }
						break;
						/*
						case "dicombinary-result":
							log.info('dicombinary-result=> ' + JSON.stringify(data));
							let anotherParts = await $this.binaryParts.filter((part)=>{
								if (data.name != part) {
									return part;
								}
							});
							$this.binaryParts = anotherParts;
							if (anotherParts.length > 0) {
								log.info('anotherParts[0]=> ' + anotherParts[0]);
								let filePath = data.path;
								let binaryFile = filePath + '/' + anotherParts[0];
								let binary = await $this.doReadBinary(binaryFile);
								log.info('binary=> ' + binary);
								log.info('filename=> ' + anotherParts[0]);
								let jsonBinary = {type: 'dicombinary', binary: binary, filename: anotherParts[0], path: filePath};
								$this.connection.send(JSON.stringify(jsonBinary));
							} else {
								connection.send(JSON.stringify({type: 'dicombinary-merge', names: $this.originParts, originname: $this.originName}));
								if ($this.localWebsocketServer) {
									$this.localWebsocketServer.clients.forEach((ws) => {
										ws.send(JSON.stringify(data));
									});
								}
							}
						break;
						case "server-api-result":
							if ($this.localWebsocketServer) {
								$this.localWebsocketServer.clients.forEach((ws) => {
									ws.send(JSON.stringify(data));
								});
							}
						break;
						*/
						case "restart":
							this.runCommand('')
						break;

						case "clientreconnect":
							$this.reconnect();
						break;
						case "clientclose":
							$this.connection.close();
							$this.connection.onclose = undefined;
						break;
						case "reset":
							connection.send(JSON.stringify({type: 'reset'}));
						break;
					}
				} else {
					if (connection.connected) {
						connection.send(JSON.stringify({type: 'error', message: 'You command invalid type.'}));
					}
				}
			}
		});
		/*
		if (($this.binaryParts) && ($this.binaryParts.length > 0)) {
			log.info('$this.binaryParts[0]=> ' + $this.binaryParts[0]);
			let filePath = $this.binaryPath;
			let binaryFile = filePath + '/' + $this.binaryParts[0];
			let binary = await $this.doReadBinary(binaryFile);
			log.info('binary=> ' + binary);
			log.info('filename=> ' + $this.binaryParts[0]);
			let jsonBinary = {type: 'dicombinary', binary: binary, filename: $this.binaryParts[0], path: filePath};
			$this.connection.send(JSON.stringify(jsonBinary));
		}
		*/
	});

	this.runCommand = function (command) {
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

	this.reconnect = function(){
		$this.connection.close();
		log.info('$this.connectUrl=>' + $this.connectUrl);
		client.connect($this.connectUrl/*, 'echo-protocol'*/);
		$this.counterping = 0;
	}

	this.close = function() {
		$this.connection.close();
	}

	this.setLocalWebsocketServer = function(wsSocket) {
		$this.localWebsocketServer = wsSocket;
	}
	/*
	this.sendBinary = function(filePath, filePartNames, fileOriginName){
		return new Promise(async function(resolve, reject) {
			$this.originParts = filePartNames;
			$this.originName = fileOriginName;
			$this.binaryParts = filePartNames;
			$this.binaryPath = filePath;
			let binaryFile = filePath + '/' + filePartNames[0];
			let binary = await $this.doReadBinary(binaryFile);
			log.info('binary=> ' + binary);
			log.info('filename=> ' + filePartNames[0]);
			let jsonBinary = {type: 'dicombinary', binary: binary, filename: filePartNames[0], path: filePath};
			$this.connection.send(JSON.stringify(jsonBinary));
			resolve(jsonBinary);
		});
	}

	this.doReadBinary = function(binaryFile) {
		return new Promise(function(resolve, reject) {
			const file_buffer  = fs.readFileSync(binaryFile);
			const contents_in_base64 = file_buffer.toString('base64');
			resolve(contents_in_base64);
		});
	}

	this.sendCallServerApi = function(data){
		$this.connection.send(JSON.stringify(data));
	}
	*/

	client.connect(this.connectUrl/*, 'echo-protocol'*/);
}

module.exports = ( arg, monitor ) => {
	const webSocketClient = new RadconWebSocketClient(arg, monitor);
	return webSocketClient;
}
