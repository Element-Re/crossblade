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
* For best results, Crossblade sound layer audio source files should have the same BPM and should all start at the same point in the song.
    * The playlist sound's main audio source will control when the playlist automatically proceeds to the next sound. If other Crossblade sound layers are not finished playing at this time they will fade out and stop early.
    * If a playlist sound is set to loop, each layer will loop independently, which will cause them to go out of sync if they aren't all exactly the same length.
    * Even if songs are the same length, in some cases they can still go out of sync during a loop. This is a tricky problem to troubleshoot, and the best I can offer you is that it's best to use sound files that are optimized for looping. For example, sometimes compressed audio files will go out of sync depending on how they were compressed. In my experience, compressing to .ogg using the exact same bitrate seems to usually work, but I am unfortunately not an audio expert. In the worst case scenario, if you have access to original uncompressed audio files, those should always work assuming they are all the same length.
* Each client will have to download each sound layer they can each start playing it. Crossblade will always attempt to start playing the base sound layer as soon as it's loaded, but it may not be audible if the sound is configured to fade in another layer for the current sound instead and that layer hasn't been loaded yet, though Crossblade will attempt to preload the following tracks in a playlist a bit before they are set to play automatically.
* There is currently a limit on the number of playlist audio data that can be loaded at once by Foundry. It's a fairly large number, but due to Crossblade's loading of multiple audio sources per sound, it's a fair easier to run into it. When the limit is reached, no other sounds will be able to be loaded but previously loaded sounds can continue to be played.
     * If a client is connected using the standalone application, this can cause the canvas and ui to disappear. This won't affect clients connecting via a full browser like Chrome or Firefox.
     * All clients can resolve the issue by refreshing the window/tab.
     * There is currently no way to uncache this data aside from refreshing.
     * Again, this is an issue that exists in core Foundry and I am unable to do anything about it. If you are careful with how many layers your sounds have, you should be fine.

If you find this module useful, consider [buying me a coffee](https://ko-fi.com/element_re "Buy me a coffee!")!
