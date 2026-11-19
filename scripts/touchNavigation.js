import { updateEndCardTime } from './renderContent.js';

const getFrameWidth = () => document.body.clientWidth;
const frameLeft = () => document.body.getBoundingClientRect().left;

let currentIndex = 0;
export function getCurrentIndex() {
  return currentIndex;
}

let _goToIndex = null;
export function goToIndex(newIndex, withoutAnimation) {
  _goToIndex?.(newIndex, withoutAnimation);
}

export function setupStoryEventListeners(track, onIndexChange, startIndex = 0) {
  const getStories = () => document.querySelectorAll('.story-scroller');
  const progressBar = document.getElementById('progress-bar');
  const pullIndicator = document.getElementById('pull-to-refresh');

  const currentIdxRef = { value: 0 };

  const resetStoryIndex = (newIndex) => {
    const stories = getStories();
    const clamped = Math.min(newIndex, stories.length - 1);
    currentIdxRef.value = clamped;
    currentIndex = clamped;
    track.style.transition = 'none';
    track.style.transform = `translateX(${-clamped * getFrameWidth()}px)`;
  };

  let startX = 0,
    startY = 0,
    isHorizontal = false,
    isVertical = false,
    touchStartedInDeadzone = false;

  const releasePullLock = () => releaseLock(progressBar, pullIndicator);

  // Logic for tap
  _goToIndex = (newIndex, withoutAnimation = false) => {
    const stories = getStories();
    if (newIndex >= 0 && newIndex < stories.length) {
      currentIdxRef.value = newIndex;
      currentIndex = newIndex;

      track.style.transition = withoutAnimation
        ? 'none'
        : 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';

      track.style.transform = `translateX(${-currentIdxRef.value * 100}%)`;

      if (onIndexChange) onIndexChange(currentIdxRef.value);
    }
  };

  _goToIndex(startIndex, true);

  window.addEventListener(
    'touchstart',
    (e) => {
      // Calculate deadzone for top area

      const currentStory = getStories()[currentIdxRef.value];
      const isNotScrolled = currentStory && currentStory.scrollTop <= 10;

      const touchY = e.touches[0].clientY;
      const barRect = progressBar.getBoundingClientRect();

      if (touchY <= barRect.bottom && isNotScrolled) {
        touchStartedInDeadzone = true;
        if (e.cancelable) e.preventDefault();
        return;
      }

      touchStartedInDeadzone = false;
      isPulling = false;

      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;

      pullStartY = isNotScrolled ? startY : 0;

      isHorizontal = false;
      isVertical = false;
      track.style.transition = 'none';
    },
    { passive: false },
  );

  window.addEventListener(
    'touchmove',
    (e) => {
      if (touchStartedInDeadzone || startX === 0) return;

      const diffX = startX - e.touches[0].clientX;
      const diffY = startY - e.touches[0].clientY;

      // Pull-to-refresh: finger moving down from top of card
      if (!isRefreshing && !isHorizontal && !isVertical && pullStartY > 0 && diffY < -10) {
        isPulling = true;
      }

      if (isPulling) {
        if (e.cancelable) e.preventDefault();
        const pullDistance = Math.max(0, e.touches[0].clientY - pullStartY);
        applyPullOffset(pullDistance, progressBar, pullIndicator);
        return;
      }

      if (!isHorizontal && !isVertical) {
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
          if (currentIdxRef.value === 0 && diffX < 0) return;
          if (isRefreshing) return;
          isHorizontal = true;
        } else if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 10) {
          isVertical = true;
        }
      }

      if (isVertical) return;

      if (isHorizontal) {
        if (e.cancelable) e.preventDefault();

        const currentStories = getStories();
        const currentStoryLeft = currentStories[currentIdxRef.value]?.offsetLeft ?? 0;
        const lastStoryLeft = currentStories[currentStories.length - 1]?.offsetLeft ?? 0;

        let offset = -currentStoryLeft - diffX;

        // Clamp offset to prevent overscroll at boundaries
        const minOffset = -lastStoryLeft;
        const maxOffset = 0;
        offset = Math.max(minOffset, Math.min(maxOffset, offset));

        track.style.transform = `translateX(${offset}px)`;
      }
    },
    { passive: false },
  );

  window.addEventListener('touchend', (e) => {
    if (touchStartedInDeadzone || startX === 0) return;

    // Handle pull-to-refresh release
    if (isPulling) {
      const pullDistance = e.changedTouches[0].clientY - pullStartY;

      isPulling = false;
      pullStartY = 0;
      startX = 0;

      if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
        isRefreshing = true;
        refreshStartTime = Date.now();
        lockAtThreshold(progressBar, pullIndicator);
        updateEndCardTime();
        import('./nativeUtils.js').then(({ nativeRefresh }) => nativeRefresh());
        refreshFallbackTimer = setTimeout(() => releaseLock(progressBar, pullIndicator), 3000);
      } else {
        releaseLock(progressBar, pullIndicator);
      }
      return;
    }

    // Where the finger left the screen
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const diffX = startX - endX;
    const diffY = startY - endY;

    startX = 0;
    track.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1)';

    // Cheching if the user is actaully swiping horizontally, so
    if (isHorizontal && Math.abs(diffX) > getFrameWidth() * 0.15) {
      if (isRefreshing) return;
      const stories = getStories();
      if (diffX > 0 && currentIdxRef.value < stories.length - 1) {
        currentIdxRef.value++;
      } else if (diffX < 0 && currentIdxRef.value > 0) {
        currentIdxRef.value--;
      }
    } // Else if it was a tap
    else if (!isHorizontal && !isVertical && Math.abs(diffX) < 10 && Math.abs(diffY) < 10) {
      // Calculating the boundaries of the hitboxes
      const currentStory = getStories()[currentIdxRef.value];
      const scrollBtn = currentStory.querySelector('.scroll-btn-container');
      const progressBarRect = progressBar.getBoundingClientRect();
      const scrollBtnRect = scrollBtn
        ? scrollBtn.getBoundingClientRect()
        : { top: window.innerHeight };

      const isBelowProgress = endY > progressBarRect.bottom;
      const isAboveScrollBtn = endY < scrollBtnRect.top;
      const isNotScrolled = currentStory.scrollTop <= 10;

      // Only trigger tap if we are in the hitbox area and not scrolled down
      if (isBelowProgress && isAboveScrollBtn && isNotScrolled) {
        if (isRefreshing) return;
        const isLeftZone = endX - frameLeft() < getFrameWidth() * 0.33;
        if (isLeftZone) {
          _goToIndex(currentIdxRef.value - 1);
        } else {
          // Is right zone (66%)
          _goToIndex(currentIdxRef.value + 1);
        }
      }
    }

    currentIndex = currentIdxRef.value;
    const targetLeft = getStories()[currentIdxRef.value]?.offsetLeft ?? 0;
    track.style.transform = `translateX(${-targetLeft}px)`;
    if (onIndexChange) onIndexChange(currentIdxRef.value);
  });

  // Desktop: keyboard arrows and mouse clicks on the tap zones
  window.addEventListener('keydown', (e) => {
    if (isRefreshing) return;
    if (e.key === 'ArrowLeft') _goToIndex(currentIdxRef.value - 1);
    else if (e.key === 'ArrowRight') _goToIndex(currentIdxRef.value + 1);
  });

  let mouseDownX = 0,
    mouseDownY = 0;
  window.addEventListener('mousedown', (e) => {
    mouseDownX = e.clientX;
    mouseDownY = e.clientY;
  });

  window.addEventListener('click', (e) => {
    // Touch taps are handled in touchend; ignore synthesized clicks from touch
    if (e.sourceCapabilities?.firesTouchEvents) return;
    if (isRefreshing || e.button !== 0) return;
    if (e.target.closest('a, button, textarea, input, .scroll-btn-container')) return;
    if (Math.abs(e.clientX - mouseDownX) > 5 || Math.abs(e.clientY - mouseDownY) > 5) return;
    if (!window.getSelection().isCollapsed) return;

    const currentStory = getStories()[currentIdxRef.value];
    if (!currentStory || currentStory.scrollTop > 10) return;
    if (e.clientY <= progressBar.getBoundingClientRect().bottom) return;

    const scrollBtn = currentStory.querySelector('.scroll-btn-container');
    if (scrollBtn && e.clientY >= scrollBtn.getBoundingClientRect().top) return;

    const isLeftZone = e.clientX - frameLeft() < getFrameWidth() * 0.33;
    _goToIndex(currentIdxRef.value + (isLeftZone ? -1 : 1));
  });

  return { resetStoryIndex, releasePullLock };
}

/**
 * Manages the transition between the snap-enabled storycard section and the free-scrolling summary.
 *
 * * Logic:
 *
 * - When above threshold: Scroll snap is turned on to catch the user at the scroll button going down,
 * except when scrolling up (to preserve scroll momentum and avoid brake effect that becomes active when snap is on).
 *
 * - When below threshold: Scroll snap is turned off to allow smooth, natural reading.
 *
 * - Additionally the scroll button snap is turned off and on depending on the scroll direction and position
 */
export function setupVerticalScrollSmoothness() {
  document.querySelectorAll('.story-scroller').forEach((card) => {
    let lastScrollTop = card.scrollTop;

    const storycard = card.querySelector('.storycard-section');
    const scrollBtn = card.querySelector('.scroll-btn-container');

    if (!storycard) return;

    const getThreshold = () => {
      return scrollBtn ? scrollBtn.offsetTop : storycard.offsetHeight * 0.8;
    };

    card.addEventListener(
      'scroll',
      () => {
        const currentScroll = card.scrollTop;
        const threshold = getThreshold();
        const isScrollingDown = currentScroll > lastScrollTop;

        if (currentScroll < threshold) {
          if (isScrollingDown) {
            if (card.style.scrollSnapType !== 'y mandatory') {
              card.style.scrollSnapType = 'y mandatory';
            }
            if (scrollBtn && scrollBtn.style.scrollSnapAlign !== 'start') {
              scrollBtn.style.scrollSnapAlign = 'start';
            }
          }
        } else {
          if (card.style.scrollSnapType !== 'none') {
            card.style.scrollSnapType = 'none';
          }
          if (scrollBtn && scrollBtn.style.scrollSnapAlign !== '') {
            scrollBtn.style.scrollSnapAlign = '';
          }
        }

        lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
      },
      { passive: true },
    );
  });
}

/**
 * Pull To Refresh
 */

let isPulling = false;
let isRefreshing = false;
let pullStartY = 0;
let refreshFallbackTimer = null;
let refreshStartTime = 0;

const REFRESH_MIN_MS = 800;
const PULL_THRESHOLD = 120;
const PULL_RESISTANCE = 0.4;
const LOCK_Y = PULL_THRESHOLD * PULL_RESISTANCE;

function setSlideY(el, y, transition = '') {
  if (!el) return;
  el.style.transition = transition;
  el.style.transform = y === 0 ? '' : `translateY(${y}px)`;
}

function applyPullOffset(pullDistance, progressBar, pullIndicator) {
  const visualY = pullDistance * PULL_RESISTANCE;
  setSlideY(progressBar, visualY);
  setSlideY(document.getElementById('end-card'), visualY);

  if (pullIndicator) {
    const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
    pullIndicator.style.opacity = String(progress);
    pullIndicator.classList.toggle('pull-ready', pullDistance >= PULL_THRESHOLD);
  }
}

function lockAtThreshold(progressBar, pullIndicator) {
  const transition = 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)';
  setSlideY(progressBar, LOCK_Y, transition);
  setSlideY(document.getElementById('end-card'), LOCK_Y, transition);
  progressBar.addEventListener(
    'transitionend',
    () => {
      progressBar.style.transition = '';
    },
    { once: true },
  );

  if (pullIndicator) pullIndicator.style.opacity = '1';
}

function releaseLock(progressBar, pullIndicator) {
  const elapsed = Date.now() - refreshStartTime;
  const remaining = REFRESH_MIN_MS - elapsed;

  if (remaining > 0) {
    clearTimeout(refreshFallbackTimer);
    refreshFallbackTimer = setTimeout(() => releaseLock(progressBar, pullIndicator), remaining);
    return;
  }

  isRefreshing = false;
  clearTimeout(refreshFallbackTimer);

  const transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
  setSlideY(progressBar, 0, transition);
  setSlideY(document.getElementById('end-card'), 0, transition);
  progressBar.addEventListener(
    'transitionend',
    () => {
      progressBar.style.transition = '';
    },
    { once: true },
  );

  if (pullIndicator) {
    pullIndicator.style.opacity = '0';
    pullIndicator.classList.remove('pull-ready');
  }
}
