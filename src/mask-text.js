export function positionMaskText(textEl, width, height, fontSize) {
  textEl.setAttribute('x', String(width / 2));
  textEl.setAttribute('y', String(height / 2));
  textEl.style.fontSize = `${fontSize}px`;
}

export function introFontSize(width, height) {
  return Math.round(Math.min(width * 0.28, height * 0.5));
}

export function fortyFontSize(width, height) {
  return Math.round(height * 0.7);
}
