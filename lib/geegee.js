const fs = require('fs');
const path = require('path');

const NARI_ENTRY_POINT = 'D:\\join\\media';
//const NARI_ENTRY_POINT = '/media/oodsoft/NSR/NARI';
//const NARI_ENTRY_POINT = '/media/oodsoft/HPUSB1/TOPSECRETE';
//const NARI_ENTRY_POINT = '/home/oodsoft/share/topsecrete';

const formatStr = function (str) {
  var args = [].slice.call(arguments, 1);
  var i = 0;
  return str.replace(/%s/g, () => args[i++]);
}

const ggPoint = function(entryPoint) {
  return new Promise(function(resolve, reject) {
    let ggOut = [];
    let promiseList = new Promise(function(resolve2, reject2) {
      fs.readdir(entryPoint, async(err, ggdirs) => {
        if ((ggdirs) && (ggdirs.length > 0)) {
          await ggdirs.forEach((item, i) => {
            let gg = {name: item};
            let grPoint = entryPoint + '/' + item;
            let grOut = [];
            fs.readdir(grPoint, async(err, grdirs) => {
              if ((grdirs) && (grdirs.length > 0)) {
                await grdirs.forEach((fld, i) => {
                  let path = grPoint + '/' + fld;
                  let gr = {name: fld, path: path};
                  grOut.push(gr);
                });
              }
            });
            gg.galleries = grOut;
            ggOut.push(gg);
          });
        }
      });
      setTimeout(()=>{
        resolve2(ggOut);
      }, 100);
    });
    Promise.all([promiseList]).then((ob)=>{
      resolve(ob[0]);
    });
  });
}

module.exports = function (app) {
  let geegeeJson = require('./geegee.json');

  //const geegeeJson = await ggPoint(NARI_ENTRY_POINT)

  let geegeePath = geegeeJson[1].galleries[0].path;

  app.get('/load/main', async (req, res) => {
    let ggMain = [];
    await geegeeJson.forEach((item, i) => {
      ggMain.push(item.name)
    });
    res.status(200).send({status: {code: 200}, geegee: ggMain});
  });

  app.get('/load/gallery', async (req, res) => {
    let nameTarget = req.query.ggname;
    let ggTarget = await geegeeJson.find((item)=>{
      if (item.name === nameTarget) {
        return item;
      }
    });
    res.status(200).send({status: {code: 200}, galleries: ggTarget.galleries});
  });

  app.get('/load/file', async (req, res) => {
    let nameTarget = req.query.ggname;
    let galleryTarget = req.query.galleryname;
    let ggTarget = await geegeeJson.find((item)=>{
      if (item.name === nameTarget) {
        return item;
      }
    });
    let galleryFound = await ggTarget.galleries.find((item)=>{
      if (item.name === galleryTarget) {
        return item;
      }
    });

    geegeePath = galleryFound.path;

    fs.readdir(geegeePath, (err, files) => {
      res.status(200).send(files);
    });
  });

  app.get('/geegee', (req, res) => {
  	fs.readdir(geegeePath, (err, files) => {
  	  res.status(200).send(files);
  	});
  });

  app.get('/entrypoint', (req, res) => {
    ggPoint(NARI_ENTRY_POINT).then((ggjson)=>{
      geegeeJson = ggjson;
      res.status(200).send(ggjson);
    });
  });

  app.get('/geegeefile/(:gname)', function(req, res) {
  	const gname = req.params.gname;
  	let geegeeFullDirPath = geegeePath + '/' + gname;
  	fs.readFile(geegeeFullDirPath, (err, file) => {
  		if (!err){
  			res.writeHead(200, {'Content-Type': 'image/jpeg'});
  			res.end(file);
  		} else {
  			res.status(500).send({error: {reason: 'not found geegee.'}});
  		}
  	});
  });

  app.get('/geegeeview/(:gname)', function(req, res) {
  	const gname = req.params.gname;
  	let geegeeFullDirPath = path.join(geegeePath, gname);
  	fs.readFile(geegeeFullDirPath, (err, file) => {
  		if (!err){
  			res.writeHead(200, {'Content-Type': 'image/jpeg'});
  			res.end(file);
  		} else {
  			res.status(500).send({error: {reason: 'not found geegee.'}});
  		}
  	});
  });

  return {
    formatStr
	}
}
