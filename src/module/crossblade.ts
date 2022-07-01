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
  updateCrossbladeEventSocket,
  getCrossbladeEventSocket,
  CrossbladeController,
  crossfadePlaylistsSocket,
  isLeadGM,
  getUniqueCrossbladeSounds,
} from './utils';
import { DevModeApi, CrossbladePlaylistSound, CrossbladeModule } from './types';
import { PlaylistDirectoryOverrides, PlaylistOverrides, PlaylistSoundOverrides } from './overrides';
import { migratePlaylistSoundData, migrateCompendium, migrateWorld } from './migrations';

// Initialize module
Hooks.once('init', async () => {
  log('Initializing crossblade');

  // Register custom module settings
  registerSettings();

  // Preload Handlebars templates
  await preloadTemplates();

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

// Hooks.on('updatePlaylist', async (playlist: Playlist) => {
//   await updatePlaylistSocket(getCrossbladeEvent(), playlist);
// });

// Hooks.on('updatePlaylistSound', async (sound: PlaylistSound) => {
//   await updatePlaylistSoundSocket(getCrossbladeEvent(), sound);
// });

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
  CrossbladeController.setCurrentEvent((await getCrossbladeEventSocket()) || 'DEFAULT');
  CrossbladeController.crossfadePlaylists();

  // Determine whether a module migration is required and feasible
  if (!game.user?.isGM) return;
  const crossbladeModule = game.modules.get(MODULE_ID) as CrossbladeModule | undefined;

  if (!crossbladeModule) return;
  crossbladeModule.migrations = {
    migrateWorld: migrateWorld,
    migrateCompendium: migrateCompendium,
    migratePlaylistSoundData: migratePlaylistSoundData,
  };
  const latestMigrationVersion = game.settings.get(MODULE_ID, 'moduleMigrationVersion') as string | undefined;
  const NEEDS_MIGRATION_VERSION = '1.0.7';
  const COMPATIBLE_MIGRATION_VERSION = '1.0.0';
  const totalDocuments = game.playlists?.size ?? 0;
  if (!latestMigrationVersion && totalDocuments === 0)
    return game.settings.set(MODULE_ID, 'moduleMigrationVersion', crossbladeModule.data.version);
  const needsMigration = !latestMigrationVersion || isNewerVersion(NEEDS_MIGRATION_VERSION, latestMigrationVersion);
  if (!needsMigration) return;

  // Perform the migration
  if (latestMigrationVersion && isNewerVersion(COMPATIBLE_MIGRATION_VERSION, latestMigrationVersion)) {
    ui.notifications.error(game.i18n.localize('CROSSBLADE.Migration.VersionTooOldWarning'), { permanent: true });
  }
  Dialog.confirm({
    title: game.i18n.localize(`CROSSBLADE.Migration.Needed.Dialog.Title`),
    content: game.i18n.localize(`CROSSBLADE.Migration.Needed.Dialog.Content`),
    // TODO: This seems to crash the client when more than 30 or so sounds need to be migrated,
    // due to updates triggering a sync and preloading all sounds and layers, causing the heap to run out of memory.
    // The migrations do complete successfully though...
    yes: () => crossbladeModule.migrations.migrateWorld(),
  });
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
              if (pls.cbSoundLayers) {
                getUniqueCrossbladeSounds(pls).forEach((cbs) => {
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

Hooks.on('renderPlaylistDirectory', (app: Application, html: JQuery) => {
  const sounds = html.find('.directory-list .sound');
  sounds.each((index, sound) => {
    const $sound = $(sound);
    const playlistId = $sound.data('playlist-id');
    const soundId = $sound.data('sound-id');
    if (typeof playlistId === 'string' && typeof soundId === 'string') {
      const gameSound = game.playlists?.get(playlistId)?.sounds.get(soundId) as CrossbladePlaylistSound;
      const uniqueSounds = getUniqueCrossbladeSounds(gameSound);
      if (uniqueSounds.size) {
        const crossbladeIcon = `<i class="crossblade-font-icon fa-fw" title="${game.i18n.format(
          'CROSSBLADE.Layers.Count',
          { count: uniqueSounds.size },
        )}"></i>`;
        $sound.find('.sound-name').append(crossbladeIcon);
      }
    }
  });
});
