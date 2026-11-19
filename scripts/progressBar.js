import { TRACKING } from './analytics.js';
import {
  nativeTriggerHaptic,
  nativeLogScreen,
  nativeLogStructuredEvent,
  nativeMarkAsRead,
} from './nativeUtils.js';

let articlesData = [];
let segmentEls = [];
let lastHapticIndex = 0;
let highestLoggedIndex = -1;
let hasLoggedEndCard = false;
let endCardVisible = false;
let isInitializing = false;
let currentIndex = -1;
let isOpen = false;

export function setIsOpen(value) {
  isOpen = value;
}

export function initProgressBar(data, startIndex = getFirstUnreadIndexOf(data)) {
  articlesData = data;
  const documentCount = data.length;
  const bar = document.getElementById('progress-bar');

  bar.innerHTML = '';
  segmentEls = [];

  for (let i = 0; i <= documentCount; i++) {
    const seg = document.createElement('div');
    seg.className = 'progress-segment';
    bar.appendChild(seg);
    segmentEls.push(seg);
  }

  setupScrollWatcher(bar);

  currentIndex = startIndex;
  highestLoggedIndex = startIndex;
  isInitializing = true;
  updateProgressBar(startIndex);
  isInitializing = false;
}

function setupScrollWatcher(bar) {
  document.querySelectorAll('.story-scroller').forEach((card) => {
    card.addEventListener('scroll', () => {
      if (card.scrollTop > 5) {
        bar.style.transition = 'opacity 0.2s ease';
        bar.style.opacity = '0';
      } else {
        bar.style.transition = 'opacity 0.1s ease-out';
        bar.style.opacity = '1';
      }
    });
  });
}

export function updateProgressBar(newIndex) {
  const indexChanged = !isInitializing && newIndex !== currentIndex;
  if (!isInitializing) currentIndex = newIndex;

  const isEndCard = currentIndex >= segmentEls.length - 1;

  if (currentIndex !== lastHapticIndex && currentIndex < segmentEls.length && currentIndex >= 0) {
    nativeTriggerHaptic(isEndCard ? 2 : 1);
    lastHapticIndex = currentIndex;
  }

  segmentEls.forEach((seg, i) => {
    seg.classList.toggle('active', i === currentIndex);
    seg.classList.toggle('passed', i < currentIndex);
  });

  document.getElementById('end-card').classList.toggle('is-visible', isEndCard);

  markAsReadIfAdvanced(currentIndex);

  if (!isInitializing && indexChanged && isOpen) {
    if (endCardVisible && !isEndCard) {
      logEvent(TRACKING.ACTIONS.SWIPED_BACK_FROM_END_CARD, '');
    }

    logViewedStory(currentIndex);

    if (isEndCard && !hasLoggedEndCard) {
      nativeLogScreen(TRACKING.SCREENS.END_SCREEN);
      hasLoggedEndCard = true;
    }
  }

  endCardVisible = isEndCard;

  const bar = document.getElementById('progress-bar');
  const stories = document.querySelectorAll('.story-scroller');

  if (bar && stories[currentIndex]) {
    const scrolled = stories[currentIndex].scrollTop > 5;
    bar.style.transition = scrolled ? 'opacity 0.2s ease' : 'opacity 0.1s ease-out';
    bar.style.opacity = scrolled ? '0' : '1';
  }

  setTimeout(() => {
    stories.forEach((story, i) => {
      if (i !== currentIndex) story.scrollTop = 0;
    });
  }, 300);
}

export function getFirstUnreadIndexOf(data) {
  const firstUnreadIndex = data.findIndex((doc) => !doc.isRead);
  return firstUnreadIndex !== -1 ? firstUnreadIndex : data.length;
}

export function resetProgressTracking() {
  const wasOnEndCard = endCardVisible;
  const snapshotIndex = currentIndex;
  highestLoggedIndex = currentIndex;
  lastHapticIndex = -1;
  hasLoggedEndCard = false;
  if (isOpen && snapshotIndex >= 0) {
    logViewedStory(wasOnEndCard ? segmentEls.length - 1 : snapshotIndex);
  }

  return wasOnEndCard;
}

function markAsReadIfAdvanced(currentIndex) {
  if (currentIndex > highestLoggedIndex) {
    const prevIndex = highestLoggedIndex;
    highestLoggedIndex = currentIndex;
    if (prevIndex >= 0) {
      const article = articlesData[prevIndex];
      if (article && !article.isRead) {
        nativeMarkAsRead(article.documentId);
        article.isRead = true;
      }
    }
  }
}

function logViewedStory(index) {
  logEvent(TRACKING.ACTIONS.VIEWED_STORY, (index + 1).toString());
}

function logEvent(action, label) {
  nativeLogStructuredEvent(TRACKING.CATEGORY, action, label);
}
