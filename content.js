// DOM element selectors for thumbnail duration
const durationElements = [
    // NEW YOUTUBE STRUCTURE - Primary selectors
    '.badge-shape-wiz__text', // Duration text elements (like "6:18")
    'badge-shape-wiz__text', // Alternative selector
    
    // NEW YOUTUBE STRUCTURE - Progress bar selectors
    '.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment', // Thumbnail progress bar
    'ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment', // Alternative selector
    
    // Legacy selectors (keeping for compatibility)
    'ytd-thumbnail-overlay-time-status-renderer', //static thumbnail video duration
    'yt-inline-player-controls', // video duration in hover preview
    'ytd-thumbnail-overlay-resume-playback-renderer', // thumbnail progress bar
    
    // Video page duration elements (when watching a video)
    'ytp-time-duration', // video duration in player
    'ytp-tooltip-duration', // duration in tooltips
];

// DOM element selectors for video player controls
const playerElements = [
    'ytp-time-wrapper',
    'ytp-chapter-container',
    'ytp-progress-bar',
    'ytp-progress-bar-container'
];

// Global state variables
let hidePlayer = false;

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
chrome.storage.sync.get(['ydrIsEnabled', 'hidePlayer'], function(result) {
    const isEnabled = result.ydrIsEnabled ?? true;
    hidePlayer = result.hidePlayer ?? false;
    
    if (isEnabled) {
        startScript();
    }
});











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

    // Check if page is ready
    if (document.readyState === 'loading') {
        logContent("Page still loading, waiting for DOM to be ready...");
        document.addEventListener('DOMContentLoaded', () => {
            removeDurationLabels();
            handlePlayerControls(hidePlayer);
        });
    } else {
        removeDurationLabels();
        handlePlayerControls(hidePlayer);
    }

    // Also wait a bit longer for dynamic content to load
    setTimeout(() => {
        logContent("Running delayed duration removal for dynamic content...");
        removeDurationLabels();
    }, 2000);
    
    // Wait even longer for thumbnails to load
    setTimeout(() => {
        logContent("Running final duration removal for thumbnails...");
        removeDurationLabels();
    }, 5000);

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
    
    // Check for thumbnail duration elements (new YouTube structure)
    const thumbnailContainers = document.querySelectorAll('.badge-shape-wiz__text');
    // Check for video page duration elements
    const videoContainers = document.querySelectorAll('ytp-time-duration');
    
    const allContainers = [...thumbnailContainers, ...videoContainers];
    
    // check if no elements are found - this could mean page hasn't loaded yet
    if (allContainers.length === 0) {
        logContent("DOM inspected: No duration elements found (page may still be loading).");
        return false; // Assume YDR is not active if no elements found
    }
    // Check if elements are hidden
    const allHidden = allContainers.every(container => 
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
        if (containers.length > 0) {
            containers.forEach(container => {
                container.style.display = "none"; // hide elements
            });
        }
    });
}

function restoreDurationLabels() {
    logContent("Restoring thumbnail video durations.");

    durationElements.forEach(element => {
        const containers = document.querySelectorAll(element);
        if (containers.length > 0) {
            containers.forEach(container => {
                container.style.display = ""; // restore default styling for elements
            });
        }
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