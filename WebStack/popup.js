

/**
 * Update html of the stack object from the stack parameter.
 * Update badge on the extension icon.
 * Also update jquery bindings for dragging tabs, frames and the drop area and for the pop/close buttons on the tabs.
 */
function renderStack(stack){
  // stack element html
  var elementContent = ""; 
  // draw stack in reverse order as the last element represents the top
  for(var i = stack.frames.length - 1; i >= 0; i--){
    frame = stack.frames[i];
    elementContent += '<div class="stack-frame" id="frame-' + i + '">';
    for(var j = 0; j < frame.tabObjects.length; j++){
      tab = frame.tabObjects[j];
      
      // add container
      var containerId = 'container-frame-' + i + '-tab-' + j;
      elementContent += '<div class="tab-favicon-container" id="' + containerId + '" title="' + tab.title + '">';

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
    port.postMessage({type: "pop-tab", frame: fields[2], tab: fields[4]});
  });
  $(".tab-close-button").click(function(){
    var id = $(this).attr("id");
    var fields = id.split("-");
    port.postMessage({type: "drop-tab", frame: fields[2], tab: fields[4]});
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
 * Read frames and tabs, and pass them to background.js to update the stack with them,
 * and clear drop area.
 * Called, when the user changes the order of the frames or tabs (through drag-and-drop).
 */
function rebuildStackFromHtml(){
  var framesArray = $("#stack").sortable("toArray");
  var tabsArrays = framesArray.map(function(frame){
    return $("#" + frame).sortable("toArray");
  }).reverse(); // reverse because the last frame representing the top is the first object in the DOM
  var dropAreaArray = $("#drop-area").sortable("toArray");

  // re-build stack in new order.
  port.postMessage({type: "rebuild-stack", framesArray: framesArray, tabsArrays: tabsArrays, dropAreaArray: dropAreaArray});

  // clear drop area
  $("#drop-area").html("");
}

var port;

/**
 * Communication with the background script.
 */
document.addEventListener('DOMContentLoaded', function(){
  port = chrome.extension.connect({name: "Default Communication"});
  port.onMessage.addListener(function(msg) {
    switch(msg.type){
      case "render-stack":
        renderStack(msg.stack);
        break;
      default:
        console.log("Unknown message type: " + msg.type);
    }
  });

  // draw stack
  port.postMessage({type: "setup-stack"});

  // event listeners
  $("#push-button").click(function(){
    port.postMessage({type: "push"});
  });
  $("#pop-button").click(function(){
    port.postMessage({type: "pop"});
  });
});


