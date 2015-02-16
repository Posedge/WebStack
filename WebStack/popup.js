/**
 * Get stack object and call callback with it.
 * If there is none, create new stack.
 */
function getStack(callback){
  chrome.storage.sync.get({'stack': null}, function(result){
    stack = result.stack === null ? {frames: []} : result.stack;
    callback(stack);
  });
}

/**
 * Update stack object, then call callback.
 */
function setStack(stack, callback){
  chrome.storage.sync.set({"stack": stack}, callback);
}

function renderStack(stack){
  var elementContent = ""; // stack element in html
  // draw stack in reverse order as the last element represents the top
  for(var i = stack.frames.length - 1; i >= 0; i--){
    frame = stack.frames[i];
    elementContent += "<div class=\"stack-frame\">";
    for(var j = 0; j < frame.tabs.length; j++){
      elementContent += frame.tabs[j] + "<br>";
    }
    elementContent += "</div>";
  }
  
  $("#stack").html(elementContent);
}

/**
 * Push all opened and non-pinned tabs in this window to our stack. // TODO and close them
 */
function push(){
  // get tabs
  var queryInfo = {
    pinned: false,
    currentWindow: true
  }
  chrome.tabs.query(queryInfo, function(tabs){
    urls = tabs.map(function(tab){
      return tab.url;
    });
    // place on stack
    getStack(function(stack){
      frame = {
        tabs: urls 
      }
      stack.frames.push(frame);
      setStack(stack, function(){
        renderStack(stack);
      });
    });
  });  
}

/**
 * Pop last stack frame, and place tabs in current window.
 */
function pop(){
  getStack(function(stack){
    frame = stack.frames.pop();

    // open tabs
    for(var i = 0; i < frame.tabs.length; i++){
      chrome.tabs.create({url: frame.tabs[i], active: false, selected: false});
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

