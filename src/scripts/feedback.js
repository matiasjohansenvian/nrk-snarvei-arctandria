import { TRACKING } from './analytics.js';
import { nativeLogStructuredEvent, nativeSubmitFeedback } from './nativeUtils.js';

/**
 * Sets up the feedback widget including event listeners and state management
 */
export function setupFeedbackWidget() {
  const box = document.getElementById('feedback-box');
  if (!box || box.dataset.initialized) return;
  box.dataset.initialized = 'true';

  const endCard = document.getElementById('end-card');
  const thumbBtns = box.querySelectorAll('.feedback-thumb-btn');
  const textarea = document.getElementById('feedback-textarea');
  const errorMsg = document.getElementById('feedback-error');
  const charCount = document.getElementById('feedback-char-count');
  const skipBtn = document.getElementById('feedback-skip');
  const submitBtn = document.getElementById('feedback-submit');

  let selectedThumb = null;

  const restoreBox = () => {
    thumbBtns.forEach((b) => b.classList.remove('is-selected'));
    if (errorMsg) errorMsg.style.display = 'none';
    box.classList.remove('is-commenting');
    endCard?.classList.remove('is-feedback-open');
  };

  const finishFeedback = () => {
    restoreBox();
    box.classList.add('is-done');
  };

  thumbBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      thumbBtns.forEach((b) => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      setTimeout(() => {
        selectedThumb = btn.getAttribute('aria-label') === 'Tommel opp';
        const label = selectedThumb
          ? TRACKING.LABELS.FEEDBACK_POSITIVE
          : TRACKING.LABELS.FEEDBACK_NEGATIVE;
        nativeLogStructuredEvent(TRACKING.CATEGORY, TRACKING.ACTIONS.CLICKED_FEEDBACK, label);
        endCard?.classList.add('is-feedback-open');
        box.classList.add('is-commenting');
      }, 1000);
    });
  });

  textarea.addEventListener('input', () => {
    charCount.textContent = `${textarea.value.length}/250`;
    if (textarea.value.length > 0) {
      textarea.classList.remove('is-invalid');
      if (errorMsg) errorMsg.style.display = 'none';
    }
  });

  // Prevent any touch inside the box from reaching the window navigation handler
  box.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });

  skipBtn.addEventListener('click', finishFeedback);

  submitBtn.addEventListener('click', () => {
    const comment = textarea.value.trim();
    if (!comment) {
      textarea.classList.add('is-invalid');
      if (errorMsg) errorMsg.style.display = 'block';
      return;
    }
    nativeSubmitFeedback({ form_name: 'snarvei', thumb: selectedThumb, comment });
    finishFeedback();
  });
}
