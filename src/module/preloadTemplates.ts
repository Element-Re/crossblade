import { log } from './utils';

export async function preloadTemplates(): Promise<Handlebars.TemplateDelegate[]> {
  log('Preloading templates...');
  const templatePaths: string[] = [
    // Templates
    'modules/crossblade/templates/crossblade-sound-config.hbs',
    'modules/crossblade/templates/crossblade-sound-layer.hbs',
    'modules/crossblade/templates/crossblade-sound-event.hbs',
    'modules/crossblade/templates/crossblade-sound-event-subcontrol.hbs',
    'modules/crossblade/templates/crossblade-custom-event-directory-header.hbs',
  ];
  const subcontrolTemplateIndex = templatePaths.indexOf(
    'modules/crossblade/templates/crossblade-sound-event-subcontrol.hbs',
  );
  return loadTemplates(templatePaths).then((templates) => {
    Handlebars.registerPartial('crossbladeSoundEventSubcontrol', templates[subcontrolTemplateIndex]);
    return templates;
  });
}
