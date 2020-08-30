/**
 * Autocomplete.
 */
import { throttle } from './utils/events.js';

const cache = {};
const termsAllowingUnderscores = /^artist:/;
let inputField, originalValue;

function removeParent() {
  const parent = document.querySelector('.autocomplete');
  if (parent) parent.parentNode.removeChild(parent);
}

function removeSelected() {
  const selected = document.querySelector('.autocomplete__item--selected');
  if (selected) selected.classList.remove('autocomplete__item--selected');
}

function changeSelected(firstOrLast, current, sibling) {
  if (current && sibling) { // if the currently selected item has a sibling, move selection to it
    current.classList.remove('autocomplete__item--selected');
    sibling.classList.add('autocomplete__item--selected');
  }
  else if (current) { // if the next keypress will take the user outside the list, restore the original term
    inputField.value = originalValue;
    removeSelected();
  }
  else if (firstOrLast) { // if no item in the list is selected, select the first or last
    firstOrLast.classList.add('autocomplete__item--selected');
  }
}

function keydownHandler(event) {
  const selected = document.querySelector('.autocomplete__item--selected'),
        firstItem = document.querySelector('.autocomplete__item:first-of-type'),
        lastItem = document.querySelector('.autocomplete__item:last-of-type');

  if (event.keyCode === 38) changeSelected(lastItem, selected, selected && selected.previousSibling); // ArrowUp
  if (event.keyCode === 40) changeSelected(firstItem, selected, selected && selected.nextSibling); // ArrowDown
  if (event.keyCode === 13 || event.keyCode === 27 || event.keyCode === 188) removeParent(); // Enter || Esc || Comma
  if (event.keyCode === 38 || event.keyCode === 40) { // ArrowUp || ArrowDown
    const newSelected = document.querySelector('.autocomplete__item--selected');
    if (newSelected) previewSelected(newSelected.dataset.value);
    event.preventDefault();
  }
}

function previewSelected(value) {
  const { start, end } = getTermPosition(inputField);
  const prefix = start === 0 ? '' : originalValue.slice(0, start);
  const suffix = end === originalValue.length ? '' : originalValue.slice(end);
  inputField.value = prefix + value + suffix;
  const valueEnd = start + value.length;
  inputField.selectionStart = valueEnd;
  inputField.selectionEnd = valueEnd;
}

function createItem(list, suggestion) {
  const item = document.createElement('li');
  item.className = 'autocomplete__item';

  item.textContent = suggestion.label;
  item.dataset.value = suggestion.value;

  item.addEventListener('mouseover', () => {
    removeSelected();
    item.classList.add('autocomplete__item--selected');
  });

  item.addEventListener('mouseout', () => {
    removeSelected();
  });

  item.addEventListener('click', () => {
    previewSelected(item.dataset.value);
    inputField.dispatchEvent(
      new CustomEvent('autocomplete', {
        detail: {
          type: 'click',
          label: suggestion.label,
          value: suggestion.value,
        }
      })
    );
  });

  list.appendChild(item);
}

function createList(suggestions) {
  const parent = document.querySelector('.autocomplete'),
        list = document.createElement('ul');
  list.className = 'autocomplete__list';

  suggestions.forEach(suggestion => createItem(list, suggestion));

  parent.appendChild(list);
}

function createParent() {
  const parent = document.createElement('div');
  parent.className = 'autocomplete';

  // Position the parent below the inputField
  parent.style.position = 'absolute';
  parent.style.left = `${inputField.offsetLeft}px`;
  // Take the inputField offset, add its height and subtract the amount by which the parent element has scrolled
  parent.style.top = `${inputField.offsetTop + inputField.offsetHeight - inputField.parentNode.scrollTop}px`;

  // We append the parent at the end of body
  document.body.appendChild(parent);
}

function showAutocomplete(suggestions, targetInput) {
  // Remove old autocomplete suggestions
  removeParent();

  // If the input target is not empty, still visible, and suggestions were found
  if (targetInput.value && targetInput.style.display !== 'none' && suggestions.length) {
    createParent();
    createList(suggestions);
    inputField.addEventListener('keydown', keydownHandler);
  }
}

function getSuggestions(searchTerm) {
  return fetch(inputField.dataset.acSource + encodeURIComponent(searchTerm))
    .then(response => response.json())
    .then(suggestions => {
      // Save suggestions in cache
      cache[searchTerm] = suggestions;
      return suggestions;
    });
}

/**
 * @param {HTMLInputElement} input
 * @param {string|number} [start] term start position to force, pass undefined or omit to clear
 * @param {string|number} [end] term end position to force, pass undefined or omit to clear
 */
function setTermPosition(input, start, end) {
  input.dataset.acTermStart = start;
  input.dataset.acTermEnd = end;
}

/**
 * @param {HTMLInputElement} input
 * @returns {TokenPosition}
 */
function getTermPosition(input) {
  const { acTermStart = 0, acTermEnd = input.value.length } = input.dataset;
  return { start: Number(acTermStart), end: Number(acTermEnd) };
}

/**
 * @param {HTMLInputElement} input
 * @param {string} [term] term to force, pass undefined or omit to clear
 */
function setAutocompleteTerm(input, term = '') {
  input.dataset.acTerm = term;
}


/**
 * Apply additional transformations to the term before passing to the endpoint
 *
 * @param {string} term
 * @returns {string}
 */
function postprocessTerm(term) {
  let processedTerm = term;
  // Replaces underscores with spaces where applicable
  if (!termsAllowingUnderscores.test(term)) {
    processedTerm = processedTerm.replace(/_/g, ' ');
  }
  // Remove spaces before/after namespace
  processedTerm = processedTerm.replace(/^([^:\s]+)\s*:\s*(.*)$/g, '$1:$2');
  return processedTerm;
}

function getSearchTerm(target) {
  const term = typeof target.dataset.acTerm !== 'undefined' ? target.dataset.acTerm : originalValue;
  return postprocessTerm(term);
}

const handleAutocompleteInner = throttle(300, target => {
  inputField = target;
  originalValue = target.value;
  const searchTerm = getSearchTerm(target);
  const { ac, acMinLength } = target.dataset;

  if (!ac) return;
  if (isNaN(acMinLength)) throw new Error(`Autocomplete minimum length "${acMinLength}" is invalid`);

  if (searchTerm.length >= acMinLength) {
    if (cache[searchTerm]) {
      showAutocomplete(cache[searchTerm], target);
    }
    else {
      getSuggestions(searchTerm).then(suggestions => showAutocomplete(suggestions, target));
    }
  }
});

/**
 * @typedef ObjectWithTarget
 * @property {EventTarget} target
 */

/**
 * @param {ObjectWithTarget} event
 */
function handleAutocomplete(event) {
  removeParent();

  handleAutocompleteInner(event.target);
}

function listenAutocomplete() {
  // Use a timeout to delay requests until the user has stopped typing
  document.addEventListener('input', handleAutocomplete);

  // If there's a click outside the inputField, remove autocomplete
  document.addEventListener('click', event => {
    if (event.target && event.target !== inputField) removeParent();
  });
}

export { listenAutocomplete, handleAutocomplete, setTermPosition, getTermPosition, setAutocompleteTerm };
