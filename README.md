# ⚔ Crossblade - Adaptive Music for Combat and More
Crossblade is an audio module that enables the GM to define playlist sounds that crossfade in and out between simultaneously playing multi-layered tracks based on triggers. The result is a [adaptive music](https://en.wikipedia.org/wiki/Adaptive_music) soundtrack that responds dynamically to the game's state, such as the ebb and flow of a combat encounter.
## Terminology
For clarity's sake, it's best to start by defining some terms.
###
* **Playlist:** A container for a set of Playlist Sounds which defines how they should be played.
* **Playlist Sound:** A single sound entry of a playlist. 
* **Audio Source:** A reference to an audio file. Each playlist sound is associated with one.
* **Sound Layer:** This is a concept unique to Crossblade. A sound layer defines both its own unique audio source as well as a number of events that can trigger it. By default, Crossblade considers the playlist sounds's main audio source to be one layer, but additional layers can be added.
* **Crossblade Event:** A trigger that can change which sounds are currently playing.
## Usage
The following is a detailed example of a simple use case: The GM has two tracks that represent the same song in two different tonal variations.
* *Gathering Clouds (Precipitation)*
    * A subdued, tactical-sounding battle track. The GM wants this to play under most circumstances. 
* *Gathering Clouds (Storm)*
    * A more tense, percussion-heavy battle track. The GM wants this to be played only on **Hostile** combatants' turns during combat

The GM creates a "Battle" playlist and then adds a playlist sound underneath it, setting the audio source to the *Gathering Clouds (Precipitation)* file. So far this is standard Foundry configuration for a new playlist and playlist sound.

![Playlist Config](/src/assets/readme/Playlist%20Config.webp "Playlist Configuration")
![Playlist Sound Config](/src/assets/readme/Playlist%20Sound%20Config.webp "Playlist Sound Configuration")

Next the GM opens the Crossblade sound layer configuration dialog by right clicking on the playlist sound and selecting "Configure Sound Layers". The GM adds a single layer by clicking the '+' icon in the upper right of the dialog, setting the source of the new sound layer to the *Gathering Clouds (Storm)* file. Lastly, the GM selects the Disposition: Hostile event for the sound's event trigger.

https://user-images.githubusercontent.com/86752832/174438626-7547764a-d9b5-4762-af58-2b42cde40045.mp4

With this, the playlist sound is fully configured. Crossblade will use the playlist sound's main audio source for all cases in which there isn't a sound layer with a better match. In this case the only additional layer is configured to play in combat when the current combatant has a "hostile" disposition.

The GM starts a combat and begins playing the newly-configured playlist sound. They note that as each combatant takes a turn, Crossblade fades dynamically between the two sound layers based on the combatant's disposition!

## More Advanced Usage
Crossblade is not limited to playlist sounds with only two layers. A playlist sound can have multiple layers with their own triggering events, and each layer can be triggered by more than one event. If multiple layers are triggered by the same event, they will play simultaneously, effectively mixing together to a single blended sound.

You can include a sound layer that references the same file as the playlist sound's main audio source. This will allow you to configure it to play during specific events as well as when there is no other applicable event.
### Fade Duration
Crossblade uses the fade duration on the playlist sound or playlist when fading sound layers in and out.
### Sound Layer Configuration
There are two ways to access the Sound Layer Configuration dialog for a playlist sound: either from the right-click context menu for the playlist sound on the sidebar, or in the header of the playlist sound configuration dialog.
## Event Types
### Default
This event will trigger if no other, better event applies. By default, Crossblade will consider the main audio source for a playlist sound to be treated as a sound layer with a Default event trigger.
### Disposition
These will only trigger during combat, based on the disposition of the current combatant.
### Game Paused
This event will trigger when the game is paused. A setting controls whether or not this event can trigger during combat. In addition to the Module Settings tab of the Configure Game Settings dialog, there is a button to toggle this setting on and off and in the Ambient Sound Controls menu on the left side of the game window.
## Additional Features
Crossblade adds a right-click context menu option to playlists to automatically preload all playlist sounds and sound layers for that playlist for all connected clients, rather than having to preload each playlist sound one-by-one. Depending on the number of playlist sounds and layers, and the clients' connections this could take quite a while.

## Considerations and Known Issues
* A GM client is required to be connected for Crossblade to function properly.
* For best results, sound layer files should have the same BPM and be synced to start at the same point.
    * The playlist sound's main audio source will control when the playlist automatically proceeds to the next sound. If other sound layers are not finished playing at this time they will fade out and stop early.
    * If a playlist sound is set to loop, each layer will loop independently, which will cause them to go out of sync if they aren't all exactly the same length. If it's important that your sound layers remain in sync, please ensure that all the audio sources are exactly the same length. Ensuring sound length is difficult with MP3 files; consider converting your sound layer files to OGG or some other format if you are unable to get them to sync up.
    * Similarly, if a playlist sound or sound layer gets stuck and won't start playing, it could be due to an ongoing issue with core foundry that seems to mainly affect MP3 files. As before, try converting your audio files to another format like OGG.
* If for some reason a sound layer doesn't stop when the base sound does, refreshing the affected client should resolve the issue. If this occurs to you, please [log an issue](https://github.com/Elemental-Re/crossblade/issues) with as much info as possible to help me track down what causes this.

If you find this module useful, consider [buying me a coffee](https://ko-fi.com/elemental_re "Buy me a coffee!")!
