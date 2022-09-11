const doCallApi = function(url, params) {
	return new Promise(function(resolve, reject) {
		$.post(url, params, function(data){
			resolve(data);
		}).fail(function(error) {
			reject(error);
		});
	});
}

$( document ).ready(function() {
	const initPage = function() {

	};

	initPage();

	$('#test-cmd').on('click', (evt)=>{
    let testParams = {
      body: {
        Hn: "62-20-218708",
        AccessionNo: "AC622102596",
        ExamUid: "44",
        ExamName:  "CHEST",
        ResultText:  "EXAMINE\nBRAIN\nMOD\nCT\nRESULT\nOK\n",
        RadUid: 11,
        RadName: "test0003"
      },
      // url: "http://192.168.1.108/EnvisionRIEGet3rdPartyDataAi/Service/GetResult",
			url: 'http://172.16.5.100:9301/EnvisionRIEGet3rdPartyDataAi/Service/GetResult',
      method: "post"
    }

    let testUrl = "/api/proxy";

    doCallApi(testUrl, testParams).then((proxyRes)=>{
      console.log(proxyRes);
      //$('#ris-result-div').text(JSON.parse(proxyRes.res.body));
      $('#ris-result-div').text(JSON.stringify(proxyRes.res));
    });
	});
});
