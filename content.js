var s = document.createElement('script');
s.src = chrome.extension.getURL('script.js');
(document.head||document.documentElement).appendChild(s);
s.onload = function() {
    s.parentNode.removeChild(s);
};

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    // If the received message has the expected format...
    if (msg.type === 'report_back') {
        // Call the specified callback, passing
        // the web-page's DOM content as argument
        console.log(msg.text);
        document.getElementById('rev-caption-element').innerText = msg.text;
        // sendResponse(document.all[0].outerHTML);
    }
});