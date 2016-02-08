#Tabs limiter with queue#

**Tabs limiter with queue** allows you to limit the number of tabs opened in a Chrome window. New tabs exceeding the limit will be put in a queue, when a tab is closed and there's enough space in the active window, the next URL from the queue loads automatically in a new background tab.

The main purpose of this extension is to keep the browser free from a ton of background tabs that are consuming memory and CPU cycles (and battery life on laptops). It's perfect for opening links like a maniac on  Reddit, Google searches or photos/wallpaper sites.

By default tabs with URL matching Chrome internal pages won't be counted in the limit. For example chrome://extension or chrome://settings can be opened any time. This also means that you can open a new tab manually and then load any page from there, that tab won't be queued.

IMPORTANT: This extension is not meant to be used as some kind of "read later" or session manager. It's a simple tab limiter with some extra functionality.

![Button and popup screenshot](screenshots/tabs-queue-2_0-screenshot-1.jpg)
![Settings screenshot](screenshots/tabs-queue-2_0-screenshot-2.jpg)
![Settings screenshot](screenshots/tabs-queue-2_0-screenshot-3.jpg)

Enjoy.

##CURRENT VERSION##
### [2.0.0] 2016-01-26
- Multi-window queues. When a window in closed, the queue (if not empty) is saved.
- List of saved queues and preview it's content.
- Delete/restore saved queues and items.
- Drag and drop active queue items to rearrange.
- Lock items in active queue.
- Click on title to "Queue to fit limit". Two modes: queue tabs on the right or by recent. 
- Context menu option to open links new tab (override queue limit).
- On/off button to enable/disable extension functionality.
- Slow network mode: adds a new limit for loading tabs.
- Inverse mode: New items will be added to the top of the queue.
- Automatic queue migration from version 1.0.

[See full changelog.](https://raw.githubusercontent.com/rubenmv/chrome-extension-tabs-queue/master/release/CHANGELOG.md)


##ABOUT PERMISSIONS##
This extension makes use of the minimum required permissions to provide it's functionality. 

The code is minifized to improve performance, but the original source code is public and visible from the [GitHub](https://github.com/rubenmv/chrome-extension-tabs-queue) repository, including the Gulp tasks used to obtain the final build. 

##LEGAL STUFF##
Tabs Queue by Rubén Martínez is licensed as [GPLv3](http://www.gnu.org/licenses/gpl-3.0.txt). You can find the source code on [GitHub](https://github.com/rubenmv/chrome-extension-tabs-queue).  
This extension makes use of [Sortable.js](https://github.com/RubaXa/Sortable), which is distributed under the [MIT License](https://opensource.org/licenses/MIT).  
Icon from [Picol](http://www.picol.org/) is licensed under [CC BY SA 3.0](http://creativecommons.org/licenses/by-sa/3.0/).

