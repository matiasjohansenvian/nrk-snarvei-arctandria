import { TRACKING, observeSummaryScroll } from './analytics.js';
import { setupFeedbackWidget } from './feedback.js';
import { nativeLogStructuredEvent, nativeOpenModalSheet } from './nativeUtils.js';
import { initScrollButton } from './scrollButton.js';
import { goToIndex, setupVerticalScrollSmoothness } from './touchNavigation.js';
import { formatNorwegianDateTime } from './utils.js';

/**
 * Renders content for provided data
 * @param {{
 *   journalist?: { name: string, role: string, imageUrl?: string },
 *   documents: Array<{
 *     documentId: string,
 *     isRead: boolean,
 *     updatedAt: string,
 *     storyCard: {
 *       title: Array<{ text: string, marks: string[] }>,
 *       lead: string,
 *       image: { imageUrl: string, credit?: string }
 *     },
 *     explanationCard: {
 *       bulletpoints: string[],
 *       plugs: Array<{ title: string, lead: string, url: string, imageUrl?: string, kicker?: string }>
 *     }
 *   }>
 * }} data - The data object with a journalist and an array of documents.
 * @param {HTMLElement} track - The DOM element where stories will be rendered.
 */
export function renderContent(data, track) {
  const storyTemplate = document.getElementById('story-template');
  const explanationCardPlugTemplate = document.getElementById('explanationcard-plug-template');
  const totalStories = data.documents.length;

  data.documents.forEach((doc, i) => {
    const { storyCard, explanationCard, documentId } = doc;
    const title = storyCard.title.map((t) => t.text).join('');
    const story = storyTemplate.content.cloneNode(true).querySelector('.story-scroller');

    story.id = `story-${i}`;
    story.dataset.type = 'story';
    story.dataset.title = title;
    story.dataset.documentId = documentId;
    story.dataset.isRead = doc.isRead;

    if (storyCard.image?.imageUrl) {
      story.querySelector('.storycard-background-image').style.backgroundImage =
        `url('${storyCard.image.imageUrl}')`;
    }

    const creditEl = story.querySelector('.storycard-photo-credit');
    if (storyCard.image?.credit) {
      creditEl.textContent = storyCard.image.credit;
    } else {
      creditEl.hidden = true;
    }

    const titleEl = story.querySelector('.storycard-title');
    storyCard.title.forEach(({ text, marks }) => {
      const span = story.ownerDocument.createElement('span');
      span.textContent = text;
      if (marks.includes('em')) {
        span.style.color = 'var(--nrk-color-warm-orange-300)';
      }
      titleEl.appendChild(span);
    });
    story.querySelector('.storycard-lead').textContent = storyCard.lead;

    const updatedLine = story.querySelector('.explanationcard-footer-updated-at');
    if (updatedLine) {
      const formatted = formatNorwegianDateTime(doc.updatedAt);
      if (formatted) {
        updatedLine.innerHTML = `<strong>Oppdatert</strong> ${formatted}`;
      } else {
        updatedLine.remove();
      }
    }

    const explanationCardSection = story.querySelector('.explanationcard-section');
    if (explanationCardSection) {
      explanationCardSection.dataset.type = 'summary';
      explanationCardSection.dataset.title = title;
      observeSummaryScroll(story, explanationCardSection);
    }

    const explanationTitleEl = story.querySelector('.explanationcard-title');
    if (explanationTitleEl && explanationCard.title) {
      explanationTitleEl.textContent = explanationCard.title;
    }

    if (explanationCard.bulletpoints?.length) {
      story.querySelector('.explanationcard-bulletpoints').innerHTML = explanationCard.bulletpoints
        .map(
          (bp) =>
            `<li role="presentation"><p class="explanationcard-bulletpoint-text">${bp}</p></li>`,
        )
        .join('');
    } else {
      // No summary text: drop the whole "Her er saken" section (heading and list)
      story.querySelector('.explanationcard-wrapper')?.remove();
    }

    const plugsSection = story.querySelector('.explanationcard-plugs-section');
    explanationCard.plugs.forEach((plug) => {
      const plugEl = explanationCardPlugTemplate.content.cloneNode(true);
      const container = plugEl.querySelector('.explanationcard-plug-container');

      container.dataset.url = plug.url;
      if (plug.url) {
        container.setAttribute('role', 'link');
        container.tabIndex = 0;
      } else {
        container.style.cursor = 'default';
      }

      const imageWrapper = plugEl.querySelector('.explanationcard-plug-image');
      if (plug.imageUrl) {
        plugEl.querySelector('.explanationcard-plug-img').src = plug.imageUrl;
      } else {
        imageWrapper.remove();
      }
      plugEl.querySelector('.explanationcard-plug-title').textContent = plug.title;
      plugEl.querySelector('.explanationcard-plug-lead').textContent = plug.lead || '';
      plugEl.querySelector('.explanationcard-plug-kicker').textContent = plug.kicker || '';

      plugsSection.appendChild(plugEl);
    });

    const plugContainers = story.querySelectorAll('.explanationcard-plug-container');
    plugContainers.forEach((container) => {
      const openPlug = () => {
        const url = container.getAttribute('data-url');
        if (url) {
          nativeLogStructuredEvent(
            TRACKING.CATEGORY,
            TRACKING.ACTIONS.CLICKED_EXPLANATIONCARD_PLUG,
            url,
          );
          nativeOpenModalSheet(url);
        }
      };
      container.addEventListener('click', openPlug);
      container.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') openPlug();
      });
    });

    const nextBtn = story.querySelector('.next-story-btn');
    if (nextBtn) {
      const isLast = i === totalStories - 1;
      nextBtn.textContent = isLast
        ? 'Klikk for å hoppe til sluttkort eller fortsett til oppsummering'
        : 'Klikk for å gå videre til neste historie eller gå videre for oppsummering';

      nextBtn.addEventListener('click', () => {
        const targetId = isLast ? 'end-card' : `story-${i + 1}`;
        const targetEl = document.getElementById(targetId);

        if (targetEl) {
          goToIndex(i + 1);
          targetEl.setAttribute('tabindex', '-1');
          targetEl.focus({ preventScroll: true });
        }
      });
    }

    initScrollButton(story);

    track.appendChild(story);
  });

  setupVerticalScrollSmoothness();

  resetEndCard();

  if (data.journalist) {
    setupEndCardJournalist(data.journalist);
  }

  setupEndCardHeading(data.documents);
  updateEndCardTime();

  setupFeedbackWidget();
}

function resetEndCard() {
  const endCard = document.querySelector('.end-card');
  if (!endCard) return;
  endCard.classList.remove('all-read');
  const heading = endCard.querySelector('.end-card-heading');
  if (heading) heading.textContent = 'Da er du oppdatert';
  endCard.querySelector('.end-card-subtitle')?.remove();
}

/**
 * Updates end card heading and subtitle based on whether all documents are read
 */
function setupEndCardHeading(documents) {
  const allRead = documents.every((doc) => doc.isRead);

  const headingEl = document.querySelector('.end-card-heading');
  const endCard = document.querySelector('.end-card');
  if (!headingEl || !endCard) return;

  if (allRead) {
    headingEl.textContent = 'Du har fått med deg alt';

    if (!headingEl.parentNode.querySelector('.end-card-subtitle')) {
      const subtitleEl = document.createElement('p');
      subtitleEl.className = 'end-card-subtitle';
      subtitleEl.textContent = 'Vi kommer tilbake med mer';
      headingEl.parentNode.insertBefore(subtitleEl, headingEl.nextSibling);
    }

    endCard.classList.add('all-read');
  }
}

export function updateEndCardTime() {
  const el = document.getElementById('end-card-updated-at');
  if (!el) return;
  const now = new Date();
  const timeStr = formatNorwegianDateTime(now);
  el.textContent = `Oppdatert ${timeStr}`;
}

/**
 * Injects journalist data into the end card
 */
function setupEndCardJournalist(journalist) {
  const container = document.querySelector('.end-card-journalist');
  const nameEl = document.getElementById('end-card-j-name');
  const roleEl = document.getElementById('end-card-j-role');
  const photoEl = document.getElementById('end-card-j-photo');
  const initialsEl = document.getElementById('end-card-j-initials');

  if (!nameEl || !roleEl || !photoEl || !initialsEl) return;

  nameEl.innerHTML = journalist.name;
  roleEl.textContent = journalist.role;

  if (journalist.imageUrl) {
    photoEl.src = journalist.imageUrl;
    photoEl.alt = journalist.name;
  } else {
    photoEl.style.display = 'none';
    initialsEl.textContent = getInitials(journalist.name);
    initialsEl.style.display = 'flex';
  }

  if (container) {
    container.style.visibility = 'visible';
    container.addEventListener('click', () => {
      nativeLogStructuredEvent(TRACKING.CATEGORY, TRACKING.ACTIONS.CLICKED_BYLINE, '');
    });
  }
}

function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function hideLoadingScreen() {
  const el = document.getElementById('loading-screen');
  if (!el) return;
  el.classList.add('is-hidden');
  el.addEventListener('transitionend', () => el.remove(), { once: true });
}

export function sortStories(data) {
  data.sort((a, b) => {
    if (a.isRead !== b.isRead) return a.isRead ? -1 : 1;
    return new Date(a.updatedAt ?? 0) - new Date(b.updatedAt ?? 0);
  });
}
