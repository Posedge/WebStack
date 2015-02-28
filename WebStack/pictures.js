//Background part of the preview mechanism

/**
 * Just used to see something happen, remove me!
 */
var bkg = chrome.extension.getBackgroundPage();
bkg.console.log('foo');

/**
 * Constructor for the picture object
 */ 
function picture(tabid, dataURI, title){
	this.tabid = tabid;
	this.dataURI = dataURI;
	this.title = title;
}
/**
 * Get's the stuff from the storage and calls callback with it..
 */
function getPictures(callback){
	chrome.storage.local.get({pictures: null}, function(result){
		pictures = result.pictures == null ? [] : result.pictures;
		callback(pictures);
	});
}
/**
 * Add a listener which takes pictures of the tabs and saves them in the storage
 */
chrome.tabs.onUpdated.addListener(function(tabid, obj, tab){
	var options = {quality:0};
	if(tab.status == "complete" && !tab.pinned){
		var title = tab.title;
		//TODO: Error handling? What if failed to take picture 
		//      (as it occures sometimes with new tab...)
		chrome.tabs.captureVisibleTab(options, function(img){
			//if(document.getElementById('previewCanvas'))
			//	document.body.removeChild(document.getElementById('previewCanvas'));
			//bkg.console.log(img);	
			//var myC = document.createElement("canvas");
			//myC.setAttribute("id", "previewCanvas");
			//myC.setAttribute("style","width:20px;height:20px");
			//document.body.appendChild(myC);
			//var canvas = document.getElementById('previewCanvas');
			//var context = canvas.getContext('2d');
			// load image from data url
			//var imageObj = new Image();
			//imageObj.onload = function() {
			//imageObj.src = img;
			//context.drawImage(imageObj,0,0);

			//Do this dynamically according to the img size...
			//context.scale(0.2,0.2);				
			//bkg.console.log(canvas.toDataURL());

			//get the pictures array from the storage and do something with it...
			//TODO: no image gets deleted ever! -> Do this when tab gets closed!
			//TODO: Error handling? What if storage is full? (>5MB) What if failed to add??
			pictures = getPictures(function(pictures){
				pictures[tabid]=new picture(tabid, img, title);
				//bkg.console.log(pictures);
				chrome.storage.local.set({pictures: pictures});
				});
			});
		}
});
