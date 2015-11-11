/*global chrome, FileReader, window, document, console*/
(function () {
  'use strict';
  var TAB_LIMIT_DEFAULT = 10;
  // Saves options to chrome.storage
  function saveOptions() {
    var i = 0;

    var tabLimit = document.getElementById('tabLimit').value,
      allowDuplicates = document.getElementById('duplicates').checked;
    if (tabLimit < 1) {
      document.getElementById('statusTabLimit').textContent = 'Incorrect value, minimum of 1.';
      window.setTimeout(function () {
        document.getElementById('statusTabLimit').textContent = '';
      }, 3000);
      return;
    }
    // Set the options object
    var options = {};
    options.tabLimit = tabLimit;
    options.allowDuplicates = allowDuplicates;

    chrome.storage.local.set(options, function () {
      // Update status to let user know options were saved.
      var status = document.getElementById('status');
      status.textContent = 'Options saved';
      // Check for error
      if (chrome.runtime.lastError !== undefined) {
        console.error("An error ocurred saving options: " + chrome.runtime.lastError.string);
        console.error(chrome.runtime.lastError);
        status.textContent = 'An error ocurred saving options';
      }
      window.setTimeout(function () {
        status.textContent = '';
      }, 1800);
    });
  }
  //Restore user options on page load
  function restoreOptions() {
    /*  *************
      Set defaults for localStorage get error
         ************* */
    var options = {};
    options.tabLimit = TAB_LIMIT_DEFAULT;
    options.allowDuplicates = false;
    /*  *************
      Get the items from localStorage
         ************* */
    chrome.storage.local.get(options, function (items) {
      // Check for error
      if (chrome.runtime.lastError !== undefined) {
        console.error("An error ocurred restoring options: " + chrome.runtime.lastError);
        return;
      }
      //TABS LIMIT
      document.getElementById('tabLimit').value = items.tabLimit;
      document.getElementById('duplicates').checked = items.allowDuplicates;
    });
  }
  //Listener ftw
  document.addEventListener('DOMContentLoaded', restoreOptions);
  document.getElementById('save').addEventListener('click', saveOptions);
}());
