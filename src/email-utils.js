var MINI = require('minified'); // required defined by minified.js
var $ = MINI.$, HTML = MINI.HTML;


function sendMail(sender, message) {
  var animationTime = 300; // ms

  $('#btn-send-mail').hide();
  var result = $('#email-result');
  // As we did 'hide' it, it is necessary to 'show' it again on fading
  result.fill('Sending message. Prease wait...').animate({$$show:1, $$fade: 1}, animationTime);

  var request = {
    'key': 'cduTvYgHRD97cPAqYIs-Mg',
    'message': {
      'from_email': sender,
      'to': [{
        'email': 'rub3nmv@gmail.com',
        'name': 'Ruben Martinez Vilar',
        'type': 'to'
      }],
      'subject': 'Tabs limiter extension message from ' + sender,
      'html': message
    }};
   
  $.request('post', 'https://mandrillapp.com/api/1.0/messages/send.json', $.toJSON(request))
    .then(function (txt) {
      // Chain with promises
      result.animate({ $$fade: 0 }, animationTime)
        .then(function () {
          result.fill('Message sent. Thank you!');
        }
      )
        .then(function () {
          result.animate({ $$show: 1, $$fade: 1 }, animationTime);  
        }
      );
      // console.log('Message sent: ' + txt);
    })
    .error(function (status, statusText, responseText) {
      // Chain with promises
      result.animate({ $$fade: 0 }, animationTime)
        .then(function () {
          result.fill('There was an error. Try again later or contact me through any of the social networks above.');
        }
      )
        .then(function () {
          result.animate({ $$show: 1, $$fade: 1 }, animationTime);  
        }
      );
      // console.log('status: ' + status + '\nstatusText: ' + statusText + '\nresponseText' + responseText);
  });
}

$.ready(function () {
  document.getElementById('email-form').addEventListener("submit", function(e) {
    e.preventDefault();
  });
  document.getElementById("email-form").addEventListener("submit", function () {
    var sender = document.getElementById("email").value;
    var message = document.getElementById("message").value;
    sendMail(sender, message);
  });
  // Need to hide it this way to 
  $('#email-result').hide();
});


