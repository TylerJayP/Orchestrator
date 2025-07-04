// Main Application Controller for Whiskers Orchestrator
class WhiskersOrchestrator {
    constructor() {
        this.gameState = {
            connected: false,
            presenterConnected: false,
            currentChapter: null,
            currentChoices: [],
            currentSelection: 0,
            playerState: {},
            awaitingInputType: null,
            minigameActive: false
        };

        this.modules = {};
        this.initialized = false;
        this.messageLog = [];
        this.lastInputTime = 0;
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Whiskers Orchestrator...');

            // Initialize UI Manager
            this.modules.ui = new UIManager(this);
            await this.modules.ui.initialize();

            // Initialize Input Handler
            this.modules.input = new InputHandler(this);
            await this.modules.input.initialize();

            // Initialize MQTT Client
            this.modules.mqtt = new MQTTClient(this);
            await this.modules.mqtt.initialize();

            // Set up event listeners
            this.setupEventListeners();

            // Mark as initialized
            this.initialized = true;

            this.log('System: Orchestrator initialized successfully', 'system');
            console.log('✅ Whiskers Orchestrator ready');

        } catch (error) {
            console.error('❌ Failed to initialize Orchestrator:', error);
            this.log(`Error: ${error.message}`, 'error');
        }
    }

    setupEventListeners() {
        // Primary control buttons
        document.getElementById('proceed-btn').addEventListener('click', () => {
            this.proceedChapter();
        });

        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetStory();
        });

        // Choice buttons
        for (let i = 1; i <= 3; i++) {
            document.getElementById(`choice-${i}`).addEventListener('click', () => {
                this.makeChoice(i - 1);
            });
        }

        // Navigation buttons
        document.getElementById('nav-up').addEventListener('click', () => {
            this.navigateChoice('up');
        });

        document.getElementById('nav-down').addEventListener('click', () => {
            this.navigateChoice('down');
        });

        document.getElementById('scroll-up').addEventListener('click', () => {
            this.scrollStory('up');
        });

        document.getElementById('scroll-down').addEventListener('click', () => {
            this.scrollStory('down');
        });

        // Minigame buttons
        const minigameInputs = ['w', 'a', 's', 'd', 'space'];
        minigameInputs.forEach(input => {
            const buttonId = input === 'space' ? 'game-space' : `game-${input}`;
            document.getElementById(buttonId).addEventListener('click', () => {
                this.sendMinigameInput(input);
            });
        });

        // Log controls
        document.getElementById('clear-log').addEventListener('click', () => {
            this.clearLog();
        });

        document.getElementById('export-log').addEventListener('click', () => {
            this.exportLog();
        });

        // Connection modal
        document.getElementById('connect-btn').addEventListener('click', () => {
            this.connectToMQTT();
        });

        document.getElementById('close-modal').addEventListener('click', () => {
            this.modules.ui.hideConnectionModal();
        });
    }

    // MQTT Message Handling
    handleMQTTMessage(message) {
        try {
            this.log(`Received: ${message.type}`, 'mqtt');
            
            switch (message.type) {
                case 'chapter_changed':
                    this.handleChapterChanged(message);
                    break;

                case 'choices_available':
                    this.handleChoicesAvailable(message);
                    break;

                case 'ready_for_input':
                    this.handleReadyForInput(message);
                    break;

                case 'minigame_status':
                    this.handleMinigameStatus(message);
                    break;

                case 'audio_status':
                    this.handleAudioStatus(message);
                    break;

                case 'app_ready':
                    this.handlePresenterReady(message);
                    break;

                case 'scroll_status':
                    this.handleScrollStatus(message);
                    break;

                default:
                    this.log(`Unknown message type: ${message.type}`, 'error');
            }

            // Update UI
            this.modules.ui.updateStatus();

        } catch (error) {
            console.error('Error handling MQTT message:', error);
            this.log(`Error processing message: ${error.message}`, 'error');
        }
    }

    handleChapterChanged(message) {
        this.gameState.currentChapter = message.currentChapter;
        this.gameState.playerState = message.playerState || {};
        
        this.log(`Chapter changed to: ${message.currentChapter}`, 'presenter');
        
        // Clear choices when chapter changes
        if (!message.hasChoices) {
            this.gameState.currentChoices = [];
            this.modules.ui.updateChoices([]);
        }
    }

    handleChoicesAvailable(message) {
        this.gameState.currentChoices = message.choices || [];
        this.gameState.currentSelection = message.currentSelection || 0;
        
        this.modules.ui.updateChoices(this.gameState.currentChoices);
        this.modules.ui.updateChoiceSelection(this.gameState.currentSelection);
        
        this.log(`${message.choices.length} choices available`, 'presenter');
    }

    handleReadyForInput(message) {
        this.gameState.awaitingInputType = message.awaitingInputType;
        
        // Enable appropriate buttons based on what input is expected
        this.modules.ui.updateInputState(message.context, message.awaitingInputType);
        
        this.log(`Ready for input: ${message.awaitingInputType}`, 'presenter');
    }

    handleMinigameStatus(message) {
        this.gameState.minigameActive = message.status === 'started' || message.status === 'active';
        
        this.log(`Minigame ${message.status}: ${message.minigameId}`, 'presenter');
    }

    handleAudioStatus(message) {
        this.log(`Audio ${message.status}: ${message.audioFile}`, 'presenter');
    }

    handlePresenterReady(message) {
        this.gameState.presenterConnected = true;
        this.log('Presenter app connected and ready', 'success');
        this.modules.ui.updatePresenterStatus(true);
    }

    handleScrollStatus(message) {
        this.log(`Scroll ${message.direction} - Top: ${message.atTop}, Bottom: ${message.atBottom}`, 'presenter');
    }

    // Action Methods
    proceedChapter() {
        if (!this.canSendInput()) return;

        const message = {
            type: 'proceed_chapter',
            timestamp: new Date().toISOString(),
            action: 'next'
        };

        this.sendMQTTMessage(message);
        this.log('Sent: Proceed chapter', 'mqtt');
    }

    makeChoice(choiceIndex) {
        if (!this.canSendInput() || choiceIndex >= this.gameState.currentChoices.length) return;

        const message = {
            type: 'make_choice',
            timestamp: new Date().toISOString(),
            choiceIndex: choiceIndex
        };

        this.sendMQTTMessage(message);
        this.log(`Sent: Choice ${choiceIndex + 1}`, 'mqtt');
    }

    navigateChoice(direction) {
        if (!this.canSendInput()) return;

        const message = {
            type: 'navigate_choice',
            timestamp: new Date().toISOString(),
            direction: direction
        };

        this.sendMQTTMessage(message);
        this.log(`Sent: Navigate ${direction}`, 'mqtt');
    }

    scrollStory(direction) {
        if (!this.canSendInput()) return;

        const message = {
            type: direction === 'up' ? 'scroll_up' : 'scroll_down',
            timestamp: new Date().toISOString()
        };

        this.sendMQTTMessage(message);
        this.log(`Sent: Scroll ${direction}`, 'mqtt');
    }

    sendMinigameInput(input) {
        if (!this.canSendInput()) return;

        const message = {
            type: 'minigame_input',
            timestamp: new Date().toISOString(),
            input: input
        };

        this.sendMQTTMessage(message);
        this.log(`Sent: Minigame ${input.toUpperCase()}`, 'mqtt');
    }

    resetStory() {
        if (!this.canSendInput()) return;

        const message = {
            type: 'reset_game',
            timestamp: new Date().toISOString()
        };

        this.sendMQTTMessage(message);
        this.log('Sent: Reset story', 'mqtt');

        // Reset local state
        this.gameState.currentChapter = null;
        this.gameState.currentChoices = [];
        this.gameState.currentSelection = 0;
        this.gameState.playerState = {};
        this.gameState.awaitingInputType = null;
        this.gameState.minigameActive = false;

        this.modules.ui.updateStatus();
        this.modules.ui.updateChoices([]);
    }

    // Utility Methods
    sendMQTTMessage(message) {
        if (this.modules.mqtt && this.modules.mqtt.isConnected()) {
            this.modules.mqtt.publish(message);
        } else {
            this.log('Cannot send - MQTT not connected', 'error');
        }
    }

    canSendInput() {
        const now = Date.now();
        if (now - this.lastInputTime < CONFIG.INPUT.DEBOUNCE_TIME) {
            return false; // Debounce
        }
        this.lastInputTime = now;

        if (!this.gameState.connected) {
            this.log('Cannot send - not connected to MQTT', 'error');
            return false;
        }

        return true;
    }

    connectToMQTT() {
        const broker = document.getElementById('broker-input').value;
        const port = parseInt(document.getElementById('port-input').value);
        const subscribeTopic = document.getElementById('subscribe-topic').value;
        const publishTopic = document.getElementById('publish-topic').value;

        // Update config
        CONFIG.MQTT.PRIMARY_BROKER = broker;
        CONFIG.MQTT.PORT = port;
        CONFIG.TOPICS.SUBSCRIBE = subscribeTopic;
        CONFIG.TOPICS.PUBLISH = publishTopic;

        // Reconnect with new settings
        this.modules.mqtt.connect();
        this.modules.ui.hideConnectionModal();
    }

    // Logging
    log(message, type = 'system') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            timestamp: timestamp,
            message: message,
            type: type
        };

        this.messageLog.unshift(logEntry);

        // Limit log size
        if (this.messageLog.length > CONFIG.UI.MAX_LOG_ENTRIES) {
            this.messageLog = this.messageLog.slice(0, CONFIG.UI.MAX_LOG_ENTRIES);
        }

        // Update UI
        this.modules.ui.updateLog(this.messageLog);

        // Console log for debugging
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    clearLog() {
        this.messageLog = [];
        this.modules.ui.updateLog([]);
        this.log('Log cleared', 'system');
    }

    exportLog() {
        const logText = this.messageLog.map(entry => 
            `[${entry.timestamp}] ${entry.type.toUpperCase()}: ${entry.message}`
        ).join('\n');

        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `whiskers-orchestrator-log-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        this.log('Log exported', 'system');
    }

    // Getters
    getGameState() {
        return { ...this.gameState };
    }

    isInitialized() {
        return this.initialized;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        window.orchestrator = new WhiskersOrchestrator();
        await window.orchestrator.initialize();
    } catch (error) {
        console.error('Failed to initialize orchestrator:', error);
    }
});
