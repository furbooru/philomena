/**
 * DOM events
 */

export function fire(el, event, detail) {
  el.dispatchEvent(new CustomEvent(event, { detail, bubbles: true, cancelable: true }));
}

export function on(node, event, selector, func) {
  delegate(node, event, { [selector]: func });
}

export function leftClick(func) {
  return (event, target) => { if (event.button === 0) return func(event, target); };
}

export function delegate(node, event, selectors) {
  node.addEventListener(event, e => {
    for (const selector in selectors) {
      const target = e.target.closest(selector);
      if (target && selectors[selector](e, target) === false) break;
    }
  });
}

/**
 * @param fn
 * @param delay
 * @return {function}
 * @returns A function that will not execute `fn` until it hasn't been called for `delay` ms
 */
export function throttle(delay, fn) {
  let timeout;
  return (...args) => {
    window.clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

/**
 * @param fn
 * @param delay
 * @return {function}
 * @returns A function that will only execute `fn` at most once every `delay` ms
 */
export function debounce(delay, fn) {
  let timeout = null;
  return (...args) => {
    if (timeout !== null) return;
    timeout = setTimeout(() => {
      fn(...args);
      window.clearTimeout(timeout);
      timeout = null;
    }, delay);
  };
}
