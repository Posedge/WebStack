/**
* Some Paramater that can be set...
*/
	//The maximum width and height of the preview in percentage to the whole plugin
	var prevWPercentage=0.8;
	var prevHPercentage=0.45;
	var showDelayed = false;
	var stopHide = false;
/**
* calculates the position where the preview should be, tries to fit the div with a size given by 
* the two variables prevWPercentage and prevHPercentage, if it doesn't succeed it makes a smaller
* div...
* 
* @param 'mousePosition' current Position of the mouse in reference to the whole document
*													consists of x and y coordinate 
*/
function previewPos(mousePosition){
	var w = $(window).width();
	var h = $(window).height();
	var left, top;
	var width, height;

	//Calculate the left offset and the width
	if(mousePosition[0] <= 0.5 * w){
		//Mouse in the left side of the plugin -> put preview to the right
		left=mousePosition[0];		
		if((w-left) > prevWPercentage*w)
			width = prevWPercentage*w;
		else
			width = (w-left);
	}	
	else{
		if(mousePosition[0] > prevWPercentage*w)
			width = prevWPercentage*w;
		else
			width = mousePosition[0];
		left = mousePosition[0]-width;
	}

	//Calculate the top offset and the height
	if(mousePosition[1] <= 0.5 * h){
		//Mouse in the upper part of the plugin -> put preview below
		top=mousePosition[1];
		if((h-top) > prevHPercentage*h)
			height = prevHPercentage*h;
		else
			height = (h-top);
	}	
	else{
		if(mousePosition[1] > prevHPercentage*h)
			height = prevHPercentage*h;
		else
			height = mousePosition[1];
		top = mousePosition[1]-height;
	}

	//Put the preview div in position...
	$('#preview').css('left', left);
	$('#preview').css('top', top);
	$('#preview').css('width', width);
	$('#preview').css('height', height);
	$('#previewCanvas').css('width', width);
	$('#previewCanvas').css('height', height);
	$('#preview-frame').css('width', width*5);
	$('#preview-frame').css('height', height*5);
	$('#preview-frame').css('transform','scale(0.2)');	
	//And make it visible...
	$('#preview').fadeIn(1000);
}

/**
* Shows the fixed image if the full preview doesn't work...
*/
function prevShowAlt(tab){
	chrome.tabs.captureVisibleTab(function f(dataURL){
		$('#preview-frame').hide();
		var canvas = document.getElementById('previewCanvas');
		var context = canvas.getContext('2d');
		// load image from data url
		var imageObj = new Image();
		imageObj.onload = function() {
			context.drawImage(this,0,0,imageObj.width,imageObj.height,0,0,canvas.width,canvas.height);
		};
		imageObj.src = dataURL;
});
}
