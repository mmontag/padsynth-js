function StepDraw(canvasId, backgroundColor, foregroundColor, array, arrayLength, callback) {
	this.render = this.render.bind(this);
	this.onMousedown = this.onMousedown.bind(this);
	this.onMousemove = this.onMousemove.bind(this);
	this.onMouseup = this.onMouseup.bind(this);
	this.backgroundColor = this.hexToRgb(backgroundColor);
	this.foregroundColor = this.hexToRgb(foregroundColor);
	this.canvas = document.getElementById(canvasId);
	this.width = this.canvas.clientWidth;
	this.height = this.canvas.clientHeight;
	this.margin = 4;
	this.canvas.width = this.width * 2;
	this.canvas.height = this.height * 2;
	this.ctx = this.canvas.getContext("2d");
	this.ctx.translate(0, this.canvas.height);
	this.ctx.scale(2, -2);
	this.dragging = false;
	this.drawline = false;
	this.callback = callback;
	this.startPoint = { bin: null, y: null };
	this.length = arrayLength;
	this.canvas.addEventListener("mousedown", this.onMousedown);
	this.setArray(array);
	this.createLCDMatrixPattern();
	this.render();
}

StepDraw.prototype.createLCDMatrixPattern = function() {
	var r = this.foregroundColor.r;
	var g = this.foregroundColor.g;
	var b = this.foregroundColor.b;
	var imageData = new ImageData(new Uint8ClampedArray([ r,g,b,255, r,g,b,200, r,g,b,64, r,g,b,200 ]), 2, 2);
	var self = this;
	createImageBitmap(imageData).then(function(imageBitmap) {
		self.lcdMask = self.ctx.createPattern(imageBitmap, "repeat");
	});
};

StepDraw.prototype.hexToRgb = function(hex) {
	var r = (hex >> 16) & 255;
	var g = (hex >> 8) & 255;
	var b = hex & 255;
	return { r: r, g: g, b: b };
};

StepDraw.prototype.rgbToCss = function(rgb) {
	return "rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ")";
};

StepDraw.prototype.onMousedown = function (e) {
	var self = this;
	this.dragging = true;

	// Attach event listeners to document so that we capture mouse drags outside of canvas
	document.addEventListener("mousemove", this.onMousemove);
	document.addEventListener("mouseup", function onMouseup() {
		document.removeEventListener("mousemove", self.onMousemove);
		document.removeEventListener("mouseup", onMouseup);
	});

	if (e.shiftKey) {
		var rect = this.canvas.getBoundingClientRect();
		var bin = Math.floor((e.clientX - rect.left) / this.width * this.array.length);
		this.drawline = true;
		this.startPoint = { bin: bin, y: Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / this.height))};
		this.oldArray = this.array.slice();
	} else {
		this.drawline = false;
	}

	this.onMousemove(e);
};

StepDraw.prototype.onMousemove = function (e) {
	if (this.dragging) {
		var val, rect = this.canvas.getBoundingClientRect();
		var bin = Math.floor((e.clientX - rect.left) / this.width * this.array.length);
		if (this.drawline === true) {
			var mousePoint = { bin: bin, y: Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / this.height)) };
			var startPoint, endPoint;
			if (mousePoint.bin < this.startPoint.bin) {
				startPoint = mousePoint; endPoint = this.startPoint;
			} else {
				startPoint = this.startPoint; endPoint = mousePoint;
			}
			var len = endPoint.bin - startPoint.bin;
			this.array = this.oldArray.slice();
			for (var i = 0; i <= len; i++) {
				val = len === 0 ? mousePoint.y : startPoint.y + (endPoint.y - startPoint.y) * i / len;
				val = Math.round(val * 1000) / 1000;
				this.array[startPoint.bin + i] = val;
			}
		} else {
			bin = Math.max(0, Math.min(bin, this.array.length - 1));
			val = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / this.height));
			val = Math.round(val * 1000) / 1000;
			this.array[bin] = val;
		}
		if (this.callback) {
			this.callback(this.array);
		}
		this.render();
	}
};

StepDraw.prototype.onMouseup = function (e) {
	this.dragging = false;
};

StepDraw.prototype.setArray = function (array) {
	this.array = array.slice();
	// Zero-pad if necessary
	for (var i = this.array.length; i < this.length; i++) {
		this.array[i] = 0;
	}
	// Truncate if necessary
	this.array.length = this.length;
	this.render();
};

StepDraw.prototype.render = function () {
	this.ctx.fillStyle = this.rgbToCss(this.backgroundColor);
	this.ctx.fillRect(0, 0, this.width, this.height);
	this.ctx.fillStyle = this.lcdMask;
//	this.ctx.fillStyle = this.foregroundColor;
	var barWidth = this.width / this.array.length;
	for (var i = 0; i < this.array.length; i++) {
		var x = i * barWidth;
		var y = 0;
		var w = barWidth;
		var h = this.array[i] * this.height;
		this.ctx.fillRect(x + this.margin / 2, y, w - this.margin / 2, h);
	}
};

module.exports = StepDraw;