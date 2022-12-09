/* socket-ctrl.js */

let log, webSocketServer, clientSocket, util;

module.exports = (app, wsServer, wsClient, monitor) => {
  log = monitor;
  webSocketServer = wsServer;
  clientSocket = wsClient;

  util = require('../lib/utility.js')(monitor);

  app.get('/client/web/connect/cloud/reconnect', async function(req, res, next) {
		let webClientReconnectCloudNotify = {type: 'web-reconnect-cloud'};
		let clients = await webSocketServer.sendNotify(webClientReconnectCloudNotify);
		let results = [];
		await clients.forEach((item, i) => {
			let newItem = {id: item.id, state: item._readyState};
			results.push(newItem);
		});
		res.status(200).send({status: {code: 200}, result: results});
	});

	app.get('/client/web/connect/local/state', async function(req, res, next) {
		let results = [];
		await webSocketServer.clients.forEach((item, i) => {
			let newItem = {id: item.id, state: item._readyState};
			results.push(newItem);
		});
		res.status(200).send({status: {code: 200}, result: results});
	});

	app.get('/client/web/connect/cloud/state', async function(req, res, next) {
		let webClientStateCloudNotify = {type: 'web-connect-cloud-state'};
		let clients = await webSocketServer.sendNotify(webClientStateCloudNotify);
		let results = [];
		await clients.forEach((item, i) => {
			let newItem = {id: item.id, state: item._readyState};
			results.push(newItem);
		});
		res.status(200).send({status: {code: 200}, result: results});
	});

	app.get('/client/web/connect/local/close', async function(req, res, next) {
		let results = [];
		await webSocketServer.clients.forEach((item, i) => {
			item.close();
			let newItem = {id: item.id, state: item._readyState};
			results.push(newItem);
		});
		res.status(200).send({status: {code: 200}, result: results});
	});

	app.get('/client/web/connect/cloud/close', async function(req, res, next) {
		let webClientCloseCloudNotify = {type: 'web-disconnect-cloud'};
		let clients = await webSocketServer.sendNotify(webClientCloseCloudNotify);
		let results = [];
		await clients.forEach((item, i) => {
			let newItem = {id: item.id, state: item._readyState};
			results.push(newItem);
		});
		res.status(200).send({status: {code: 200}, result: results});
	});

	/*******************************************************/

	app.get('/client/api/connect/cloud/reconnect', function(req, res, next) {
		clientSocket.reconnect();
		let clientConnection = clientSocket.connection;
		let currentState = {connected: clientConnection.connected, state: clientConnection.state};
		res.status(200).send({status: {code: 200}, result: currentState});
	});

	app.get('/client/api/connect/cloud/state', function(req, res, next) {
		let clientConnection = clientSocket.connection;
		let currentState = {connected: clientConnection.connected, state: clientConnection.state};
		res.status(200).send({status: {code: 200}, result: currentState});
	});

	app.get('/client/api/connect/cloud/close', function(req, res, next) {
		let clientConnection = clientSocket.connection;
		clientConnection.close();
		let currentState = {connected: clientConnection.connected, state: clientConnection.state};
		res.status(200).send({status: {code: 200}, result: currentState});
	});

  /*******************************************************/

  return {
    /*****/
  };

}
