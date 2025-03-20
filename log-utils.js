function logToServiceWorker(sourceOfLog, ...args) {

    // Log locally for convenience
    console.log(`[${sourceOfLog}]`, ...args);

    // Forward to service worker
    chrome.runtime.sendMessage({
        type: 'LOG',
        source: sourceOfLog,
        args
    }).catch(() => {
        // Service worker might not be ready/available
        console.log('[Log Forward Failed]', ...args);
    });
}