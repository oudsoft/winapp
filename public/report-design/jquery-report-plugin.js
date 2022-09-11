
$.widget( "custom.textelement", {
  options: {
    elementType: 'text',
    type: "static",
    x: 0,
    y: 0,
    width: '140',
    height: '40',
    fontsize: 24,
    fontweight: 'normal',
    fontstyle: 'normal',
    fontalign: 'left'
  },
  _create: function() {
    let $this = this;
    this.element.addClass("ui-widget-content");
    this.element.addClass("reportElement");
    this.element.addClass("textElement");
    this.element.css({
      "left": this.options.x + "px", "top": this.options.y + "px", "width": this.options.width + "px", "height": this.options.height + "px",
      "font-size": this.options.fontsize + 'px',
      "font-weight": this.options.fontweight,
      "font-style": this.options.fontstyle,
      "text-align": this.options.fontalign
    });
    this.element.text(this.options.title);
    this.element.draggable({
      containment: "parent",
      stop: function(e) {
        $this._setOption("x", e.target.offsetLeft);
        $this._setOption("y", e.target.offsetTop);
        $this._trigger("elementdrop", null, $this.options);
      }
    });
    this.element.resizable({
      containment: "parent",
      stop: function(e) {
        console.log('stop resize text element on refresh');
        $this._setOption("width", e.target.clientWidth);
        $this._setOption("height", e.target.clientHeight);
        $this.refresh();
        //$this._trigger("elementresizestop", null, $this.options);
        $this.options.elementresizestop(e, $this.options);
        e.preventDefault();
      }
    });
    this.element.on('click', function(e, ui) {
      $this._trigger("elementselect", null, $this.options);
    });
  },
  _setOption: function( key, value ) {
    this.options[key] = value;
    this._super( key, value );
  },
  _setOptions: function( options ) {
    this._super( options );
    this.refresh();
  },
  refresh: function() {
    //console.log('refresh called.');
    //console.log(arguments.callee.caller.toString());
    let $this = this;
    this.element.resizable('destroy');
    this.element.text(this.options.title);
    this.element.css({"left": this.options.x + "px", "top": this.options.y + "px", "width": this.options.width + "px", "height": this.options.height + "px"});
    this.element.css({"font-size": this.options.fontsize + "px"});
    this.element.css({"font-weight": this.options.fontweight});
    this.element.css({"font-style": this.options.fontstyle});
    this.element.css({"text-align": this.options.fontalign});

    this.element.resizable({
      containment: "parent",
      stop: function(e) {
        console.log('stop resize text element on refresh');
        $this._setOption("width", e.target.clientWidth);
        $this._setOption("height", e.target.clientHeight);
        $this.refresh();
        //$this._trigger("elementresizestop", null, $this.options);
        $this.options.elementresizestop(e, $this.options);
        e.preventDefault();
      }
    });

  }
});

$.widget( "custom.hrelement", {
  options: {
    elementType: 'hr',
    x: 0,
    y: 0,
    width: '100%',
    height: '20',
    border: "1px solid black;",
  },
  _create: function() {
    let $this = this;
    this.element.addClass("reportElement");
    this.element.addClass("hrElement");
    this.element.css({"left": this.options.x + "px", "top": this.options.y + "px", "width": this.options.width, "height": this.options.height + "px"});
    $(this.element > "hr").css({"border": this.options.border});
    this.element.draggable({
      containment: "parent",
      stop: function(e) {
        $this._setOption("x", e.target.offsetLeft);
        $this._setOption("y", e.target.offsetTop);
        $this._trigger("elementdrop", null, $this.options);
      }
    });
    this.element.resizable({
      containment: "parent",
      stop: function(e) {
        //console.log(e);
        console.log('stop resize hr element');
        $this._setOption("width", e.target.clientWidth);
        $this._setOption("height", e.target.clientHeight);
        $this.refresh();
        $this._trigger("elementresizestop", null, $this.options);
      }
    });
    this.element.on('click', function(event) {
      //console.log(event);
      $this._trigger("elementselect", null, $this.options);
    });
  },
  _setOption: function( key, value ) {
    this.options[key] = value;
    this._super( key, value );
  },
  _setOptions: function( options ) {
    this._super( options );
    this.refresh();
  },
  refresh: function() {
    this.element.css({"left": this.options.x + "px", "top": this.options.y + "px", "width": this.options.width + "px", "height": this.options.height + "px"});
  }
});

$.widget( "custom.imageelement", {
  options: {
    elementType: 'image',
    x: 0,
    y: 0,
    width: '100',
    height: '80'
  },
  _create: function() {
    let $this = this;
    this.element.addClass("reportElement");
    this.element.addClass("imageElement");
    let newImage = new Image();
    newImage.src = this.options.url;
    newImage.setAttribute("width", this.options.width);
    this.element.append(newImage);
    this.element.css({"left": this.options.x + "px", "top": this.options.y + "px", "width": this.options.width, "height": "auto"});
    this.element.draggable({
      containment: "parent",
      stop: function(e) {
        $this._setOption("x", e.target.offsetLeft);
        $this._setOption("y", e.target.offsetTop);
        $this._trigger("elementdrop", null, $this.options);
      }
    });
    this.element.resizable({
      containment: "parent",
      stop: function(e) {
        //console.log(e);
        console.log('stop resize image element');
        $this._setOption("width", e.target.clientWidth);
        $this._setOption("height", e.target.clientHeight);
        $this.refresh();
        $this._trigger("elementresizestop", null, $this.options);
      }
    });
    this.element.on('click', function(event) {
      //console.log(event);
      $this._trigger("elementselect", null, $this.options);
    });
  },
  _setOption: function( key, value ) {
    this.options[key] = value;
    this._super( key, value );
  },
  _setOptions: function( options ) {
    this._super( options );
    this.refresh();
  },
  refresh: function() {
    let $this = this;
    this.element.resizable('destroy');
    this.element.empty();
    let newImage = new Image();
    newImage.src = this.options.url;
    newImage.setAttribute("width", this.options.width);
    this.element.append(newImage);
    this.element.css({"left": this.options.x + "px", "top": this.options.y + "px", "width": this.options.width, "height": "auto"});
    this.element.resizable({
      containment: "parent",
      stop: function(e) {
        $this._setOption("width", e.target.clientWidth);
        $this._setOption("height", e.target.clientHeight);
        $this.refresh();
        $this._trigger("elementresizestop", null, $this.options);
      }
    });
  }
});
