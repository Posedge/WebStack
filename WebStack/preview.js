/**
* Some Paramater that can be set...
*/
	//The maximum width and height of the preview in percentage to the whole plugin
	var prevWPercentage=0.9;
	var prevHPercentage=0.8;
	var previewEnabled = true;
	var previewDelay = 1000;
	var prevAbove = false;
/**
* calculates the position where the preview should be, tries to fit the div with a size given by 
* the two variables prevWPercentage and prevHPercentage, if it doesn't succeed it makes a smaller
* div...
*/
function previewPos(e, obj){
	var w = $(window).width();
	var h = $(window).height();
	var left, top;
	var width, height;
	var offset = $(obj).offset();
	//Calculate the left offset and the width
	if(offset.left+$(obj).width()*0.5 <= 0.5 * w){
		//Div in the left side of the popup -> put preview to the right
		left=offset.left;		
		if((w-left) > prevWPercentage*w)
			width = prevWPercentage*w;
		else
			width = (w-left);
	}	
	else{
		//Div in the right side of the popup -> put preview to the left side
		if(offset.left > prevWPercentage*w)
			width = prevWPercentage*w;
		else
			width = offset.left+$(obj).width();
		left = offset.left+$(obj).width()-width;
	}
	//Calculate the top offset and the height
	if(offset.top+$(obj).height()*0.5 <= 0.5 * h){
		//Div in the upper part of the popup -> put preview below
		prevAbove=false;
		top=offset.top + $(obj).height();
		if((h-top) > prevHPercentage*h)
			height = prevHPercentage*h;
		else
			height = (h-top);
	}	
	else{
		//Div in the lower part of the popup -> put preview above
		prevAbove=true;
		if(offset.top > prevHPercentage*h)
			height = prevHPercentage*h;
		else
			height = offset.top + $(obj).height();
		top = offset.top - height;
	}

	//Put the preview div in position...
	$('#preview').css('left', left);
	console.log("set top:"+top);
	$('#preview').css('top', top);
	$('#preview').css('width', width);
	$('#preview').css('height', height);
	$('#previewCanvas').css('width', width);
	$('#previewCanvas').css('height', height);
	//And make it visible...
//	$('#preview').fadeIn(1000);
}

/**
* Shows the fixed image if the full preview doesn't work...
*/
function prevShowAlt(){
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
/**
 * Draws an image into the canvas
 * @param picture : This is the picture object defined in pictures.js
 */
function drawPicture(picture){
		/*
		 * Note:since this is a canvas and it's not directly created and edited
		 * in the DOM we cannot use jQuery, so use standard Javascipt here!
		*/
		var canvas = document.getElementById('previewCanvas');
		var context = canvas.getContext('2d');
		canvas.width = $(canvas).width()
		canvas.height = $(canvas).height();
		var initialHeight = canvas.height;
		var initialTop = $('#preview').css('top');
		initialTop = initialTop.replace('px', '');

		//Clear the Canvas
		context.clearRect(0, 0, canvas.width, canvas.height);

		// load image from data url
		var imageObj = new Image();
		imageObj.src = picture.dataURI;

		//Adjust the height and width according to the ratio of the image
		//Calculate the ratio
		var qImage = imageObj.width/imageObj.height;
		var qCanvas = canvas.width/canvas.height;
		if(qImage < qCanvas){//Make width smaller...
			canvas.width=qImage*canvas.height;
			}
		else{//Make height smaller
			canvas.height=(1/qImage)*canvas.width;
			if(prevAbove){
				var heightDiff=initialHeight-canvas.height;
				$('#preview').css('top',parseInt(initialTop)+heightDiff);
				}
			}

		//Draw the image
		context.drawImage(imageObj,0,0,imageObj.width,imageObj.height,0,0,canvas.width,canvas.height);
		
		//Add some Text to the canvas
		var w = context.measureText(picture.title).width+30;
		var h = 20;
		context.fillStyle='#FFF';
		context.fillRect(0,canvas.height-15,w,h);	
		context.fillStyle='#000';
		context.font="10px Arial";
		context.fillText(picture.title,20,canvas.height-5);
		
		//set the style attributes to the new dimension...
		$(canvas).css('width', canvas.width);
		$(canvas).css('height', canvas.height);
		$('#preview').css('width', canvas.width);
		$('#preview').css('height', canvas.height);
}
