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
        logContent("YDR is already enabled on this tab.");
        return;
    }
    if (!ydrIsOn && !isEnabled) {
        logContent("YDR is already disabled on this tab.");
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
    logContent("YDR turned on: Removing youtube duration previews.");

    toggleStyling(true);

    // Immediately attempt removal (for already loaded elements)
    removeDurationLabels();

    // Ensure observer is always watching for new thumbnails
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    });

    logContent("Observer is now monitoring YouTube's dynamic content.");
}

function stopScript() {
    logContent("YDR turned off: Restoring youtube duration previews.");

    if (observer) {
        observer.disconnect();
    }

    toggleStyling(false);

    restoreDurationLabels(); 
}

function isYdrOn() {
    logContent("Checking YDR state on current tab.");
    
    const containers = document.querySelectorAll('ytd-thumbnail-overlay-time-status-renderer');
    
    if (containers.length === 0) {
        logContent("YDR is enabled: No duration elements found.");
        return true;
    }

    // Check if elements are hidden
    const allHidden = [...containers].every(container => 
        window.getComputedStyle(container).display === "none"
    );

    if (allHidden) {
        logContent("YDR is enabled: Duration elements are hidden.");
        return true;
    }
    
    logContent("YDR is disabled: Duration elements are visible.");
    return false;
}

function removeDurationLabels() {
    const overlayContainers = document.querySelectorAll('ytd-thumbnail-overlay-time-status-renderer');
    overlayContainers.forEach(container => {
      container.style.display = "none";
    });
}

function restoreDurationLabels() {
    logContent("Restoring YouTube duration previews.");

    // Unhide existing elements
    const overlayContainers = document.querySelectorAll('ytd-thumbnail-overlay-time-status-renderer');
    overlayContainers.forEach(container => {
        container.style.display = ""; // Reset display
    });

    // **Force YouTube to reload video thumbnails**
    const allThumbnails = document.querySelectorAll('ytd-thumbnail');
    allThumbnails.forEach(thumbnail => {
        thumbnail.classList.add("ydr-refresh");
        setTimeout(() => {
            thumbnail.classList.remove("ydr-refresh");
        }, 100);
    });
}

function waitForDurationElements(timeout = 1000) {
    return new Promise((resolve, reject) => {
        const checkElements = () => {
            const containers = document.querySelectorAll('ytd-thumbnail-overlay-time-status-renderer');
            if (containers.length > 0) {
                resolve();
                return;
            }
            if (performance.now() - startTime > timeout) {
                reject();
            } else {
                requestAnimationFrame(checkElements);
            }
        };

        const startTime = performance.now();
        checkElements();
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

// Tell service worker to reload tabs
function sendReloadMessage() {
    chrome.runtime.sendMessage({ action: "reloadYoutubeTabs" });
}

function logContent(...args) {
    logToServiceWorker('Content', ...args);
}