## Known Issues
- Changing the 'Loop' setting of a currently playing PlaylistSound will not be reflected until the next time the sound is started.

## Changelog

### 1.1.0
- [Changed] Much of the module has undergone a major rewrite
- [New] The sound layer configuration dialog has a new coat of paint, to more easily differentiate between layers and save some space with a dynamic list of event triggers instead of a row of checkboxes for each possible event.

!['New Layer Config Dialog'](https://github.com/Elemental-Re/crossblade/blob/main/project_assets/changelog/1.1.0_new-layer-config-dialog.webp?raw=true "New Layer Config Dialog")

- [Changed] Crossblade event data has changed under the hood. The module should automatically migrate all Crossblade event data the first time the world is loaded after updating.
- [Fixed] Resolved issue that caused clients to crash when bulk operations were performed on a large number of Playlist Sounds
- [Fixed] Resolved at least one more cause of sound layers going out of sync.

### 1.0.7
- [Fixed] Resolved error preventing rendering the sound layer configuration dialog on systems other than 5e

### 1.0.6
- [Changed] Updated README.md
- [Changed] The build process should now be packaging README.md and CHANGELOG.md with the module

### 1.0.5

- [Changed] Refactor of layer generation logic to reuse the main sound object if the same audio source is specified in a sound layer
- [Fixed] Resolved a number of cases that could cause sound layers to go out of sync from the base sound
- [Added] Crossblade-enabled sounds will now display a "⚔" icon next to their name in the playlist directory, so that they can be identified at a glance

!['Playlist Directory Icons'](https://github.com/Elemental-Re/crossblade/blob/main/project_assets/changelog/playlist-directory-icons.webp?raw=true "Playlist Directory Icons")

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
