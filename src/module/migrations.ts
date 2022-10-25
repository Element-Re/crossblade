import { PlaylistSoundDataProperties } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/playlistSoundData';
import { PropertiesToSource } from '@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes';
import { CrossbladeModule } from './types';
import { debug, log, MODULE_ID } from './utils';

/**
 * Perform a module migration for the entire World, applying migrations for Playlists and Compendium packs
 * @returns {Promise}      A Promise which resolves once the migration is completed
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const migrateWorld = async function (): Promise<any> {
  const module = game.modules.get(MODULE_ID) as CrossbladeModule;
  if (!module) return;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore TODO: v10 type implementation for module.version
  const version = module.version;
  ui.notifications.info(game.i18n.format('CROSSBLADE.Migration.Begin', { version }), { permanent: true });

  // Migrate World PlaylistSounds
  for (const pls of game.playlists?.map((playlist) => playlist.sounds.contents).flat() ?? []) {
    try {
      const updateData = migratePlaylistSoundData(pls.toObject());
      if (!foundry.utils.isObjectEmpty(updateData)) {
        log(`Migrating ${pls.documentName} ${pls.name} of ${pls.parent?.documentName} ${pls.parent?.name}`);
        await pls.update(updateData, { enforceTypes: false });
      }
    } catch (err) {
      if (err instanceof Error) {
        err.message = `Failed crossblade module migration for PlaylistSound ${pls.name}: ${err.message}`;
      }
      console.error(err);
    }
  }

  // Migrate World Compendium Packs
  for (const p of game.packs) {
    if (p.metadata.package !== 'world') continue;
    if (p.documentName !== 'Playlist') continue;
    await migrateCompendium(p);
  }

  // Set the migration as complete
  game.settings.set(MODULE_ID, 'moduleMigrationVersion', version);
  ui.notifications.info(game.i18n.format('CROSSBLADE.Migration.End', { version }), { permanent: true });
};

/* -------------------------------------------- */

/**
 * Apply migration rules to all Documents within a single Compendium pack
 * @param {CompendiumCollection} pack  Pack to be migrated.
 * @returns {Promise}
 */
export const migrateCompendium = async function (
  pack: CompendiumCollection<CompendiumCollection.Metadata>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  debug(`migrating ${pack.documentName} Pack ${pack.name} ...`);
  const documentName = pack.documentName;
  if (documentName !== 'Playlist') return;
  // Unlock the pack for editing
  const wasLocked = pack.locked;
  await pack.configure({ locked: false });
  // Begin by requesting server-side data model migration and get the migrated content
  const playlists = (await pack.getDocuments()) as StoredDocument<Playlist>[];
  // Iterate over compendium entries - applying fine-tuned migration functions
  for (const playlist of playlists) {
    for (const pls of playlist.sounds) {
      try {
        const updateData = migratePlaylistSoundData(pls.toObject());
        // Save the entry, if data was changed
        if (foundry.utils.isObjectEmpty(updateData)) continue;
        await pls.update(updateData);
        log(
          `Migrated Crossblade data for ${pls.documentName} ${pls.name} of ${playlist.documentName} ${playlist.name} in Compendium ${pack.collection}`,
        );
      } catch (err) {
        // Handle migration failures
        if (err instanceof Error) {
          err.message = `Failed Crossblade data migration for ${pls.documentName} ${pls.name} of ${playlist.documentName} ${playlist.name} in Compendium ${pack.collection}: ${err.message}`;
        }
        console.error(err);
      }
    }
  }
  // Apply the original locked status for the pack
  await pack.configure({ locked: wasLocked });
  log(`Migrated all ${documentName} documents from Compendium ${pack.collection}`);
};

interface CrossbladePlaylistSoundDataProperties extends PropertiesToSource<PlaylistSoundDataProperties> {
  flags: {
    crossblade?: {
      soundLayers?: {
        src?: string;
        events?: [];
      }[];
    };
  };
}

interface CrossbladePlaylistSoundUpdateData {
  flags?: {
    crossblade?: {
      soundLayers?: {
        src?: string;
        events?: unknown[];
      }[];
    };
  };
}

/**
 * Migrate a single PlaylistSound document to incorporate latest data model changes
 * Return an Object of updateData to be applied
 * @param {PlaylistSound} plsData       The actor data object to update
 * @returns {object}                The updateData to apply
 */
export const migratePlaylistSoundData = (plsData: CrossbladePlaylistSoundDataProperties): object => {
  debug('migratePlaylistSoundData', plsData);
  const updateData = {} as CrossbladePlaylistSoundUpdateData;

  // Actor Data Updates
  if (plsData.flags) {
    _migratePlaylistSoundCrossbladeEvents(plsData, updateData);
  }
  debug('updateData', updateData);
  return updateData;
};

const _migratePlaylistSoundCrossbladeEvents = (
  plsData: CrossbladePlaylistSoundDataProperties,
  updateData: CrossbladePlaylistSoundUpdateData,
) => {
  const soundLayers = plsData.flags.crossblade?.soundLayers;
  if (!soundLayers?.length) return;
  const updatedLayers = soundLayers
    // Only update layers with string events
    .filter((layer) => layer.events?.some((event) => typeof event === 'string'))
    .map((layer) => {
      return {
        src: layer.src,
        events:
          layer.events?.map((event) => {
            if (typeof event !== 'string') return event;
            switch (event) {
              case 'COMBAT_DISPOSITION_FRIENDLY':
                return ['COMBATANT', 'FRIENDLY'];
              case 'COMBAT_DISPOSITION_NEUTRAL':
                return ['COMBATANT', 'NEUTRAL'];
              case 'COMBAT_DISPOSITION_HOSTILE':
                return ['COMBATANT', 'HOSTILE'];
              case 'GAME_PAUSED':
                return ['GAME', 'PAUSED'];
              default:
                return ['DEFAULT'];
            }
          }) ?? [],
      };
    });
  if (updatedLayers.length) {
    updateData.flags = { crossblade: { soundLayers: updatedLayers } };
  }
};
