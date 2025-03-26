let observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        if (mutation.addedNodes.length || mutation.type === "childList") {
            hidePlayerControls();
            removeDurationLabels();
        }
    });
});

let isObserving = false;

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

    removeDurationLabels();
    hidePlayerControls();

    if (!isObserving)
    {
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false
        });
        isObserving = true;
    }
}

function stopScript() {
    logContent("Restoring youtube duration previews.");

    if (isObserving) {
        observer.disconnect();
        isObserving = false;
    }

    restoreDurationLabels();
    restorePlayerControls();
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

    // remove progress bar in thumbnail
    const progressDurationElements = document.querySelectorAll('ytd-thumbnail-overlay-resume-playback-renderer');
    progressDurationElements.forEach(container => {
        container.style.display = "none"; // hide to be able to restore later
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

    // restore progress bar in thumbnail
    const progressDurationElements = document.querySelectorAll('ytd-thumbnail-overlay-resume-playback-renderer');
    progressDurationElements.forEach(container => {
        container.style.display = "";
    });
}

function hidePlayerControls() {
    try {
        document.getElementsByClassName('ytp-chrome-top')[0].style.visibility = 'hidden';
        document.getElementsByClassName('ytp-chrome-controls')[0].style.visibility = 'hidden';
        document.getElementsByClassName('ytp-gradient-top')[0].style.visibility = 'hidden';
        document.getElementsByClassName('ytp-gradient-bottom')[0].style.visibility = 'hidden';
        document.getElementsByClassName('ytp-progress-bar')[0].style.visibility = 'hidden';
        document.getElementsByClassName('ytp-progress-bar-container')[0].style.visibility = 'hidden';    
    } catch (error) {
        logContent("Player control elements have not finishing rendering.");
    }
    
}

function restorePlayerControls() {
    try {
        document.getElementsByClassName('ytp-chrome-top')[0].style.visibility = 'visible';
        document.getElementsByClassName('ytp-chrome-controls')[0].style.visibility = 'visible';
        document.getElementsByClassName('ytp-gradient-top')[0].style.visibility = 'visible';
        document.getElementsByClassName('ytp-gradient-bottom')[0].style.visibility = 'visible';
        document.getElementsByClassName('ytp-progress-bar')[0].style.visibility = 'visible';
        document.getElementsByClassName('ytp-progress-bar-container')[0].style.visibility = 'visible';
    } catch (error) {
        logContent("Player control elements have not finishing rendering.");
    }
    
}

// logging functionality
function logContent(...args) {
    logToServiceWorker('Content', ...args);
}