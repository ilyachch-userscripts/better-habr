import './outliner.css';

type HeadingEntry = {
  element: HTMLElement;
  id: string;
  level: number;
  text: string;
};

const ARTICLE_BODY_SELECTOR = '[data-test-id="article-body"]';
const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';
const OUTLINER_HEADING_ATTR = 'data-outliner-heading';
const OUTLINER_SIDEBAR_ATTR = 'data-outliner-sidebar';
const OUTLINER_ACTIVE_CLASS = 'bh-outliner-link--active';
const OUTLINER_SMOOTH_ATTR = 'data-outliner-smooth';

type OutlinerSidebarState = HTMLElement & {
  __bhOutlinerObserver?: IntersectionObserver;
  __bhOutlinerScrollHandler?: () => void;
};

function collectHeadings(articleBody: HTMLElement): HeadingEntry[] {
  const headingNodes = Array.from(articleBody.querySelectorAll<HTMLElement>(HEADING_SELECTOR));
  const usedIds = new Set<string>();

  return headingNodes
    .map((heading, index) => {
      const text = sanitizeHeadingText(heading.innerText);
      if (!text) {
        return null;
      }

      const level = Number.parseInt(heading.tagName.replace('H', ''), 10);
      const id = ensureHeadingId(heading, index, usedIds);

      return {
        element: heading,
        id,
        level: Number.isNaN(level) ? 2 : level,
        text,
      };
    })
    .filter((entry): entry is HeadingEntry => entry !== null);
}

function sanitizeHeadingText(text: string): string {
  const cleaned = text.replace(/[^\x20-\x7E\u0400-\u04FF]/g, ' ');
  return cleaned.replace(/\s+/g, ' ').trim();
}

function ensureHeadingId(heading: HTMLElement, index: number, usedIds: Set<string>): string {
  const existingId = heading.id.trim();
  if (existingId && !usedIds.has(existingId)) {
    usedIds.add(existingId);
    return existingId;
  }

  let candidate = `bh-outliner-heading-${index + 1}`;
  let suffix = 1;
  while (usedIds.has(candidate) || document.getElementById(candidate)) {
    candidate = `bh-outliner-heading-${index + 1}-${suffix}`;
    suffix += 1;
  }

  heading.id = candidate;
  heading.setAttribute(OUTLINER_HEADING_ATTR, 'true');
  usedIds.add(candidate);

  return candidate;
}

function buildOutlineList(headings: HeadingEntry[]): HTMLUListElement {
  const list = document.createElement('ul');
  list.className = 'bh-outliner-list';

  const levelOrder = Array.from(new Set(headings.map((heading) => heading.level))).sort(
    (a, b) => a - b
  );
  const levelIndex = new Map<number, number>();
  levelOrder.forEach((level, index) => {
    levelIndex.set(level, index);
  });

  for (const heading of headings) {
    const item = document.createElement('li');
    item.className = 'bh-outliner-item';

    const link = document.createElement('a');
    link.className = 'bh-outliner-link';
    link.href = `#${heading.id}`;
    link.textContent = heading.text;
    item.appendChild(link);

    const indent = levelIndex.get(heading.level) ?? 0;
    if (indent > 0) {
      item.style.marginLeft = `${indent * 12}px`;
    }

    list.appendChild(item);
  }

  return list;
}

function buildOutlinerSection(list: HTMLElement): HTMLElement {
  const sidebar = document.createElement('aside');
  sidebar.className = 'bh-outliner-sidebar';
  sidebar.setAttribute(OUTLINER_SIDEBAR_ATTR, 'true');

  const header = document.createElement('div');
  header.className = 'bh-outliner-sidebar__header';
  header.textContent = 'Contents';
  sidebar.appendChild(header);

  const body = document.createElement('div');
  body.className = 'bh-outliner-sidebar__body';
  body.appendChild(list);
  sidebar.appendChild(body);

  return sidebar;
}

function enableSmoothScroll(sidebar: HTMLElement): void {
  if (sidebar.getAttribute(OUTLINER_SMOOTH_ATTR) === 'true') {
    return;
  }

  sidebar.setAttribute(OUTLINER_SMOOTH_ATTR, 'true');
  sidebar.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLAnchorElement)) {
      return;
    }

    if (!target.classList.contains('bh-outliner-link')) {
      return;
    }

    const href = target.getAttribute('href');
    if (!href || !href.startsWith('#')) {
      return;
    }

    const id = href.slice(1);
    const heading = document.getElementById(id);
    if (!heading) {
      return;
    }

    event.preventDefault();
    heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
  });
}

function trackActiveSection(headings: HeadingEntry[], sidebar: HTMLElement): void {
  const state = sidebar as OutlinerSidebarState;
  if (state.__bhOutlinerObserver) {
    state.__bhOutlinerObserver.disconnect();
    state.__bhOutlinerObserver = undefined;
  }
  if (state.__bhOutlinerScrollHandler) {
    window.removeEventListener('scroll', state.__bhOutlinerScrollHandler);
    state.__bhOutlinerScrollHandler = undefined;
  }

  const linkById = new Map<string, HTMLAnchorElement>();
  const links = Array.from(sidebar.querySelectorAll<HTMLAnchorElement>('.bh-outliner-link'));
  for (const link of links) {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      linkById.set(href.slice(1), link);
    }
  }

  const setActive = (id: string | null) => {
    for (const [key, link] of linkById) {
      if (key === id) {
        link.classList.add(OUTLINER_ACTIVE_CLASS);
      } else {
        link.classList.remove(OUTLINER_ACTIVE_CLASS);
      }
    }
  };

  const updateFromScroll = () => {
    let activeId: string | null = null;
    for (const heading of headings) {
      const rect = heading.element.getBoundingClientRect();
      if (rect.top <= 120) {
        activeId = heading.id;
      } else {
        break;
      }
    }
    setActive(activeId);
  };

  if ('IntersectionObserver' in window) {
    let currentId: string | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length === 0) {
          return;
        }

        const id = (visible[0].target as HTMLElement).id;
        if (id && id !== currentId) {
          currentId = id;
          setActive(id);
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: [0, 1] }
    );

    for (const heading of headings) {
      observer.observe(heading.element);
    }

    state.__bhOutlinerObserver = observer;
    updateFromScroll();
  } else {
    state.__bhOutlinerScrollHandler = updateFromScroll;
    (window as Window).addEventListener('scroll', updateFromScroll, { passive: true });
    updateFromScroll();
  }
}

function insertOutliner(): boolean {
  const articleBody = document.querySelector<HTMLElement>(ARTICLE_BODY_SELECTOR);
  if (!articleBody) {
    return false;
  }

  const headings = collectHeadings(articleBody);
  if (headings.length === 0) {
    return false;
  }

  const outlineList = buildOutlineList(headings);
  const existingSidebar = document.querySelector<HTMLElement>(`[${OUTLINER_SIDEBAR_ATTR}="true"]`);

  if (existingSidebar) {
    const body = existingSidebar.querySelector<HTMLElement>('.bh-outliner-sidebar__body');
    if (body) {
      body.innerHTML = '';
      body.appendChild(outlineList);
    }
    enableSmoothScroll(existingSidebar);
    trackActiveSection(headings, existingSidebar);
    return true;
  }

  const sidebar = buildOutlinerSection(outlineList);
  enableSmoothScroll(sidebar);
  trackActiveSection(headings, sidebar);
  document.body.appendChild(sidebar);

  return true;
}

export function initOutliner(): void {
  const attemptInsert = () => {
    if (insertOutliner()) {
      window.clearInterval(intervalId);
    }
  };

  const intervalId = window.setInterval(attemptInsert, 1000);
  attemptInsert();
}
