document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.getElementById('ydrToggle');

    if (!toggle) {
        logPopup("YDR toggle switch element not found.");
        return;
    }

    // check switch state
    chrome.storage.sync.get(['ydrIsEnabled'], function(result) {
        // set switch state
        toggle.checked = result.ydrIsEnabled ?? true;
    });
    
    // add event listener for switch
    toggle.addEventListener('change', function() {
        const newState = toggle.checked;

        // check storage for value, update if different
        chrome.storage.sync.get(["ydrIsEnabled"], (data) => {
            if (data.ydrIsEnabled !== newState) {
                chrome.storage.sync.set({ ydrIsEnabled: newState });
                logPopup("Switch flipped, updated the ydrIsEnabled state to:", newState);
            }
        });
    });
});

function logPopup(...args) {
    logToServiceWorker('Popup', ...args);
}