import { $$ } from './utils/dom.js';
import { handleAutocomplete, setAutocompleteTerm, setTermPosition } from './autocomplete.js';

const LITERAL_FIELDS = [
  'id',
  'width',
  'height',
  'comment_count',
  'score',
  'upvotes',
  'downvotes', 'faves',
  'uploader_id',
  'faved_by_id',
  'tag_count',
  'pixels',
  'size',
  'aspect_ratio',
  'wilson_score',
  'duration',
  'created_at',
  'updated_at',
  'first_seen_at'
];

/**
 * @type {RegExp[]}
 */
const ignoredTerms = [
  new RegExp(`^(?:${LITERAL_FIELDS.join('|')})(?:\\.[^:]*)?:`),
];

/**
 * @param {string} value
 * @returns {boolean}
 */
function isIgnoredTerm(value) {
  return ignoredTerms.some(regex => {
    const matches = regex.test(value);
    console.log('%s %s for regex %s', value, matches ? 'matches' : 'does not match', regex);
    return matches;
  });
}

/**
 * @typedef {TokenPosition & TokenValue} ParserToken
 */

/**
 * @typedef TokenValue
 * @property {string} value
 */

/**
 * @typedef TokenPosition
 * @property {number} start
 * @property {number} end
 */

/**
 * Extract the search term form an input string and the cursor position
 * @param {string} input
 * @param {number} cursorPos
 * @return {ParserToken}
 */
function extractTerm(input, cursorPos) {
  const inputLength = input.length;
  if (cursorPos > inputLength) {
    throw new Error('Cursor position is outside input value');
  }

  // First we need to find the group closest to the cursor
  let depth = 0;
  /**
   * @type {Object.<number, TokenPosition>}
   */
  const groups = {
    0: {
      start: 0,
      end: 0,
    },
  };
  const parenBalance = {
    0: 0,
  };
  let pos = 0;
  while (pos < inputLength) {
    if (input[pos] === '(') {
      if (pos >= cursorPos) {
        // New group is starting past the cursor position, we found what we came for
        break;
      }

      if (/(?:^\s*|(?:,|&&|\|\|)\s*|\s+AND\s+|\s+OR\s+)$/.test(input.substring(0, pos))) {
        depth++;
        const start = pos + 1;
        groups[depth] = {
          start,
          end: start,
        };
        parenBalance[depth] = 0;
        pos++;
        continue;
      }
      else {
        parenBalance[depth]++;
      }
    }
    else if (input[pos] === ')') {
      if (pos >= cursorPos) {
        // Target acquired
        break;
      }

      parenBalance[depth] = Math.max(0, parenBalance[depth] - 1);

      console.log(parenBalance[depth]);
      if (parenBalance[depth] <= 0) {
        if (parenBalance[depth] === 0) {
          depth = Math.max(0, depth - 1);
        }
        pos++;
        continue;
      }
    }

    groups[depth].end = pos + 1;
    pos++;
  }

  // Now we refine the position within the group
  const { start: groupStart, end: groupEnd } = groups[depth];
  /**
   * @type {Object.<number, ParserToken>}
   */
  const terms = {
    0: {
      value: '',
      start: groupStart,
      end: groupStart,
    },
  };
  let currentTermIndex = 0;
  pos = groupStart;
  while (pos < groupEnd) {
    const remainingString = input.substring(pos, groupEnd);
    const specialTokenStart = remainingString.match(/^(?:(?:,|&&|\|\|)\s*|\s+AND\s+|\s+OR\s+|!\s*|NOT\s+)/);
    if (specialTokenStart !== null) {
      const specialToken = specialTokenStart[0];
      if (specialToken.trim().length > 0) {
        pos += specialToken.length;
        if (pos > cursorPos) {
          // Bingo
          break;
        }

        currentTermIndex++;
        terms[currentTermIndex] = {
          value: '',
          start: pos,
          end: pos,
        };
        continue;
      }
    }

    terms[currentTermIndex].value += input[pos];
    terms[currentTermIndex].end = pos + 1;
    pos++;
  }
  return terms[currentTermIndex];
}

/**
 * @param {HTMLInputElement} input
 * @returns {ParserToken|null}
 */
function grabToken(input) {
  const { selectionStart: start, selectionEnd: end, value } = input;
  // If text is selected disable autocompletion
  if (end !== start) {
    return null;
  }
  return extractTerm(value, start);
}

let inputTimeout;
const last = {
  value: null,
  term: null,
  cursorPos: null,
};

function handleInput(event) {
  window.clearTimeout(inputTimeout);
  inputTimeout = window.setTimeout(() => {
    const field = event.target;
    const cursorPos = field.selectionStart === field.selectionEnd
      ? field.selectionStart
      : null;

    // eslint-disable-next-line default-case
    switch (event.type) {
      // The original autocomplete listener waits for this event
      case 'input':
        // Prevent bubbling, we'll handle it ourselves
        event.stopPropagation();
        break;
      case 'keydown':
        if (event.keyCode === 38 || event.keyCode === 40) { // ArrowUp || ArrowDown
          // Ignore these events, should be handled by autocomplete
          return;
        }
        break;
    }

    let term;
    if (last.value === field.value && cursorPos === last.cursorPos) {
      term = last.term;
    }
    else {
      term = grabToken(field);
      last.value = field.value;
      last.term = term;
    }

    if (term && !isIgnoredTerm(term.value)) {
      setAutocompleteTerm(field, term.value);
      setTermPosition(field, term.start, term.end);
      handleAutocomplete(event);
    }
    else {
      setAutocompleteTerm(field);
      setTermPosition(field);
    }
  }, 100);
}

function setupSearchAutocomplete() {
  const fields = $$('.js-search-field');

  fields.forEach(field => {
    field.setAttribute('autocomplete', 'off');
    field.setAttribute('autocapitalize', 'none');
    field.dataset.ac = 'true';
    field.dataset.acSource = '/search/autocomplete?term=';
    field.dataset.acMinLength = '3';

    field.addEventListener('input', handleInput);
    // Handle text cursor movement inside the input
    field.addEventListener('keydown', handleInput);
    field.addEventListener('click', handleInput);
    field.addEventListener('focus', handleInput);
  });
}

export { setupSearchAutocomplete };
