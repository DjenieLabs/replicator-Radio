define(['HubLink', 'PropertiesPanel', 'Easy'], function(Hub, PropertiesPanel, easy) {

  var actions = [];
  var inputs = [];
  var Radio = {};

  Radio.getActions = function() {
    return actions;
  };

  Radio.getInputs = function() {
    return inputs;
  };

  // Added for the first time to the side bar
  Radio.onLoad = function(){
    var that = this;
    // Add the missing property required for hub requests.
    this.nodeName = this.name;  

    // Load our properties template and keep it in memory
    this.loadTemplate('properties.html').then(function(template){
      that.propTemplate = template;
    });
  };

  Radio.onClick = function(){
    var that = this;
    // This type of block cannot use normal block's API calls.
    // we need to use custom requests to obtain and save its settings.
    return getSettings.call(this, 5).then(function(settings){
      // TODO: Removing custom object until implemented
      that._orgSettings = $.extend(true, {}, settings);
      console.log("Settings: ", settings);
      renderSettings.call(that, settings);
    }).catch(function(err){
      console.log("Error reading settings: ", err);
    });
  };

  /**
   * Intercepts the properties panel save action.
   * You must call the save method directly for the
   * new values to be sent to hardware blocks.
   * @param settings is an object with the values
   * of the elements rendered in the interface.
   * NOTE: For the settings object to contain anything
   * you MUST have rendered the panel using standard
   * ways (easy.showBaseSettings and easy.renderCustomSettings)
   */
  Radio.onSaveProperties = function(settings){
    console.log("Saving: ", settings);
    // settings.Custom = this._orgSettings;
    this.settings = settings;
    setSettings.call(this, 10).then(function(res){
      console.log("Settings saved: ", res);
    }).catch(function(err){
      console.log("Couldn't save settings: ", err);
    });
  };

  /**
   * Loads the interface controllers into the properties panel
   */
  function renderSettings(settings){
    // Remove default event mode from basic structure
    // since radios use a different type of modes.
    var mode = settings.EventMode;
    delete settings.EventMode;

    // available to hardware blocks
    easy.showBaseSettings(this, settings);

    var objs = [];
    for(var key in settings.Custom){
      if(typeof(settings.Custom[key]) === 'number'){
        var obj = {name: unpascal(key), value: settings.Custom[key], property: "Custom."+key};
        if(obj.value < 2){
          if(obj.value == 1){
            obj.selected = true;
          }else{
            delete obj.value;
          }
        }else{
          obj.numeric = true;
          if(key == 'RadioChannel'){
            obj.disabled = 'disabled';
          }
        }
        objs.push(obj);
      }
    }


      var evtModes = {
        property: 'EventMode',
        items: [
          { name: "Slave Message", value: 1, selected: (mode & 1)?true:false },
          { name: "Radio Message", value: 2, selected: (mode & 2)?true:false }
        ]
      };

      // Render the template
      var html = $(this.propTemplate({element: objs, event_modes: evtModes}));
      // Init Semantic-UI components
      html.find(".checkbox").checkbox();
      html.find(".dropdown").dropdown();

      // Display elements
      easy.displayCustomSettings(html);
  }

  function unpascal(str){
    return str.replace(/(?:^|\.?)([A-Z])/g, function (x,y){return " " + y;}).replace(/^_/, "");
  }

  function setSettings(retries){
    var that = this;
    var attempt = 0;
    retries = retries || 0;
    if(!PropertiesPanel.isLoadingWithText()){
      PropertiesPanel.loading("Saving Settings...");
    }
    return new Promise(function (resolve, reject) {
      var loadNow = function(){
        return Hub.request('node:saveSettings', that).then(function(res){
          if(res.success){
            PropertiesPanel.stopLoading();
            PropertiesPanel.unlock();
            resolve(res.data);
          }
        }).catch(function(err){
          if(attempt++ < retries){
            console.log("Couldn't load the radio's settings, trying again...");
            return setTimeout(loadNow, 500);
          }else{
            if(err.message){
              PropertiesPanel.lockWithMessage(err.message);
            }else if(typeof(err.data) === 'string'){
              PropertiesPanel.lockWithMessage(err.data);
            }else{
              PropertiesPanel.lockWithMessage(err);
            }
            reject(err);
          }
        });  
      };
          
      loadNow();
    });
  }
  
  // Helper method to read the properties from the radio
  function getSettings(retries){
    var that = this;
    var attempt = 0;
    retries = retries || 0;
    if(!PropertiesPanel.isLoadingWithText()){
      PropertiesPanel.loading("Loading Settings...");
    }
    return new Promise(function (resolve, reject) {
      var loadNow = function(){
        return Hub.request('node:readSettings', that).then(function(res){
          if(res.success){
            PropertiesPanel.stopLoading();
            PropertiesPanel.unlock();
            resolve(res.data);
          }
        }).catch(function(err){
          if(attempt++ < retries){
            console.log("Couldn't load the radio's settings, trying again...");
            return setTimeout(loadNow, 500);
          }else{
            if(err.message){
              PropertiesPanel.lockWithMessage(err.message);
            }else{
              PropertiesPanel.lockWithMessage(err);
            }
            reject(err);
          }
        });  
      };
          
      loadNow();
    });
  }

  return Radio;

});
