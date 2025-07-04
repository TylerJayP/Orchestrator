// Configuration for Orchestrator App
const CONFIG = {
    // MQTT Settings - Updated to match Presenter app
    MQTT: {
        PRIMARY_BROKER: 'broker.emqx.io',     // Same as Presenter app
        FALLBACK_BROKER: 'broker.emqx.io',   // Fallback if primary fails
        PORT: 8083,
        SECURE_PORT: 8084,
        USE_SSL: false,
        CLIENT_ID_PREFIX: 'WhiskersOrchestrator',
        KEEP_ALIVE: 60,
        RECONNECT_PERIOD: 3000,
        CONNECT_TIMEOUT: 15000,  // Reduced from 30s to 15s
        CLEAN_SESSION: true
    },

    // MQTT Topics - Same as Presenter app
    TOPICS: {
        SUBSCRIBE: 'catstory/presenter/to/orchestrator',
        PUBLISH: 'catstory/orchestrator/to/presenter'
    },

    // Input Settings
    INPUT: {
        KEYBOARD_ENABLED: true,
        GAMEPAD_ENABLED: true,
        REPEAT_DELAY: 200, // ms between repeated inputs
        DEBOUNCE_TIME: 50  // ms to prevent duplicate inputs
    },

    // UI Settings
    UI: {
        MAX_LOG_ENTRIES: 100,
        LOG_AUTO_SCROLL: true,
        CONNECTION_RETRY_DISPLAY: true,
        STATUS_UPDATE_INTERVAL: 1000
    },

    // Development Settings
    DEV: {
        SHOW_ALL_MESSAGES: true,
        ENABLE_MESSAGE_EXPORT: true,
        ENABLE_DEBUG_COMMANDS: true
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}