/**
 * Get stack object and call callback with it.
 * If there is none, create new stack.
 */
function getStack(callback){
  chrome.storage.sync.get({stack: null}, function(result){
    stack = result.stack === null ? new Stack([]) : result.stack;
    callback(stack);
  });
}

/**
 * Update stack object, then call callback.
 */
function setStack(stack, callback){
  chrome.storage.sync.set({stack: stack}, callback);
}

function renderStack(stack){
  var elementContent = ""; // stack element in html
  // draw stack in reverse order as the last element represents the top
  for(var i = stack.frames.length - 1; i >= 0; i--){
    frame = stack.frames[i];
    elementContent += '<div class="stack-frame" id="frame-' + i + '">';
    for(var j = 0; j < frame.tabObjects.length; j++){
      tab = frame.tabObjects[j];
      
      // add container
      var containerId = 'container-frame-' + i + '-tab-' + j;
      elementContent += '<div class="tab-favicon-container" id="' + containerId + '" title="' + tab.title + '" id="frame-' + i + '-tab-' + j + '">';

      // add close and pop button
      var closeId = 'close-frame-' + i + '-tab-' + j;
      var popId = 'pop-frame-' + i + '-tab-' + j;
      elementContent += '<div class="tab-close-button" id="' + closeId + '"></div>';
      elementContent += '<div class="tab-pop-button" id="' + popId + '"></div>';

      // add image
      elementContent += '<img class="tab-favicon-img" src="' + tab.favUrl + '" alt="' + tab.title + '" />';

      elementContent += '</div>';
    };
    elementContent += '</div>';
  }

  $("#stack").html(elementContent);

  // show pop/close buttons only on mouse over
  $(".tab-close-button, .tab-pop-button").hide(0);
  $(".tab-favicon-container").hover(function(){
    $(this).find(".tab-close-button, .tab-pop-button").show(0);
  }, function(){
    $(this).find(".tab-close-button, .tab-pop-button").hide(0);
  });

  // pop/close buttons functionality
  $(".tab-pop-button").click(function(){
    var id = $(this).attr("id");
    var fields = id.split("-"); // maybe add some type of check for the format of the id here?
    popTab(fields[2], fields[4]);
  });
  $(".tab-close-button").click(function(){
    var id = $(this).attr("id");
    var fields = id.split("-");
    dropTab(fields[2], fields[4]);
  });

  $("#drop-area").hide(0); // hide drop area

  // these have to be updated (set to sortable) when the stack is rendered, because their content often changes.
  $("#stack").sortable({
    update: rebuildStackFromHtml
  });
  $(".stack-frame").sortable({
    connectWith: ".stack-frame, #drop-area",
    stop: rebuildStackFromHtml,
    start: function(){$("#drop-area").show(0);}
  });
  $("#drop-area").sortable({
    connectWith: ".stack-frame, #drop-area",
    start: function(){$("#drop-area").show(0);}
  });
  $("#drop-area").disableSelection();
  $(".stack-frame").disableSelection();
  $(".tab-favicon-container").disableSelection();
}

/**
 * Constructor for the stack.
 */
function Stack(frames){
  this.frames = frames;
}

/**
 * Constructor for objects to represent a set of tabs ("frame").
 */
function Frame(tabObjects){
  this.tabObjects = tabObjects;
}

/**
 * Constructor for object to represent a tab.
 */
function TabObject(url, title, favUrl){
  this.url = url;
  this.title = title;
  if (favUrl === undefined) {
    // If the tab has not finished loading, there is no favicon Url. In that case we use google shared stuff to get a favicob.
    // Getting the original favicon and replacing it asynchronously would be very elaborate. For now this will do fine
    var hostname = url.match(/:\/\/(.[^/]+)/)[1];
    this.favUrl = "https://www.google.com/s2/favicons?domain=" + hostname;
  } else {
    this.favUrl = favUrl;
  }
}

/**
 * Read frames and tabs, and update them in the stack object.
 * Called, when the user changes the order of the frames or tabs (through drag-and-drop).
 */
function rebuildStackFromHtml(){
  var framesArray = $("#stack").sortable("toArray");

  /**
   * Parse string with the html id of the tab element, and return an array with the frame and tab index.
   */
  function parseTabId(string){
    if(string.substring(0, "container".length) !== "container")
      return null; // only parse container objects
    var id = string.split("-");
    if(id.length != 5 || id[0] !== "container" || id[1] !== "frame" || id[3] !== "tab"){
      console.log("WebStack: Reorder failure!");
      return;
    }
    return [parseInt(id[2]), parseInt(id[4])];
  }

  // re-build stack in new order.
  getStack(function(stack){
    var newFrames = [];
    for (var i = framesArray.length - 1; i >= 0; i--){
      // again, reverse order because the first element in the html is the top of the stack
      var tabsArray = $("#" + framesArray[i]).sortable("toArray");

      var tabObjects = [];
      for (var j = 0; j < tabsArray.length; j++){
        var indices = parseTabId(tabsArray[j]);
        if (indices === null) continue;
        var f = indices[0]; var t = indices[1];
        tabObjects.push(stack.frames[f].tabObjects[t]);
      }

      if(tabObjects.length != 0)
        newFrames.push(new Frame(tabObjects));
    }

    // if something was in the drop area, put it on the stack.
    var dropAreaArray = $("#drop-area").sortable("toArray");
    for(var i = 0; i < dropAreaArray.length; i++){
        var indices = parseTabId(dropAreaArray[i]);
        if (indices === null) continue;
        var f = indices[0]; var t = indices[1];
        newFrames.push(new Frame([stack.frames[f].tabObjects[t]]));
        
        // clear drop area
        $("#drop-area").html("");
        
        break;
    }

    var newStack = new Stack(newFrames);
    setStack(newStack, function(){
      renderStack(newStack); // re-rendering wouldn't be necessary, but for now I will leave this in here in case the order was wrong.
    });
  });
}

/**
 * Push all opened and non-pinned tabs in this window to our stack.
 */
function push(){
  // get tabs
  var queryInfo = {
    pinned: false,
    currentWindow: true
  }
  chrome.tabs.query(queryInfo, function(allTabs){
    function tabIsEmpty(tab){return tab.url === "chrome://newtab/"};

    // if no tab is opened, or all tabs are empty, do not do anything
    if (allTabs.length === 0 || allTabs.every(tabIsEmpty)){
      return;
    }

    // create objects for each tab, containing url, title, and favicon
    tabs = allTabs.filter(function(tab){return !tabIsEmpty(tab)}); // filter out all empty tabs
    tabObjects = tabs.map(function(tab){
      return new TabObject(tab.url, tab.title, tab.favIconUrl);
    });

    // place on stack
    getStack(function(stack){
      // Note: "frame" refers to a set of tabs which you move from the current window to the stack and vice versa.
      // Not the best name, I know.
      frame = new Frame(tabObjects);
      stack.frames.push(frame);
      setStack(stack, function(){
        renderStack(stack);

        // open a new tab so that the window is not closed
        chrome.tabs.create({});

        // close all other tabs
        allTabs.forEach(function(tab){
          chrome.tabs.remove(tab.id);
        });
      });
    });
  });  
}

/**
 * Pop last stack frame, and place tabs in current window.
 */
function pop(){
  getStack(function(stack){
    if (stack.frames.length == 0){
      return; // stack is empty.
    }

    var emptyTabsQueryInfo = {
      pinned: false,
      currentWindow: true,
      url: "chrome://newtab/"
    }
    chrome.tabs.query(emptyTabsQueryInfo, function(emptyTabs){  
      var frame = stack.frames.pop();
      
      // open tabs
      for(var i = 0; i < frame.tabObjects.length; i++){
        chrome.tabs.create({url: frame.tabObjects[i].url, active: false, selected: false});
      }
      
      // close empty tabs
      emptyTabs.forEach(function(tab){
        chrome.tabs.remove(tab.id);
      });
      
      // update stack object
      setStack(stack, function(){
        renderStack(stack);
      });
    });
  });
}

/**
 * Delete a tab (identified by frame and tab number) from the stack, re-draw stack, and call callback function if provided.
 */
function dropTab(frameIndex, tabIndex, callback){
  getStack(function(stack){
    // extract tab from stack
    var frame = stack.frames[frameIndex];
    var tab = frame.tabObjects[tabIndex];
    frame.tabObjects.splice(tabIndex, 1);
    
    // if frame is now empty, remove it
    if (frame.tabObjects.length === 0){
      stack.frames.splice(frameIndex, 1);
    }
    
    // update stack object
    setStack(stack, function(){
      renderStack(stack);
      if (callback !== undefined) callback();
    })
  });
}

/**
 * Open a tab from the stack, and delete it from there.
 */
function popTab(frameIndex, tabIndex){
  getStack(function(stack){
    var tab = stack.frames[frameIndex].tabObjects[tabIndex];
    dropTab(frameIndex, tabIndex, function(){
      // clear empty tabs
      var emptyTabsQueryInfo = {
        pinned: false,
        currentWindow: true,
        url: "chrome://newtab/"
      }
      chrome.tabs.query(emptyTabsQueryInfo, function(emptyTabs){  
        // open tab
        chrome.tabs.create({url: tab.url, active: true, selected: true});

        emptyTabs.forEach(function(tab){
          chrome.tabs.remove(tab.id);
        });
      });
    });
  });
}

/**
 * Delete the stack. As of now, only for debugging purposes.
 */
function del(){
  chrome.storage.sync.remove("stack");
}

document.addEventListener('DOMContentLoaded', function(){
  // draw stack
  getStack(function(stack){renderStack(stack);});

  // event listeners
  $("#push-button").click(push);
  $("#pop-button").click(pop);
});

