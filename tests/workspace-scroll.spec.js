import { afterEach, it, expect } from 'vitest';
import { scrollWorkspace } from '../src/utils/workspaceScroll';
afterEach(() => { document.body.innerHTML = ''; document.documentElement.scrollTop = 0; });
function sizes(element, height, total, top = 0) {
  Object.defineProperty(element, 'clientHeight', { configurable: true, value: height });
  Object.defineProperty(element, 'scrollHeight', { configurable: true, value: total });
  element.scrollTop = top;
}
function scene() {
  const region = document.createElement('div'), editor = document.createElement('div');
  editor.contentEditable = 'true'; region.append(editor); document.body.append(region);
  sizes(document.documentElement, 800, 2000);
  sizes(region, 1200, 1200);
  return { region, editor, page: document.documentElement };
}
function wheel(target, options = {}) {
  const event = new WheelEvent('wheel', { deltaY: 100, cancelable: true, bubbles: true, ...options });
  target.dispatchEvent(event); return event;
}
it('scrolls the document while the mouse is over an editor in a single page', () => {
  const { region, editor, page } = scene();
  const event = wheel(editor);
  expect(scrollWorkspace(event, region)).toBe(page);
  expect(page.scrollTop).toBe(100); expect(event.defaultPrevented).toBe(true);
});
it('scrolls a split panel first, then continues on the page when its bottom is reached', () => {
  const { region, editor, page } = scene(); region.style.overflowY = 'auto'; sizes(region, 300, 700, 300);
  scrollWorkspace(wheel(editor), region); expect(region.scrollTop).toBe(400); expect(page.scrollTop).toBe(0);
  scrollWorkspace(wheel(editor), region); expect(page.scrollTop).toBe(100);
  scrollWorkspace(wheel(editor, { deltaY: -100 }), region); expect(region.scrollTop).toBe(300);
});
it('preserves nested textarea scrolling and hands off at the edge', () => {
  const { region, page } = scene(); const textarea = document.createElement('textarea'); textarea.style.overflowY = 'auto'; region.append(textarea); sizes(textarea, 100, 300, 100);
  scrollWorkspace(wheel(textarea), region); expect(textarea.scrollTop).toBe(200); expect(page.scrollTop).toBe(0);
  scrollWorkspace(wheel(textarea), region); expect(page.scrollTop).toBe(100);
});
it('keeps zoom and horizontal gestures native and converts line-based wheel events', () => {
  const { region, editor, page } = scene();
  for (const options of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { deltaX: 200 }]) {
    const event = wheel(editor, options); expect(scrollWorkspace(event, region)).toBeNull(); expect(event.defaultPrevented).toBe(false);
  }
  scrollWorkspace(wheel(editor, { deltaY: 3, deltaMode: 1 }), region); expect(page.scrollTop).toBe(48);
});
