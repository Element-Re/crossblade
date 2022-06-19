import { ConfiguredDocumentClass } from '@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes';
import { CrossbladeFlags } from './types';
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
      width: 360,
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
    // Create the expanded update soundLayers object
    const crossblade = submitData.flags?.crossblade;
    if (crossblade?.soundLayers) {
      crossblade.soundLayers = Object.values(crossblade.soundLayers).map((sl) => [sl[0] || '', sl[1] || '']);
    }
    return submitData;
  }
  /** @override */
  activateListeners(html: JQuery<HTMLElement>): void {
    debug('activatingListeners...');
    super.activateListeners(html);
    if (this.isEditable) {
      html.find('.crossblade-layer-control').on('click', this._onCrossbladeLayerControl.bind(this));
    }
    html.find('.crossblade-help').on('click', (event) => {
      event.stopPropagation();
      event.preventDefault();
    });
  }

  protected async _onCrossbladeLayerControl(event: Event) {
    debug('control Event...', event);
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
    return this.object
      .unsetFlag('crossblade', 'soundLayers')
      .then(() => {
        this.object.setFlag('crossblade', 'soundLayers', Array.from(Object.values(soundLayers)) ?? []);
      })
      .then(() => {
        debug(this.object.data.flags);
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
