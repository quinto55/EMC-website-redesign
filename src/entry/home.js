// The home page's script: everything every page does, then the live sample board.
import './site.js';
import { mountBoard } from '../demo/board-view.js';

function mountBoards() {
  for (const el of document.querySelectorAll('[data-board]')) {
    try {
      mountBoard(el);
    } catch (err) {
      console.error(err); // the board stays as served; nothing else on the page is affected
    }
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountBoards);
else mountBoards();
