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
  chrome.tabs.query(queryInfo, function(tabs){
    // if no tab is opened, do not do anything
    if (tabs.length === 0) return;

    // create objects for each tab, containing url, title, and favicon
    tabObjects = tabs.map(function(tab){
      return {
        url: tab.url,
        title: tab.title,
        favUrl: tab.favIconUrl
      }
    });

    // place on stack
    getStack(function(stack){
      frame = {
        tabObjects: tabObjects 
      }
      stack.frames.push(frame);
      setStack(stack, function(){
        renderStack(stack);
      });
    });

    // close tabs
    tabs.forEach(function(tab){
      chrome.tabs.remove(tab.id);
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
    frame = stack.frames.pop();
    
    // open tabs
    for(var i = 0; i < frame.tabObjects.length; i++){
      chrome.tabs.create({url: frame.tabObjects[i].url, active: false, selected: false});
    }
    
    // update stack object
    setStack(stack, function(){
      renderStack(stack);
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

