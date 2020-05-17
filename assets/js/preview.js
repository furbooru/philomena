/**
 * Markdown previews (posts, comments, messages)
 */

import { fetchJson } from './utils/requests';
import { filterNode } from './imagesclientside';
import { debounce } from './utils/events.js';
import { hideEl, showEl } from './utils/dom.js';

function handleError(response) {
  const errorMessage = '<div>Preview failed to load!</div>';

  if (!response.ok) {
    return errorMessage;
  }

  return response.text();
}

function commentReply(user, url, textarea, quote) {
  const text = `"@${user}":${url}`;
  let newval = textarea.value;

  if (newval && /\n$/.test(newval)) newval += '\n';
  newval += `${text}\n`;

  if (quote) {
    newval += `[bq="${user.replace('"', '\'')}"] ${quote} [/bq]\n`;
  }

  textarea.value = newval;
  textarea.selectionStart = textarea.selectionEnd = newval.length;

  const writeTabToggle = document.querySelector('a[data-click-tab="write"]:not(.selected)');
  if (writeTabToggle) writeTabToggle.click();

  textarea.focus();
}

function getPreview(body, anonymous, previewLoading, previewContent) {
  let path = '/posts/preview';

  showEl(previewLoading);

  setTimeout(() => {
    const { Remarkable } = remarkable,
          md = new Remarkable('full');
    previewContent.innerHTML = md.render(body);
    showEl(previewContent);
    hideEl(previewLoading);
  }, 50 + (Math.random() * 100));

  // TODO Restore API call when renderer is updated

  /*fetchJson('POST', path, { body, anonymous })
    .then(handleError)
    .then(data => {
      previewContent.innerHTML = data;
      filterNode(previewContent);
      showEl(previewContent);
      hideEl(previewLoading);
    });*/
}

function setupPreviews() {
  let textarea = document.querySelector('.js-preview-input');

  if (!textarea) {
    textarea = document.querySelector('.js-preview-description');
  }

  const previewLoading = document.querySelector('.communication-preview__loading');
  const previewContent = document.querySelector('.communication-preview__content');
  const previewAnon = document.querySelector('.preview-anonymous') || false;

  if (!textarea || !previewContent) {
    return;
  }

  const updatePreview = () => {
    getPreview(textarea.value, Boolean(previewAnon.checked), previewLoading, previewContent);
  };

  const debouncedUpdater = debounce(500, () => {
    if (previewContent.previewedText === textarea.value) return;
    previewContent.previewedText = textarea.value;

    updatePreview();
  });

  textarea.addEventListener('keydown', debouncedUpdater);
  textarea.addEventListener('focus', debouncedUpdater);

  // Fire handler if textarea contains text on page load (e.g. editing)
  if (textarea.value) textarea.dispatchEvent(new Event('keydown'));

  previewAnon && previewAnon.addEventListener('click', updatePreview);

  document.addEventListener('click', event => {
    if (event.target && event.target.closest('.post-reply')) {
      const link = event.target.closest('.post-reply');
      commentReply(link.dataset.author, link.getAttribute('href'), textarea, link.dataset.post);
      event.preventDefault();
    }
  });
}

export { setupPreviews };
