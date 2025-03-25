// set initial state of extension on install
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ydrIsEnabled: true});
})

// tab listeners to check for: switched to youtube tab, loading completes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!tab || !tab.url || !tab.url.includes('youtube.com')) return;

    logBackground("Switched to a YouTube tab.", activeInfo.tabId);
    sendMessageToContentScript(activeInfo.tabId, { action: "triggerContentScript" });
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url && tab.url.includes("youtube.com")) {
        logBackground("New tab fully loaded.", tabId);
        sendMessageToContentScript(tabId, { action: "triggerContentScript" });
    }
});

async function sendMessageToContentScript(tabId, message) {
    try {
        // Try sending message first
        await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
        logBackground("Content script not found. Injecting now...");

        try {
            // Inject content script manually
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ["content.js"]
            });

            logBackground("Content script injected. Retrying message...");

            // Wait briefly before re-sending the message
            setTimeout(() => {
                chrome.tabs.sendMessage(tabId, message);
            }, 500);
        } catch (injectError) {
            logBackground("Failed to inject content script:", injectError);
        }
    }
}


// Logging functionality

// normalize logs from background service worker
function logBackground(...args) {
    console.log('YDR_LOG', '[Background]', ...args);
}

// feed log stream from scripts into service worker log
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'LOG') {
        console.log('YDR_LOG', `[${message.source}]`, ...message.args);
    }
})