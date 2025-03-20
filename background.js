chrome.runtime.onMessage.addListener((message, sender) => {
    logBackground("Reloading Youtube tabs.");
    if (message.action === "reloadYoutubeTabs") {
        // reload all youtube tabs
        chrome.tabs.query({url: "*://www.youtube.com/*"}, (tabs) => {
            tabs.forEach((tab) => {
                if (tab.id) {
                    chrome.tabs.reload(tab.id);
                }
            });
        });
    }
})

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