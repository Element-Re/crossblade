import { ConfiguredDocumentClass } from '@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes';
import { CrossbladeEventKey, CrossbladeFlags } from './types';
import { CROSSBLADE_EVENTS, debug } from './utils';

export default class CrossbladeSoundConfig<
  Options extends CrossbladeSoundConfig.Options = CrossbladeSoundConfig.Options,
  Data extends CrossbladeSoundConfig.Data<Options> = CrossbladeSoundConfig.Data<Options>,
> extends FormApplication<Options, Data, InstanceType<ConfiguredDocumentClass<typeof PlaylistSound>>> {
  get template() {
    return `modules/crossblade/templates/crossblade-sound-config.hbs`;
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['crossblade-edit-layers'],
      template: 'modules/crossblade/templates/crossblade-sound-config.hbs',
      width: 440,
    });
  }

  /** @override */
  async getData(options: Options) {
    const data = await super.getData(options);
    debug('getData', options, data);
    data.data = this.object.data;
    data.crossbladeEvents = CROSSBLADE_EVENTS;

    debug('data', data);
    return data;
  }

  /** @override */
  protected _getSubmitData(updateData?: object | null | undefined): Record<string, unknown> {
    const submitData = super._getSubmitData(updateData) as {
      flags?: {
        crossblade?: {
          soundLayers?: object | null;
        } | null;
      } | null;
    };
    debug('submitData', submitData);
    // Create the expanded update soundLayers object
    const crossblade = submitData.flags?.crossblade;
    if (crossblade?.soundLayers) {
      crossblade.soundLayers = Object.values(crossblade.soundLayers).map((sl) => [sl[0] || '', sl[1] || '']);
    }
    debug('submitData (after)', submitData);
    return submitData;
  }
  /** @override */
  activateListeners(html: JQuery<HTMLElement>): void {
    debug('activatingListeners...');
    super.activateListeners(html);
    if (this.isEditable) {
      html.find('.crossblade-click-control').on('click', this._onCrossbladeClickControl.bind(this));
      html.find('.crossblade-change-control').on('change', this._onCrossbladeChangeControl.bind(this));
    }
    html.find('.crossblade-help').on('click', (event) => {
      event.stopPropagation();
      event.preventDefault();
    });
  }
  protected async _onCrossbladeChangeControl(event: JQuery.ChangeEvent) {
    debug('change Event...', event);
    const select = event.currentTarget as HTMLSelectElement;
    const $select = $(select);
    if (select.classList.contains('change-event')) {
      const subControl = $select.siblings('.event-subcontrol');
      const event = CROSSBLADE_EVENTS[select.value as CrossbladeEventKey];
      debug('event', event);
      const layerIndex = $select.parents('.crossblade-sound-layer').data('layer');
      const eventIndex = $select.parents('.crossblade-event').data('event');
      //const layerIndex =
      const newContent = await renderTemplate('modules/crossblade/templates/crossblade-sound-event-subcontrol.hbs', {
        options: event.options,
        manualEntry: event.manualEntry,
        layerIndex: layerIndex,
        eventIndex: eventIndex,
      });
      subControl.replaceWith(newContent);
    }
  }

  protected async _onCrossbladeClickControl(event: JQuery.ClickEvent) {
    debug('click Event...', event);
    event.preventDefault();
    event.stopPropagation();
    const a = event.currentTarget as HTMLAnchorElement;
    // Add new layer component
    if (a.classList.contains('add-layer')) {
      debug('adding Layer...');
      const form = $(a).parents('form');
      debug('form', form);

      const soundLayersSection = form.find('#soundLayers');
      const newContent = await renderTemplate('modules/crossblade/templates/crossblade-sound-layer.hbs', {
        index: randomID(),
        crossbladeEvents: CROSSBLADE_EVENTS,
      });

      debug('newContent', newContent);
      const $newContent = $(newContent);
      $newContent.appendTo(soundLayersSection);
      this.activateListeners($newContent);
      this.setPosition({ height: 'auto' });
    }

    // Remove a layer
    if (a.classList.contains('delete-layer')) {
      debug('deleting Layer...');
      const layerContainer = a.closest('.crossblade-sound-layer');
      layerContainer?.remove();
      this.setPosition({ height: 'auto' });
    }

    // Add an event
    if (a.classList.contains('add-event')) {
      debug('adding Event...');
      const soundLayer = $(a).parents('.crossblade-sound-layer');
      const events = soundLayer.find('.crossblade-events');
      const layerIndex = soundLayer.data('layer');
      debug(events);
      const newContent = await renderTemplate('modules/crossblade/templates/crossblade-sound-event.hbs', {
        layerIndex: layerIndex,
        eventIndex: randomID(),
        crossbladeEvents: CROSSBLADE_EVENTS,
      });
      const $newContent = $(newContent);
      $newContent.appendTo(events);
      this.activateListeners($newContent);
      this.setPosition({ height: 'auto' });
    }

    // Remove an event
    if (a.classList.contains('delete-event')) {
      debug('deleting Event...');
      const eventContainer = a.closest('.crossblade-event');
      eventContainer?.remove();
      this.setPosition({ height: 'auto' });
    }
  }

  /** @override */
  protected _updateObject(event: Event, formData: object): Promise<unknown> {
    debug('update object', formData);
    const expandedFormData = expandObject(formData ?? {}) as { flags?: CrossbladeFlags };
    const flags = expandedFormData.flags || {};
    debug('expandedFormData', expandedFormData);
    const crossbladeFlags = flags.crossblade || {};
    debug('crossbladeFlags', crossbladeFlags);
    const soundLayers = crossbladeFlags.soundLayers || {};
    const soundLayersArray = [...Object.values(soundLayers)] as { events?: object }[];
    soundLayersArray.forEach((soundLayer) => {
      const events = soundLayer.events ?? {};
      const eventsArray = Array.from(Object.values(events)).map((event) => {
        // Ensure an array of trimmed strings, no more than 2 in length.
        return (Array.isArray(event) ? event.slice(0, 2) : [event]).map((part) => part.toString().trim());
      });
      soundLayer.events = eventsArray;
    });
    debug('soundLayersArray', soundLayersArray);
    return this.object.unsetFlag('crossblade', 'soundLayers').then(() => {
      this.object.setFlag('crossblade', 'soundLayers', soundLayersArray);
    });
  }
  /** @override */
  get title() {
    const name = this.object.name ?? this.object.id;
    const reference = name ? `: ${name}` : '';
    return `${game.i18n.localize('CROSSBLADE.Layers.Config')}${reference}`;
  }
}

namespace CrossbladeSoundConfig {
  export interface Data<Options extends CrossbladeSoundConfig.Options = CrossbladeSoundConfig.Options>
    extends PlaylistSoundConfig<Options, Data> {
    data: {
      flags: { crossblade?: { disp_trigger?: string[] } };
    };
    crossbladeEvents?: typeof CROSSBLADE_EVENTS;
  }
  export type Options = DocumentSheetOptions;
}
