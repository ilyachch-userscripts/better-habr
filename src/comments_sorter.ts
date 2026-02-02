import './comments_sorter.css';

type NotificationType = 'success' | 'error';

type CommentRatingEntry = {
  rating: number;
  thread: Element;
  commentId: number;
};

const UNREVEALED_COMMENTS_SELECTOR = '.tm-comment-footer:has(svg > use[*|href$="votes-fallback"])';
const COMMENTS_REVEALED_EVENT = 'comments_revealed';
const COMMENTS_HEADER_PATCHED_ATTR = 'data-comments-sorter-patched';

declare const GM_registerMenuCommand: ((name: string, fn: () => void) => void) | undefined;

let activeNotificationTimeout: number | undefined;
let activeProgressBar: HTMLDivElement | null = null;

function showNotification(text: string, type: NotificationType = 'success', duration = 5000): void {
  const existingNotification = document.querySelector('.bh-notification');
  if (existingNotification) {
    if (activeNotificationTimeout) {
      window.clearTimeout(activeNotificationTimeout);
      activeNotificationTimeout = undefined;
    }
    existingNotification.remove();
  }

  const notification = document.createElement('div');
  notification.classList.add('bh-notification', `bh-notification-${type}`);
  notification.textContent = text;

  const closeButton = document.createElement('span');
  closeButton.classList.add('bh-notification-close');
  closeButton.innerHTML = '×';
  closeButton.onclick = () => {
    if (activeNotificationTimeout) {
      window.clearTimeout(activeNotificationTimeout);
      activeNotificationTimeout = undefined;
    }
    notification.classList.remove('show');
    window.setTimeout(() => notification.remove(), 500);
  };
  notification.appendChild(closeButton);

  document.body.appendChild(notification);
  window.setTimeout(() => notification.classList.add('show'), 50);

  activeNotificationTimeout = window.setTimeout(() => {
    notification.classList.remove('show');
    window.setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
      activeNotificationTimeout = undefined;
    }, 500);
  }, duration);
}

function showProgressBar(title: string, total: number): (completed: number) => void {
  if (activeProgressBar) {
    activeProgressBar.remove();
    activeProgressBar = null;
  }

  const progressContainer = document.createElement('div');
  progressContainer.classList.add('bh-progress-container');

  const progressContent = document.createElement('div');
  progressContent.classList.add('bh-progress-content');
  progressContainer.appendChild(progressContent);

  const progressTitle = document.createElement('div');
  progressTitle.classList.add('bh-progress-title');
  progressTitle.textContent = title;
  progressContent.appendChild(progressTitle);

  const progressBar = document.createElement('div');
  progressBar.classList.add('bh-progress-bar');
  progressContent.appendChild(progressBar);

  const progressText = document.createElement('div');
  progressText.classList.add('bh-progress-text');
  progressText.textContent = '0%';
  progressContent.appendChild(progressText);

  const closeButton = document.createElement('span');
  closeButton.classList.add('bh-progress-close');
  closeButton.innerHTML = '×';
  closeButton.onclick = () => {
    progressContainer.classList.remove('show');
    window.setTimeout(() => {
      if (progressContainer.parentNode) {
        progressContainer.remove();
        activeProgressBar = null;
      }
    }, 500);
  };
  progressContent.appendChild(closeButton);

  document.body.appendChild(progressContainer);
  window.setTimeout(() => progressContainer.classList.add('show'), 50);

  activeProgressBar = progressContainer;

  return function updateProgress(completed: number) {
    if (!activeProgressBar) {
      return;
    }

    const percentage = total === 0 ? 100 : Math.round((completed / total) * 100);
    const currentProgressBar = activeProgressBar.querySelector<HTMLElement>('.bh-progress-bar');
    const currentProgressText = activeProgressBar.querySelector<HTMLElement>('.bh-progress-text');
    if (currentProgressBar) {
      currentProgressBar.style.width = `${percentage}%`;
    }
    if (currentProgressText) {
      currentProgressText.textContent = `${completed}/${total} (${percentage}%)`;
    }
  };
}

function hideProgressBar(): void {
  if (activeProgressBar) {
    activeProgressBar.classList.remove('show');
    window.setTimeout(() => {
      if (activeProgressBar && activeProgressBar.parentNode) {
        activeProgressBar.remove();
        activeProgressBar = null;
      }
    }, 500);
  }
}

function revealComments(): void {
  const getUnrevealedComments = () => document.querySelectorAll(UNREVEALED_COMMENTS_SELECTOR);

  let unrevealedComments = getUnrevealedComments();

  if (unrevealedComments.length === 0) {
    showNotification('All comment ratings are already visible', 'success');
    window.dispatchEvent(new Event(COMMENTS_REVEALED_EVENT));
    return;
  }

  const initialScrollPosition = window.pageYOffset;

  const totalToReveal = unrevealedComments.length;
  let revealed = 0;
  let lastProcessedTime = Date.now();
  let isScrolling = false;
  let stuckCounter = 0;
  let lastUnrevealedCount = unrevealedComments.length;

  const updateProgressBar = showProgressBar('Opening comment ratings', totalToReveal);

  const handleScroll = () => {
    isScrolling = false;

    const currentUnrevealed = getUnrevealedComments();

    if (currentUnrevealed.length === lastUnrevealedCount) {
      stuckCounter += 1;

      if (stuckCounter >= 3 && currentUnrevealed.length > 0) {
        revealed += 1;
        lastUnrevealedCount = currentUnrevealed.length - 1;
        stuckCounter = 0;
        revealNext();
        return;
      }
    } else {
      stuckCounter = 0;
      lastUnrevealedCount = currentUnrevealed.length;
    }

    if (currentUnrevealed.length < unrevealedComments.length) {
      revealed += unrevealedComments.length - currentUnrevealed.length;
      unrevealedComments = currentUnrevealed;
      updateProgressBar(revealed);
    }

    if (currentUnrevealed.length === 0) {
      window.scrollTo({
        top: initialScrollPosition,
        behavior: 'smooth',
      });

      window.setTimeout(() => {
        hideProgressBar();
        showNotification(`Done! All ${totalToReveal} comment ratings opened`, 'success');
        window.dispatchEvent(new Event(COMMENTS_REVEALED_EVENT));
      }, 500);
    } else {
      revealNext();
    }
  };

  const revealNext = () => {
    if (Date.now() - lastProcessedTime > 30000) {
      hideProgressBar();
      showNotification('Processing time exceeded, stopping...', 'error');
      window.scrollTo({
        top: initialScrollPosition,
        behavior: 'smooth',
      });
      window.dispatchEvent(new Event(COMMENTS_REVEALED_EVENT));
      return;
    }

    const currentUnrevealed = getUnrevealedComments();

    if (currentUnrevealed.length === 0) {
      window.scrollTo({
        top: initialScrollPosition,
        behavior: 'smooth',
      });
      window.setTimeout(() => {
        hideProgressBar();
        showNotification(`Done! All ${totalToReveal} comment ratings opened`, 'success');
        window.dispatchEvent(new Event(COMMENTS_REVEALED_EVENT));
      }, 500);
      return;
    }

    if (isScrolling) {
      return;
    }

    const commentFooter = currentUnrevealed[0];
    const commentContainer = commentFooter.closest<HTMLElement>('.tm-comment-thread__comment');

    if (!commentContainer) {
      window.setTimeout(revealNext, 100);
      return;
    }

    isScrolling = true;
    lastProcessedTime = Date.now();

    try {
      const commentRect = commentContainer.getBoundingClientRect();
      const targetY = commentRect.top + window.pageYOffset - 20;
      window.scrollTo({
        top: targetY,
        behavior: 'smooth',
      });
    } catch (error) {
      console.error('Error during scroll:', error);
      isScrolling = false;
      window.setTimeout(revealNext, 100);
      return;
    }

    window.setTimeout(handleScroll, 500);
  };

  revealNext();
}

function sortComments(container: Element): void {
  const commentThreads = Array.from(
    container.querySelectorAll(':scope > section.tm-comment-thread')
  );

  const commentByRating: CommentRatingEntry[] = [];

  commentThreads.forEach((thread) => {
    const ratingElement =
      thread.querySelector(
        ':scope > article.tm-comment-thread__comment .tm-votes-lever__score-counter'
      ) ||
      thread.querySelector(':scope > article.tm-comment-thread__comment .tm-votes-meter__value');
    const rating = ratingElement ? Number.parseInt(ratingElement.textContent ?? '', 10) : -1;

    const commentAnchor = thread.querySelector<HTMLAnchorElement>(
      ":scope > article.tm-comment-thread__comment > a[name^='comment_']"
    );

    let commentId = 0;
    if (commentAnchor?.name) {
      commentId = Number.parseInt(commentAnchor.name.split('_')[1] ?? '0', 10);
    }

    commentByRating.push({ rating, thread, commentId });
  });

  commentByRating.sort((a, b) => {
    if (a.rating < b.rating) return 1;
    if (a.rating > b.rating) return -1;
    if (a.commentId < b.commentId) return -1;
    if (a.commentId > b.commentId) return 1;
    return 0;
  });

  commentThreads.forEach((thread) => {
    container.removeChild(thread);
  });

  commentByRating.forEach((comment) => {
    container.appendChild(comment.thread);
    const innerContainer = comment.thread.querySelector(':scope > .tm-comment-thread__children');
    if (innerContainer) {
      sortComments(innerContainer);
    }
  });
}

function sortCommentsByRating(): void {
  window.addEventListener(
    COMMENTS_REVEALED_EVENT,
    function onCommentsRevealed() {
      const container = document.querySelector('.tm-comments__tree');
      if (container) {
        sortComments(container);
        showNotification('Comments sorted by rating');
      }
    },
    { once: true }
  );

  revealComments();
}

function patchCommentsHeader(): void {
  const commentsHeader = document.querySelector<HTMLElement>(
    'div.tm-comments-wrapper__wrapper > header > h2'
  );

  if (!commentsHeader) {
    return;
  }

  if (commentsHeader.getAttribute(COMMENTS_HEADER_PATCHED_ATTR) === 'true') {
    return;
  }

  commentsHeader.style.cursor = 'pointer';
  commentsHeader.style.color = 'rgb(102, 154, 179)';

  const indicator = document.createElement('span');
  indicator.style.fontSize = '0.8em';
  indicator.style.verticalAlign = 'middle';
  indicator.textContent = '⇅';
  commentsHeader.appendChild(document.createTextNode(' '));
  commentsHeader.appendChild(indicator);

  commentsHeader.addEventListener('click', sortCommentsByRating);
  commentsHeader.setAttribute(COMMENTS_HEADER_PATCHED_ATTR, 'true');
}

export function initCommentsSorter(): void {
  patchCommentsHeader();
  window.setInterval(patchCommentsHeader, 1000);

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('Sort Habr Comments by Rating', sortCommentsByRating);
  }
}
