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

					break;
					case "exec":
					break;
					case "move":
					break;
					case "run":
						command = data.data.command;
						log.info('Start Run Exec your command=> ' + command);
						$this.runCommand(command).then((result) => {
							log.info('Run Exec your Result=> ' + result);
							let runResult = JSON.parse(result);
							ws.send(JSON.stringify({type: 'exec', data: {type: 'runresult', result: runResult, sender: data.sender, hospitalId: data.hospitalId}}));
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
					/*
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
					*/
				}
			} else {
				ws.send(JSON.stringify({type: 'error', message: 'You command invalid type.'}));
			}
		});

		ws.isAlive = true;

		ws.on('pong', () => {
			let clientConnection = wsClient.connection;
			let clientCounterping = wsClient.counterping;
			let currentState = {connected: clientConnection.connected, state: clientConnection.state, counterping: clientCounterping};
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
