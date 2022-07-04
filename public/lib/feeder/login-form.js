/* login-form.js */
(function($) {
  $.fn.loginform = function( options ) {
    var settings = $.extend({

    }, options );

    const $this = this;

    //let mainBox = undefined;
    let signinTextBox = undefined;
    let signinYourAccountTextBox = undefined;
    let usernameInputBox = undefined;
    let passwordInputBox = undefined;
    let errorMessageBox = undefined;
    let rememberMeOptionBox = undefined;
    let loginButtonCmd = undefined;
    let tryLoginCount = 0;

    const doCallLoginApi = function(user) {
      return new Promise(function(resolve, reject) {
        tryLoginCount += 1;
        var loginApiUri = 'https://radconnext.info/api/login/';
        var params = user;
        $.post(loginApiUri, params, function(response){
    			resolve(response);
    		}).catch((err) => {
    			console.log(JSON.stringify(err));
          reject(err);
    		})
    	});
    }

    const doGetCheckUsername = function(username){
  		return new Promise(function(resolve, reject) {
  			var existUsernameApiUri = 'https://radconnext.info/api/users/searchusername/' + username;
  			var params = {username: username};
  			$.get(existUsernameApiUri, params, function(response){
  				resolve(response);
  			}).catch((err) => {
  				console.log(JSON.stringify(err));
  				reject(err);
  			})
  		});
  	}

    const doCallSendResetPwdEmail = function(yourEmail, username, userId) {
  		return new Promise(function(resolve, reject) {
        var existEmailApiUri = 'https://radconnext.info/api/resettask/new';
        var params = {email: yourEmail, username: username, userId: userId};
        $.post(existEmailApiUri, params, function(response){
    			resolve(response);
    		}).catch((err) => {
    			console.log(JSON.stringify(err));
          reject(err);
    		})
    	});
  	}

    const gotoYourPage = function(usertype){
  		let dicomfilter = undefined;
      console.log(usertype);
      switch (usertype) {
        case 1:
          window.location.replace('/staff.html');
          /* รอแก้ bundle ของ admin */
        break;
        case 2:
  				dicomfilter = localStorage.getItem('dicomfilter');
  				if (!dicomfilter) {
  					const defualtDicomFilter = {"Level": "Study", "Expand": true, "Query": {"Modality": "*"}, "Limit": 30};
  					localStorage.setItem('dicomfilter', JSON.stringify(defualtDicomFilter));
  				}
          window.location.replace('/dicom/index.html');
        break;
        case 3:
  				//window.location.replace('/biller/index.html');
        break;
        case 4:
          //window.location.replace('/radio/index.html');
        break;
        case 5:
          //window.location.replace('/refer/index.html');
        break;
        case 8:
          //window.location.replace('/sip/dialcall.html');
        break;
      }
    }

  	const doCheckUserData = function(){
  		let yourToken = localStorage.getItem('token');
  		if (yourToken) {
  			let userdata = localStorage.getItem('userdata');
  			if (userdata !== 'undefined') {
  				userdata = JSON.parse(userdata);
  				if (userdata && userdata.usertype){
  					gotoYourPage(userdata.usertype.id)
  				}
  			}
  		}
  	}

    const doCreateSigninTextBox = function(){
      let signinTextBox = $('<div></div>');
      let signinText = $('<h2>Sign In</h2>');
      return $(signinTextBox).append($(signinText));
    }

    const doCreateSigninYourAccountTextBox = function(){
      let signinYourAccountTextBox = $('<div></div>');
      let signinYourAccountText = $('<h3>Sign in to your account.</h3>');
      return $(signinYourAccountTextBox).append($(signinYourAccountText));
    }

    const doCreateUsernameInputBox = function(){
      let usernameInputBox = $('<div style="position: relative;"></div>');
      let usernameGuideText = $('<h5 style="position: relative; line-height: 0px;">Username <span style="color: red;">*</span></h5>');
      let usernameInput = $('<input type="text" style="position: relative; margin: -50px 0px; width: 100%;"/>');
      $(usernameInput).on('keypress',function(evt) {
        if(evt.which == 13) {
          doUserClickLogin();
        };
      });
      let lastStorageOption = localStorage.getItem('rememberme');
      if (lastStorageOption == 1) {
        let lastStorageUsername = localStorage.getItem('username');
        $(usernameInput).val(lastStorageUsername);
      }
      return $(usernameInputBox).append($(usernameGuideText)).append($(usernameInput));
    }

    const doCreatePasswordInputBox = function(){
      let passwordInputBox = $('<div style="position: relative;"></div>');
      let passwordGuideText = $('<h5 style="line-height: 0px;">Password <span style="color: red;">*</span></h5>');
      let passwordInput = $('<input type="password" style="width: 100%; margin-top: -50px;"/>');
      $(passwordInput).on('keypress',function(evt) {
        if(evt.which == 13) {
          doUserClickLogin();
        };
      });
      /*
      let lastStorageOption = localStorage.getItem('rememberme');
      if (lastStorageOption == 1) {
        let lastStoragePassword = localStorage.getItem('password');
        $(usernameInput).val(lastStoragePassword);
      }
      */
      return $(passwordInputBox).append($(passwordGuideText)).append($(passwordInput));
    }

    const doCreateLoginErrorMessageBox = function(){
      let errorMessageBox = $('<div style="display: none; line-height: 4px;"></div>');
      let errorMessageText = $('<h5 class="errormessage" style="color: red; line-height: 14px;">Error...</h5>');
      return $(errorMessageBox).append($(errorMessageText));
    }

    const doCreateRememberMeOptionBox = function(){
      let rememberMeOptionBox = $('<div style="margin-top: 10px;"></div>');
      let optionBox = $('<input type="checkbox" id="RememberMe" value="1"/>');
      let labelBox = $('<label for="RememberMe" style="margin-left: 5px;">Remember my account in this device.</label>');
      let lastStorageOption = localStorage.getItem('rememberme');
      if (lastStorageOption == 1) {
        $(optionBox).prop("checked", true);
      }
      return $(rememberMeOptionBox).append($(optionBox)).append($(labelBox));
    }

    const doCreateLoginButtonCmd = function(){
      let loginButtonCmd = $('<input type="button" value=" SIGN IN " style="width: 100%; margin-top: 44px;"/>');
      $(loginButtonCmd).css({'background-color': '#184175', 'color': 'white'}); //#2F4646
      $(loginButtonCmd).on('click', (evt)=>{
        doUserClickLogin();
      });
      return $(loginButtonCmd);
    }

    const doCreateForgotMyPassword = function(username, userEmail, userId){
      let linkCmd = $('<a href="#" style="position: relative; line-height: 0px; margin-top: 60px;">I have forgot my password.</a>');
      $(linkCmd).on('click', (evt)=>{
        doCallSendResetPwdEmail(userEmail, username, userId).then((sendRes)=>{
          let sendEmailResBox = $('<div style="position: relative; width: 100%; padding: 10px; background-color: white; border-radius: 10px; border: 2px solid red;"></div>');
          let resText = '<p>ระบบฯ ได้ส่งลิงค์สำหรับรีเซ็ตรหัสผ่านไปทางอีเมล์ <b>'+ userEmail + '</b> เรียบร้อยแล้ว โปรดตรวจสอบ ที่กล่องอีเมล์ของคุณ</p>';
          resText += '<p><b>คุณมีเวลาสำหรับรีเซ็ตรหัสผ่าน 1 ชม. นับจากนี้</b></p>';
          $(sendEmailResBox).append($(resText));
          $(sendEmailResBox).insertBefore($(loginButtonCmd));
          $(linkCmd).remove();
        });
      });
      return $(linkCmd);
    }

    const doUserClickLogin = function(){
      let errorMsgBox = $(errorMessageBox);
      let username = $(usernameInputBox).find('input').val();
      let password = $(passwordInputBox).find('input').val();
      if (username !== '') {
        $(usernameInputBox).find('input').css('border', '');
        $(errorMsgBox).find('.errormessage').text('');
        $(errorMsgBox).hide();
        if (password !== '') {
          $(passwordInputBox).find('input').css('border', '');
          $(errorMsgBox).find('.errormessage').text('');
          $(errorMsgBox).hide();
          let user = {username: username, password: password};
          doCallLoginApi(user).then(async (response) => {
            if (response.success == false) {
              if (tryLoginCount == 4) {
                doGetCheckUsername(username).then((existRes)=>{
                  if ((existRes.result == true) && (existRes.email !== '')  && (existRes.id)) {
                    let forgotLink = doCreateForgotMyPassword(username, existRes.email, existRes.id);
                    $(forgotLink).insertBefore($(loginButtonCmd));

                    let errorMsg = 'We are sorry, Your password Incorrect.'
                    $(passwordInputBox).find('input').css('border', '1px solid red');
                    $(errorMsgBox).find('.errormessage').text('').text(errorMsg);
                    $(errorMsgBox).show();
                  }
                });
              } else {
                let errorMsg = 'We are sorry, Your username or password is not correct.'
                $(usernameInputBox).find('input').css('border', '1px solid red');
                $(passwordInputBox).find('input').css('border', '1px solid red');
                $(errorMsgBox).find('.errormessage').text('').text(errorMsg);
                $(errorMsgBox).show();
              }
            } else {
              $(usernameInputBox).find('input').css('border', '');
              $(passwordInputBox).find('input').css('border', '');
              $(errorMsgBox).find('.errormessage').text('');
              $(errorMsgBox).hide();

              let usertype = response.data.usertype.id;
              /*
              if (usertype == 4) {
                if (response.data.userprofiles.length == 0){
                  const defaultProfile = {
                    readyState: 1,
                		readyBy: 'user',
                    screen: {
                      lock: 30,
                      unlock: 0
                    },
                    auotacc: 0,
                    casenotify: {
                      webmessage: 1,
                      line: 1,
                      autocall: 0,
                      mancall:0
                    }
                  };
                  response.data.userprofiles.push({Profile: defaultProfile});
                }
              }
              */
              localStorage.setItem('token', response.token);
    					localStorage.setItem('userdata', JSON.stringify(response.data));
      				const defualtSettings = {"itemperpage" : "20"};
      				localStorage.setItem('defualsettings', JSON.stringify(defualtSettings));

              let rememberMeOption = $(rememberMeOptionBox).find('input').prop("checked");
              if (rememberMeOption == true) {
    						localStorage.setItem('rememberme', 1);
                localStorage.setItem('username', username);
                //localStorage.setItem('password', password);
    					} else {
    						localStorage.setItem('rememberme', 0);
    					}

              sessionStorage.setItem('logged', true);
              /*
    					let queryObj = urlQueryToObject(window.location.href);
              if (queryObj.action) {
    						if (queryObj.action === 'callchat'){
    							let caseId = queryObj.caseId;
    							window.location.replace('/refer/callradio.html?caseId=' + caseId);
    						}
    					} else {
              	gotoYourPage(usertype);
    					}
              */
              gotoYourPage(usertype);
            }
          });
        } else {
          let errorMsg = 'Please enter your password.'
          $(passwordInputBox).find('input').css('border', '1px solid red');
          $(errorMsgBox).find('.errormessage').text('').text(errorMsg);
          $(errorMsgBox).show();
        }
      } else {
        let errorMsg = 'Please enter your username.'
        $(usernameInputBox).find('input').css('border', '1px solid red');
        $(errorMsgBox).find('.errormessage').text('').text(errorMsg);
        $(errorMsgBox).show();
      }
    }

    const init = function() {
      $this.css({'position': 'relative', 'width': '50%', 'text-align': 'left', 'margin-left': 'auto', 'margin-right': 'auto'});
      signinTextBox = doCreateSigninTextBox();
      signinYourAccountTextBox = doCreateSigninYourAccountTextBox();
      usernameInputBox = doCreateUsernameInputBox();
      passwordInputBox = doCreatePasswordInputBox();
      errorMessageBox = doCreateLoginErrorMessageBox();
      rememberMeOptionBox = doCreateRememberMeOptionBox();
      loginButtonCmd = doCreateLoginButtonCmd();
      $this.append($(signinTextBox)).append($(signinYourAccountTextBox));
      $this.append($(usernameInputBox)).append($(passwordInputBox));
      return $this.append($(errorMessageBox)).append($(rememberMeOptionBox)).append($(loginButtonCmd));
    }

    init();

    var output = {
      settings: settings,
      handle: this,
      signinTextBox: signinTextBox,
      signinYourAccountTextBox: signinYourAccountTextBox,
      usernameInputBox: usernameInputBox,
      passwordInputBox: passwordInputBox,
      errorMessageBox: errorMessageBox,
      rememberMeOptionBox: rememberMeOptionBox,
      loginButtonCmd: loginButtonCmd,

      doUserClickLogin: doUserClickLogin
    }

    return output;

  };

})(jQuery);

(()=>{

  const loginBox = $('<div></div>');
  //$(loginBox).css({'position': 'relative', 'width': '100%', 'text-align': 'center'});

  const radconnextOption = {};
  const myRadconnextLoginForm = $(loginBox).loginform(radconnextOption);

  return myRadconnextLoginForm;

})();
