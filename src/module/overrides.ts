import CrossbladeSoundConfig from './CrossbladeSoundConfig';
import { CrossbladePlaylistSound, DevModeModuleData } from './types';
import {
  getCrossfadeVolume,
  generateCrossbladeSounds,
  debug,
  localFade,
  getUniqueCrossbladeSounds,
  clearCrossbladeData,
  MODULE_ID,
} from './utils';

export namespace PlaylistOverrides {
  export async function _onSoundStartWrapper(
    this: Playlist,
    wrapped: (sound: PlaylistSound) => void,
    sound: PlaylistSound,
  ) {
    const result = wrapped(sound);
    if (![CONST.PLAYLIST_MODES.SEQUENTIAL, CONST.PLAYLIST_MODES.SHUFFLE].some((mode) => mode === this.mode))
      return result;
    const apl = CONFIG.Playlist.autoPreloadSeconds;
    if (
      Number.isNumeric(apl) &&
      sound.sound &&
      typeof sound.sound.duration === 'number' &&
      Number.isFinite(sound.sound.duration)
    ) {
      const scheduledLoad = (sound.sound.duration - apl) * 1000;
      setTimeout(() => {
        if (sound.sound?.playing && sound.id) {
          const next = this._getNextSound(sound.id) as CrossbladePlaylistSound;
          if (next && next.cbSoundLayers)
            getUniqueCrossbladeSounds(next).forEach((ns: Sound) => {
              ns.load();
            });
        }
      }, scheduledLoad);
    }

    return result;
  }

  export function _onDeleteWrapper(this: Playlist, wrapped: (...args: unknown[]) => void, ...args: unknown[]) {
    wrapped(...args);
    this.sounds.forEach((pls: CrossbladePlaylistSound) => getUniqueCrossbladeSounds(pls).forEach((s) => s.stop()));
  }
}

export namespace PlaylistSoundOverrides {
  export function crossbladeSoundsGetter(this: CrossbladePlaylistSound) {
    if (!this._cbSoundLayers) {
      this._cbSoundLayers = generateCrossbladeSounds(this);
    }
    return this._cbSoundLayers;
  }
  export async function syncWrapper(
    this: CrossbladePlaylistSound,
    wrapped: (...args: never[]) => Sound | Promise<Sound> | undefined,
  ) {
    const layerSounds = new Set(this._cbSoundLayers?.keys());
    if (!this.sound || this.sound.failed || !layerSounds.size) return wrapped();
    // In case of duplicate
    layerSounds.delete(this.sound);
    const fade = this.fadeDuration;

    // Conclude current playback
    if (!this.playing) {
      const stopPromises: Promise<Sound | void>[] = [];

      if (fade && !this.data.pausedTime && this.sound.playing) {
        stopPromises.push(this.sound.fade(0, { duration: fade }).then(() => this.sound?.stop()));
      } else this.sound.stop();
      for (const layerSound of layerSounds) {
        if (fade && !this.data.pausedTime && layerSound.playing)
          stopPromises.push(
            layerSound.fade(0, { duration: fade }).then(() => {
              layerSound.stop();
            }),
          );
        else layerSound.stop();
      }
      return Promise.all(stopPromises).then(() => {
        return;
      });
    }
    const playPromises: Promise<Sound | void>[] = [];
    // Determine base sound playback configuration
    const basePlayback: Sound.PlayOptions = {
      loop: this.data.repeat,
      volume: getCrossfadeVolume(this, this.sound),
      fade: fade,
    };

    if (this.data.pausedTime && this.playing && !this.sound.playing) basePlayback.offset = this.data.pausedTime;

    // Load and autoplay base sound, or play directly if already loaded
    if (!this.sound.loaded) playPromises.push(this.sound.load());
    playPromises.concat([...layerSounds].map((sound) => sound.load()));
    // Process each Crossblade sound layer
    for (const layerSound of layerSounds) {
      const volume = getCrossfadeVolume(this, layerSound);
      // Determine layer playback configuration
      const playback: Sound.PlayOptions = {
        loop: this.data.repeat,
        volume: volume,
        fade: fade,
      };
      Object.defineProperty(playback, 'offset', { get: () => this.sound?.currentTime || 0 });
      // Load and autoplay layer sound, or play directly if already loaded
      if (!this.sound.playing) {
        // The base sound is not playing, prepare for when it starts
        this.sound.on(
          'start',
          (startedSound) => {
            if (startedSound.playing) {
              layerSound.play(playback);
            }
          },
          { once: true },
        );
        if (!layerSound.loaded) playPromises.push(layerSound.load());
      } else {
        // The base sound is playing, start this layer sound ASAP
        if (!layerSound.loaded) playPromises.push(layerSound.load({ autoplay: true, autoplayOptions: playback }));
        else layerSound.play(playback);
      }
    }
    return Promise.all(playPromises).then(() => {
      return this.sound?.play(basePlayback);
    });
  }
  export function _onUpdateWrapper(
    this: CrossbladePlaylistSound,
    wrapped: (...args: unknown[]) => void,
    ...args: unknown[]
  ) {
    const changed = args[0] as { path?: string; flags?: { crossblade?: { soundLayers?: [] } } };
    debug('_onUpdateWrapper', changed);
    const oldCrossbladeSounds = getUniqueCrossbladeSounds(this);
    if (this.sound) oldCrossbladeSounds.delete(this.sound);
    const result = wrapped(...args);
    if ('path' in changed || (changed.flags?.crossblade && 'soundLayers' in changed.flags.crossblade)) {
      oldCrossbladeSounds.forEach((oldSound) => {
        oldSound.stop();
      });
      this._cbSoundLayers = generateCrossbladeSounds(this);
    }
    // Syncing again though it happened after calling the wrapped function. This should work...
    this.sync();
    return result;
  }
}

export namespace PlaylistDirectoryOverrides {
  interface MenuItem {
    name: string;
    icon: string;
    condition: () => boolean;
    callback: () => void;
  }

  // TODO: Replace with hook if possible — there doesn't seem to be one by default
  export function _getSoundContextOptionsWrapper(
    this: PlaylistDirectory,
    wrapped: (...args: never) => MenuItem[],
  ): MenuItem[] {
    const result = wrapped();
    const additionalItems = [
      {
        name: 'CROSSBLADE.Layers.Config',
        icon: '<i class="crossblade-font-icon"></i>',
        callback: (li: JQuery<HTMLElement>) => {
          debug('in callback', li);
          const sound = game.playlists?.get(li.data('playlistId'))?.sounds.get(li.data('soundId'));
          debug(sound);
          if (sound) {
            new CrossbladeSoundConfig(sound).render(true);
          }
        },
      } as MenuItem,
    ];
    try {
      const devMode = game.modules.get('_dev-mode') as DevModeModuleData | undefined;
      if (devMode?.api?.getPackageDebugValue(MODULE_ID)) {
        // Clear data is only for debug mode
        additionalItems.push({
          name: 'CROSSBLADE.Sound.ClearData',
          icon: '<i class="fas fa-times-circle"></i>',
          callback: (li: JQuery<HTMLElement>) => {
            debug('in callback', li);
            const sound = game.playlists?.get(li.data('playlistId'))?.sounds.get(li.data('soundId')) as
              | CrossbladePlaylistSound
              | undefined;
            debug(sound);
            if (sound) {
              Dialog.confirm({ title: `CROSSBLADE.Sound.ClearDataConfirm`, yes: () => clearCrossbladeData(sound) });
            }
          },
        } as MenuItem);
      }
    } catch (e) {}

    return result.concat(...additionalItems);
  }

  export function _onSoundVolumeWrapper(
    this: PlaylistDirectory,
    wrapped: (...args: unknown[]) => void,
    ...args: unknown[]
  ) {
    const result = wrapped(...args);
    const event = args[0] as Event;
    const slider = event.currentTarget;

    if (slider) {
      const $soundElement = $(slider).closest('.sound');
      const playlistId = $soundElement.data('playlist-id');
      const soundId = $soundElement.data('sound-id');
      const sound = game.playlists?.find((p) => p.id === playlistId)?.sounds.find((s) => s.id === soundId);
      const volume = AudioHelper.inputToVolume($(slider).val() as number);
      debug(slider, $soundElement, playlistId, soundId);
      if (sound && !sound.isOwner) {
        localFade(sound, volume);
      }
    }
    return result;
  }
}
