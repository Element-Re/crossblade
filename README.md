# ⚔ Crossblade - Adaptive Music Crossfader
Crossblade is an audio module that enables the GM to define playlist sounds that crossfade in and out between synchronous multi-layered sound files based on triggers. The result is an [adaptive music](https://en.wikipedia.org/wiki/Adaptive_music) soundtrack that responds dynamically to the game's state, such as the ebb and flow of a combat encounter.

## Crossblade in action (enable sound)

https://user-images.githubusercontent.com/86752832/177466983-44460e56-9c14-4840-8668-6d2102e5db6c.mp4

## What does this module do?
With Crossblade, you can setup playlist sounds that employ techniques sometimes used in video game soundtracks known as [vertical re-orchestration](https://en.wikipedia.org/wiki/Adaptive_music#Horizontal_and_vertical_techniques) or [soundtrack switching](https://en.wikipedia.org/wiki/Adaptive_music#Soundtrack_switching). The basic idea is that the sound is composed of multiple layers of audio. Each layer is its own audio file, but each represents a different version or instrumental component of the same song. When a Crossblade-configured sound is playing, Crossblade will respond to events that happen in the game and automatically fade in or out each layer as configured. As layers fade in and out, the tone of the currently playing song changes, but the change happens "in place" without the song ending and is seamless compared to starting another sound entirely.

![Crossblade Events and Layer Fading](https://user-images.githubusercontent.com/86752832/177472671-cfefc08b-ceb7-4f57-8332-3bfb36727499.png?raw=true "Crossblade Events and Layer Fading")

A Crossblade-configured sound can be part of a larger playlist of sounds, of which any or none of the other sounds could be configured with additional sound layers. Crossblade will only attempt to crossfade currently playing sounds that are configured with additional layers—any other sound will play as normal without Crossblade interfering.

![Playlist with Mixed Sounds](https://user-images.githubusercontent.com/86752832/177472669-9f3fbf5a-fc53-418b-85eb-740eafb3c3af.png?raw=true "Playlist with Mixed Sounds")

Crossblade does not come with any audio files. You will have to provide those yourself.

## Using Crossblade
For instructions how to use Crossblade, check out [the wiki](https://github.com/Elemental-Re/crossblade/wiki).

## Considerations and Known Issues

### Sound Syncing and Looping
* For best results, Crossblade sound layer audio source files should have the same BPM and should all start at the same point in the song.
    * The playlist sound's main audio source will control when the playlist automatically proceeds to the next sound. If other Crossblade sound layers are not finished playing at this time they will fade out and stop early.
    * If a playlist sound is set to loop, each layer will loop independently, which will cause them to go out of sync if they aren't all exactly the same length.
    * Even if songs are the same length, in some cases they can still go out of sync during a loop. This is a tricky problem to troubleshoot, and the best I can offer you is that it's best to use sound files that are optimized for looping. For example, sometimes compressed audio files will go out of sync depending on how they were compressed. In my experience, compressing each audio source of a single playlist sound to .ogg using the exact same bitrate seems to usually work, but I am unfortunately not an audio expert. In the worst case scenario, if you have access to original uncompressed audio files, those should always work assuming they are all the same length.

### Starting Unloaded Sounds
* Each client will have to download each sound layer before they can each start playing it. Crossblade will always attempt to start playing the base sound layer as soon as it's loaded, but if the sound is configured to fade out the main layer based on the current event when the sound first starts, there may be some silence until the layers that are supposed to fade in are fully loaded. Crossblade will attempt to preload the following tracks in a playlist a bit before they are set to play automatically.

### Data Transfer and Loading Limitations
* Due to loading multiple audio sources per playlist sound, Crossblade is a rather data intensive module, so you should think twice about using it if you or your players have poor connections or data limits.
* There is currently a limit on the amount of playlist audio data that can be loaded in a session by Foundry. It's a fairly large number, but due to Crossblade's loading of multiple audio sources per sound, it's a fair bit easier to run into it. When the limit is reached, no other sounds will be able to be loaded but previously loaded sounds can continue to be played.
     * If a client is connected using the standalone application, this can cause the canvas and ui to disappear. This won't affect clients connecting via a full browser like Chrome or Firefox.
     * All clients can resolve the issue by refreshing the window/tab as this will clear all the cached audio data for the session.
     * There is currently no way to uncache this data aside from refreshing.
     * Again, this is an issue that exists in core Foundry and I am unable to do anything about it. If you are careful with how many layers your sounds have, you should be fine.

If you find this module useful, consider [buying me a coffee](https://ko-fi.com/element_re "Buy me a coffee!")!
