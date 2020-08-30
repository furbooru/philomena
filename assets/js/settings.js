/**
 * Settings.
 */

import { $, $$ } from './utils/dom';
import store from './utils/store';

export function setupSettings() {

  if (!$('#js-setting-table')) return;

  const localCheckboxes = $$('[data-tab="local"] input[type="checkbox"]');
  const themeSelect = $('#user_theme');
  const styleSheet = $('head link[rel="stylesheet"]');

  // Local settings
  localCheckboxes.forEach(checkbox => {
    const storeKey = checkbox.id.replace('user_', '');
    checkbox.checked = store.get(storeKey);

    checkbox.addEventListener('change', () => {
      store.set(storeKey, checkbox.checked);
    });
  });

  // Theme preview
  themeSelect && themeSelect.addEventListener('change', () => {
    styleSheet.href = themeSelect.options[themeSelect.selectedIndex].dataset.themePath;
  });

}
