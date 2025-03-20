document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.getElementById('ydrToggle');

    if (!toggle) {
        logPopup("YDR toggle switch element not found.");
        return;
    }

    // check switch state
    chrome.storage.sync.get(['ydrIsEnabled'], function(result) {
        // if undefined in storage, turn on extension by default
        if (result.ydrIsEnabled === undefined) {
            chrome.storage.sync.set({ydrIsEnabled: true});
        }

        // set switch state
        toggle.checked = result.ydrIsEnabled ?? true;
    });
    
    // add event listener for switch
    toggle.addEventListener('change', function() {
        logPopup("Event listener in popup.js saw the switch flip.");

        const newState = toggle.checked;

        // check storage for value, update if different
        chrome.storage.sync.get(["ydrIsEnabled"], (data) => {
            if (data.ydrIsEnabled !== newState) {
                chrome.storage.sync.set({ ydrIsEnabled: newState });
                logPopup("popup.js updated the ydrIsEnabled state.");
            }
        });
    });
});

function logPopup(...args) {
    logToServiceWorker('Popup', ...args);
}