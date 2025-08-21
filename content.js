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

// Debounce function to limit execution frequency
let debounceTimer;
function debounce(func, delay) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(func, delay);
}

// set up page mutation observer
let observer = new MutationObserver((mutations) => {
    // Check if any added nodes contain our target elements
    const hasRelevantChanges = mutations.some(mutation => {
        return Array.from(mutation.addedNodes).some(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                return node.querySelector && (
                    node.querySelector('.badge-shape-wiz__text') ||
                    node.querySelector('.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment') ||
                    node.querySelector('.style-scope.ytd-thumbnail-overlay-resume-playback-renderer') ||
                    node.matches && node.matches('.badge-shape-wiz__text, .ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment, .style-scope.ytd-thumbnail-overlay-resume-playback-renderer')
                );
            }
            return false;
        });
    });
    
    if (hasRelevantChanges) {
        debounce(() => {
            handlePlayerControls(hidePlayer);
            removeDurationLabels();
        }, 100); // 100ms debounce
    }
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

    // Single timeout for initial load (redundant with observer but kept for safety)
    setTimeout(() => {
        removeDurationLabels();
    }, 1000);

    if (!isObserving)
    {
        // Observe specific containers where thumbnails appear
        const targetContainers = [
            '#content', // Main content area
            '#primary', // Primary content
            '#secondary', // Secondary content (sidebar)
            'ytd-rich-grid-renderer', // Homepage grid
            'ytd-search', // Search results
            'ytd-watch-flexy' // Video page
        ];
        
        targetContainers.forEach(selector => {
            const container = document.querySelector(selector);
            if (container) {
                observer.observe(container, {
                    childList: true,
                    subtree: true,
                    attributes: false,
                    characterData: false
                });
            }
        });
        
        // Also observe body for new containers that might be added
        observer.observe(document.body, {
            childList: true,
            subtree: false, // Don't observe subtree of body
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



// CSS-based hiding for better performance
let styleElement = null;

function removeDurationLabels() {
    logContent("Hiding thumbnail video durations.");

    // Use CSS injection for better performance
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'youtube-duration-remover-styles';
        styleElement.textContent = `
            .badge-shape-wiz__text,
            .ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment,
            .style-scope.ytd-thumbnail-overlay-resume-playback-renderer {
                display: none !important;
            }
        `;
        document.head.appendChild(styleElement);
    }
}

function restoreDurationLabels() {
    logContent("Restoring thumbnail video durations.");

    // Remove the CSS style element
    if (styleElement) {
        styleElement.remove();
        styleElement = null;
    }
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