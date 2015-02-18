/**
 * Get stack object and call callback with it.
 * If there is none, create new stack.
 */
function getStack(callback){
  chrome.storage.sync.get({stack: null}, function(result){
    stack = result.stack === null ? {frames: []} : result.stack;
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
    elementContent += '<div class="stack-frame">';
    for(var j = 0; j < frame.tabObjects.length; j++){
      elementContent += '<div class="tab-favicon-container" title="' + frame.tabObjects[j].title + '"><img class="tab-favicon-img" src="' + frame.tabObjects[j].favUrl + '" alt="' + frame.tabObjects[j].title + '" /></div>';
    }
    elementContent += '</div>';
  }
  
  $("#stack").html(elementContent);
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
      return {
        url: tab.url,
        title: tab.title,
        favUrl: tab.favIconUrl
      }
    });

    // place on stack
    getStack(function(stack){
      // Note: "frame" refers to a set of tabs which you move from the current window to the stack and vice versa.
      // Not the best name, I know.
      frame = {
        tabObjects: tabObjects 
      }
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
      frame = stack.frames.pop();
      
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
 * Delete the stack. As of now, only for debugging purposes.
 */
function del(){
  chrome.storage.sync.remove("stack");
}

document.addEventListener('DOMContentLoaded', function(){
  getStack(function(stack){renderStack(stack);});
  $("#push-button").click(push);
  $("#pop-button").click(pop);
});

