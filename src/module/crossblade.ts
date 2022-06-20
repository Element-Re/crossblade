import { registerSettings } from './settings';
import { preloadTemplates } from './preloadTemplates';
import CrossbladeSoundConfig from './CrossbladeSoundConfig';
import { libWrapper } from './shim';
import {
  MODULE_ID,
  log,
  debug,
  inArray,
  updatePlaylistSocket,
  getCrossbladeEvent,
  updatePlaylistSoundSocket,
  updateCrossbladeEventSocket,
  getCrossbladeEventSocket,
  CrossbladeController,
  crossfadePlaylistsSocket,
  isLeadGM,
  getUniqueSounds,
} from './utils';
import { DevModeApi, CrossbladePlaylistSound } from './types';
import { PlaylistDirectoryOverrides, PlaylistOverrides, PlaylistSoundOverrides } from './overrides';

// Initialize module
Hooks.once('init', async () => {
  log('Initializing crossblade');

  // Register custom module settings
  registerSettings();

  // Preload Handlebars templates
  await preloadTemplates();

  Object.defineProperty(PlaylistSound.prototype, 'crossbladeSounds', {
    get: PlaylistSoundOverrides.crossbladeSoundsGetter,
  });
  libWrapper.register(MODULE_ID, 'PlaylistSound.prototype.sync', PlaylistSoundOverrides.syncWrapper, 'WRAPPER');
  libWrapper.register(
    MODULE_ID,
    'PlaylistSound.prototype._onUpdate',
    PlaylistSoundOverrides._onUpdateWrapper,
    'WRAPPER',
  );
  libWrapper.register(MODULE_ID, 'Playlist.prototype._onSoundStart', PlaylistOverrides._onSoundStartWrapper, 'WRAPPER');
  libWrapper.register(MODULE_ID, 'Playlist.prototype._onDelete', PlaylistOverrides._onDeleteWrapper, 'WRAPPER');
  libWrapper.register(
    MODULE_ID,
    'PlaylistDirectory.prototype._onSoundVolume',
    PlaylistDirectoryOverrides._onSoundVolumeWrapper,
    'WRAPPER',
  );
  libWrapper.register(
    MODULE_ID,
    'PlaylistDirectory.prototype._getSoundContextOptions',
    PlaylistDirectoryOverrides._getSoundContextOptionsWrapper,
    'WRAPPER',
  );

  Handlebars.registerHelper('inArray', inArray);
});

// Hooks

Hooks.once('devModeReady', (api: DevModeApi) => {
  api.registerPackageDebugFlag(MODULE_ID, 'boolean');
});

Hooks.on('updateCombat', async () => {
  await updatePlaylistSocket(getCrossbladeEvent());
});

Hooks.on('updatePlaylist', async (playlist: Playlist) => {
  await updatePlaylistSocket(getCrossbladeEvent(), playlist);
});

Hooks.on('updatePlaylistSound', async (sound: PlaylistSound) => {
  await updatePlaylistSoundSocket(getCrossbladeEvent(), sound);
});

Hooks.on('deleteCombat', async () => {
  await updateCrossbladeEventSocket(getCrossbladeEvent());
});

Hooks.on('pauseGame', async () => {
  if (isLeadGM()) {
    await updateCrossbladeEventSocket(getCrossbladeEvent());
  }
});

Hooks.on('globalPlaylistVolumeChanged', async () => {
  await crossfadePlaylistsSocket();
});

Hooks.once('ready', async () => {
  CrossbladeController.setCurrentEvent((await getCrossbladeEventSocket()) || null);
  CrossbladeController.crossfadePlaylists();
});

// Right-click menu context hook for playlists
Hooks.on(
  'getPlaylistDirectoryEntryContext',
  (html: string, entryOptions: { name: string; icon: string; callback: (target: JQuery) => void }[]) => {
    if (game.user?.isGM) {
      entryOptions.push({
        name: 'CROSSBLADE.PlaylistContext.Preload',
        icon: '<i class="fas fa-download fa-fw"></i>',
        callback: async function (target: JQuery): Promise<void> {
          const playlist = game.playlists?.get(target.data('document-id'));
          playlist?.sounds.forEach((pls: CrossbladePlaylistSound) => {
            if (pls.sound) {
              AudioHelper.preloadSound(pls.sound.src);
              if (pls.crossbladeSounds) {
                getUniqueSounds(pls).forEach((cbs) => {
                  AudioHelper.preloadSound(cbs.src);
                });
              }
            }
          });
        },
      });
    }
  },
);

// Header button bars for sound config
Hooks.on(
  'getPlaylistSoundConfigHeaderButtons',
  (soundConfig: PlaylistSoundConfig, buttons: Application.HeaderButton[]) => {
    if (soundConfig.document.id) {
      buttons.unshift({
        label: 'Crossblade',
        class: 'crossblade-config',
        icon: 'crossblade-font-icon',
        onclick: () => {
          debug('onclick');
          new CrossbladeSoundConfig(soundConfig.document).render(true);
        },
      });
    }
  },
);

// Header button bars for sound config
Hooks.on('getSceneControlButtons', (buttons) => {
  if (!canvas) return;
  const group = buttons.find((b) => b.name === 'sounds') as SceneControl;
  group.tools.push({
    icon: 'fas fa-pause',
    name: 'CROSSBLADE.Settings.Combat.Pause.Name',
    title: 'CROSSBLADE.Settings.Combat.Pause.Hint',
    onClick: () => {
      game.settings.set(MODULE_ID, 'combatPause', !(game.settings.get(MODULE_ID, 'combatPause') ?? false));
    },
    active: game.settings.get(MODULE_ID, 'combatPause') === true,
    toggle: true,
  });
});
