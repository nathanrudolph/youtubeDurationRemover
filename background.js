chrome.runtime.onMessage.addListener((message, sender) => {
    console.log("Reloading Youtube tabs.");
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