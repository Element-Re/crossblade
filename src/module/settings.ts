import { CrossbladeController, getCrossbladeEvent, MODULE_ID, updateCrossbladeEventSocket } from './utils';

export function registerSettings(): void {
  // Register any custom module settings
  game.settings.register(MODULE_ID, 'enable', {
    name: 'CROSSBLADE.Settings.Enable.Name',
    hint: 'CROSSBLADE.Settings.Enable.Hint',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
    onChange: async () => {
      CrossbladeController.crossfadePlaylists();
    },
  });

  game.settings.register(MODULE_ID, 'combatPause', {
    name: 'CROSSBLADE.Settings.Combat.Pause.Name',
    hint: 'CROSSBLADE.Settings.Combat.Pause.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
    onChange: async () => {
      await updateCrossbladeEventSocket(getCrossbladeEvent());
    },
  });
}
