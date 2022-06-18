import { log } from './utils';

export async function preloadTemplates(): Promise<Handlebars.TemplateDelegate[]> {
  log('Preloading templates...');
  const templatePaths: string[] = [
    // Templates
    'modules/crossblade/templates/crossblade-sound-config.hbs',
    'modules/crossblade/templates/crossblade-sound-config-section.hbs',
    'modules/crossblade/templates/crossblade-sound-layer.hbs',
  ];

  return loadTemplates(templatePaths);
}
