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
    label: 'CROSSBLADE.Events.Default.Label',
    description: 'CROSSBLADE.Events.Default.Description',
  } as CrossbladeEvent,
  COMBAT_DISPOSITION_FRIENDLY: {
    label: 'CROSSBLADE.Events.Combat.Disposition.FRIENDLY.Label',
    description: 'CROSSBLADE.Events.Combat.Disposition.FRIENDLY.Description',
  } as CrossbladeEvent,
  COMBAT_DISPOSITION_NEUTRAL: {
    label: 'CROSSBLADE.Events.Combat.Disposition.NEUTRAL.Label',
    description: 'CROSSBLADE.Events.Combat.Disposition.NEUTRAL.Description',
  } as CrossbladeEvent,
  COMBAT_DISPOSITION_HOSTILE: {
    label: 'CROSSBLADE.Events.Combat.Disposition.HOSTILE.Label',
    description: 'CROSSBLADE.Events.Combat.Disposition.HOSTILE.Description',
  } as CrossbladeEvent,
  GAME_PAUSED: {
    label: 'CROSSBLADE.Events.Game.Paused.Label',
    description: 'CROSSBLADE.Events.Game.Paused.Description',
  } as CrossbladeEvent,
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
    const sound = game.audio.create({
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

export function getCrossbladeEvent(): CrossbladeEventKey | null {
  if (game.settings.get(MODULE_ID, 'combatPause') === true && game.paused) return 'GAME_PAUSED';
  if (!game.combat?.started) return game.paused ? 'GAME_PAUSED' : 'DEFAULT';
  switch (game.combat?.combatant?.token?.data.disposition) {
    case CONST.TOKEN_DISPOSITIONS.FRIENDLY:
      return 'COMBAT_DISPOSITION_FRIENDLY';
    case CONST.TOKEN_DISPOSITIONS.NEUTRAL:
      return 'COMBAT_DISPOSITION_NEUTRAL';
    case CONST.TOKEN_DISPOSITIONS.HOSTILE:
      return 'COMBAT_DISPOSITION_HOSTILE';
    default:
      return 'DEFAULT';
  }
}

export function getCrossfadeVolume(pls: CrossbladePlaylistSound, sound: Sound, volume: number = pls.volume) {
  const crossbladeEvent = CrossbladeController.getCurrentEvent();
  const crossbladeSounds = pls.crossbladeSounds;
  // Default volume --- Only activate if this is the base sound;
  let fadeVolume = pls.sound?.id === sound.id ? volume : 0;
  // If crossblade is enabled and if there's a current event and crossblade is initialized for this PlaylistSound
  if (game.settings.get(MODULE_ID, 'enable') === true && crossbladeEvent && crossbladeSounds) {
    const currentEventSounds = new Set(crossbladeSounds.get(crossbladeEvent));
    const otherEventSounds = new Set(
      Array.from(crossbladeSounds.entries())
        .filter((entry) => entry[0] !== crossbladeEvent)
        .map((entry) => entry[1])
        .flat(),
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

export function getUniqueSounds(pls: CrossbladePlaylistSound): Set<Sound> {
  const sounds = pls.sound ? [pls.sound] : [];
  const crossbladeSounds = pls.crossbladeSounds ? Array.from(pls.crossbladeSounds.values()).flat() : [];
  return new Set(sounds.concat(crossbladeSounds));
}

export async function localFade(pls: CrossbladePlaylistSound, volume: number) {
  const localVolume = volume * game.settings.get('core', 'globalPlaylistVolume');
  if (pls.crossbladeSounds && pls.sound) {
    getUniqueSounds(pls).forEach(async (s) => {
      s.fade(getCrossfadeVolume(pls, s, localVolume), {
        duration: PlaylistSound.VOLUME_DEBOUNCE_MS,
      });
    });
  }
}

export function generateCrossbladeSounds(pls: PlaylistSound) {
  debug('generateCrossbladeSounds');
  const crossbladeSounds = new Map<CrossbladeEventKey, Sound[]>();

  const soundLayers = pls.getFlag('crossblade', 'soundLayers') as SoundLayer[] | undefined;
  debug('soundLayers', soundLayers);
  if (Array.isArray(soundLayers)) {
    soundLayers?.forEach((sl) => {
      if (sl.src && sl.events && sl.events.length > 0) {
        const layerSound = createCrossbladeSound(sl.src, pls);
        if (layerSound && !layerSound?.failed) {
          sl.events.forEach((e) => {
            const eventSounds = crossbladeSounds.get(e) ?? [];
            crossbladeSounds.set(e, eventSounds.concat(layerSound));
          });
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

export async function updateCrossbladeEventSocket(status: CrossbladeEventKey | null) {
  debug('updateCrossbladeEventSocket', status);
  return socket?.executeForEveryone(_updateCrossbladeEventSocket, status);
}

function _updateCrossbladeEventSocket(status: CrossbladeEventKey | null) {
  debug('_updateCrossbladeEventSocket', status);
  CrossbladeController.setCurrentEvent(status);
  CrossbladeController.crossfadePlaylists();
}

export async function updatePlaylistSocket(status: CrossbladeEventKey | null, ...playlists: Playlist[]) {
  debug('updatePlaylistSocket', status, playlists);
  return socket?.executeForEveryone(
    _updatePlaylistSocket,
    status,
    playlists.map((p) => p.id),
  );
}

function _updatePlaylistSocket(status: CrossbladeEventKey | null, ...playlistIds: string[]) {
  debug('_updatePlaylistSocket', status, playlistIds);
  CrossbladeController.setCurrentEvent(status);
  const playlists = game.playlists?.filter((p) => playlistIds.includes(p.id)) ?? [];
  CrossbladeController.crossfadePlaylists(...playlists);
}

export async function updatePlaylistSoundSocket(status: CrossbladeEventKey | null, ...sounds: PlaylistSound[]) {
  debug('updatePlaylistSoundSocket', status, sounds);
  return socket?.executeForEveryone(_updatePlaylistSoundSocket, status, ...sounds.map((s) => s.uuid));
}

function _updatePlaylistSoundSocket(status: CrossbladeEventKey | null, ...soundUuids: string[]) {
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
  protected static _currentStatus: CrossbladeEventKey | null = null;

  static getCurrentEvent(): CrossbladeEventKey | null {
    debug('getCurrentEvent', this._currentStatus);
    return this._currentStatus;
  }

  static setCurrentEvent(status: CrossbladeEventKey | null) {
    debug('getCurrentEvent', status);
    this._currentStatus = status;
  }

  static getCrossbladePlaylists(...playlists: Playlist[]) {
    // Filter down to only crossfade-applicable playlists...
    return playlists?.filter((p) =>
      p.sounds.find((s) => {
        const cbps = s as CrossbladePlaylistSound;
        if (cbps.crossbladeSounds && cbps.crossbladeSounds.size > 0) return true;
        else return false;
      }),
    );
  }
  static async crossfadePlaylists(...playlists: Playlist[]) {
    debug('crossfading Playlists...', playlists);

    playlists = playlists.length ? playlists : game.playlists?.playing || [];
    const crossbladeSounds: PlaylistSound[] = [];
    playlists.forEach((p) =>
      crossbladeSounds.push(
        ...p.sounds.filter((s: PlaylistSound) => {
          const cbps = s as CrossbladePlaylistSound;
          const cbpsSize = cbps.crossbladeSounds?.size;
          const isCrossbladeSound = typeof cbpsSize === 'number' && cbpsSize > 0;
          return s.playing && isCrossbladeSound;
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
      if (cbps.crossbladeSounds && cbps.sound) {
        log('Handling crossfade for', `🎵${pls.name}🎵`);
        if (!cbps.sound.loaded) await cbps.sound.load();
        const uniqueSounds = getUniqueSounds(pls);
        // Ensure all crossblade sounds are loaded before attempting crossfade...
        await Promise.all([...uniqueSounds].map(async (s) => await s.load()));

        if (pls.sound) uniqueSounds.add(pls.sound);
        uniqueSounds.forEach((s) => {
          s.fade(getCrossfadeVolume(pls, s), { duration: pls.fadeDuration });
        });
      }
    });
    debug('...done crossfading sounds', playlistSounds);
  }
}
