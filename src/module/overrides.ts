import CrossbladeSoundConfig from './CrossbladeSoundConfig';
import { CrossbladeEventKey, CrossbladePlaylistSound } from './types';
import { getCrossfadeVolume, generateCrossbladeSounds, debug, localFade, getUniqueCrossbladeSounds } from './utils';

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
          if (next && next.crossbladeSounds)
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

function _syncSound(
  pls: CrossbladePlaylistSound,
  sound?: Sound,
  event?: CrossbladeEventKey,
  fade: number = pls.fadeDuration,
) {
  if (!sound) return;
  try {
    if (!pls.playing) {
      if (fade && !pls.data.pausedTime && sound.playing)
        sound.fade(0, { duration: fade }).then(() => {
          sound.stop();
        });
      else sound.stop();
    } else {
      // Determine playback configuration
      const volume = getCrossfadeVolume(pls, sound); //, event);
      debug(pls.name, event, sound.src, volume);

      const playback: Sound.PlayOptions = {
        loop: pls.data.repeat,
        volume: volume,
        fade: fade,
      };
      if (pls.playing && !sound.playing) {
        Object.defineProperty(playback, 'offset', { get: () => pls.sound?.currentTime || 0 });
      }
      // Load and autoplay, or play directly if already loaded
      if (sound.loaded) sound.play(playback);
      else sound.load({ autoplay: true, autoplayOptions: playback });
    }
  } catch (e) {
    console.log(e);
  }
}

export namespace PlaylistSoundOverrides {
  export function crossbladeSoundsGetter(this: CrossbladePlaylistSound) {
    if (!this._crossbladeSounds) {
      this._crossbladeSounds = generateCrossbladeSounds(this);
    }
    return this._crossbladeSounds;
  }
  export function syncWrapper(this: CrossbladePlaylistSound, wrapped: (...args: never[]) => Sound) {
    const sound = wrapped() as Sound | undefined;
    if (!this.sound || this.sound.failed || !this.crossbladeSounds) return;

    Array.from(this.crossbladeSounds.keys()).forEach((k) => {
      this.crossbladeSounds?.get(k)?.forEach((sound: Sound) => {
        _syncSound(this, sound, k);
      });
    });

    return sound;
  }
  export function _onUpdateWrapper(
    this: CrossbladePlaylistSound,
    wrapped: (...args: unknown[]) => void,
    ...args: unknown[]
  ) {
    const changed = args[0] as { path?: string; flags?: { crossblade?: { soundLayers?: [] } } };
    debug('_onUpdateWrapper', changed);
    const oldCrossbladeSounds = this.crossbladeSounds;
    const result = wrapped(...args);
    if ('path' in changed || (changed.flags?.crossblade && 'soundLayers' in changed.flags.crossblade)) {
      if (oldCrossbladeSounds) {
        Array.from(oldCrossbladeSounds.keys()).forEach((k) => {
          const cbs = oldCrossbladeSounds.get(k) ?? [];
          cbs.forEach((s) => {
            if (s.playing) {
              s.stop();
            }
          });
        });
      }
      this._crossbladeSounds = generateCrossbladeSounds(this);
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
    const crossbladeItem = {
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
    } as MenuItem;
    return result.concat(crossbladeItem);
  }

  export function _onSoundVolumeWrapper(
    this: PlaylistDirectory,
    wrapped: (...args: unknown[]) => void,
    ...args: unknown[]
  ) {
    const result = wrapped(...args);
    const event = args[0] as Event;
    //const target = event.target;
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
        //MusicController.crossfadeSounds(sound);
      }
    }
    return result;
  }
}
