import { CrossbladeController, log, MODULE_ID } from './utils';

export function registerSettings(): void {
  // Register any custom module settings

  game.settings.register(MODULE_ID, 'enable', {
    name: 'CROSSBLADE.Settings.Module.Enable.Name',
    hint: 'CROSSBLADE.Settings.Module.Enable.Hint',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
    onChange: async () => {
      CrossbladeController.crossfadePlaylists();
    },
  });

  // Internal Module Migration Version
  game.settings.register(MODULE_ID, 'moduleMigrationVersion', {
    name: 'Module Migration Version',
    scope: 'world',
    config: false,
    type: String,
    default: '',
  });

  game.settings.register(MODULE_ID, 'customEvent', {
    name: 'CROSSBLADE.Settings.Events.Custom.Name',
    hint: 'CROSSBLADE.Settings.Events.Custom.Hint',
    scope: 'world',
    config: true,
    type: String,
    onChange: async (value) => {
      if (game.user?.isGM) {
        if (value) log(game.i18n.format('CROSSBLADE.Settings.Events.Custom.SetTo', { value: value }));
        else log(game.i18n.format('CROSSBLADE.Settings.Events.Custom.Cleared'));
      }
      ui.playlists.render();
      CrossbladeController.crossfadePlaylists();
    },
  });

  game.settings.register(MODULE_ID, 'playlistDirectoryCustomEvent', {
    name: 'CROSSBLADE.Settings.UI.PlaylistDirectoryCustomEvent.Name',
    hint: 'CROSSBLADE.Settings.UI.PlaylistDirectoryCustomEvent.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
    onChange: async () => {
      if (game.user?.isGM) {
        ui.playlists.render();
      }
    },
  });

  game.settings.register(MODULE_ID, 'combatEvents', {
    name: 'CROSSBLADE.Settings.Events.CombatEvents.Name',
    hint: 'CROSSBLADE.Settings.Events.CombatEvents.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => {
      if (game.user?.isGM) {
        log(`CROSSBLADE.Settings.Events.CombatEvents.${value ? 'Enabled' : 'Disabled'}`);
      }
      CrossbladeController.crossfadePlaylists();
    },
  });
  game.settings.register(MODULE_ID, 'combatPauseEvent', {
    name: 'CROSSBLADE.Settings.Events.CombatPauseEvent.Name',
    hint: 'CROSSBLADE.Settings.Events.CombatPauseEvent.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => {
      if (game.user?.isGM) {
        log(`CROSSBLADE.Settings.Events.CombatPauseEvent.${value ? 'Enabled' : 'Disabled'}`);
      }
      CrossbladeController.crossfadePlaylists();
    },
  });
}
