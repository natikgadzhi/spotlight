import React from "react";
import ReactDOM from "react-dom/client";

import fontStyles from "@fontsource/raleway/index.css?inline";

import App from "./App.tsx";
import { SentryEvent } from "./types.ts";
import type { Integration } from "./integrations/integration";
import { initIntegrations } from "./integrations/integration";
import globalStyles from "./index.css?inline";
import dataCache from "./lib/dataCache.ts";

import type { Envelope } from "@sentry/types";

export { default as sentry } from "./integrations/sentry";
export { default as console } from "./integrations/console";


function createStyleSheet(styles: string) {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(styles);
  return sheet;
}

export async function init({
  integrations,
  fullScreen = false,
  defaultEventId,
}: {
  integrations?: Integration[],
  fullScreen?: boolean;
  defaultEventId?: string;
  relay?: string;
} = {}) {
  if (typeof document === "undefined") return;

  const initializedIntegrations = await initIntegrations(integrations);

  // connectToRelay(relay, contentTypeToIntegrations);

  // build shadow dom container to contain styles
  const docRoot = document.createElement("div");
  const shadow = docRoot.attachShadow({ mode: "open" });
  const appRoot = document.createElement("div");
  appRoot.style.position = "absolute";
  appRoot.style.top = "0";
  appRoot.style.left = "0";
  appRoot.style.right = "0";
  shadow.appendChild(appRoot);

  const ssGlobal = createStyleSheet(globalStyles);
  shadow.adoptedStyleSheets = [createStyleSheet(fontStyles), ssGlobal];

  if (import.meta.hot) {
    import.meta.hot.accept("./index.css?inline", (newGlobalStyles) => {
      ssGlobal.replaceSync(newGlobalStyles?.default);
    });
  }

  ReactDOM.createRoot(appRoot).render(
    // <React.StrictMode>
      <App integrations={initializedIntegrations} fullScreen={fullScreen} defaultEventId={defaultEventId} />
    // </React.StrictMode>
  );

  window.addEventListener("load", () => {
    console.log("[spotlight] Injecting into application");

    document.body.append(docRoot);
  });
}

export function pushEvent(event: SentryEvent) {
  dataCache.pushEvent(event);
}

export function pushEnvelope(envelope: Envelope) {
  dataCache.pushEnvelope(envelope);
}


export function connectToRelay(
  relayUrl: string, 
  contentTypeToIntegrations: Map<string, Integration<unknown>[]>, 
  setIntegrationData: React.Dispatch<React.SetStateAction<Record<string, Array<unknown>>>>
): () => void
 {
  console.log("[Spotlight] Connecting to relay");
  const source = new EventSource(relayUrl);

  source.addEventListener("application/x-sentry-envelope", (event) => {
    console.log("[spotlight] Received new envelope");
    const [rawHeader, ...rawEntries] = event.data.split("\n");
    const header = JSON.parse(rawHeader) as Envelope[0];
    console.log(
      `[Spotlight] Received new envelope from SDK ${
        header.sdk?.name || "(unknown)"
      }`
    );

    const items: Envelope[1][] = [];
    for (let i = 0; i < rawEntries.length; i += 2) {
      items.push([JSON.parse(rawEntries[i]), JSON.parse(rawEntries[i + 1])]);
    }

    const envelope = [header, items] as Envelope;
    console.log('[Spotlight]', envelope);

    dataCache.pushEnvelope(envelope);
  });

  const contentTypeListeners: [contentType: string, listener: (event: MessageEvent) => void][] = [];

  for (const [contentType, integrations] of contentTypeToIntegrations.entries()) {

    // TODO: remove this, for now this isolates the sentry stuff from the new integrations API 
    if (contentType === "application/x-sentry-envelope") {
      continue;
    }

    const listener = (event: MessageEvent): void => {
      console.log(`[spotlight] Received new ${contentType} event`);
      integrations.forEach((integration) => {
        if (integration.processEvent) {
          const processedEvent = integration.processEvent({
            contentType,
            data: event.data
          });
          if (processedEvent) {
            setIntegrationData(prev => {
              return {
                ...prev,
                [contentType]: [...(prev[contentType] || []), processedEvent]
              };
            });
          }
        }
      });
    };

    // `contentType` could for example be "application/x-sentry-envelope"
    contentTypeListeners.push([contentType, listener]);
    source.addEventListener(contentType, listener);

    console.log('[spotlight] added listener for', contentType, 'sum', contentTypeListeners.length)
   }

  source.addEventListener("event", (event) => {
    console.log("[Spotlight] Received new event");
    const data = JSON.parse(event.data);
    dataCache.pushEvent(data);
  });

  source.addEventListener("open", () => {
    console.log("[Spotlight] open");
    dataCache.setOnline(true);
  });

  source.addEventListener("error", (err) => {
    dataCache.setOnline(false);

    console.error("EventSource failed:", err);
  });

  return () => {
    console.log(`[spotlight] removing ${contentTypeListeners.length} listeners`)
    contentTypeListeners.forEach(typeAndListener => {
      source.removeEventListener(typeAndListener[0], typeAndListener[1])
      console.log('[spotlight] removed listner for type', typeAndListener[0])
    });
  }
}
