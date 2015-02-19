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
    elementContent += '<div class="stack-frame" id="frame-' + i + '">';
    //frame.tabObjects.forEach(function(tab){
    for(var j = 0; j < frame.tabObjects.length; j++){
      tab = frame.tabObjects[j];
      elementContent += '<div class="tab-favicon-container" title="' + tab.title + '" id="frame-' + i + '-tab-' + j + '">';
      elementContent += '<img class="tab-favicon-img" src="' + tab.favUrl + '" alt="' + tab.title + '" />';
      elementContent += '</div>';
    };
    elementContent += '</div>';
  }
  
  $("#stack").html(elementContent);

  $("#stack").sortable({
    update: rebuildStackFromHtml
  });

  $(".stack-frame").sortable({
    connectWith: ".stack-frame",
    //stop: rebuildStackFromHtml,
    update: rebuildStackFromHtml
    /*function(event, ui){
      console.log("sortable-start");
      getStack(function(stack){
        stack.frames.push({tabObjects: []});
        setStack(stack, function(){
          renderStack(stack);
        });
      });
    }*/
  });

  $(".stack-frame").disableSelection();
  $(".tab-favicon-container").disableSelection();
}

/**
 * Read frames and tabs, and update them in the stack object.
 * Called, when the user changes the order of the frames or tabs (through drag-and-drop).
 */
function rebuildStackFromHtml(){
  // TODO for some reason, this is sometimes called TWICE. Fix this (but it works fine though)
  var framesArray = $("#stack").sortable("toArray");

  // re-build stack in new order.
  getStack(function(stack){
    var newFrames = [];
    for (var i = framesArray.length - 1; i >= 0; i--){
      // again, reverse order because the first element in the html is the top of the stack
      var tabsArray = $("#" + framesArray[i]).sortable("toArray");

      var tabObjects = [];
      for (var j = 0; j < tabsArray.length; j++){
        var parsedId = tabsArray[j].split("-");
        if(parsedId.length != 4 || parsedId[0] !== "frame" || parsedId[2] !== "tab"){
          console.log("WebStack: Reorder failure!");
          return;
        }

        var f = parseInt(parsedId[1]);
        var t = parseInt(parsedId[3]);
        tabObjects.push(stack.frames[f].tabObjects[t]);
      }

      if(tabObjects.length != 0)
        newFrames.push({tabObjects: tabObjects});
    }

    var newStack = {frames: newFrames};
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
  // draw stack
  getStack(function(stack){renderStack(stack);});

  // event listeners
  $("#push-button").click(push);
  $("#pop-button").click(pop);
});

