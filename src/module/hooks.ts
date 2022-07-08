import CrossbladeSoundConfig from './CrossbladeSoundConfig';
import { CrossbladeModule, CrossbladePlaylistSound, DevModeApi } from './types';
import {
  CrossbladeController,
  debug,
  formatCustomEvent,
  getAllCustomEvents,
  getCustomEvent,
  getPlayingCustomEvents,
  getUniqueCrossbladeSounds,
  MODULE_ID,
} from './utils';

export function registerCriticalHooks() {
  Hooks.once('ready', async () => {
    if (!game.user?.isGM) return;
    const crossbladeModule = game.modules.get(MODULE_ID) as CrossbladeModule | undefined;
    if (!crossbladeModule) return;
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

  // Dev mode
  Hooks.once('devModeReady', (api: DevModeApi) => {
    api.registerPackageDebugFlag(MODULE_ID, 'boolean');
  });

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
          game.settings.set(
            MODULE_ID,
            'combatPauseEvent',
            !(game.settings.get(MODULE_ID, 'combatPauseEvent') ?? false),
          );
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
}

export function registerOptionalHooks() {
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

  Hooks.once('ready', () => {
    if (game.settings.get(MODULE_ID, 'enable') === true) {
      CrossbladeController.crossfadePlaylists();
    }
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
      const directoryCustomEventSetting = game.settings.get(MODULE_ID, 'playlistDirectoryCustomEvent') as string;
      if (['DROPDOWN', 'INPUT'].includes(directoryCustomEventSetting)) {
        const $directoryHeader = html.find('header.directory-header');
        const customEvent = getCustomEvent();
        const formattedCustomEvent = formatCustomEvent(customEvent);
        const status =
          formattedCustomEvent && game.playlists?.playing.length
            ? game.playlists?.playing.some((playlist) =>
                playlist.sounds.some(
                  (pls) =>
                    pls.playing &&
                    [...((pls as CrossbladePlaylistSound).cbSoundLayers?.values() ?? [])]
                      .flat()
                      .some((event) => event === formattedCustomEvent),
                ),
              )
              ? 'active'
              : 'inactive'
            : undefined;
        let options: string[] | undefined;
        if (directoryCustomEventSetting === 'DROPDOWN') {
          const allCustomEvents = getAllCustomEvents({ sort: true });
          options = [
            '',
            ...(customEvent && !allCustomEvents.has(customEvent) ? [customEvent] : []),
            ...allCustomEvents,
          ];
        }
        const customEventRow = await renderTemplate(
          'modules/crossblade/templates/crossblade-custom-event-directory-header.hbs',
          {
            value: customEvent,
            status: status,
            options: options,
            playing: options ? getPlayingCustomEvents() : undefined,
          },
        );
        $directoryHeader.append(customEventRow);
        const module = game.modules.get(MODULE_ID) as CrossbladeModule;

        if (directoryCustomEventSetting === 'DROPDOWN') {
          $directoryHeader.find('select[name=customEvent]').on('change', (event) => {
            module.api.setCustomEvent($(event.target).val() as string | undefined);
          });
        } else if (directoryCustomEventSetting === 'INPUT') {
          const $customEventInput = $directoryHeader.find('input[name=customEvent]');
          // Input handling
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
          $setCustomEventAnchor.on('click', () =>
            module.api.setCustomEvent($customEventInput.val() as string | undefined),
          );
          const $clearCustomEventAnchor = $directoryHeader.find('a.clear-custom-event');
          $clearCustomEventAnchor.on('click', () => module.api.setCustomEvent());
        }
      }
    }
  });
}
