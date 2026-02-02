type RatingSide = 'positive' | 'negative' | 'neutral';

type Rating = {
  score: number;
  side: RatingSide;
  color?: string;
  sign?: string;
  shouldColorize: boolean;
};

const patchedHeaderAttribute = 'data-rating-header-patched';
const patchedTitleAttribute = 'data-rating-title-patched';

function parseRatingText(text: string): Rating {
  const normalized = text.trim();

  if (normalized.startsWith('+')) {
    const score = Number.parseInt(normalized.slice(1), 10) || 0;
    return {
      score,
      side: 'positive',
      color: '#7aa600',
      sign: '+',
      shouldColorize: true,
    };
  }

  if (normalized.startsWith('-')) {
    const score = Number.parseInt(normalized.slice(1), 10) || 0;
    return {
      score,
      side: 'negative',
      color: '#d04e4e',
      sign: '-',
      shouldColorize: true,
    };
  }

  const score = Number.parseInt(normalized, 10);
  return {
    score: Number.isNaN(score) ? 0 : score,
    side: 'neutral',
    shouldColorize: false,
  };
}

function getRating(): Rating {
  const ratingElement = document.querySelector<HTMLElement>(
    '[data-test-id="article-body"] [data-test-id="votes-score-counter"]'
  );
  if (ratingElement?.innerText) {
    return parseRatingText(ratingElement.innerText);
  }

  return {
    score: 0,
    side: 'neutral',
    shouldColorize: false,
  };
}

function colorizeHeader(rating: Rating): void {
  if (!rating.shouldColorize) {
    return;
  }

  const titleBlock = document.querySelector<HTMLElement>('h1.tm-title');
  const titleElement = document.querySelector<HTMLElement>('h1.tm-title span');

  if (!titleBlock || !titleElement) {
    return;
  }

  if (titleBlock.getAttribute(patchedHeaderAttribute) === 'true') {
    return;
  }

  if (!titleBlock.querySelector('.header_rating')) {
    titleBlock.style.color = rating.color ?? '';

    const ratingSpan = document.createElement('span');
    ratingSpan.className = 'header_rating';
    ratingSpan.style.color = rating.color ?? '';
    ratingSpan.textContent = ` (${rating.sign ?? ''}${rating.score})`;

    titleElement.appendChild(ratingSpan);
  }

  titleBlock.setAttribute(patchedHeaderAttribute, 'true');
}

function setTitle(rating: Rating): void {
  const titleElement = document.querySelector<HTMLElement>('head title');

  if (!titleElement) {
    return;
  }

  if (titleElement.getAttribute(patchedTitleAttribute) === 'true') {
    return;
  }

  const sign = rating.sign ?? '';
  titleElement.innerText = `(${sign}${rating.score}) ${titleElement.innerText}`;
  titleElement.setAttribute(patchedTitleAttribute, 'true');
}

export function exposeRating(): void {
  const rating = getRating();

  window.setInterval(() => {
    colorizeHeader(rating);
    setTitle(rating);
  }, 1000);
}
