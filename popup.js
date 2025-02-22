document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.getElementById('ydrToggle');

    if (!toggle) {
        console.error("YDR toggle switch element not found.");
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
    toggle.addEventListener('change', async function() {
        const newState = toggle.checked;

        // check sync storage for global value, update if different
        const syncStorage = await chrome.storage.sync.get(["ydrIsEnabled"]);
        if (syncStorage.ydrIsEnabled !== newState) {
            logPopup("Updating global state: ", newState);
            await chrome.storage.sync.set({ ydrIsEnabled: newState });
        }

        // update local cache for current tab
        const tab = await getCurrentTab();
        if (!tab || !tab.url || !tab.url.includes('youtube.com')){
            return;
        }
        const localStorage = chrome.storage.local.get(['tabStates']);
        const tabStates = localStorage.tabStates || {};
        if (tabStates[tab.id] !== syncStorage.ydrIsEnabled) {
            logPopup("Updating local state for tab ", tab.id);
            tabStates[tab.id] = syncStorage.ydrIsEnabled;
            await chrome.storage.local.set({tabStates});
            logPopup("Local tab states: ", JSON.stringify(tabStates));
        }
    });
});

async function getCurrentTab() {
    let queryOptions = { active: true, lastFocusedWindow: true };
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

function logPopup(...args) {
    logToServiceWorker('Popup', ...args);
}