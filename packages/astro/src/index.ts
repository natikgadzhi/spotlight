import type { AstroIntegration } from 'astro';
import { SPOTLIGHT_SERVER_SNIPPET, buildClientInitSnippet, type ClientInitOptions } from './snippets';

import path from 'path';
import url from 'url';

import { errorPageInjectionPlugin } from './vite/error-page';

const PKG_NAME = '@spotlightjs/astro';

export type SpotlightOptions =
  | {
      __debugOptions?: ClientInitOptions;
      debug: boolean;
    }
  | undefined;

const createPlugin = (options?: SpotlightOptions): AstroIntegration => {
  const thisFilePath = url.fileURLToPath(import.meta.url);

  return {
    name: PKG_NAME,

    hooks: {
      'astro:config:setup': async ({ command, injectScript, addDevOverlayPlugin, logger, config }) => {
        if (command === 'dev') {
          logger.info('[@spotlightjs/astro] Setting up Spotlight');

          // Importing this plugin dynamically because for some reason, the top level import
          // caused a client error because the source-map library code was bundled into the client
          const { sourceContextPlugin } = await import('./vite/source-context');

          config.vite.plugins = [
            errorPageInjectionPlugin({ importPath: thisFilePath }),
            sourceContextPlugin(),
            ...(config.vite.plugins || []),
          ];

          let showTriggerButton = true;
          // We suppose with 4.0 this will be promoted top level and expimental will be removed
          // to keep backwards compatibility we check both
          // @ts-ignore
          if (config.devOverlay) {
            // @ts-ignore
            showTriggerButton = config.devOverlay ? false : true;
          }
          // @ts-ignore
          if (config.experimental?.devOverlay) {
            // @ts-ignore
            showTriggerButton = config.experimental?.devOverlay ? false : true;
          }

          injectScript('page', buildClientInitSnippet({ importPath: PKG_NAME, showTriggerButton, ...options }));
          injectScript('page-ssr', SPOTLIGHT_SERVER_SNIPPET);

          const importPath = path.dirname(url.fileURLToPath(import.meta.url));
          const pluginPath = path.join(importPath, 'overlay/index.ts');
          addDevOverlayPlugin(pluginPath);
        } else {
          if (options?.__debugOptions) {
            injectScript('page', buildClientInitSnippet(options.__debugOptions));
          }
        }
      },

      'astro:server:start': async () => {
        // Importing this dynamically because for some reason, the top level import
        // caused a dev server error because the sidecar code was bundled into the server
        const { setupSidecar } = await import('@spotlightjs/sidecar');
        setupSidecar();
      },
    },
  };
};

export default createPlugin;

export * from '@spotlightjs/overlay';
