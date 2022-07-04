/* login-leftside.js */
(function($) {

  $.fn.radconnextwelcome = function( options ) {
    var settings = $.extend({

    }, options );

    const $this = this;

    let mainBox = undefined;
    let logoBox = undefined;
    let welcomeTextBox = undefined;
    let powerbyTextBox = undefined

    const doCreateLogoBox = function(){
      let logoBox = $('<div style="position: relative; width: 100%;"></div>');
      let logoImage = $('<img src="https://radconnext.info/images/logo/radconnext-logo.png" style="width: 230px; height: auto;"/>');
      return $(logoBox).append($(logoImage));
    }

    const doCreateWelcomeTextBox = function(){
      let welcomeTextBox = $('<div style="position: relative; width: 100%;"></div>');
      let welcomeText = $('<h2>Welcome to Radconnext</h2>');
      return $(welcomeTextBox).append($(welcomeText));
    }

    const doCreatePowerByTextBox = function(){
      let powerbyTextBox = $('<div style="position: relative; width: 100%;"></div>');
      let powerbyText = $('<h3>Power by ... </h3>');
      return $(powerbyTextBox).append($(powerbyText));
    }

    const init = function() {
      mainBox = $('<div style="position: relative; width: 100%;"></div>');
      logoBox = doCreateLogoBox();
      welcomeTextBox = doCreateWelcomeTextBox();
      //powerbyTextBox = doCreatePowerByTextBox();
      //return $(mainBox).append($(logoBox)).append($(welcomeTextBox)).append($(powerbyTextBox));
      return $(mainBox).append($(logoBox)).append($(welcomeTextBox));
    }

    let radconnextWelcome = init();
    $this.empty().append($(radconnextWelcome));

    var output = {
      settings: settings,
      handle: this,
      mainBox: mainBox,
      logoBox: logoBox,
      powerbyTextBox: powerbyTextBox,
      welcomeTextBox: welcomeTextBox,
    }

    return output;

  };

})(jQuery);

(()=>{

  const radconnextBox = $('<div></div>');
  $(radconnextBox).css({'position': 'relative', 'width': '100%', 'text-align': 'center'});

  const radconnextOption = {};
  const myRadconnextWelcome = $(radconnextBox).radconnextwelcome(radconnextOption);

  return myRadconnextWelcome;

})();
