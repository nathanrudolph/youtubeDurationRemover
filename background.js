// Turn on extension if state has not been set
chrome.storage.sync.get(['ydrIsEnabled'], function(result) {
    if (result.ydrIsEnabled === undefined) {
        chrome.storage.sync.set({ydrIsEnabled: true});
    }
})

// reset local tab states and inject content script on startup
chrome.runtime.onStartup.addListener(() => {
    const tabStates = {};
    chrome.storage.local.set({ tabStates });
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            if (tab.url && tab.url.includes("youtube.com")) {
                injectContentScript(tab.id);
            }
        });
    });
});

// event listener to refresh page when content script sends message
chrome.runtime.onMessage.addListener((message, sender) => {
    logBackground("Reloading current Youtube tab.");
    if (message.action === "reloadCurrentYoutubeTab") {

        // reload current youtube tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.reload(tabs[0].id);
            }
        });
    }
})

// tab listener to check when user switches to a youtube tab (to avoid having to reload all youtube tabs when extension is toggled)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    
    if (!tab || !tab.url || !tab.url.includes('youtube.com')){
        return;
    }

    injectContentScript(tab.id);

    logBackground("Tab activated:", tab.id);

    await handleState(tab.id);
})

// separate listener for when loading completes?
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com')) {
        
        injectContentScript(tabId);

        logBackground("New tab fully loaded. ", tabId);

        await handleState(tabId);
    }
})

// cleanup when tab is closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
    const result = await chrome.storage.local.get(['tabStates']);
    const tabStates = result.tabStates || {};

    if (tabStates[tabId]) {
        logBackground("Tab closed, removing from local state cache. ", tabId);
        delete tabStates[tabId];
        await chrome.storage.local.set({ tabStates });
    }
});

// handle global and local tab states
async function handleState(tabId) {
    const localStorage = await chrome.storage.local.get(['tabStates']);
    const tabStates = localStorage.tabStates || {};

    // get cached global state
    const syncStorage = await chrome.storage.sync.get(['ydrIsEnabled']);

    if (tabStates[tabId] !== syncStorage.ydrIsEnabled) {
        logBackground("Updating local tab state and sending message to content script.", tabId);
        tabStates[tabId] = syncStorage.ydrIsEnabled;
        await chrome.storage.local.set({ tabStates });
        logBackground("Local tab states: ", JSON.stringify(tabStates));

        try {
            await chrome.tabs.sendMessage(tabId, {
                action: "tabStateUpdated"
            });
        } catch (error) {
            logBackground('Could not send message to YDR script:', error);
        }
    }
}

function injectContentScript(tabId) {
    chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"]
    }).catch(err => console.warn("Failed to inject content script:", err));
}

// feed log stream from scripts into service worker log
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'LOG') {
        console.log('YDR_LOG', `[${message.source}]`, ...message.args);
    }
})

// normalize logs from service worker
function logBackground(...args) {
    console.log('YDR_LOG', '[Background]', ...args);
}