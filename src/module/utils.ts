import {
  CrossbladeEvent,
  CrossbladeEventKey,
  CrossbladeFlags,
  CrossbladePlaylistSound,
  DevModeModuleData,
  SoundLayerData,
  SoundLayerFlagData,
} from './types';

export const CROSSBLADE_EVENTS: Record<CrossbladeEventKey, CrossbladeEvent> = {
  DEFAULT: {
    key: 'DEFAULT',
    label: 'CROSSBLADE.Events.Default.Label',
    description: 'CROSSBLADE.Events.Default.Description',
  },
  COMBATANT: {
    key: 'COMBATANT',
    label: 'CROSSBLADE.Events.Combatant.Label',
    description: 'CROSSBLADE.Events.Combatant.Description',
    options: {
      FRIENDLY: 'TOKEN.FRIENDLY',
      NEUTRAL: 'TOKEN.NEUTRAL',
      HOSTILE: 'TOKEN.HOSTILE',
    },
  },
  GAME: {
    key: 'GAME',
    label: 'CROSSBLADE.Events.Game.Label',
    description: 'CROSSBLADE.Events.Game.Description',
    options: {
      PAUSED: 'GAME.Paused',
    },
  },
  CUSTOM: {
    key: 'CUSTOM',
    label: 'CROSSBLADE.Events.Custom.Label',
    description: 'CROSSBLADE.Events.Custom.Description',
    manualEntry: true,
  },
};

export const MODULE_ID = 'crossblade';
export const MODULE_NAME = 'Crossblade';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function inHelper(iterable: Iterable<any> | undefined | null, toCheck: any | undefined | null) {
  if (iterable) {
    for (const item of iterable) {
      if (item === toCheck) return true;
    }
  }
  return false;
}

export function getCrossbladeSound(src: string, basedOn: PlaylistSound) {
  try {
    if (!basedOn.id || !basedOn.data.path) return null;
    // Use the base sound if it matches the layer audio source, or create a new one.
    const sound = basedOn.sound?.src === src ? basedOn.sound : createCrossbladeSound.bind(basedOn)(src);
    return sound;
  } catch (e) {
    console.error(e);
    return null;
  }
}

function createCrossbladeSound(this: CrossbladePlaylistSound, src: string) {
  const sound = game.audio.create({
    src: src,
    preload: false,
    singleton: false,
  });
  sound.on('start', this._onStart.bind(this));
  return sound;
}

function _determineCrossbladeEvent(): string {
  const combatPauseEvent = game.settings.get(MODULE_ID, 'combatPauseEvent') as boolean;
  const combatEvents = game.settings.get(MODULE_ID, 'combatEvents') as boolean;

  if (combatPauseEvent && game.paused) return 'GAME: PAUSED';
  if (!combatEvents || !game.combat?.started) return game.paused ? 'GAME_PAUSED' : 'DEFAULT';
  switch (game.combat?.combatant?.token?.data.disposition) {
    case CONST.TOKEN_DISPOSITIONS.FRIENDLY:
      return 'COMBATANT: FRIENDLY';
    case CONST.TOKEN_DISPOSITIONS.NEUTRAL:
      return 'COMBATANT: NEUTRAL';
    case CONST.TOKEN_DISPOSITIONS.HOSTILE:
      return 'COMBATANT: HOSTILE';
    default:
      return 'DEFAULT';
  }
}

export function getCrossfadeVolume(pls: CrossbladePlaylistSound, sound: Sound) {
  const fadeInVolume = pls.volume * Math.clamped(pls.cbSoundLayers?.get(sound)?.volumeAdjustment ?? 1, 0, 1);
  const soundLayers = pls.cbSoundLayers ?? new Map<Sound, SoundLayerData>();
  // Default volume --- Only activate if this is the base sound;
  let fadeVolume = pls.sound === sound ? fadeInVolume : 0;
  // If crossblade is enabled and and this PlaylistSound has crossblade sound layers
  if (game.settings.get(MODULE_ID, 'enable') === true && soundLayers.size) {
    let crossbladeEvent = CrossbladeController.event;
    debug('Crossblade Event:', crossbladeEvent);
    const customEvent = CrossbladeController.customEvent;
    debug('Custom Event:', customEvent);
    if (
      customEvent &&
      [...soundLayers.values()]
        .map((l) => l.events)
        .flat()
        .includes(customEvent)
    ) {
      // Use custom event if it applies to at least one layer
      crossbladeEvent = customEvent;
    } else if (
      crossbladeEvent !== 'DEFAULT' &&
      ![...soundLayers.values()]
        .map((l) => l.events)
        .flat()
        .includes(crossbladeEvent)
    ) {
      // Default event if current event applies to no layers
      crossbladeEvent = 'DEFAULT';
    }
    debug('Crossblade Event (Final)', crossbladeEvent);
    debug('Sound Layer Events:', [...soundLayers.values()].flat());
    const currentEventSounds = new Set(
      [...soundLayers.entries()].filter((entry) => entry[1].events.includes(crossbladeEvent)).map((entry) => entry[0]),
    );
    const otherEventSounds = new Set(
      [...soundLayers.entries()].filter((entry) => !entry[1].events.includes(crossbladeEvent)).map((entry) => entry[0]),
    );

    // If this event has sounds
    if (currentEventSounds.size) {
      if (currentEventSounds.has(sound)) {
        fadeVolume = fadeInVolume;
      } else if (otherEventSounds.has(sound) || pls.sound === sound) {
        fadeVolume = 0;
      }
    }
  }
  return fadeVolume;
}

export function getUniqueCrossbladeSounds(pls: CrossbladePlaylistSound, includeBaseSound = false): Set<Sound> {
  const uniqueSounds: Sound[] = [];
  if (includeBaseSound && pls.sound) uniqueSounds.push(pls.sound);
  const soundLayers = pls.cbSoundLayers;
  if (soundLayers) uniqueSounds.push(...soundLayers.keys());
  return new Set(uniqueSounds);
}

export function getLayerOnlyCrossbladeSounds(pls: CrossbladePlaylistSound) {
  const uniqueSounds = getUniqueCrossbladeSounds(pls);
  if (pls.sound) uniqueSounds.delete(pls.sound);
  return uniqueSounds;
}

export function generateCrossbladeSounds(pls: PlaylistSound) {
  debug('generateCrossbladeSounds');
  const crossbladeSounds = new Map<Sound, SoundLayerData>();

  const soundLayers = pls.getFlag('crossblade', 'soundLayers') as SoundLayerFlagData[] | undefined;
  debug('soundLayers', soundLayers);
  if (Array.isArray(soundLayers)) {
    soundLayers?.forEach((sl) => {
      if (sl.src && sl.events && sl.events.length > 0) {
        const layerSound = getCrossbladeSound(sl.src, pls);
        if (layerSound && !layerSound?.failed) {
          debug('events', sl.events);
          const soundLayerData: SoundLayerData = {
            events: sl.events
              .filter((event) => Array.isArray(event) && event.length)
              // Maps ['COMBATANT', 'HOSTILE'] as 'COMBATANT: HOSTILE'
              // Easier to check if an event matches
              .map((event) => event.slice(0, 2).join(': ').toUpperCase()),
          };
          if (sl.volumeAdjustment) {
            soundLayerData.volumeAdjustment = sl.volumeAdjustment;
          }
          crossbladeSounds.set(layerSound, soundLayerData);
        }
      }
    });
  }
  return crossbladeSounds;
}

export const getFirstActiveGM = function () {
  const filteredGMs = game.users
    ?.filter((u) => u.isGM && u.active)
    ?.sort((u1, u2) => {
      // Compare ids. EN locale is arbitrary and used for consistency only.
      return u1.id.localeCompare(u2.id, 'en');
    });

  return filteredGMs ? filteredGMs[0] : null;
};

export const isLeadGM = function () {
  return game.user === getFirstActiveGM();
};

export async function clearCrossbladeData(pls: CrossbladePlaylistSound) {
  const flags = pls.data.flags[MODULE_ID] as Record<string, unknown>;
  await Promise.all(Array.from(Object.keys(flags)).map((flag) => pls.unsetFlag(MODULE_ID, flag)));
}

export function log(...args: unknown[]) {
  console.log(`⚔️${MODULE_NAME} |`, ...args);
}

export function debug(...args: unknown[]) {
  try {
    const devMode = game.modules.get('_dev-mode') as DevModeModuleData | undefined;
    if (devMode?.api?.getPackageDebugValue(MODULE_ID)) {
      log(...args);
    }
  } catch (e) {}
}

export function getCustomEvent() {
  return game.settings.get(MODULE_ID, 'customEvent') as string | undefined;
}

export async function setCustomEvent(event?: string) {
  return await game.settings.set(MODULE_ID, 'customEvent', event?.trim() ?? '');
}

export function formatCustomEvent(customEvent: string | undefined) {
  return customEvent ? `CUSTOM: ${customEvent.toUpperCase()}` : undefined;
}

export function getPlayingCustomEvents(options = { sort: false }) {
  const events = game.playlists?.playing
    .map((playlist) =>
      playlist.sounds
        .filter((pls) => pls.playing)
        .map((pls: CrossbladePlaylistSound) =>
          ((pls.data.flags as CrossbladeFlags).crossblade?.soundLayers ?? [])
            .map((layer) => layer.events)
            .flat()
            .filter((event) => event[0] === 'CUSTOM')
            .map((event) => event[1]),
        ),
    )
    .deepFlatten();

  return new Set(options.sort ? events?.sort() : events);
}
// /**
//  * Gets the current volume for a Crossblade PlaylistSound, which may have been modified by this client when they are not the sound's owner while it is currently playing.
//  * @param pls The sound to get the current volume for.
//  * @returns The current volume compared to the baseline based on the what the input of the PlaylistSound is set to for non-owners, or the actual sound volume for owners.
//  */
// export function getCurrentVolume(pls: CrossbladePlaylistSound) {
//   debug('in getCurrentVolume', pls.name);
//   if (!pls.isOwner && pls.id && pls.parent?.id) {
//     // The adjusted-volume class indicates that the client has adjusted the volume locally.
//     const inputVolumeValue = $(
//       `#sidebar #playlists #currently-playing ol.playlist-sounds li.sound.playing[data-playlist-id=${pls.parent.id}][data-sound-id=${pls.id}] input.sound-volume.adjusted-volume`,
//     ).val();
//     const inputVolume = Number(inputVolumeValue);
//     debug('inputVolume', inputVolume, typeof inputVolume);
//     if (inputVolume) {
//       const currentVolume = AudioHelper.inputToVolume(inputVolume) * game.settings.get('core', 'globalPlaylistVolume');
//       debug('currentVolume', currentVolume);
//       return currentVolume;
//     }
//   }
//   return pls.volume;
// }

export function getAllCustomEvents(options = { sort: false }) {
  const events = game.playlists?.contents
    .map((playlist) =>
      playlist.sounds.map((pls: CrossbladePlaylistSound) =>
        ((pls.data.flags as CrossbladeFlags).crossblade?.soundLayers ?? [])
          ?.map((layer) => layer.events)
          .flat()
          .filter((event) => event[0] === 'CUSTOM')
          .map((event) => event[1]),
      ),
    )
    .deepFlatten();
  return new Set(options.sort ? events?.sort() : events);
}

export class CrossbladeController {
  static get event(): string {
    return _determineCrossbladeEvent();
  }

  static get customEvent() {
    return formatCustomEvent(getCustomEvent());
  }

  static getCrossbladePlaylists(...playlists: Playlist[]) {
    // Filter down to only crossfade-applicable playlists...
    return playlists?.filter((p) =>
      p.sounds.find((s) => {
        const cbps = s as CrossbladePlaylistSound;
        const soundLayers = cbps.cbSoundLayers;
        if (soundLayers && soundLayers.size > 0) return true;
        else return false;
      }),
    );
  }
  static async crossfadePlaylists(...playlists: Playlist[]) {
    playlists = playlists.length ? playlists : game.playlists?.playing || [];
    debug('crossfading Playlists...', playlists);
    const crossbladeSounds: PlaylistSound[] = [];
    playlists.forEach((p) =>
      crossbladeSounds.push(
        ...p.sounds.filter((pls: CrossbladePlaylistSound) => {
          const cbpsSize = pls.cbSoundLayers?.size;
          const isCrossbladeSound = typeof cbpsSize === 'number' && cbpsSize > 0;
          return pls.playing && isCrossbladeSound;
        }),
      ),
    );
    this.crossfadeSounds(...crossbladeSounds);
    debug('...done crossfading Playlists', playlists);
  }
  static async crossfadeSounds(...playlistSounds: CrossbladePlaylistSound[]) {
    playlistSounds = playlistSounds.filter((pls) => pls.playing || pls.parent?.playing);
    debug('crossfading sounds...', playlistSounds);
    playlistSounds.forEach(async (pls) => {
      const cbps = pls as CrossbladePlaylistSound;
      if (cbps.cbSoundLayers && cbps.sound) {
        log('Handling crossfade for', `🎵${pls.name}🎵`);
        cbps.sync();
      }
    });
    debug('...done crossfading sounds', playlistSounds);
  }
}
