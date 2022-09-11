/*unzipproclib.js */
const fs = require('fs');
const path = require('path');
const unzip = require('unzip');

const procArgs = process.argv;
console.log(procArgs);

let archiveFile = procArgs[0];
let archiveDir = procArgs[1];

let archiveFileData = fs.statSync(archiveFile);
let archiveFileSize = archiveFileData.size;

let archiveProgressSize = 0;

let archiveStreamReader = fs.createReadStream(archiveFile);


if (!fs.existsSync(archiveDir)) {
	fs.mkdirSync(archiveDir);
}

archiveStreamReader.on('data', function(chunk) {
	archiveProgressSize += chunk.length;
	let percent = ((archiveProgressSize/1000) / archiveFileSize) * 100;
	console.log('Progress=>' + archiveFileSize + '/' + archiveProgressSize + '=>' + percent); 
});

archiveStreamReader.pipe(unzip.Extract({ path: archiveDir })).on('close', function () {
	console.log('Success');
});


