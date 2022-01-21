var HarmonicProfiles = {
	saw: function(length) {
		var array = new Array(length);
		for (var i = 0; i < length; i++) {
			array[i] = 1 / (i + 1);
		}
		return array;
	},

	square: function(length) {
		var array = new Array(length);
		for (var i = 0; i < length; i++) {
			array[i] = ((i + 1) % 2) / (i + 1);
		}
		return array;
	},

	ah: function() {
		return [0.673, 0.74, 0.813, 0.773, 0.627, 0.153, 0, 0, 0, 0, 0.087, 0.62, 0.773, 0.793, 0.773, 0.607, 0.407, 0.187,
			0.14, 0.133, 0.12, 0.1, 0.08, 0.06, 0.047, 0.047, 0.047, 0.04, 0.033, 0.033, 0.033, 0.033, 0.033, 0.027, 0.027,
			0.02, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	},

	ee: function() {
		return [0.807, 0.413, 0.08, 0, 0, 0, 0, 0, 0, 0, 0.027, 0.32, 0.653, 0.887, 0.94, 0.927, 0.827, 0.62, 0.38, 0.187,
			0.093, 0.06, 0.06, 0.047, 0.047, 0.047, 0.047, 0.047, 0.047, 0.047, 0.033, 0, 0.039, 0.033, 0.028, 0.022, 0.017,
			0.011, 0.006, 0.007, 0.013, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	},

	clear: function(length) {
		return Array(length).fill(0);
	}
};

module.exports = HarmonicProfiles;
