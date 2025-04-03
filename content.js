// DOM element selectors for thumbnail duration
const durationElements = [
    'ytd-thumbnail-overlay-time-status-renderer', //static thumbnail video duration
    'yt-inline-player-controls', // video duration in hover preview
    'ytd-thumbnail-overlay-resume-playback-renderer', // thumbnail progress bar
    'ytp-time-display' // mini player video duration
];

// DOM element selectors for video player controls
const playerElements = [
    'ytp-chrome-controls',
    'ytp-gradient-top',
    'ytp-gradient-bottom',
    'ytp-progress-bar',
    'ytp-progress-bar-container'
];

// set up page mutation observer
let observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        if (mutation.addedNodes.length || mutation.type === "childList") {
            handlePlayerControls(hidePlayer);
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

// event listener for player control on/off state
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.hidePlayer) {
        hidePlayer = changes.hidePlayer.newValue;
        handlePlayerControls(hidePlayer);
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
let hidePlayer = chrome.storage.sync.get(['hidePlayer']);
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
    handlePlayerControls(hidePlayer);

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
    handlePlayerControls(hidePlayer);
}

function handlePlayerControls(hidePlayer) {
    if (hidePlayer) {
        hidePlayerControls();
    }
    else {
        restorePlayerControls();
    }
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
    logContent("Hiding thumbnail video durations.");

    durationElements.forEach(element => {
        const containers = document.querySelectorAll(element);
        containers.forEach(container => {
            container.style.display = "none"; // hide elements
        });
    });
}

function restoreDurationLabels() {
    logContent("Restoring thumbnail video durations.");

    durationElements.forEach(element => {
        const containers = document.querySelectorAll(element);
        containers.forEach(container => {
            container.style.display = ""; // restore default styling for elements
        });
    });
}

function hidePlayerControls() {
    try {
        playerElements.forEach(element => {
            document.getElementsByClassName(element)[0].style.visibility = 'hidden';
        });
        logContent("Hiding video player controls.");
    } catch (error) {
        logContent("Player control elements have not finishing rendering, will try hiding them again once rendered.");
    }
    
}

function restorePlayerControls() {
    try {
        playerElements.forEach(element => {
            document.getElementsByClassName(element)[0].style.visibility = 'visible';
        });
        logContent("Restoring video player controls.");
    } catch (error) {
        logContent("Player control elements have not finishing rendering, will try restoring them again once rendered.");
    }
    
}

// logging functionality
function logContent(...args) {
    logToServiceWorker('Content', ...args);
}