/*global chrome, FileReader, window, document, console*/
"use strict";
var TAB_LIMIT_DEFAULT = 10;

/**
 * Saves options to chrome.storage
 */
function saveOptions() {
  var
    tabLimit = document.getElementById("tabLimit").value,
    allowDuplicates = document.getElementById("duplicates").checked,
    restoreOnStart = document.getElementById("restoreOnStart").checked,
    hideContextMenu = document.getElementById("hideContextMenu").checked,
    queueByRecent = document.getElementById("queueMode1").checked,
    slowNetworkMode = document.getElementById("slowNetworkMode").checked,
    slowNetworkLimit = document.getElementById("slowNetworkLimit").value;

  if (tabLimit < 2) {
    document.getElementById("statusTabLimit").textContent = "Incorrect value, minimum of 2.";
    window.setTimeout(function () {
      document.getElementById("statusTabLimit").textContent = "";
    }, 3000);
    return;
  }
  // Set the options object
  var options = {};
  options["tabLimit"] = tabLimit;
  options["allowDuplicates"] = allowDuplicates;
  options["restoreOnStart"] = restoreOnStart;
  options["hideContextMenu"] = hideContextMenu;
  options["queueByRecent"] = queueByRecent;
  options["slowNetworkMode"] = slowNetworkMode;
  options["slowNetworkLimit"] = slowNetworkLimit;

  chrome.storage.local.set(options, function () {
    // Update status to let user know options were saved.
    var status = document.getElementById("status");
    status.textContent = "Options saved";
    // Check for error
    if (chrome.runtime.lastError !== undefined) {
      console.error("An error ocurred saving options: " + chrome.runtime.lastError.string);
      console.error(chrome.runtime.lastError);
      status.textContent = "An error ocurred saving options";
    }
    window.setTimeout(function () {
      status.textContent = "";
    }, 1800);
  });
}

/**
 * Restore user options on page load
 */
function restoreOptions() {
  /*  *************
    Set defaults for localStorage get error
       ************* */
  var options = {};
  options["tabLimit"] = TAB_LIMIT_DEFAULT;
  options["allowDuplicates"] = false;
  options["restoreOnStart"] = false;
  options["hideContextMenu"] = false;
  options["queueByRecent"] = false;
  options["slowNetworkMode"] = false;
  options["slowNetworkLimit"] = TAB_LIMIT_DEFAULT;
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
    document.getElementById("tabLimit").value = items.tabLimit;
    document.getElementById("duplicates").checked = items.allowDuplicates;
    document.getElementById("restoreOnStart").checked = items.restoreOnStart;
    document.getElementById("hideContextMenu").checked = items.hideContextMenu;
    if (items.queueByRecent) {
      document.getElementById("queueMode1").checked = items.queueByRecent;
    }
    else {
      document.getElementById("queueMode0").checked = true;
    }
    document.getElementById("slowNetworkMode").checked = items.slowNetworkMode;
    document.getElementById("slowNetworkLimit").checked = items.slowNetworkLimit;
  });
}
//Listener ftw
document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("save").addEventListener("click", saveOptions);
