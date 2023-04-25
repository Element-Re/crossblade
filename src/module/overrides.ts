import CrossbladeSoundConfig from './CrossbladeSoundConfig.js';
import { libWrapper } from './shim.js';
import { CrossbladePlaylistSound, DevModeModuleData } from './types.js';
import {
  getCrossfadeVolume,
  generateCrossbladeSounds,
  debug,
  getUniqueCrossbladeSounds,
  clearCrossbladeData,
  MODULE_ID,
} from './utils.js';

export function registerCriticalOverrides() {
  // Right-click context menu for sounds
  libWrapper.register(
    MODULE_ID,
    'PlaylistDirectory.prototype._getSoundContextOptions',
    PlaylistDirectoryOverrides._getSoundContextOptionsWrapper,
    'WRAPPER',
  );
}

export function registerOptionalOverrides() {
  // PlaylistSound Overrides
  Object.defineProperty(PlaylistSound.prototype, 'cbSoundLayers', {
    get: PlaylistSoundOverrides.crossbladeSoundsGetter,
  });
  libWrapper.register(MODULE_ID, 'PlaylistSound.prototype.sync', PlaylistSoundOverrides.syncWrapper, 'MIXED');
  libWrapper.register(
    MODULE_ID,
    'PlaylistSound.prototype._onUpdate',
    PlaylistSoundOverrides._onUpdateWrapper,
    'OVERRIDE',
  );
  libWrapper.register(
    MODULE_ID,
    'PlaylistSound.prototype._onStart',
    PlaylistSoundOverrides._onStartWrapper,
    'OVERRIDE',
  );
  libWrapper.register(MODULE_ID, 'PlaylistSound.prototype._fadeIn', PlaylistSoundOverrides._fadeInWrapper, 'OVERRIDE');

  // Playlist overrides
  libWrapper.register(MODULE_ID, 'Playlist.prototype._onSoundStart', PlaylistOverrides._onSoundStartWrapper, 'WRAPPER');
  libWrapper.register(MODULE_ID, 'Playlist.prototype._onDelete', PlaylistOverrides._onDeleteWrapper, 'WRAPPER');

  // Playlist directory (sidebar list) overrides
  libWrapper.register(
    MODULE_ID,
    'PlaylistDirectory.prototype._onSoundVolume',
    PlaylistDirectoryOverrides._onSoundVolumeWrapper,
    'WRAPPER',
  );
}

namespace PlaylistOverrides {
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

namespace PlaylistSoundOverrides {
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
    debug('in syncWrapper', this.name);
    if (!this.sound || this.sound.failed || !this.cbSoundLayers?.size) return wrapped();
    const baseSound = this.sound;
    // Process base sound and all layers together
    const layerSounds = new Set([baseSound, ...(this.cbSoundLayers.keys() ?? [])]);
    const fade = this.fadeDuration;

    if (!this.playing) {
      // Conclude current playback
      const stopPromises: Promise<Sound | void>[] = [];
      for (const layerSound of layerSounds) {
        if (fade && !this.pausedTime)
          stopPromises.push(
            layerSound.fade(0, { duration: fade }).then(() => {
              if (!this.playing) layerSound.stop();
            }),
          );
        else layerSound.stop();
      }
      return Promise.all(stopPromises);
    } else {
      // Begin playback
      for (const layerSound of layerSounds) {
        // Determine layer playback configuration
        const playback: Sound.PlayOptions = {
          loop: this.repeat,
          fade: fade,
        };
        if (this.pausedTime && baseSound === layerSound) {
          playback.offset = this.pausedTime;
        } else if (baseSound !== layerSound) {
          // Getters to ensure value is current for when accessed
          Object.defineProperty(playback, 'offset', { get: () => this.sound?.currentTime });
        }
        Object.defineProperty(playback, 'volume', { get: () => getCrossfadeVolume(this, layerSound) });
        const loadOrPlay = async () => {
          await layerSound.loading;
          // Load and autoplay layer sound, play directly if already loaded and not playing, or just fade to the proper volume.
          if (!layerSound.loaded) layerSound.load({ autoplay: true, autoplayOptions: playback });
          // Keep layers playing together.
          else if (!layerSound.playing || layerSound.loop != this.repeat) layerSound.play(playback);
          else layerSound.fade(getCrossfadeVolume(this, layerSound), { duration: this.fadeDuration });
        };

        if (layerSound !== baseSound && !baseSound.playing) baseSound.on('start', loadOrPlay, { once: true });
        else loadOrPlay();
      }
    }
  }
  export function _onUpdateWrapper(this: CrossbladePlaylistSound, ...args: unknown[]) {
    const changed = args[0] as { path?: string; flags?: { crossblade?: { soundLayers?: [] } } };
    debug('_onUpdateWrapper', changed);
    const oldCrossbladeSounds = getUniqueCrossbladeSounds(this);
    if (this.sound) oldCrossbladeSounds.delete(this.sound);
    Object.getPrototypeOf(PlaylistSound).prototype._onUpdate.apply(this, args);
    if ('path' in changed) {
      if (this.sound) this.sound.stop();
      this.sound = this._createSound();
    }
    if ('sort' in changed && this.parent) {
      _clearPlaybackOrder.bind(this.parent)();
    }
    if ('path' in changed || (changed.flags?.crossblade && 'soundLayers' in changed.flags.crossblade)) {
      oldCrossbladeSounds.forEach((oldSound) => {
        oldSound.stop();
      });
      this._cbSoundLayers = generateCrossbladeSounds(this);
    }
    this.sync();
  }

  function _clearPlaybackOrder(this: Playlist) {
    this._playbackOrder = undefined;
  }

  export function _fadeInWrapper(this: CrossbladePlaylistSound, sound: Sound) {
    if (!sound.node) return;
    const fade = this.fadeDuration;
    if (!fade || sound.pausedTime) return;
    sound.fade(getCrossfadeVolume(this, sound), { duration: fade, from: 0 });
  }
  export async function _onStartWrapper(this: CrossbladePlaylistSound, sound: Sound) {
    if (!this.playing) {
      return sound.stop();
    }

    // Apply fade timings
    const fade = this.fadeDuration;
    if (fade) {
      this._fadeIn(sound);
      if (!this.repeat && Number.isFinite(sound.duration)) {
        sound.schedule(this._fadeOut.bind(this), Number(sound.duration) - fade / 1000);
      }
    }
    if (sound === this.sound) {
      // Playlist-level orchestration actions
      return this.parent?._onSoundStart(this);
    }
  }
}

namespace PlaylistDirectoryOverrides {
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
      debug(slider, $soundElement, playlistId, soundId);
      if (sound && !sound.isOwner) {
        // Change volume in memory... which could change when the sound is updated
        // by an owner or otherwise refreshed (which should be what we want).
        sound.volume = AudioHelper.inputToVolume($(slider).val() as number);
        sound.sync();
      }
    }
    return result;
  }
}
