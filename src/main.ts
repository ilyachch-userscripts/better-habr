import './style.css';
import { exposeRating } from './rating_exposer';
import { initCommentsSorter } from './comments_sorter';
import { initOutliner } from './outliner';

function init() {
  exposeRating();
  initCommentsSorter();
  initOutliner();
}

init();
