PADSynth
=================

Additive synthesis using the Web Audio and Web MIDI API. Works in Chrome and Firefox.
Use a MIDI or QWERTY keyboard to play the synth.

![CleanShot 2022-01-22 at 03 06 15](https://user-images.githubusercontent.com/946117/150636090-8487490e-a8f5-4935-a6a6-d1977d9eba1f.png)


[Live demo](http://mmontag.github.io/padsynth-js/)

The PADsynth technique works by running the inverse FFT on a frequency spectrum profile determined by the synthesis parameters. Frequency spread (or "bandwidth") is one of the key parameters; turning it up results in a rich chorus/ensemble sound.

The output is a time domain waveform. Every time the parameters are adjusted, the [wavetable must be recalculated](https://github.com/mmontag/padsynth-js/blob/3ad41048a11fb4fb70a24f895fb6c77c37dcac27/src/padvoice.js#L86). 

Fortunately, with a short wavetable, this happens fast enough to allow interactive performance in a web browser.


Many thanks to Paul Nasca, creator of the [PADSynth algorithm](http://www.paulnasca.com/algorithms-created-by-me#TOC-PadSynth-synthesis-algorithm).
