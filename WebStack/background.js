
// key listeners
chrome.commands.onCommand.addListener(function(cmd){
  switch(cmd){
    case "push-tabs":
      push();
      break;
    case "pop-tabs":
      pop();
      break;
    default:
      console.log("Unknown command: " + cmd);
  }
});

// communication with the popup
var port;

/**
 * For communication with the popup we have to use messages.
 * Handle them here.
 */
chrome.extension.onConnect.addListener(function(port) {
  window.port = port;
  port.onMessage.addListener(function(msg) {
    switch(msg.type){
      case "push":
        push();
        break;
      case "pop":
        pop();
        break;
      case "setup-stack":
        getStack(function(stack){
          sendToPopup({type: "render-stack", stack: stack});
        });
        break;
      case "set-stack":
        setStack(msg.stack);
        break;
      case "rebuild-stack": 
        rebuildStack(msg.framesArray, msg.tabsArrays, msg.dropAreaArray);
        break;
      case "pop-tab":
        popTab(msg.frame, msg.tab);
        break;
      case "drop-tab":
        dropTab(msg.frame, msg.tab);
        break;
      default:
        console.log("Unknown message type: " + msg.type);
				console.log(msg);
    }
  });
  port.onDisconnect.addListener(function(){window.port = undefined;});
});

/**
 * Send a message to the popup.
 */
function sendToPopup(object){
  port.postMessage(object);
}

/**
 * If a connection to the popup is established, send a message.
 */
function trySendToPopup(object){
	if (port !== undefined) sendToPopup(object);
}
