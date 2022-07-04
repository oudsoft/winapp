/* jqury-readystate-plugin.js */
(function ( $ ) {
  $.fn.readystate = function( options ) {

    var settings = $.extend({
      onActionCallback: undefined,
      offActionCallback: undefined
    }, options );

    var $this = this;

    const onActionFromExternal = function() {
      $(readySwitch).find('input[type="checkbox"]').prop('checked', true);
    }

    const offActionFromExternal = function() {
      $(readySwitch).find('input[type="checkbox"]').prop('checked', false);
    }

    const doGetState = function(){
      let state = $(readySwitch).find('input[type="checkbox"]').prop('checked');
      return state;
    }

    const init = function(onAction, offAction) {
      let switchBox = $('<div></div>');
  		let toggleSwitch = $('<label class="switch"></label>');
  		let input = $('<input type="checkbox">');
  		let slider = $('<span class="slider"></span>');
  		$(toggleSwitch).append($(input));
  		$(toggleSwitch).append($(slider));
  		$(input).on('click', (evt)=>{
  			let isOn = $(input).prop('checked');
  			if (isOn) {
  				onAction();
  			} else {
          offAction();
  			}
  		});
      $(toggleSwitch).appendTo($(switchBox));
      return $(switchBox);
    }

    /*
    pluginOption {
      onActionCallback
      offActionCallback
    }

    */

    const readySwitch = init(settings.onActionCallback, settings.offActionCallback);
    this.append($(readySwitch));

    /* public method of plugin */
    var output = {
      settings: $this.settings,
      readySwitch: readySwitch,
      onAction: onActionFromExternal,
      offAction: offActionFromExternal,
      getState: doGetState
    }

    return output;

  };
}( jQuery ));
