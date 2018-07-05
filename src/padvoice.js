var FFT = require('./fft');
var config = require('./config');
var EnvelopeADSR = require('./envelope-adsr.js');

var PERIOD = config.period;
var BUFFER_SIZE = config.bufferSize;
var SAMPLE_RATE = config.sampleRate;
var WAVETABLE_LENGTH = 2; // seconds
var N = 65536; //SAMPLE_RATE * WAVETABLE_LENGTH;
var MULTISAMPLE_NOTES = [33, 45, 48, 51, 54, 57, 60, 63, 66, 69, 81, 93];
var BASE_FREQUENCIES = MULTISAMPLE_NOTES.map(noteNumToFrequency);
//var BASE_FREQUENCIES = [55, 110, 165, 220, 330, 440, 880, 1760];
var PARAMS = null;
var fft = new FFT(N);
var randomLUT = new Float32Array(N);
for (var i = 0; i < N; i++) {
	randomLUT[i] = Math.random() * 2 * Math.PI;
}

function PADVoice(note, velocity) {
	this.down = true;
	this.note = parseInt(note, 10);
	this.velocity = parseFloat(velocity);
	this.envelope = new EnvelopeADSR(PARAMS.env);
	var frequency = noteNumToFrequency(note);
	this.wavetableIndex = pickNearest(note, MULTISAMPLE_NOTES);
	var baseFrequency = BASE_FREQUENCIES[this.wavetableIndex];
	this.stepSize = frequency / baseFrequency;
	// Start at random point in wavetable
	this.ptrL = Math.floor(Math.random() * N);
	// Stereo by 1/2 wavetable shift
	this.ptrR = (this.ptrL + N / 2) % N;
	//console.log("Note %d with wavetableIndex %d, baseFrequency %d, stepSize %f", note, this.wavetableIndex, baseFrequency, this.stepSize);
}

function noteNumToFrequency(note) {
	return 440 * Math.pow(2, (note - 69) / 12);
}

function pickNearest(note, noteList) {
	for(var i = 0; i < noteList.length; i++) {
		if (noteList[i + 1] == null) return i;
		if ((noteList[i] + noteList[i + 1]) / 2 > note) {
			return i;
		}
	}
}

function interleave(real, imag) {
	var interleaved = new Float32Array(real.length * 2);
	for (var i = 0; i < real.length; i++) {
		interleaved[i * 2] = real[i];
		interleaved[i * 2 + 1] = imag[i];
	}
	return interleaved;
}

PADVoice.dirty = [];
PADVoice.previousWavetables = [];
PADVoice.wavetables = [];
var crossfade = 0;

PADVoice.setDirty = function() {
	for (var i = 0; i < MULTISAMPLE_NOTES.length; i++) {
		PADVoice.dirty[i] = true;
	}
};

PADVoice.update = function () {
	for (var i = 0; i < MULTISAMPLE_NOTES.length; i++) {
		if (PADVoice.dirty[i]) {
			console.time("Generating wavetable " + MULTISAMPLE_NOTES[i]);
			PADVoice.dirty[i] = false;
			PADVoice.previousWavetables[i] = PADVoice.wavetables[i];
			PADVoice.wavetables[i] = PADVoice.generateWavetable(i);
			console.timeEnd("Generating wavetable " + MULTISAMPLE_NOTES[i]);
			// Render one wavetable per update call
			break;
		}
	}
};

PADVoice.updateHarmonics = function (harmonics) {
	PARAMS.harmonics = harmonics;
	PADVoice.setDirty();
};

PADVoice.generateWavetable = function (i) {
	var harmonics = PADVoice.initHarmonics(BASE_FREQUENCIES[i]);
	var coeffs = PADVoice.computeCoeffs(BASE_FREQUENCIES[i], harmonics, PARAMS.bandwidth, PARAMS.bwScaling);
	//console.time("Performing IFFT " + i);
	var wavetable = new Float32Array(fft.inverse(interleave(coeffs.real, coeffs.imag)));
	//console.timeEnd("Performing IFFT " + i);
	// Normalize the output (prevent ear damage)
	var max = 0;
	for (var j = 0; j < N; j++)
		if (Math.abs(wavetable[j]) > max)
			max = Math.abs(wavetable[j]);
	if (max < 1e-5)
		max = 1e-5;
	max = max / 50; // sometimes it's not loud enough
	for (var k = 0; k < N; k++)
		wavetable[k] /= max;
	return wavetable;
};

// Relative frequency of Nth overtone. Allows detuned harmonics or metallic sounds (like bells).
PADVoice.relF = function (n) {
	var noise = (randomLUT[n] - 0.5) * PARAMS.harmonicFreqNoise * PARAMS.harmonicRatio;
	return Math.pow(n, PARAMS.harmonicRatio) + noise;
};

// Gaussian spread
PADVoice.profile = function (fi, bwi) {
	var x = fi / bwi;
	x *= x;
	//if (x > 14.71280603) return 0;
	return Math.exp(-x) / bwi;
};

PADVoice.computeCoeffs = function (frequency, harmonics, bwCents, bwScaling) {
	var i, nh, hprofile;
	var mag = new Float32Array(N / 2);

	for (nh = 0; nh < harmonics.length; nh++) {
		if (harmonics[nh] < 0.001 || !harmonics[nh]) continue;
		var bwHz = (Math.pow(2, bwCents / 1200) - 1) * frequency * Math.pow(PADVoice.relF(nh + 1), bwScaling);
		var bwi = bwHz / (2 * SAMPLE_RATE);
		var rF = frequency * PADVoice.relF(nh + 1);
		var fi = rF / SAMPLE_RATE;
		var centerBin = Math.floor(fi * N);
		for (i = 0; centerBin + i < N / 2; i++) {
			hprofile = PADVoice.profile(((centerBin + i) / N) - fi, bwi);
			if (hprofile < 0.01) break;
			mag[centerBin + i] += hprofile * harmonics[nh];
			if (centerBin - i > 0)
				mag[centerBin - i] += hprofile * harmonics[nh];
		}
	}

	var real = new Float32Array(N / 2);
	var imag = new Float32Array(N / 2);
	//Convert the magnitude bins to complex array (real/imaginary) with random phases
	for (i = 0; i < N / 2; i++) {
		var phase = randomLUT[i];
		real[i] = mag[i] * Math.cos(phase);
		imag[i] = mag[i] * Math.sin(phase);
	}

	return {
		real: real,
		imag: imag
	};
};

PADVoice.initHarmonics = function (baseFrequency) {
	// Resample the harmonic envelope to maintain constant resonance/formants.
	// This means 110 hz will have 4x as many harmonic partials as 440 hz
	var harmonics = [];
	if (PARAMS.harmonicScaling > 0) {
		var interpStep = PADVoice.mix(1, baseFrequency / 220, PARAMS.harmonicScaling);
		for (var i = 0, j = 0; i < PARAMS.harmonics.length; i += interpStep) {
			harmonics[j] = PADVoice.splineInterp(PARAMS.harmonics, i, true);
			j++;
		}
	} else {
		harmonics = PARAMS.harmonics;
	}
	//console.log("Harmonics:", harmonics);
	return harmonics;
};

//PADVoice.linearInterp = function (idx) {
//	var idx1 = Math.floor(idx);
//	var idx2 = (idx1 + 1) % N;
//	var coeff1 = idx - idx1;
//	var coeff2 = 1 - coeff1;
//	return PADVoice.wavetable[idx1] * coeff1 + PADVoice.wavetable[idx2] * coeff2;
//};

PADVoice.splineInterp = function (table, location, pad) {
	var p0, p1, p2, p3, p4, p5;
	var len = table.length;
	var nearest = Math.floor(location);
	var x = location - nearest;
	if (pad) {
		p0 = table[Math.max(0, nearest - 2)];
		p1 = table[Math.max(0, nearest - 1)];
		p2 = table[nearest];
		p3 = table[Math.min(len - 1, nearest + 1)];
		p4 = table[Math.min(len - 1, nearest + 2)];
		p5 = table[Math.min(len - 1, nearest + 3)];
	} else {
		p0 = table[(nearest + len - 2) % len];
		p1 = table[(nearest + len - 1) % len];
		p2 = table[nearest % len];
		p3 = table[(nearest + 1) % len];
		p4 = table[(nearest + 2) % len];
		p5 = table[(nearest + 3) % len];
	}

	return p2 + 0.04166666666 * x * ((p3 - p1) * 16.0 + (p0 - p4) * 2.0
		+ x * ((p3 + p1) * 16.0 - p0 - p2 * 30.0 - p4
		+ x * (p3 * 66.0 - p2 * 70.0 - p4 * 33.0 + p1 * 39.0 + p5 * 7.0 - p0 * 9.0
		+ x * (p2 * 126.0 - p3 * 124.0 + p4 * 61.0 - p1 * 64.0 - p5 * 12.0 + p0 * 13.0
		+ x * ((p3 - p2) * 50.0 + (p1 - p4) * 25.0 + (p5 - p0) * 5.0)))));
};

// Equal power crossfade; ratio = b:a
PADVoice.mix = function (a, b, ratio) {
	// Linear power fade works better with padsynth, I guess.
	var ca = 1 - ratio; // Math.pow(1 - ratio, 0.5);
	var cb = ratio; // Math.pow(ratio, 0.5);
	return ca * a + cb * b;
};

PADVoice.prototype.render = function () {
	var outputL, outputR, scaling;
	var previousWavetable = PADVoice.previousWavetables[this.wavetableIndex];
	var wavetable = PADVoice.wavetables[this.wavetableIndex];

	//if (previousWavetable) {
	//	var ratio = crossfade / BUFFER_SIZE;
	//	outputL = PADVoice.mix(
	//			PADVoice.splineInterp(previousWavetable, this.ptrL),
	//			PADVoice.splineInterp(wavetable, this.ptrL),
	//			ratio
	//	);
	//	outputR = PADVoice.mix(
	//			PADVoice.splineInterp(previousWavetable, this.ptrR),
	//			PADVoice.splineInterp(wavetable, this.ptrR),
	//			ratio
	//	);
	//	crossfade++;
	//	if (crossfade >= BUFFER_SIZE) {
	//		crossfade = 0;
	//		PADVoice.previousWavetables[this.wavetableIndex] = null;
	//	}
	//} else {
		outputL = PADVoice.splineInterp(wavetable, this.ptrL);
		outputR = PADVoice.splineInterp(wavetable, this.ptrR);
	//}

	scaling = this.envelope.render() * this.velocity;

	this.ptrL = (this.ptrL + this.stepSize) % N;
	this.ptrR = (this.ptrR + this.stepSize) % N;

	return [outputL * scaling, outputR * scaling];
};

PADVoice.prototype.noteOff = function () {
	this.down = false;
	this.envelope.noteOff();
};

PADVoice.prototype.isFinished = function () {
	return this.envelope.isFinished();
};

PADVoice.pitchBend = function () {};
PADVoice.prototype.updatePitchBend = function () {};
PADVoice.modulationWheel = function () {};
PADVoice.channelAftertouch = function () {};

PADVoice.setParams = function(params) {
	PARAMS = params;
};

module.exports = PADVoice;