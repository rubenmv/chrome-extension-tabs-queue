/*global chrome, FileReader, window, document, console*/
(function () {
	'use strict';
	var TAB_LIMIT_DEFAULT = 10,
		FILE_TYPES = ['image/jpeg', 'image/png', 'image/x-icon'],
		FILE_SIZE_LIMIT = 102400, //Bytes, 100KB (1KB = 1024B)
		IMAGE_DIM_LIMIT = 128, //px, square
		// Icon is saved in base64, calculate storage limits and leave some bytes for the other items
		// QUOTA_BYTES = max bytes in sync storage
		// QUOTA_BYTES_PER_ITEM = max bytes per item(key:value + quotes)
		// QUOTA_BYTES / QUOTA_BYTES_PER_ITEM = max items to split the icon string
		// icon items = max keys - some keys for the rest
		ITEM_BYTES_LIMIT = chrome.storage.sync.QUOTA_BYTES_PER_ITEM, //for later use
		// We leave at least 3 free slots for the rest of items (3*QUOTA_BYTES_PER_ITEM is more than enough free bytes), no need to worry about items (slots) limit (is like 512)
		ICON_MAX_KEYS = (chrome.storage.sync.QUOTA_BYTES / ITEM_BYTES_LIMIT) - 3,
		DEFAULT_ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABmJLR0QA/wD/AP+gvaeTAAAAqElEQVR4nO3aQQrCQBBE0Y54/yOrW5GABI0fmfeWs2iKYtLMIjMAAMCKtpm5nzDz2afzT513+XDY31NAHaB23Tl7/ebe+fYO+anlb4AC6gC1vXeAHbASBdQBanvvgKOO7ozSNjO354Plb4AC6gA1BdQBagqoA9QUUAeoKaAOUFNAHaCmgDpATQF1gJoC6gA1BdQBagqoA9TO+Eforyx/AxRQBwAAACg8AEejCFAaFqVwAAAAAElFTkSuQmCC';

	function setFileError(errorString) {
		// Update status to let user know options were saved.
		var status = document.getElementById('statusIcon');
		status.textContent = errorString;
		window.setTimeout(function () {
			status.textContent = '';
		}, 5000);
	}
	//Read icon file
	//Limits: 100KB and/or 128x128px
	function handleFileSelect(evt) {
		var files = evt.target.files,
			file = files[0];
		if (files && file) {
			var preview = document.getElementById('iconImage');
			preview.setAttribute('src', DEFAULT_ICON);
			if (file.size > FILE_SIZE_LIMIT) {
				setFileError('File size limit exceeded (max 100KB)');
				evt.srcElement.value = '';
				return;
			} else if (FILE_TYPES.indexOf(file.type) === -1) {
				setFileError('Invalid file type (JPEG or PNG)');
				evt.srcElement.value = '';
				return;
			}
			var reader = new FileReader();
			reader.onload = function (readerEvt) {
				var binaryString = readerEvt.target.result;
				var base64String = 'data:image/png;base64,' + window.btoa(binaryString);
				preview.setAttribute('src', base64String);
			};
			reader.readAsBinaryString(file);
		}
	}
	// Saves options to chrome.storage
	function saveOptions() {
		var i = 0;

		var tabLimit = document.getElementById('tabLimit').value,
			allowDuplicates = document.getElementById('duplicates').checked,
			iconSource = document.getElementById('iconImage').src; //BASE64 or url

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
		//Generate the keys for the icon
		//Icon keys cleanup
		for (i = 0; i < ICON_MAX_KEYS; i++) {
			options['icon' + i] = '';
		}
		//Split icon base64 string, maximum QUOTA_BYTES_PER_ITEM = 4096 bytes
		//maxLength = QUOTA_BYTES_PER_ITEM - 4 (key 'icon') - 4 quotes (on key and value)
		var maxLength = ITEM_BYTES_LIMIT - 'iconxx'.length - 4,
			//g = global match: finds all matches rather than stopping on the first one
			regex = new RegExp('.{1,' + maxLength + '}', 'g'),
			splitted = iconSource.match(regex),
			iconKeys = [];

		for (i = 0; i < ICON_MAX_KEYS && i < splitted.length; i++) {
			if (splitted[i] !== undefined) {
				options['icon' + i] = splitted[i];
			}
		}
		chrome.storage.sync.set(options, function () {
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
		//icon cleanup
		for (var i = 0; i < ICON_MAX_KEYS; i++) {
			options['icon' + i] = '';
		}
		options.icon0 = DEFAULT_ICON;
		/*  *************
			Get the items from localStorage
				 ************* */
		chrome.storage.sync.get(options, function (items) {
			// Check for error
			if (chrome.runtime.lastError !== undefined) {
				console.error("An error ocurred restoring options: " + chrome.runtime.lastError);
				return;
			}
			//TAB LIMIT
			document.getElementById('tabLimit').value = items.tabLimit;
			document.getElementById('duplicates').checked = items.allowDuplicates;
			//ICON
			var iconString = '';
			//Get icon parts and join them
			for (var i = 0; i < ICON_MAX_KEYS; i++) {
				iconString += items['icon' + i];
			}
			document.getElementById('iconImage').src = iconString;
		});
	}
	//Reset to default icon
	function resetIcon() {
		document.getElementById('iconImage').src = DEFAULT_ICON;
	}

	//Listener ftw
	document.addEventListener('DOMContentLoaded', restoreOptions);
	document.getElementById('save').addEventListener('click', saveOptions);
	document.getElementById('iconRestore').addEventListener('click', resetIcon);
	if (window.File && window.FileReader && window.FileList && window.Blob) {
		document.getElementById('iconFilePicker').addEventListener('change', handleFileSelect, false);
	} else {
		console.log('The File APIs are not fully supported in this browser.');
	}
}());
