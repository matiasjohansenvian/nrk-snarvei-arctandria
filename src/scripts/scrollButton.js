import { TRACKING } from './analytics.js';
import { nativeLogStructuredEvent, nativeTriggerHaptic } from './nativeUtils.js';

/**
 * Initialises scroll button behaviour for a story element.
 * @param {HTMLElement} storyEl
 */
export function initScrollButton(storyEl) {
  const storycardSection = storyEl.querySelector('.storycard-section');
  const scrollBtnContainer = storyEl.querySelector('.scroll-btn-container');
  const creditEl = storyEl.querySelector('.storycard-photo-credit');
  const scrollBtnInner = storyEl.querySelector('.scroll-btn-inner');
  const scrollBtnIcon = storyEl.querySelector('.scroll-btn-icon');

  const setBackState = (isBack) => {
    scrollBtnContainer.classList.toggle('is-back', isBack);
    creditEl.classList.toggle('is-back', isBack);
  };

  let ticking = false;

  storyEl.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollTop = storyEl.scrollTop;
          const storycardOffsetH = storycardSection.offsetHeight;
          const scrollH = scrollBtnContainer.offsetHeight;
          const innerH = scrollBtnInner.offsetHeight;
          const offset = 140;

          const progress = Math.max(
            0,
            Math.min(1, (scrollTop - storycardOffsetH + offset + innerH) / scrollH),
          );

          const travel = scrollH - innerH;
          scrollBtnInner.style.transform = `translateY(${progress * travel}px)`;

          const rotation = progress * 180;
          scrollBtnIcon.style.transform = `rotate(${rotation}deg)`;

          setBackState(scrollTop + innerH / 2 > storycardOffsetH);

          ticking = false;
        });
        ticking = true;
      }
    },
    { passive: true },
  );

  scrollBtnContainer.addEventListener('click', () => {
    nativeTriggerHaptic(0);

    if (scrollBtnContainer.classList.contains('is-back')) {
      nativeLogStructuredEvent(TRACKING.CATEGORY, TRACKING.ACTIONS.CLICKED_SCROLL_UP, '');
      storyEl.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      nativeLogStructuredEvent(TRACKING.CATEGORY, TRACKING.ACTIONS.CLICKED_SCROLL_DOWN, '');
      storyEl.scrollTo({ top: storycardSection.offsetHeight, behavior: 'smooth' });
    }
  });
}
