document.addEventListener('DOMContentLoaded', function() {
    const ydrToggle = document.getElementById('ydrToggle');
    const hidePlayerToggle = document.getElementById('hidePlayerToggle');

    if (!ydrToggle) {
        logPopup("YDR toggle switch element not found.");
        return;
    }
    if (!hidePlayerToggle) {
        logPopup("YDR toggle switch element not found.");
        return;
    }

    // check switch state
    chrome.storage.sync.get(['ydrIsEnabled'], function(result) {
        // set switch state
        ydrToggle.checked = result.ydrIsEnabled ?? true;
    });

    chrome.storage.sync.get(['hidePlayer'], function(result) {
        hidePlayerToggle.checked = result.hidePlayer ?? false;
    });
    
    // add event listener for switch
    ydrToggle.addEventListener('change', function() {
        const newYdrState = ydrToggle.checked;

        // check storage for value, update if different
        chrome.storage.sync.get(["ydrIsEnabled"], (data) => {
            if (data.ydrIsEnabled !== newYdrState) {
                chrome.storage.sync.set({ ydrIsEnabled: newYdrState });
                logPopup("YDR switch flipped, updated storage state to:", newYdrState);

                // turn off hidePlayer if overall extension gets turned off
                if (!newYdrState && hidePlayerToggle.checked) {
                    chrome.storage.sync.set({ hidePlayer: newYdrState });
                    logPopup("Also turned off HidePlayer switch.");
                }
            }
        });    
    });

    hidePlayerToggle.addEventListener('change', function() {
        const newHidePlayerState = hidePlayerToggle.checked;
        chrome.storage.sync.get(["hidePlayer"], (data) => {
            if (data.hidePlayer !== newHidePlayerState) {
                chrome.storage.sync.set({ hidePlayer: newHidePlayerState });
                logPopup("HidePlayer switch flipped, updated storage state to:", newHidePlayerState);
            }
        });
    });

});

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.hidePlayer) {
        const hidePlayerToggle = document.getElementById('hidePlayerToggle');
        if (hidePlayerToggle.checked !== changes.hidePlayer.newValue) {
            hidePlayerToggle.checked = changes.hidePlayer.newValue;
            logPopup("Updated HidePlayer switch position due to storage state update.");
        }
    }
});

function logPopup(...args) {
    logToServiceWorker('Popup', ...args);
}