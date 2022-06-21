# ⚔ Crossblade - Adaptive Music Crossfader for Combat and More
Crossblade is an audio module that enables the GM to define playlist sounds that crossfade in and out between synchronous multi-layered sound files based on triggers. The result is an [adaptive music](https://en.wikipedia.org/wiki/Adaptive_music) soundtrack that responds dynamically to the game's state, such as the ebb and flow of a combat encounter.
## What does this module do?
With Crossblade, you can setup playlist sounds that employ techniques sometimes used in video game soundtracks known as [vertical re-orchestration](https://en.wikipedia.org/wiki/Adaptive_music#Horizontal_and_vertical_techniques) or [soundtrack switching](https://en.wikipedia.org/wiki/Adaptive_music#Soundtrack_switching). The basic idea is that the sound is composed of multiple layers of audio. Each layer is its own audio file, but each represents a different version or instrumental component of the same song. When a Crossblade-configured sound is playing, Crossblade will respond to events that happen in the game and automatically fade in or out each layer as configured. As layers fade in and out, the tone of the currently playing song changes, but the change happens "in place" without the song ending and is seamless compared to starting another sound entirely.

![](/src/assets/readme/Sound%20Diagram.svg "Crossblade Sound with Layers")

A Crossblade-configured sound can be part of a larger playlist of sounds, of which any or none could configured with additional sound layers. Crossblade will only attempt to crossfade currently playing sounds that are configured with additional layers—any other sound will play as normal without Crossblade fading.

![](/src/assets/readme/Playlist%20Diagram.svg "Playlist with Mixed Sounds")

Crossblade does not come with any audio files. You will have to provide those yourself.
## Terminology
For clarity's sake, it's best to define some terms.
### Core Foundry Terms
* **Playlist:** A container for a set of sounds which defines how they should be played.
* **Playlist Sound:** A single sound entry of a playlist. 
* **Audio Source:** A reference to an audio file. Each playlist sound is associated with one.
### Crossblade-Specific Terms
* **Crossblade Sound Layer:** A Crossblade sound layer defines both its own unique audio source as well as a number of events that can trigger it. By default, Crossblade considers the playlist sounds's main audio source to be one layer, but additional layers can be added.
    * **Note:** This term has nothing to do with the [Canvas Sounds Layer](https://foundryvtt.com/article/canvas-layers/).
* **Crossblade Event:** A trigger that can change which Crossblade sound layers are currently audible.
## Usage
The following is a detailed example of a simple use case: The GM has two tracks that represent the same song in two different tonal variations.
* *Gathering Clouds (Precipitation)*
    * A subdued, tactical-sounding battle track. The GM wants this to play under most circumstances. 
* *Gathering Clouds (Storm)*
    * A more tense, percussion-heavy battle track. The GM wants this to be played only on **Hostile** combatants' turns during combat

The GM creates a "Battle" playlist and then adds a playlist sound underneath it, setting the audio source to the *Gathering Clouds (Precipitation)* file. So far this is standard Foundry configuration for a new playlist and playlist sound.

![Playlist Sound Config](/src/assets/readme/Playlist%20Sound%20Config.webp "Playlist Sound Configuration")

Next the GM opens the Crossblade sound layer configuration dialog by right clicking on the playlist sound and selecting "Configure Sound Layers".

![](/src/assets/readme/Context%20Menu.webp "Crossblade Sound Layers Context Menu")

The GM adds a single layer by clicking the '+' icon in the upper right of the dialog, setting the source of the new layer to the *Gathering Clouds (Storm)* file. Lastly, the GM selects the Disposition: Hostile event for the sound's event trigger.

![](/src/assets/readme/Add%20Sound%20Layer.webp "Add Crossblade Sound Layer")

![](/src/assets/readme/Configure%20Sound%20Layers.webp "Configure Crossblade Sound Layers")

With this, the playlist sound is fully configured. Crossblade will use the playlist sound's main audio source for all cases in which there isn't a sound layer with a better match. In this case the only additional layer is configured to play in combat when the current combatant has a "hostile" disposition.

The GM starts a combat and begins playing the newly-configured playlist sound. They note that as each combatant takes a turn, Crossblade fades dynamically between the two layers based on the combatant's disposition!

## More Advanced Usage
Crossblade is not limited to playlist sounds with only two layers. A playlist sound can have multiple layers with their own triggering events, and each layer can be triggered by more than one event. If multiple layers are triggered by the same event, they will play simultaneously, effectively mixing together to a single blended sound.

[](/src/assets/readme/Complex%20Sound%20Layers.webp?raw=true "Complex Sound Layers Example")

You can include a Crossblade sound layer that references the same file as the playlist sound's main audio source. This will allow you to configure it to play during specific events as well as when there is no other applicable event.
### Fade Duration
Crossblade uses the fade duration on the playlist sound or playlist when fading sound layers in and out.
### Crossblade Sound Layer Configuration
There are two ways to access the Crossblade Sound Layer Configuration dialog for a playlist sound: either from the right-click context menu for the playlist sound on the sidebar, or in the header of the playlist sound configuration dialog.
## Event Types
* **Default:** This event will trigger if no other, better event applies. By default, Crossblade will consider the main audio source for a playlist sound to be treated as a Crossblade sound layer with a Default event trigger.
* **Disposition:** These will only trigger during combat, based on the disposition of the current combatant.
* **Game Paused:** This event will trigger when the game is paused. A setting controls whether or not this event can trigger during combat. In addition to the Module Settings tab of the Configure Game Settings dialog, there is a button to toggle this setting on and off and in the Ambient Sound Controls menu on the left side of the game window.
Support for more events, including non-combat and manually-triggered events, is planned for a future release.
## Additional Features
Crossblade adds a right-click context menu option to playlists to automatically preload all playlist sounds and Crossblade sound layers for that playlist for all connected clients, rather than having to preload each playlist sound one-by-one. Depending on the number of playlist sounds and layers, and the clients' connections this could take quite a while.

## Considerations and Known Issues
* A GM client is required to be connected for Crossblade to function properly.
* For best results, Crossblade sound layer audio source files should have the same BPM and be synced to start at the same point.
    * The playlist sound's main audio source will control when the playlist automatically proceeds to the next sound. If other Crossblade sound layers are not finished playing at this time they will fade out and stop early.
    * If a playlist sound is set to loop, each layer will loop independently, which will cause them to go out of sync if they aren't all exactly the same length. If it's important that your sound's layers remain in sync, please ensure that all the audio sources are exactly the same length. Ensuring sound length is difficult with MP3 files; consider converting your sound's layer files to OGG or some other format if you are unable to get them to sync up.
    * Similarly, if a playlist sound or Crossblade sound layer gets stuck and won't start playing, it could be due to an ongoing issue with core foundry that seems to mainly affect MP3 files. As before, try converting your audio files to another format like OGG.
* If for some reason a Crossblade sound layer doesn't stop when the base sound does, refreshing the affected client should resolve the issue. If this occurs to you, please [log an issue](https://github.com/Elemental-Re/crossblade/issues) with as much info as possible to help me track down what causes this.

If you find this module useful, consider [buying me a coffee](https://ko-fi.com/element_re "Buy me a coffee!")!
