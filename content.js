const cssId = "ydrStyling";

// Event listener for extension on/off state
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.ydrIsEnabled) {
        handleExtensionState(changes.ydrIsEnabled.newValue);
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
    logContent("YDR turned on: Removing youtube duration previews.");

    removeDurationLabels();

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    });
}

function stopScript() {
    logContent("YDR turned off: Restoring youtube duration previews.");

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
    chrome.runtime.sendMessage({ action: "reloadYoutubeTabs" });
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