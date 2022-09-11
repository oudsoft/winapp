const path = require('path');
const fetch = require('node-fetch');
const {pipeline} = require('stream');
const {promisify} = require('util');
const { createReadStream, createWriteStream } = require('fs');

const FormData = require('form-data');
const streamPipeline = promisify(pipeline);


const https = require('https');

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

function doCallUpload(uploadUrl, filepath, uploadname, type="archive") {
  var data = new FormData();
  data.append('type', type);
  data.append('name', uploadname);
  data.append(uploadname, createReadStream(filepath));
  data.append('uploadby', 'oudsoft');

  const options = {
    method: 'POST',
    body: data,
    agent: httpsAgent,
    headers: {
      ...data.getHeaders()
    },
  }
  return fetch(uploadUrl, options).then(res => {
    console.log(JSON.stringify(res));
    if (res.ok) {
      return res.json()
    }
    throw new Error(res.statusText)
  })
}


let uploadUrl = 'https://radconnext.info/api/transfer/archive';
let uploadname = 'archiveupload';
//let filepath = '/home/drink/Downloads/THONGDAENG_SAECHAN-20220807-194241-213609.zip';
//let filepath = '/home/drink/Downloads/temp/NITTAYA_PHURIANGPHA-20220721-181533-184613.zip';
let filepath = 'D:/radcon/Radconnext-win32-x64/http/public/img/usr/zip/NITTAYA_PHURIANGPHA-20220721-181533-184613.zip';
doCallUpload(uploadUrl, filepath, uploadname).then((res)=>{
  console.log(JSON.stringify(res));
});
