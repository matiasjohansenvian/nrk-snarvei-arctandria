import { logShortcutOpened, logShortcutLeft } from './analytics.js';

const nativeBrigdeInterface = window.ShortcutJSBridge;
const getIosBridge = () => window.webkit?.messageHandlers?.ShortcutJSBridge;

const postToIos = (topic, data) => {
  const iosBridge = getIosBridge();
  if (iosBridge) {
    iosBridge.postMessage({ topic, data });
  }
};

/**
 * 0 - low
 * 1 - medium
 * 2 - high
 *
 * @param {number} type
 */

function nativeTriggerHaptic(type) {
  if (nativeBrigdeInterface?.triggerHaptic) {
    nativeBrigdeInterface.triggerHaptic(type);
  } else {
    postToIos('triggerHaptic', { type });
  }
}

function nativeOpenModalSheet(url) {
  if (nativeBrigdeInterface?.openModalSheet) {
    nativeBrigdeInterface.openModalSheet(url);
  } else if (getIosBridge()) {
    postToIos('openModalSheet', { url });
  } else {
    // Plain browser (no native bridge): open the link in a new tab
    window.open(url, '_blank', 'noopener');
  }
}

function nativeRefresh() {
  if (nativeBrigdeInterface?.refresh) {
    nativeBrigdeInterface.refresh();
  } else {
    postToIos('refresh', {});
  }
}

function nativeLogCrashlytics(message) {
  if (nativeBrigdeInterface?.logCrashLytics) {
    nativeBrigdeInterface.logCrashLytics(message);
  } else {
    const msg =
      typeof message === 'string'
        ? message
        : message?.message || message?.toString() || 'Unknown error';
    const stack = message?.stack || '';
    postToIos('logCrashlytics', {
      description: msg,
      reason: stack,
      errorDomain: 'JSException',
      errorCode: 500,
    });
  }
}

function nativeLogScreen(screen) {
  if (nativeBrigdeInterface?.logScreen) {
    nativeBrigdeInterface.logScreen(screen);
  } else {
    postToIos('logScreen', { screenName: screen });
  }
}

function nativeLogStructuredEvent(category, action, label) {
  if (nativeBrigdeInterface?.logStructuredEvent) {
    nativeBrigdeInterface.logStructuredEvent(category, action, label);
  } else {
    postToIos('logStructuredEvent', { category, action, label, value: null });
  }
}

function nativeMarkAsRead(documentId) {
  if (nativeBrigdeInterface?.markAsRead) {
    nativeBrigdeInterface.markAsRead(documentId);
  } else {
    postToIos('markAsRead', { documentId });
  }
}

function nativeSubmitFeedback(payload) {
  if (nativeBrigdeInterface?.submitFeedback) {
    nativeBrigdeInterface.submitFeedback(JSON.stringify(payload));
  } else {
    postToIos('submitFeedback', payload);
  }
}

// Inject android font
function injectAndroidFont() {
  if (nativeBrigdeInterface) {
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'NRK Sans Variable';
        src: url('https://assets.nonrkmobilapp.no/assets/fonts/NRKSans_Variable.woff2');
      }`;
    document.head.append(style);
  }
}

window.nativeTriggerWeb = function (command) {
  switch (command) {
    case 'pageReload':
      window.location.reload();
      break;

    case 'shortcutOpened':
      logShortcutOpened();
      break;

    case 'shortcutLeft':
      logShortcutLeft();
      break;
  }
};

window.triggerShortcutOpened = function () {
  logShortcutOpened();
};

window.triggerShortcutLeft = function () {
  logShortcutLeft();
};

export {
  injectAndroidFont,
  nativeLogCrashlytics,
  nativeLogScreen,
  nativeLogStructuredEvent,
  nativeOpenModalSheet,
  nativeTriggerHaptic,
  nativeRefresh,
  nativeMarkAsRead,
  nativeSubmitFeedback,
};
