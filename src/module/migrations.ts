import { PlaylistSoundDataProperties } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/playlistSoundData';
import { PropertiesToSource } from '@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes';
import { CrossbladeModule } from './types';
import { debug, log, MODULE_ID } from './utils';

/**
 * Perform a system migration for the entire World, applying migrations for Actors, Items, and Compendium packs
 * @returns {Promise}      A Promise which resolves once the migration is completed
 */
export const migrateWorld = async function () {
  const module = game.modules.get(MODULE_ID) as CrossbladeModule;
  if (!module) return;
  const version = module.data.version;
  ui.notifications.info(game.i18n.format('CROSSBLADE.Migration.Begin', { version }), { permanent: true });

  // Migrate World PlaylistSounds
  for (const pls of game.playlists?.map((playlist) => playlist.sounds.contents).flat() ?? []) {
    try {
      const updateData = migratePlaylistSoundData(pls.toObject());
      if (!foundry.utils.isObjectEmpty(updateData)) {
        console.log(`Migrating PlaylistSound document ${pls.name}`);
        await pls.update(updateData, { enforceTypes: false });
      }
    } catch (err) {
      if (err instanceof Error) {
        err.message = `Failed crossblade module migration for PlaylistSound ${pls.name}: ${err.message}`;
      }
      console.error(err);
    }
  }

  // // Migrate World Compendium Packs
  // for (let p of game.packs) {
  //   if (p.metadata.package !== 'world') continue;
  //   if (!['Actor', 'Item', 'Scene'].includes(p.documentName)) continue;
  //   await migrateCompendium(p);
  // }

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const migrateCompendium = async function (pack: Compendium<any, any, any>) {
  debug('migrating Pack...', pack);
  // const documentName = pack.documentName;
  // if (!['Actor', 'Item', 'Scene'].includes(documentName)) return;
  // const migrationData = await getMigrationData();
  // // Unlock the pack for editing
  // const wasLocked = pack.locked;
  // await pack.configure({ locked: false });
  // // Begin by requesting server-side data model migration and get the migrated content
  // await pack.migrate();
  // const documents = await pack.getDocuments();
  // // Iterate over compendium entries - applying fine-tuned migration functions
  // for (let doc of documents) {
  //   let updateData = {};
  //   try {
  //     switch (documentName) {
  //       case 'Actor':
  //         updateData = migratePlaylistSoundData(doc.toObject(), migrationData);
  //         break;
  //       case 'Item':
  //         updateData = migrateItemData(doc.toObject(), migrationData);
  //         break;
  //       case 'Scene':
  //         updateData = migrateSceneData(doc.data, migrationData);
  //         break;
  //     }
  //     // Save the entry, if data was changed
  //     if (foundry.utils.isObjectEmpty(updateData)) continue;
  //     await doc.update(updateData);
  //     console.log(`Migrated ${documentName} document ${doc.name} in Compendium ${pack.collection}`);
  //   } catch (err) {
  //     // Handle migration failures
  //     err.message = `Failed dnd5e system migration for document ${doc.name} in pack ${pack.collection}: ${err.message}`;
  //     console.error(err);
  //   }
  // }
  // // Apply the original locked status for the pack
  // await pack.configure({ locked: wasLocked });
  // console.log(`Migrated all ${documentName} documents from Compendium ${pack.collection}`);
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
  log('migrating pls', plsData);
  const updateData = {} as CrossbladePlaylistSoundUpdateData;

  // Actor Data Updates
  if (plsData.flags) {
    _migratePlaylistSoundCrossbladeEvents(plsData, updateData);
  }

  return updateData;
};

const _migratePlaylistSoundCrossbladeEvents = (
  plsData: CrossbladePlaylistSoundDataProperties,
  updateData: CrossbladePlaylistSoundUpdateData,
) => {
  const soundLayers = plsData.flags.crossblade?.soundLayers;
  if (!soundLayers?.length) return updateData;
  const updatedLayers = soundLayers
    // Only update layers with string events
    //.filter((layer) => layer.events?.some((event) => typeof event === 'string'))
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
  log('updateData', updateData);
  return updateData;
};
