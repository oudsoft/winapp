/* websocket.js */
const fs = require('fs');
const path = require('path');
const splitFile = require('split-file');

function RadconWebSocketServer (arg, log, wsClient) {
	const $this = this;
	this.httpsServer = arg;
	const WebSocketServer = require('ws').Server;
	const wss = new WebSocketServer({server: this.httpsServer/*, path: '/' + roomname */});
	this.clients = [];
	this.socket = wss;
	this.cloudSocket = wsClient;

	wss.on('connection', async function (ws, req) {
		$this.clients.push(ws);
		log.info(ws._socket.remoteAddress);
		log.info(ws._socket._peername);
		log.info(req.connection.remoteAddress);
		log.info(`WS Conn Url : ${req.url} Connected.`);
		let fullReqPaths = req.url.split('?');
		let wssPath = fullReqPaths[0];
		log.info(wssPath);
		//wssPath = wssPath.substring(1);
		wssPath = wssPath.split('/');
		log.info(wssPath);
		ws.id = wssPath[2];
		ws.counterping = 0;
		ws.send(JSON.stringify({type: 'test', message: ws.id + ', You have Connected local websocket success.'}));

		ws.on('message', function (message) {
			var data;

			//accepting only JSON messages
			try {
				data = JSON.parse(message);
			} catch (e) {
				log.info("Invalid JSON");
				data = {};
			}

			log.info('data in=> '+JSON.stringify(data));

			let command;
			if (data.type) {
				switch (data.type) {
					case "trigger":
						/*
						let command = 'curl -X POST --user demo:demopassword http://localhost:8042/tools/execute-script -d "doLocalStore(\'' + data.dcmname + '\')"';
						$this.runCommand(command).then((result) => {
							ws.send(JSON.stringify({type: 'result', message: result}));
						});
						*/
						command = 'curl -k https://' + data.hostname + '/img/usr/pdf/' + data.dcmname + ' -o C:\\RadConnext\\tmp\\' + data.dcmname;
						log.info('Start Download Dicom with command=> ' + command);
						$this.runCommand(command).then((result) => {
							log.info('Download Result=> ' + result);
							ws.send(JSON.stringify({type: 'result', message: result}))
							command = 'storescu localhost 4242 C:\\RadConnext\\tmp\\'  +  data.dcmname + ' -v';
							log.info('Start Store Dicom with command=> ' + command);
							$this.runCommand(command).then((result2) => {

								command = 'curl -X POST --user demo:demopassword http://localhost:8042/modalities/Localhost/move -d "{""Level"" : ""Study"", ""Resources"" : [{""StudyInstanceUID"": ""' + data.StudyInstanceUID + '""}], ""TargetAet"": ""ORTHANCPACS""}"';
								log.info('Start Transfer dicom to Pacs with command=> ' + command);
								$this.runCommand(command).then((result3) => {
									log.info('Transer dicom to Pacs Result=> ' + result3);
									let moveResult = JSON.parse(result3);
									ws.send(JSON.stringify({type: 'move', data: {type: 'cmoveresult', data: moveResult, owner: data.owner, StudyInstanceUID: data.StudyInstanceUID}}));
								}).catch((err3) => {
									log.error('Transfer dicom Error=> ' + JSON.stringify(err3));
								});
							}).catch((err2) => {
								log.error('Store Dicom Error=> ' + JSON.stringify(err2));
							});
						});
					break;
					case "exec":
						let queryStr;
						if (data.data.key === 'PatientName'){
							 queryStr = '"{""Level"": ""Patient"", ""Expand"": true, ""Query"":{""PatientName"": ""' + data.data.value + '""}}"';
						} else if (data.data.key === 'PatientHN'){
							queryStr = '"{""Level"": ""Study"", ""Expand"": true, ""Query"":{""PatientID"": ""' + data.data.value + '""}}"';
						}
						command = 'curl -X POST --user demo:demopassword  -H "Content-Type: application/json" http://localhost:8042/modalities/Pacs/query -d ' + queryStr;
						log.info('Start C-Find with command=> ' + command);
						$this.runCommand(command).then((result1) => {
							log.info('Find Result=> ' + result1);
							let findResult = JSON.parse(result1);
							command = 'curl -X GET --user demo:demopassword http://localhost:8042' + findResult.Path + '/answers';
							log.info('Start Check find-answer with command=> ' + command);
							$this.runCommand(command).then((result2) => {
								let answerResult = JSON.parse(result2);
								if (answerResult.length > 0){
									command += '/0/content';
									log.info('Start Get Result with command=> ' + command);
									$this.runCommand(command).then((result3) => {
										let contentResult = JSON.parse(result3);
										log.info('Content Result=> ' + JSON.stringify(contentResult));
										ws.send(JSON.stringify({type: 'exec', data: {type: 'cfindresult', data: contentResult, owner: data.data.owner, hospitalId: data.data.hospitalId, queryPath: findResult.Path}}));
									});
								} else {
									ws.send(JSON.stringify({type: 'exec', data: {type: 'cfindresult', data: {}, owner: data.data.owner, hospitalId: data.data.hospitalId}}));
								}
							});
						}).catch((err) => {
							log.error('Store Dicom Error=> ' + JSON.stringify(err));
						});
					break;
					case "move":
						//command = 'curl -X POST --user demo:demopassword http://localhost:8042/modalities/Pacs/move -d "{""Level"" : ""Study"", ""Resources"" : [{""StudyInstanceUID"": ""' + data.data.StudyInstanceUID + '""}], ""Timeout"": 60}"';
						command = 'curl -X POST --user demo:demopassword http://localhost:8042' + data.data.queryPath + '/retrieve -d "{""TargetAet"": ""ORTHANC"", ""Synchronous"": false}"';
						log.info('Start C-Move with command=> ' + command);
						$this.runCommand(command).then((result1) => {
							log.info('Move Result=> ' + result1);
							let moveResult = JSON.parse(result1);
							command = 'curl --user demo:demopassword http://localhost:8042' + moveResult.Path;
							log.info('Get Job Move Result with command=> ' + command);
							$this.runCommand(command).then((result2) => {
								log.info('Job Move Result=> ' + result2);
								moveResult = JSON.parse(result2);
								ws.send(JSON.stringify({type: 'move', data: {type: 'cmoveresult', data: moveResult, owner: data.data.owner, PatientID: data.data.patientID, hospitalId: data.data.hospitalId}}));
							});
						}).catch((err) => {
							log.error('C-Move Dicom Error=> ' + JSON.stringify(err));
						});
					break;
					case "run":
						command =data.data.command;
						log.info('Start Run Exec your command=> ' + command);
						$this.runCommand(command).then((result) => {
							log.info('Run Exec your Result=> ' + result);
							let runResult = JSON.parse(result);
							ws.send(JSON.stringify({type: 'move', data: {type: 'runresult', data: runResult, owner: data.data.owner}}));
						}).catch((err) => {
							log.error('You have Exec Error=> ' + JSON.stringify(err));
						});
					break;
					case "notify":
						ws.send(JSON.stringify({type: 'notify', message: data.notify}));
					break;
					case "client-status":
						let clientStatus = $this.cloudSocket.readyState;
						ws.send(JSON.stringify({type: 'clientreadystate', data: {state: clientStatus}}));
					break;
					case "client-reconnect":
						$this.cloudSocket.reconnect();
					break;
					case "client-sendbinary":
						let zipDir = path.join(__dirname, '/public/img/usr/zip');

						let zipFilename = 'multi.zip';
						let dicomZipFile = zipDir + '/' + zipFilename;
						log.info('dicomZipFile=> ' + dicomZipFile);
						splitFile.splitFileBySize(dicomZipFile, 50000000).then(async(partNames) => {
							log.info('partNames=> ' + partNames);
							let parts = [];
							await partNames.forEach((filePartName, i) => {
								let names = filePartName.split('/');
								let fileName = names[names.length-1];
								parts.push(fileName);
							});
							log.info('parts=> ' + parts);
							wsClient.sendBinary(zipDir, parts, zipFilename);
					  });
					break;
					case "call-server-api":
						wsClient.sendCallServerApi(data);
					break;
				}
			} else {
				ws.send(JSON.stringify({type: 'error', message: 'You command invalid type.'}));
			}
		});

		ws.isAlive = true;

		ws.on('pong', () => {
			let clientConnection = wsClient.connection;
			let currentState = {connected: clientConnection.connected, state: clientConnection.state};
			ws.counterping += 1;
			ws.isAlive = true;
			ws.send(JSON.stringify({type: 'ping', counterping: ws.counterping, form: 'local', clientSocketState: currentState, datetime: new Date()}));
		});

		ws.on('close', async function(client, req) {
			log.info('ws=> ' + ws.id + '/' + ws.hospitalId + ' closed.');
			await $this.removeNoneActiveSocket(ws.id);
			let allSocket = await $this.listClient();
			log.info('allSocket after one close=> ' + JSON.stringify(allSocket));
		});

	});

	wss.on('error', function(err){
		log.info('err=> ' + JSON.stringify(err))
	});

	setInterval(() => {
		wss.clients.forEach((ws) => {
			if (!ws.isAlive) return ws.terminate();
			ws.ping(null, false, true);
		});
	}, 60000);

	this.removeNoneActiveSocket = function(wsId){
		return new Promise(async function(resolve, reject) {
			let anotherActiveSockets = await $this.clients.filter((client) =>{
				if (client.id !== wsId) {
					if ((client.isAlive) || (client.readyState == 0) || (client.readyState == 1)) {
						return client;
					}
				}
			});
			$this.clients = anotherActiveSockets;
			resolve($this.clients);
		});
	}

	this.listClient = function(){
		return new Promise(async function(resolve, reject) {
			let clientConns = [];
			await $this.clients.forEach((item, i) => {
				clientConns.push({id: item.id, state: item.readyState});
			});
			resolve(clientConns);
		});
	}

	this.sendNotify = function (notify) {
		return new Promise(async function(resolve, reject) {
			await $this.clients.forEach((client) =>{
				client.send(JSON.stringify(notify));
			});
			resolve($this.clients);
		});
	}

	this.runCommand = function (command) {
		return new Promise(function(resolve, reject) {
			const exec = require('child_process').exec;
			exec(command, (error, stdout, stderr) => {
				if(error === null) {
					resolve(`${stdout}`);
				} else {
					reject(`${stderr}`);
				}
	    });
		});
	}

	this.doReadBinary = function(binaryFile) {
		return new Promise(function(resolve, reject) {
			const file_buffer  = fs.readFileSync(binaryFile);
			const contents_in_base64 = file_buffer.toString('base64');
			//log.info('contents_in_base64 => ' + JSON.stringify(contents_in_base64));
			resolve(contents_in_base64);
		});
	}
}

module.exports = ( arg, monitor, clientSocket ) => {
	const webSocketServer = new RadconWebSocketServer(arg, monitor, clientSocket);
	return webSocketServer;
}
