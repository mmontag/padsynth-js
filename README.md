PADSynth
=================

Additive synthesis using the Web Audio and Web MIDI API. Works in Chrome and Firefox.
Use a MIDI or QWERTY keyboard to play the synth.

[Live demo](http://mmontag.github.io/padsynth-js/)

The PADsynth technique works by running the inverse FFT on a frequency spectrum profile determined by the synthesis parameters. 
The output is a time domain waveform. Every time the parameters are adjusted, the wavetable must be recalculated. Fortunately, with a short wavetable, this happens fast enough to allow interactive performance in a web browser.


Many thanks to Paul Nasca, creator of the [PADSynth algorithm](http://www.paulnasca.com/algorithms-created-by-me#TOC-PadSynth-synthesis-algorithm).
