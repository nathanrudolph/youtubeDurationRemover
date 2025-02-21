// Turn on extension if state has not been set
chrome.storage.sync.get(['ydrIsEnabled'], function(result) {
    if (result.ydrIsEnabled === undefined) {
        chrome.storage.sync.set({ydrIsEnabled: true});
        startScript();
    }
})

// Event listener for extension on/off state
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.ydrIsEnabled) {
        console.log("content.js saw the update to ydrIsEnabled.");
        handleExtensionState(changes.ydrIsEnabled.newValue);
    }
});

function handleExtensionState(isEnabled) {
    if (isEnabled) {
        startScript();
    } else {
        stopScript();
    }
}

// Duration remover script
function startScript() {
    sendReloadMessage();

    console.log("Running startScript");

    removeDurationLabels();

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    });
}

function stopScript() {
    console.log("Running stopScript");

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
    console.log("Sending message to reload tabs.");
    chrome.runtime.sendMessage({ action: "reloadYoutubeTabs" });
}