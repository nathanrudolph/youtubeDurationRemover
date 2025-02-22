function logToServiceWorker(sourceOfLog, ...args) {
    // let source;

    // if (typeof window !== 'undefined' && window.location) {
    //     // Running in a document (popup or content script)
    //     source = window.location.href.includes('popup.html') ? 'Popup' : 'Content';
    // } else {
    //     // Running in a background/service worker
    //     source = 'Background';
    // }

    // Log locally too for convenience
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