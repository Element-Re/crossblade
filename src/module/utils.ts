import {
  CrossbladeEvent,
  CrossbladeEventKey,
  CrossbladePlaylistSound,
  DevModeModuleData,
  Socket,
  SoundLayer,
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
  // COMBATANT_TAG: {
  //   key: 'COMBATANT', // Technically the same as the normal Combatant event
  //   label: 'CROSSBLADE.Events.CombatantTag.Label',
  //   description: 'CROSSBLADE.Events.CombatantTag.Description',
  //   isCustom: true,
  // },
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
    isCustom: true,
  },
};

export const MODULE_ID = 'crossblade';
export const MODULE_NAME = 'Crossblade';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function inArray(array: any[] | undefined | null, toCheck: any | undefined | null) {
  return toCheck && array?.includes(toCheck);
}

export function createCrossbladeSound(src: string, basedOn: PlaylistSound) {
  try {
    if (!basedOn.id || !basedOn.data.path) return null;
    const sound =
      basedOn.sound?.src === src
        ? basedOn.sound
        : game.audio.create({
            src: src,
            preload: false,
            singleton: true,
          });
    return sound;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export function getCrossbladeEvent(): string {
  if (game.settings.get(MODULE_ID, 'combatPause') === true && game.paused) return 'GAME: PAUSED';
  if (!game.combat?.started) return game.paused ? 'GAME_PAUSED' : 'DEFAULT';
  switch (game.combat?.combatant?.token?.data.disposition) {
    case CONST.TOKEN_DISPOSITIONS.FRIENDLY:
      return 'TENSION: MEDIUM';
    case CONST.TOKEN_DISPOSITIONS.NEUTRAL:
      return 'TENSION: LOW';
    case CONST.TOKEN_DISPOSITIONS.HOSTILE:
      return 'TENSION: HIGH';
    default:
      return 'DEFAULT';
  }
}

export function getCrossfadeVolume(pls: CrossbladePlaylistSound, sound: Sound, volume: number = pls.volume) {
  let crossbladeEvent = CrossbladeController.getCurrentEvent();
  const soundLayers = pls.cbSoundLayers;
  if (!soundLayers) throw `${pls.name} has no Crossblade sound layer data`;
  const layerEvents = soundLayers.get(sound);
  if (!layerEvents) throw `${sound.src} is not a layer of ${pls.name}`;
  // Default volume --- Only activate if this is the base sound;
  let fadeVolume = pls.sound?.id === sound.id ? volume : 0;
  // If crossblade is enabled and and this PlaylistSound has crossblade sound layers
  if (game.settings.get(MODULE_ID, 'enable') === true && soundLayers.size) {
    // Default event if there's no sounds for this event.
    if (!layerEvents.includes(crossbladeEvent) && crossbladeEvent !== 'DEFAULT') {
      crossbladeEvent = 'DEFAULT';
    }
    const currentEventSounds = new Set(
      [...soundLayers.entries()].filter((entry) => entry[1].includes(crossbladeEvent)).map((entry) => entry[0]),
    );
    const otherEventSounds = new Set(
      [...soundLayers.entries()].filter((entry) => !entry[1].includes(crossbladeEvent)).map((entry) => entry[0]),
    );

    // If this event has sounds
    if (currentEventSounds.size) {
      if (currentEventSounds.has(sound)) {
        fadeVolume = volume;
      } else if (otherEventSounds.has(sound) || pls.sound?.id === sound.id) {
        fadeVolume = 0;
      }
    }
  }
  return fadeVolume;
}

export function getUniqueCrossbladeSounds(pls: CrossbladePlaylistSound): Set<Sound> {
  return new Set([...(pls.cbSoundLayers?.keys() ?? [])]);
}

export async function localFade(pls: CrossbladePlaylistSound, volume: number) {
  const localVolume = volume * game.settings.get('core', 'globalPlaylistVolume');
  if (pls.cbSoundLayers && pls.sound) {
    getUniqueCrossbladeSounds(pls).forEach(async (s) => {
      s.fade(getCrossfadeVolume(pls, s, localVolume), {
        duration: PlaylistSound.VOLUME_DEBOUNCE_MS,
      });
    });
  }
}

export function generateCrossbladeSounds(pls: PlaylistSound) {
  debug('generateCrossbladeSounds');
  const crossbladeSounds = new Map<Sound, string[]>();

  const soundLayers = pls.getFlag('crossblade', 'soundLayers') as SoundLayer[] | undefined;
  debug('soundLayers', soundLayers);
  if (Array.isArray(soundLayers)) {
    soundLayers?.forEach((sl) => {
      if (sl.src && sl.events && sl.events.length > 0) {
        // Use the base sound if it matches the layer, or create a new one.
        const layerSound = createCrossbladeSound(sl.src, pls);
        if (layerSound && !layerSound?.failed) {
          crossbladeSounds.set(layerSound, sl.events);
          // sl.events.forEach((e) => {
          //   const eventSounds = crossbladeSounds.get(e) ?? [];
          //   crossbladeSounds.set(e, eventSounds.concat(layerSound));
          // });
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

export function hasOwnProperty<X extends object, Y extends PropertyKey>(
  obj: X,
  prop: Y,
): obj is X & Record<Y, unknown> {
  return obj.hasOwnProperty(prop);
}

/// Sockets
export let socket: Socket | undefined;

Hooks.once('socketlib.ready', () => {
  debug('socketlib.ready');
  socket = socketlib.registerModule(MODULE_ID);
  socket.register('crossfadePlaylists', _crossfadePlaylistsSocket);
  socket.register('crossfadeSounds', _crossfadeSoundsSocket);
  socket.register('getCrossbladeEvent', _getCrossbladeEventSocket);
  socket.register('updateCrossbladeEventSocket', _updateCrossbladeEventSocket);
  socket.register('updatePlaylistSocket', _updatePlaylistSocket);
  socket.register('updatePlaylistSoundSocket', _updatePlaylistSoundSocket);
});

export async function crossfadePlaylistsSocket(...playlistIds: string[]) {
  debug('crossfadePlaylistsSocket', playlistIds);

  return socket?.executeForEveryone(_crossfadePlaylistsSocket, ...playlistIds);
}

function _crossfadePlaylistsSocket(...playlistIds: string[]) {
  debug('_crossfadePlaylistsSocket', playlistIds);
  const playlists = game.playlists?.filter((p) => playlistIds.includes(p.id));
  if (playlists) {
    CrossbladeController.crossfadePlaylists(...playlists);
  }
}

export async function crossfadeSoundsSocket(playlistId: string, ...soundIds: string[]) {
  debug('crossfadeSoundsSocket', soundIds);
  return socket?.executeForEveryone(_crossfadeSoundsSocket, playlistId, ...soundIds);
}

function _crossfadeSoundsSocket(playlistId: string, ...soundIds: string[]) {
  debug('_crossfadeSoundsSocket', soundIds);
  const playlist = game.playlists?.find((p) => p.id === playlistId);
  const sounds = playlist?.sounds.filter((s) => (s.id && soundIds.includes(s.id)) as boolean);
  if (sounds) {
    CrossbladeController.crossfadeSounds(...sounds);
  }
}

export async function getCrossbladeEventSocket() {
  debug('getCrossbladeEventSocket');
  return socket?.executeAsGM(_getCrossbladeEventSocket);
}

function _getCrossbladeEventSocket() {
  debug('_getCrossbladeEventSocket');
  return getCrossbladeEvent();
}

export async function updateCrossbladeEventSocket(status: string) {
  debug('updateCrossbladeEventSocket', status);
  return socket?.executeForEveryone(_updateCrossbladeEventSocket, status);
}

function _updateCrossbladeEventSocket(status: string) {
  debug('_updateCrossbladeEventSocket', status);
  CrossbladeController.setCurrentEvent(status);
  CrossbladeController.crossfadePlaylists();
}

export async function updatePlaylistSocket(status: string, ...playlists: Playlist[]) {
  debug('updatePlaylistSocket', status, playlists);
  return socket?.executeForEveryone(
    _updatePlaylistSocket,
    status,
    playlists.map((p) => p.id),
  );
}

function _updatePlaylistSocket(status: string, ...playlistIds: string[]) {
  debug('_updatePlaylistSocket', status, playlistIds);
  CrossbladeController.setCurrentEvent(status);
  const playlists = game.playlists?.filter((p) => playlistIds.includes(p.id)) ?? [];
  CrossbladeController.crossfadePlaylists(...playlists);
}

export async function updatePlaylistSoundSocket(status: string, ...sounds: PlaylistSound[]) {
  debug('updatePlaylistSoundSocket', status, sounds);
  return socket?.executeForEveryone(_updatePlaylistSoundSocket, status, ...sounds.map((s) => s.uuid));
}

function _updatePlaylistSoundSocket(status: string, ...soundUuids: string[]) {
  debug('_updatePlaylistSoundSocket', status, soundUuids);
  CrossbladeController.setCurrentEvent(status);

  Promise.all(
    soundUuids.map((uuid) => {
      return fromUuid(uuid) as Promise<PlaylistSound>;
    }),
  ).then((sounds) => {
    CrossbladeController.crossfadeSounds(...sounds);
  });
}

export class CrossbladeController {
  protected static _currentStatus = 'DEFAULT';

  static getCurrentEvent(): string {
    debug('getCurrentEvent', this._currentStatus);
    return this._currentStatus;
  }

  static setCurrentEvent(status: string) {
    debug('getCurrentEvent', status);
    this._currentStatus = status;
  }

  static getCrossbladePlaylists(...playlists: Playlist[]) {
    // Filter down to only crossfade-applicable playlists...
    return playlists?.filter((p) =>
      p.sounds.find((s) => {
        const cbps = s as CrossbladePlaylistSound;
        if (cbps.cbSoundLayers && cbps.cbSoundLayers.size > 0) return true;
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
  static async crossfadeSounds(...playlistSounds: PlaylistSound[]) {
    debug('crossfading sounds...', playlistSounds);
    playlistSounds.forEach(async (pls) => {
      const cbps = pls as CrossbladePlaylistSound;
      if (cbps.cbSoundLayers && cbps.sound) {
        log('Handling crossfade for', `🎵${pls.name}🎵`);
        if (!cbps.sound.loaded) await cbps.sound.load();
        const uniqueSounds = getUniqueCrossbladeSounds(pls);
        // Ensure all crossblade sounds are loaded before attempting crossfade...
        await Promise.all([...uniqueSounds].map(async (s) => s.load()));
        // Set *should* filter this out if one of the layers is the same as the base sound
        if (pls.sound) uniqueSounds.add(pls.sound);
        uniqueSounds.forEach((s) => {
          debug(s.src, s.currentTime);
          s.fade(getCrossfadeVolume(pls, s), { duration: pls.fadeDuration });
        });
      }
    });
    debug('...done crossfading sounds', playlistSounds);
  }
}
