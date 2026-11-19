import { reorderStoriesForDeepLink } from './scripts/deepLinking.js';
import { injectAndroidFont, nativeLogCrashlytics } from './scripts/nativeUtils.js';
import {
  initProgressBar,
  updateProgressBar,
  getFirstUnreadIndexOf,
  setIsOpen,
} from './scripts/progressBar.js';
import { hideLoadingScreen, renderContent, sortStories } from './scripts/renderContent.js';
import { setupStoryEventListeners } from './scripts/touchNavigation.js';

let storyNavigation = null;
let currentData = null;

function renderStories(data, startIndex = getFirstUnreadIndexOf(data.documents)) {
  const track = document.getElementById('track');

  track.querySelectorAll('.story-scroller:not(.end-card)').forEach((story) => story.remove());
  renderContent(data, track);
  track.appendChild(document.getElementById('end-card'));

  initProgressBar(data.documents, startIndex);

  if (!storyNavigation) {
    storyNavigation = setupStoryEventListeners(track, updateProgressBar, startIndex);
  } else {
    storyNavigation.resetStoryIndex(startIndex);
    storyNavigation.releasePullLock();
  }

  currentData = data;
  hideLoadingScreen();
}

window.scrollToStoryId = (documentId) => {
  if (!currentData) return;

  try {
    const startIndex = reorderStoriesForDeepLink(currentData.documents, documentId);
    if (startIndex === -1) return;
    renderStories(currentData, startIndex);
  } catch (e) {
    nativeLogCrashlytics(e);
  }
};

function renderMarkup(b64Json) {
  try {
    const jsonString = decodeURIComponent(escape(window.atob(b64Json)));
    const data = JSON.parse(jsonString);

    sortStories(data.documents);
    renderStories(data);
  } catch (e) {
    nativeLogCrashlytics(e);
  }
}

injectAndroidFont();
window.renderMarkup = renderMarkup;

const READ_KEY = 'snarvei-read-ids';

function getReadIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY)) ?? []);
  } catch {
    return new Set();
  }
}

function saveReadIds(data) {
  try {
    const ids = data.documents.filter((d) => d.isRead).map((d) => d.documentId);
    localStorage.setItem(READ_KEY, JSON.stringify(ids));
  } catch {
    // localStorage unavailable
  }
}

async function init() {
  try {
    const data = await fetch('./mock-data.json').then((r) => r.json());
    const readIds = getReadIds();
    data.documents.forEach((doc) => {
      doc.isRead = readIds.has(doc.documentId);
    });

    sortStories(data.documents);
    renderStories(data);
    setIsOpen(true);
    window.__releasePullLock = storyNavigation.releasePullLock;
    window.addEventListener('pagehide', () => saveReadIds(data));
    document.addEventListener('visibilitychange', () => saveReadIds(data));
  } catch (e) {
    nativeLogCrashlytics(e);
  }
}

init();
