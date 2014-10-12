<h1>Custom Button</h1>

<b>Custom Button</b> is a simple Chrome extension where you can customize a button, set an URL, change the icon and some other stuff.

Just go to options and set the url and the window mode on activation.
You can also set a regular expresion to match a certain domain and activate notifications when the match fails.

<h2>Options</h2>
<h3>URL</h3>
Set the url you want to launch. For example:<br>
*https://www.youtube.com/feed/subscriptions*

Add **%url** anywhere in the string and it will be replaced by the active tab url. For example:<br>
*http://en.savefrom.net/%url*

Choose the **opening method**. For example, you could set the url to *chrome://extensions* and then set it to open on a popup window. This way your button will open the extensions page on a separate popup window, pretty cool!

<h3>ICON</h3>
Sets the icon on the button and notifications.<br>
*PNG format and 64x64px maximum is recommended.*<br>
*Maximum size of 100KB.*

<h3>DOMAIN</h3>
You can make the button work only on a certain domain.<br>
Matches any url by default.<br>
Uses *regular expressions* (test it here if you want).<br>
For example, this will match any *http/https* site: **^(http|https)://*** 


<h3>NOTIFICATIONS</h3>
Shows desktop notification when domain doesn't match. When active it's possible to change the title and text for the notification.

<h2>LEGAL STUFF</h2>
**Custom Icon** by <a href="https://twitter.com/rub3nmv">**Rub&eacute;n Mart&iacute;nez**</a> is licensed as <a href="http://www.gnu.org/licenses/gpl-3.0.txt">GPLv3</a>.<br>
Default icon made by <a href="http://www.typicons.com" title="Stephen Hutchings">Stephen Hutchings</a> from <a href="http://www.flaticon.com" title="Flaticon">www.flaticon.com</a> is licensed under <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0">CC BY 3.0</a>

