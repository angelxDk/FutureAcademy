/** Keep vertical wheel gestures usable even over editors and non-scrolling cards. */
export function scrollWorkspace(event, region) {
  // Preserve browser zoom, horizontal trackpad gestures and Shift + wheel.
  if (!event.cancelable || event.ctrlKey || event.metaKey || event.shiftKey || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return null;
  const page = region.ownerDocument.scrollingElement || region.ownerDocument.documentElement;
  const step = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? Math.min(region.clientHeight || window.innerHeight, window.innerHeight) : 1;
  const delta = event.deltaY * step;
  const canMove = node => delta < 0 ? node.scrollTop > 0 : node.scrollTop + node.clientHeight < node.scrollHeight - 1;
  let node = event.target?.nodeType === 1 ? event.target : event.target?.parentElement;
  // Honor nested textareas, message logs and the panel itself before handing off to the page.
  while (node && region.contains(node)) {
    const overflow = window.getComputedStyle(node).overflowY;
    if (/(auto|scroll)/.test(overflow) && node.scrollHeight > node.clientHeight && canMove(node)) {
      event.preventDefault();
      node.scrollTop = Math.max(0, Math.min(node.scrollHeight - node.clientHeight, node.scrollTop + delta));
      return node;
    }
    if (node === region) break;
    node = node.parentElement;
  }
  if (canMove(page)) {
    event.preventDefault();
    page.scrollTop = Math.max(0, Math.min(page.scrollHeight - page.clientHeight, page.scrollTop + delta));
    return page;
  }
  return null;
}
