//Runs in background

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
function TabObject(id, url, title, favUrl){
	this.id = id;
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
function parseTabId(string, prefix){
	if(prefix === undefined)
		prefix = "container";	
  if(string.substring(0, prefix.length) !== prefix)
		return null; // only parse container objects
	var id = string.split("-");
	if(id.length != 5 || id[0] !== prefix || id[1] !== "frame" || id[3] !== "tab"){
		console.log("WebStack: Reorder failure!");
		return;
	}
	return [parseInt(id[2]), parseInt(id[4])];
}
/**
 * Replace the stack with a new one, with the new order passed through the array parameters.
 */
function rebuildStack(framesArray, tabsArrays, dropAreaArray){
  /**
   * Parse string with the html id of the tab element, and return an array with the frame and tab index.
   */

  // re-build stack in new order.
  getStack(function(stack){
    var newFrames = [];
    for (var i = 0; i < framesArray.length; i++){
      // again, reverse order because the first element in the html is the top of the stack
      var tabsArray = tabsArrays[i];

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
    for(var i = 0; i < dropAreaArray.length; i++){
        var indices = parseTabId(dropAreaArray[i]);
        if (indices === null) continue;
        var f = indices[0]; var t = indices[1];
        newFrames.push(new Frame([stack.frames[f].tabObjects[t]]));
        break;
    }

    var newStack = new Stack(newFrames);
    setStack(newStack);
    sendToPopup({type: "render-stack", stack: newStack}); // re-rendering wouldn't be necessary, but for now I will leave this in here to catch bugs if the order was wrong.
    
    // badge
    updateBadge(newStack);
  });
};

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
		bkg.console.log(tabs);
    tabObjects = tabs.map(function(tab){
      return new TabObject(tab.id, tab.url, tab.title, tab.favIconUrl);
    });

    // place on stack
    getStack(function(stack){
      // Note: "frame" refers to a set of tabs which you move from the current window to the stack and vice versa.
      // Not the best name, I know.
      frame = new Frame(tabObjects);
      stack.frames.push(frame);
      setStack(stack, function(){
        trySendToPopup({type: "render-stack", stack: stack});

        // open a new tab so that the window is not closed
        chrome.tabs.create({});

        // close all other tabs
        var allTabIds = allTabs.map(function(tab){return tab.id;});
        chrome.tabs.remove(allTabIds);
      });

      // badge
      updateBadge(stack);
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
      
      // update stack object
      setStack(stack, function(){
        trySendToPopup({type: "render-stack", stack: stack});

        // close empty tabs
        var emptyTabIds = emptyTabs.map(function(tab){return tab.id;});
        chrome.tabs.remove(emptyTabIds);
      });

      // badge
      updateBadge(stack);
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
      sendToPopup({type: "render-stack", stack: stack});
      if (callback !== undefined) callback();
    })
    
    // badge
    updateBadge(stack);
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
	chrome.storage.local.remove("pictures");
  chrome.storage.sync.remove("stack");
}

/**
 * Update chrome badge to display number of frames.
 */
function updateBadge(stack){
  chrome.browserAction.setBadgeText({text: stack.frames.length.toString()});
}
