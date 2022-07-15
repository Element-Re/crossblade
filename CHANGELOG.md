### 1.1.3
- [New] Crossblade sound layers can now optionally specify a volume to use when fading in instead of the PlaylistSound's base volume. Useful for tweaking sound layers that are abnormally loud or quiet compared to others.

### 1.1.2
- [Changed] Disabling the "Enable Crossblade" client setting now really disables most of Crossblades functionality, including loading audio data for extra sound layers, which should help when using Crossblade with clients that have poor connections or data limits. A GM client with the setting disabled can still edit sound layer data and set custom events, but will not load sound layer audio data or hear the extra sound layers fade in or out.

### 1.1.1
- [Fixed] Resolved issue that could cause player clients to not load sound layers until an event occurred

### 1.1.0
- [Changed] Much of the module has undergone a major rewrite
- [New] Crossblade now supports configuring custom events for layers than can be manually triggered via a macro or [input directly from the playlists sidebar](https://user-images.githubusercontent.com/86752832/177448150-31d0237d-54da-44d7-9502-f70b767a1aba.png). Custom events take priority over standard events
- [New] Added new settings to allow users to customize how they want to use Crossblade, optionally favoring standard events, custom events, or a mixed approach
- [New] The sound layer configuration dialog [has a new coat of paint](https://github.com/Elemental-Re/crossblade/blob/main/project_assets/changelog/1.1.0_new-layer-config-dialog.webp?raw=true), to more easily differentiate between layers and save some space with a dynamic list of event triggers instead of a row of checkboxes for each possible event, as well as allow input of custom events
- [Changed] Crossblade event data has changed under the hood. The module should automatically migrate all Crossblade event data the first time the world is loaded after updating.
- [Fixed] Resolved issue that caused the Web Audio api (and potentially the Foundry client) to crash when bulk operations were performed on a large number of Playlist Sounds
- [Fixed] Resolved several more causes of sound layers going out of sync

### 1.0.7
- [Fixed] Resolved error preventing rendering the sound layer configuration dialog on systems other than 5e

### 1.0.6
- [Changed] Updated README.md
- [Changed] The build process should now be packaging README.md and CHANGELOG.md with the module

### 1.0.5

- [Changed] Refactor of layer generation logic to reuse the main sound object if the same audio source is specified in a sound layer
- [Fixed] Resolved a number of cases that could cause sound layers to go out of sync from the base sound
- [Added] Crossblade-enabled sounds will now [display a "⚔" icon](https://github.com/Elemental-Re/crossblade/blob/main/project_assets/changelog/playlist-directory-icons.webp?raw=true) next to their name in the playlist directory, so that they can be identified at a glance

### 1.0.4

- [Changed] Update module.json

### 1.0.3

- [Fixed] Resolved bug causing all layers to fade out on complex layer configs involving a layer referencing the same sound as the base playlist sound

### 1.0.2

- [Fixed] Various minor bug fixes
- [Changed] Code cleanup

### 1.0.1

- [Changed] Improved the sound layer config form a bit: better styling and added some help tooltips

### 1.0.0

- Initial public release
