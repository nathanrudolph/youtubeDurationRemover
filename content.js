let observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        if (mutation.addedNodes.length || mutation.type === "childList") {
            removeDurationLabels();
        }
    });
});

// Event listener for extension on/off state
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.ydrIsEnabled) {
        handleExtensionState(changes.ydrIsEnabled.newValue);
    }
});

// Event listener for trigger from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action == "triggerContentScript")
    {
        chrome.storage.sync.get(['ydrIsEnabled'], function(result) {
            logContent("Checked global state:", result.ydrIsEnabled);
            handleExtensionState(result.ydrIsEnabled);
        })
    }
})

// run script on initial injection
const isEnabled = chrome.storage.sync.get(['ydrIsEnabled']);
if (isEnabled) {
    startScript();
}

function handleExtensionState(isEnabled) {
    const ydrIsOn = isYdrOn();
    if (ydrIsOn && isEnabled) {
        logContent("No need to run script: YDR is already enabled on this tab.");
        return;
    }
    if (!ydrIsOn && !isEnabled) {
        logContent("No need to run script: YDR is already disabled on this tab.");
        return;
    }
    
    if (isEnabled) {
        startScript();
    } else {
        stopScript();
    }
}

// Duration remover script
function startScript() {
    logContent("Removing youtube duration previews.");

    toggleStyling(true);
    removeDurationLabels();
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    });
}

function stopScript() {
    logContent("Restoring youtube duration previews.");

    if (observer) {
        observer.disconnect();
    }
    toggleStyling(false);
    restoreDurationLabels(); 
}

function isYdrOn() {
    logContent("Checking YDR state on current tab.");
    
    const containers = document.querySelectorAll('ytd-thumbnail-overlay-time-status-renderer');
    
    // check if no elements are found
    if (containers.length === 0) {
        logContent("DOM inspected: No duration elements found (YDR is enabled).");
        return true;
    }
    // Check if elements are hidden
    const allHidden = [...containers].every(container => 
        window.getComputedStyle(container).display === "none"
    );
    if (allHidden) {
        logContent("DOM inspected: Duration elements are hidden (YDR is enabled).");
        return true;
    }
    logContent("DOM inspected: Duration elements are visible (YDR is disabled).");
    return false;
}

function removeDurationLabels() {
    // remove static thumbnail durations
    const overlayContainers = document.querySelectorAll('ytd-thumbnail-overlay-time-status-renderer');
    overlayContainers.forEach(container => {
      container.style.display = "none"; // hide to be able to restore later
    });

    // remove hover preview duration
    const hoverDurationElements = document.querySelectorAll('yt-inline-player-controls');
    hoverDurationElements.forEach(container => {
        container.style.display = "none";
    });
}

function restoreDurationLabels() {
    logContent("Restoring YouTube duration previews.");

    // unhide static elements
    const overlayContainers = document.querySelectorAll('ytd-thumbnail-overlay-time-status-renderer');
    overlayContainers.forEach(container => {
        container.style.display = ""; // reset to default style
    });

    // restore hover preview
    const hoverDurationElements = document.querySelectorAll('yt-inline-player-controls');
    hoverDurationElements.forEach(container => {
        container.style.display = "";
    });
}

function toggleStyling(enable) {
    const cssId = "ydr-css";
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
            logContent("CSS removed.");
        }
    }
}



// logging functionality
function logContent(...args) {
    logToServiceWorker('Content', ...args);
}