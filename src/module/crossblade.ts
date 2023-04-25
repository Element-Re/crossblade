import { registerSettings } from './settings.js';
import { preloadTemplates, registerHandlebarsHelpers } from './handlebars.js';
import { MODULE_ID, log, setCustomEvent, getCustomEvent, getPlayingCustomEvents, getAllCustomEvents } from './utils.js';
import { CrossbladeModule } from './types.js';
import { registerCriticalOverrides, registerOptionalOverrides } from './overrides.js';
import { migratePlaylistSoundData, migrateCompendium, migrateWorld } from './migrations.js';
import { registerCriticalHooks, registerOptionalHooks } from './hooks.js';

// Initialize module
Hooks.once('init', async () => {
  log('Initializing crossblade');

  const crossbladeModule = game.modules.get(MODULE_ID) as CrossbladeModule | undefined;
  if (crossbladeModule) {
    crossbladeModule.api = {
      getCustomEvent: getCustomEvent,
      setCustomEvent: setCustomEvent,
      getPlayingCustomEvents: getPlayingCustomEvents,
      getAllCustomEvents: getAllCustomEvents,
    };
    crossbladeModule.migrations = {
      migrateWorld: migrateWorld,
      migrateCompendium: migrateCompendium,
      migratePlaylistSoundData: migratePlaylistSoundData,
    };
  }
  // Register custom module settings
  registerSettings();

  // Register critical hooks that are needed even if the client setting indicates module functionality is disabled
  registerCriticalHooks();

  // Register critical overrides for default foundry classes
  registerCriticalOverrides();

  // Preload Handlebars templates
  await preloadTemplates();
  // Register Handlebars helpers
  registerHandlebarsHelpers();

  if (game.settings.get(MODULE_ID, 'enable') !== true) {
    log('Initialization aborted due to client setting. Most functionality will be disabled.');
    return;
  }

  // Register optional hooks that are only needed if the client setting indicates module functionality is enabled
  registerOptionalHooks();

  // Register optional overrides for default foundry classes
  registerOptionalOverrides();
});
