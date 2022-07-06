# ⚔ Crossblade - Adaptive Music Crossfader
Crossblade is an audio module that enables the GM to define playlist sounds that crossfade in and out between synchronous multi-layered sound files based on triggers. The result is an [adaptive music](https://en.wikipedia.org/wiki/Adaptive_music) soundtrack that responds dynamically to the game's state, such as the ebb and flow of a combat encounter.

## Crossblade in action (enable sound)

https://user-images.githubusercontent.com/86752832/177430418-d5d30c67-58af-4e51-a5e3-259c2b706be0.mp4

## What does this module do?
With Crossblade, you can setup playlist sounds that employ techniques sometimes used in video game soundtracks known as [vertical re-orchestration](https://en.wikipedia.org/wiki/Adaptive_music#Horizontal_and_vertical_techniques) or [soundtrack switching](https://en.wikipedia.org/wiki/Adaptive_music#Soundtrack_switching). The basic idea is that the sound is composed of multiple layers of audio. Each layer is its own audio file, but each represents a different version or instrumental component of the same song. When a Crossblade-configured sound is playing, Crossblade will respond to events that happen in the game and automatically fade in or out each layer as configured. As layers fade in and out, the tone of the currently playing song changes, but the change happens "in place" without the song ending and is seamless compared to starting another sound entirely.

![Crossblade Sound with Layers](https://github.com/Elemental-Re/crossblade/blob/main/project_assets/readme/Sound%20Diagram.webp?raw=true "Crossblade Sound with Layers")

A Crossblade-configured sound can be part of a larger playlist of sounds, of which any or none of the other sounds could be configured with additional sound layers. Crossblade will only attempt to crossfade currently playing sounds that are configured with additional layers—any other sound will play as normal without Crossblade interfering.

![Crossblade Sound with Layers](https://github.com/Elemental-Re/crossblade/blob/main/project_assets/readme/Playlist%20Diagram.webp?raw=true "Playlist with Mixed Sounds")

Crossblade does not come with any audio files. You will have to provide those yourself.

## Using Crossblade
For instructions how to use Crossblade, check out [the wiki](https://github.com/Elemental-Re/crossblade/wiki).

## Considerations and Known Issues
* A GM client is required to be connected for Crossblade to function properly.
* For best results, Crossblade sound layer audio source files should have the same BPM and should all start at the same point in the song.
    * The playlist sound's main audio source will control when the playlist automatically proceeds to the next sound. If other Crossblade sound layers are not finished playing at this time they will fade out and stop early.
    * If a playlist sound is set to loop, each layer will loop independently, which will cause them to go out of sync if they aren't all exactly the same length. If it's important that your sound's layers remain in sync, please ensure that all the audio sources are exactly the same length. Ensuring sound length is difficult with MP3 files; consider converting your sound's layer files to OGG or some other format if you are unable to get them to sync up.
    * Similarly, if a playlist sound or Crossblade sound layer gets stuck and won't start playing, it could be due to an ongoing issue with core foundry that seems to mainly affect MP3 files. You can try resolving it in the moment by having the affected client refresh their browser window, but if it happens regularly, as before, you can try converting your audio files to another format like OGG.
* If for some reason a Crossblade sound layer continues to play when the base sound stops, or otherwise goes out of sync unexpectedly, refreshing the affected client should at least temporarily resolve the issue. If this happens regularly to you, please [log an issue](https://github.com/Elemental-Re/crossblade/issues) with as much info as possible to help me track down the cause.

If you find this module useful, consider [buying me a coffee](https://ko-fi.com/element_re "Buy me a coffee!")!
