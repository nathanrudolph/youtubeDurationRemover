const cssId = "ydrStyling";

// Turn on extension if state has not been set
chrome.storage.sync.get(['ydrIsEnabled'], function(result) {
    if (result.ydrIsEnabled === undefined) {
        chrome.storage.sync.set({ydrIsEnabled: true});
        startScript();
    }
})

// Event listener for extension on/off state updates
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.ydrIsEnabled) {
        logContent('Switch toggled, new value: ', changes.ydrIsEnabled.newValue );
        handleExtensionState(changes.ydrIsEnabled.newValue);
    }
});

// Event listener from service worker to trigger check if user switches to a youtube tab
chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.action === "tabStateUpdated") {
        logContent("Message received to update tab because it was out of sync with global YDR state.");
        // trigger remover script
        chrome.storage.sync.get(['ydrIsEnabled'], function(result) {
            handleExtensionState(result.ydrIsEnabled);
        });
    }
});

function handleExtensionState(isEnabled) {
    toggleStyling(isEnabled);
    if (isEnabled) {
        startScript();
    } else {
        stopScript();
    }
}

// Duration remover script
function startScript() {
    logContent("YDR turned ON: Removing youtube duration previews on current tab.");

    removeDurationLabels();

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    });
}

function stopScript() {
    logContent("YDR turned OFF: Restoring youtube duration previews on current tab.");

    if (observer) {
        observer.disconnect();
    }

    sendReloadMessage();
}

function removeDurationLabels() {
    const overlayContainers = document.querySelectorAll('ytd-thumbnail-overlay-time-status-renderer');
    overlayContainers.forEach(container => {
      container.remove();
    });
}

const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        if (mutation.addedNodes.length) {
            removeDurationLabels();
        }
    });
});

// Tell service worker to reload tabs
function sendReloadMessage() {
    chrome.runtime.sendMessage({ action: "reloadCurrentYoutubeTab" });
}

function toggleStyling(enable) {
    if (enable) {
        if (!document.getElementById(cssId)) {
            const link = document.createElement("link");
            link.id = cssId;
            link.rel = "stylesheet";
            link.href = chrome.runtime.getURL("styles.css");
            document.head.appendChild(link);
        }
    } else {
        const existingStyle = document.getElementById(cssId);
        if (existingStyle) {
            existingStyle.remove();
        }
    }
}

function logContent(...args) {
    logToServiceWorker('Content', ...args);
}