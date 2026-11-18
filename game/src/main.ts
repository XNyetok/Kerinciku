// The new game's staging page. For now it only says what it is, whether this phone has
// WebGL2 (the baseline of the new game), and which build it is.
import './style.css';
import { text } from './strings';

function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} is missing from index.html`);
  return el;
}

function hasWebGL2(): boolean {
  try {
    return document.createElement('canvas').getContext('webgl2') !== null;
  } catch {
    return false;
  }
}

byId('about').textContent = text.about;
byId('webgl').textContent = hasWebGL2() ? text.webgl2Yes : text.webgl2No;
byId('label').textContent = text.version(__BUILD_LABEL__);
