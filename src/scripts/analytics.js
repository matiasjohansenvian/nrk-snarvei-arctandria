import { nativeLogScreen, nativeLogStructuredEvent } from './nativeUtils.js';
import { resetProgressTracking, setIsOpen } from './progressBar.js';
import { getCurrentIndex } from './touchNavigation.js';

export const TRACKING = {
  CATEGORY: 'shortcut',
  SCREENS: {
    SHORTCUT: 'shortcut',
    END_SCREEN: 'shortcut-end',
  },
  ACTIONS: {
    CLICKED_SCROLL_DOWN: 'clicked-scroll-down-button',
    CLICKED_SCROLL_UP: 'clicked-scroll-up-button',
    CLICKED_EXPLANATIONCARD_PLUG: 'clicked-explanationcard-plug',
    SCROLLED_TO_EXPLANATIONCARD: 'scrolled-to-explanationcard',
    LEFT_SHORTCUT: 'left-shortcut-on-story',
    OPENED_SHORTCUT: 'opened-shortcut-on-story',
    CLICKED_FEEDBACK: 'clicked-feedback',
    VIEWED_STORY: 'viewed-story',
    SWIPED_BACK_FROM_END_CARD: 'swiped-back-from-end-card',
    CLICKED_BYLINE: 'clicked-shortcut-byline',
  },
  LABELS: {
    FEEDBACK_POSITIVE: 'positive',
    FEEDBACK_NEGATIVE: 'negative',
  },
};

export function observeSummaryScroll(storyElement, summaryElement) {
  const handleScroll = () => {
    if (storyElement.scrollTop > 50) {
      if (summaryElement.dataset.logged === 'true') return;
      summaryElement.dataset.logged = 'true';

      const { title } = summaryElement.dataset;
      nativeLogStructuredEvent(
        TRACKING.CATEGORY,
        TRACKING.ACTIONS.SCROLLED_TO_EXPLANATIONCARD,
        title,
      );

      storyElement.removeEventListener('scroll', handleScroll);
    }
  };

  storyElement.addEventListener('scroll', handleScroll, { passive: true });
}

function getShortcutProgressLabel() {
  const stories = document.querySelectorAll('.story-scroller');
  const totalStories = stories.length;
  if (totalStories === 0) return '0 of 0';

  const current = getCurrentIndex();
  const position = Math.min(current + 1, totalStories);
  return `${position} of ${totalStories}`;
}

let isShortcutCurrentlyOpen = false;

export function logShortcutOpened() {
  if (isShortcutCurrentlyOpen) return;
  isShortcutCurrentlyOpen = true;
  setIsOpen(true);

  const wasOnEndCard = resetProgressTracking();

  nativeLogStructuredEvent(
    TRACKING.CATEGORY,
    TRACKING.ACTIONS.OPENED_SHORTCUT,
    getShortcutProgressLabel(),
  );

  if (wasOnEndCard) {
    nativeLogScreen(TRACKING.SCREENS.END_SCREEN);
  }
}

export function logShortcutLeft() {
  if (!isShortcutCurrentlyOpen) return;
  isShortcutCurrentlyOpen = false;
  setIsOpen(false);

  nativeLogStructuredEvent(
    TRACKING.CATEGORY,
    TRACKING.ACTIONS.LEFT_SHORTCUT,
    getShortcutProgressLabel(),
  );
}
