import { registerSettings } from './settings';
import { preloadTemplates } from './preloadTemplates';
import CrossbladeSoundConfig from './CrossbladeSoundConfig';
import { libWrapper } from './shim';
import {
  MODULE_ID,
  log,
  debug,
  inArray,
  CrossbladeController,
  getUniqueCrossbladeSounds,
  setCustomEvent,
  getCustomEvent,
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
  if (game.settings.get(MODULE_ID, 'combatEvents') === true) {
    CrossbladeController.crossfadePlaylists();
  }
});

Hooks.on('deleteCombat', async () => {
  if (game.settings.get(MODULE_ID, 'combatEvents') === true) {
    CrossbladeController.crossfadePlaylists();
  }
});

Hooks.on('pauseGame', async () => {
  CrossbladeController.crossfadePlaylists();
});

Hooks.on('globalPlaylistVolumeChanged', async () => {
  CrossbladeController.crossfadePlaylists();
});

Hooks.once('ready', async () => {
  CrossbladeController.crossfadePlaylists();

  if (!game.user?.isGM) return;
  const crossbladeModule = game.modules.get(MODULE_ID) as CrossbladeModule | undefined;
  if (!crossbladeModule) return;
  crossbladeModule.api = {
    getCustomEvent: getCustomEvent,
    setCustomEvent: setCustomEvent,
  };
  crossbladeModule.migrations = {
    migrateWorld: migrateWorld,
    migrateCompendium: migrateCompendium,
    migratePlaylistSoundData: migratePlaylistSoundData,
  };
  // Determine whether a module migration is required
  const latestMigrationVersion = game.settings.get(MODULE_ID, 'moduleMigrationVersion') as string | undefined;
  const NEEDS_MIGRATION_VERSION = '1.0.7';
  const totalDocuments = game.playlists?.size ?? 0;
  if (!latestMigrationVersion && totalDocuments === 0)
    return game.settings.set(MODULE_ID, 'moduleMigrationVersion', crossbladeModule.data.version);
  const needsMigration = !latestMigrationVersion || isNewerVersion(NEEDS_MIGRATION_VERSION, latestMigrationVersion);
  if (!needsMigration) return;

  // Perform the migration
  crossbladeModule.migrations.migrateWorld();
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

// Header bar buttons for sound config
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

// Scene control buttons
Hooks.on('getSceneControlButtons', (buttons) => {
  if (!canvas) return;
  const group = buttons.find((b) => b.name === 'sounds') as SceneControl;
  group.tools.push(
    {
      icon: 'fas fa-pause',
      name: 'CROSSBLADE.Settings.Events.CombatPauseEvent.Name',
      title: 'CROSSBLADE.Settings.Events.CombatPauseEvent.Hint',
      onClick: () => {
        game.settings.set(MODULE_ID, 'combatPauseEvent', !(game.settings.get(MODULE_ID, 'combatPauseEvent') ?? false));
      },
      active: game.settings.get(MODULE_ID, 'combatPauseEvent') === true,
      toggle: true,
    },
    {
      icon: 'crossblade-font-icon',
      name: 'CROSSBLADE.Settings.Events.CombatEvents.Name',
      title: 'CROSSBLADE.Settings.Events.CombatEvents.Hint',
      onClick: () => {
        game.settings.set(MODULE_ID, 'combatEvents', !(game.settings.get(MODULE_ID, 'combatEvents') ?? false));
      },
      active: game.settings.get(MODULE_ID, 'combatEvents') === true,
      toggle: true,
    },
  );
});

// Right sidebar playlist
Hooks.on('renderPlaylistDirectory', async (app: Application, html: JQuery) => {
  if (game.user?.isGM) {
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
    if (game.settings.get(MODULE_ID, 'playlistDirectoryCustomEvent') === true) {
      const $directoryHeader = html.find('header.directory-header');
      const customEventRow = await renderTemplate(
        'modules/crossblade/templates/crossblade-custom-event-directory-header.hbs',
        {
          value: game.settings.get(MODULE_ID, 'customEvent'),
        },
      );
      $directoryHeader.append(customEventRow);
      const module = game.modules.get(MODULE_ID) as CrossbladeModule;
      const $customEventInput = $directoryHeader.find('input[name=customEvent]');
      $customEventInput.on('keypress', (event) => {
        if (event.key === 'Enter') module.api.setCustomEvent($customEventInput.val() as string | undefined);
      });
      $customEventInput.on('focusin', () => $customEventInput.trigger('select'));
      $customEventInput.on('focusout', () => {
        if ($customEventInput.val() !== $customEventInput.attr('value')) {
          // Wait a moment to see if the user updates by clicking the set button
          setTimeout(() => {
            if ($.contains(document.documentElement, $customEventInput.get(0) as HTMLElement)) {
              if ($customEventInput.val() !== $customEventInput.attr('value')) {
                $customEventInput.addClass('warn');
                if (game.settings.get(MODULE_ID, 'playlistDirectoryCustomEventWarning')) {
                  ui.notifications.warn('CROSSBLADE.Notifications.UI.PlaylistDirectoryCustomEventWarning', {
                    localize: true,
                  });
                }
              } else {
                $customEventInput.removeClass('warn');
              }
            }
          }, 200);
        }
      });
      const $setCustomEventAnchor = $directoryHeader.find('a.set-custom-event');
      $setCustomEventAnchor.on('click', () => module.api.setCustomEvent($customEventInput.val() as string | undefined));
      const $clearCustomEventAnchor = $directoryHeader.find('a.clear-custom-event');
      $clearCustomEventAnchor.on('click', () => module.api.setCustomEvent());
    }
  }
});
