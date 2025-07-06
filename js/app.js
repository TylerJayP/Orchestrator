// Complete Orchestrator app.js - All fixes including enhanced reset functionality
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

        // Minigame buttons - FIXED EVENT LISTENERS
        const minigameInputs = ['w', 'a', 's', 'd', 'space'];
        minigameInputs.forEach(input => {
            const buttonId = input === 'space' ? 'game-space' : `game-${input}`;
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    this.sendMinigameInput(input);
                });
            }
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

    // MQTT Message Handling - INCLUDES ALL MESSAGE TYPES
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

                case 'choice_selected':
                    this.handleChoiceSelected(message);
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

                case 'choice_made':
                    // Optional: Handle choice confirmations from Presenter
                    this.log(`Choice confirmed: ${message.choiceText}`, 'presenter');
                    break;

                case 'game_reset':
                    this.handleGameReset(message);
                    break;

                case 'presenter_disconnected':
                    this.handlePresenterDisconnected(message);
                    break;

                default:
                    this.log(`Unknown message type: ${message.type}`, 'error');
            }

            // Update UI after processing message
            if (this.modules.ui) {
                this.modules.ui.updateStatus();
            }

        } catch (error) {
            console.error('Error handling MQTT message:', error);
            this.log(`Error processing message: ${error.message}`, 'error');
        }
    }

    handleChapterChanged(message) {
        // Handle both string and object currentChapter values
        let chapterValue = message.currentChapter;
        if (typeof chapterValue === 'object' && chapterValue !== null) {
            chapterValue = chapterValue.id || chapterValue.name || 'Unknown Chapter';
        }
        
        this.gameState.currentChapter = chapterValue;
        this.gameState.playerState = message.playerState || {};
        
        this.log(`Chapter changed to: ${chapterValue}`, 'presenter');
        
        // Clear choices when chapter changes (unless hasChoices is true)
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

    handleChoiceSelected(message) {
        this.gameState.currentSelection = message.choiceIndex;
        this.modules.ui.updateChoiceSelection(this.gameState.currentSelection);
        this.log(`Choice ${message.choiceIndex + 1} selected: ${message.choiceText}`, 'presenter');
    }

    // FIXED: Minigame status handling with proper UI updates
    handleMinigameStatus(message) {
        // Update game state based on minigame status
        const wasActive = this.gameState.minigameActive;
        const isActive = message.status === 'started' || message.status === 'active' || message.status === 'progress';
        this.gameState.minigameActive = isActive;
        
        // CRITICAL: Update UI to enable/disable minigame controls when status changes
        if (wasActive !== isActive && this.modules.ui) {
            this.modules.ui.updateInputState(
                isActive ? 'minigame' : 'story',
                isActive ? 'minigame' : this.gameState.awaitingInputType
            );
        }
        
        // Enhanced logging with visual feedback
        if (isActive && !wasActive) {
            this.log(`🎮 MINIGAME STARTED: ${message.minigameId}`, 'success');
            this.log(`🎮 Use WASD + SPACE to control the minigame!`, 'success');
            
            // Flash minigame buttons to show they're active
            if (this.modules.ui && typeof this.modules.ui.flashMinigameButtons === 'function') {
                setTimeout(() => this.modules.ui.flashMinigameButtons(), 100);
            }
        } else if (!isActive && wasActive) {
            this.log(`🎮 Minigame ended: ${message.minigameId}`, 'presenter');
        }
        
        // Handle specific statuses
        switch (message.status) {
            case 'started':
                this.log(`🎮 Minigame controls are now ACTIVE!`, 'success');
                break;
            case 'completed':
                this.log(`🎮 Minigame completed successfully!`, 'success');
                break;
            case 'failed':
                this.log(`🎮 Minigame failed - try again!`, 'error');
                break;
            case 'error':
                this.log(`🎮 Minigame error: ${message.result?.error || 'Unknown error'}`, 'error');
                break;
            case 'progress':
                // Don't spam logs for progress updates
                break;
            default:
                this.log(`🎮 Minigame ${message.status}: ${message.minigameId}`, 'presenter');
        }
    }

    handleAudioStatus(message) {
        this.log(`Audio ${message.status}: ${message.audioFile}`, 'presenter');
    }

    handlePresenterReady(message) {
        this.gameState.presenterConnected = true;
        this.log('Presenter app connected and ready', 'success');
        this.modules.ui.updatePresenterStatus(true);
        
        // Request status update after short delay
        setTimeout(() => {
            if (this.modules.mqtt && this.modules.mqtt.isConnected()) {
                this.modules.mqtt.requestPresenterStatus();
            }
        }, 500);
    }

    handleScrollStatus(message) {
        this.log(`Scroll ${message.direction} - Top: ${message.atTop}, Bottom: ${message.atBottom}`, 'presenter');
    }

    handlePresenterDisconnected(message) {
        this.gameState.presenterConnected = false;
        this.gameState.minigameActive = false; // Disable minigame controls when presenter disconnects
        this.modules.ui.updatePresenterStatus(false);
        this.modules.ui.updateInputState('disconnected', null);
        this.log(`Presenter disconnected: ${message.clientId}`, 'error');
    }

    // ENHANCED: Handle reset confirmations from Presenter
    handleGameReset(message) {
        if (message.success) {
            this.log('✅ Game reset completed successfully!', 'success');
            
            // Ensure local state matches the reset Presenter
            this.gameState.currentChapter = 'start';
            this.gameState.currentChoices = [];
            this.gameState.currentSelection = 0;
            this.gameState.minigameActive = false;
            this.gameState.awaitingInputType = 'proceed';
            this.gameState.playerState = {
                health: 100,
                courage: 'Normal',
                location: 'Home'
            };
            
            // Update UI to reflect reset state
            this.modules.ui.updateChoices([]);
            this.modules.ui.updateInputState('story', 'proceed');
            this.modules.ui.updateStatus();
            
            this.log('📖 Story reset to Chapter 1 - ready to begin adventure!', 'success');
            
            // Optional: Flash the proceed button to indicate what to do next
            if (this.modules.ui && typeof this.modules.ui.flashButton === 'function') {
                setTimeout(() => {
                    this.modules.ui.flashButton('proceed-btn', 500);
                }, 500);
            }
        } else {
            this.log(`❌ Game reset failed: ${message.error || 'Unknown error'}`, 'error');
            this.log('Try refreshing both applications if the issue persists', 'error');
        }
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
        if (!this.canSendInput() || choiceIndex >= this.gameState.currentChoices.length) {
            this.log(`Cannot select choice ${choiceIndex + 1} - invalid or not available`, 'error');
            return;
        }

        // Update local selection immediately for responsive UI
        this.gameState.currentSelection = choiceIndex;
        this.modules.ui.updateChoiceSelection(choiceIndex);

        const message = {
            type: 'make_choice',
            timestamp: new Date().toISOString(),
            choiceIndex: choiceIndex
        };

        this.sendMQTTMessage(message);
        this.log(`Selected choice ${choiceIndex + 1}: ${this.gameState.currentChoices[choiceIndex]?.text}`, 'mqtt');
    }

    navigateChoice(direction) {
        if (!this.canSendInput()) return;

        // Update local selection immediately for responsive feel
        if (this.gameState.currentChoices.length > 0) {
            let newSelection = this.gameState.currentSelection;
            
            if (direction === 'up') {
                newSelection = Math.max(0, newSelection - 1);
            } else if (direction === 'down') {
                newSelection = Math.min(this.gameState.currentChoices.length - 1, newSelection + 1);
            }
            
            if (newSelection !== this.gameState.currentSelection) {
                this.gameState.currentSelection = newSelection;
                this.modules.ui.updateChoiceSelection(newSelection);
            }
        }

        const message = {
            type: 'navigate_choice',
            timestamp: new Date().toISOString(),
            direction: direction
        };

        this.sendMQTTMessage(message);
        this.log(`Navigate ${direction}`, 'mqtt');
    }

    scrollStory(direction) {
        if (!this.canSendInput()) return;

        const message = {
            type: direction === 'up' ? 'scroll_up' : 'scroll_down',
            timestamp: new Date().toISOString()
        };

        this.sendMQTTMessage(message);
        this.log(`Scroll ${direction}`, 'mqtt');
    }

    // FIXED: Minigame input method with proper validation and feedback
    sendMinigameInput(input) {
        if (!this.gameState.minigameActive) {
            this.log(`🎮 Cannot send input '${input}' - no active minigame`, 'error');
            return;
        }

        if (!this.canSendInput()) {
            this.log(`🎮 Cannot send input '${input}' - not connected`, 'error');
            return;
        }

        const message = {
            type: 'minigame_input',
            timestamp: new Date().toISOString(),
            input: input
        };

        this.sendMQTTMessage(message);
        this.log(`🎮 Minigame input: ${input.toUpperCase()}`, 'mqtt');
        
        // Visual feedback
        if (this.modules.ui && typeof this.modules.ui.flashButton === 'function') {
            const buttonId = input === 'space' ? 'game-space' : `game-${input}`;
            this.modules.ui.flashButton(buttonId);
        }
    }

    // ENHANCED: Reset story with confirmation system
    resetStory() {
        if (!this.canSendInput()) {
            this.log('Cannot reset - not connected to Presenter', 'error');
            return;
        }

        this.log('🔄 Sending reset command to Presenter...', 'system');

        const message = {
            type: 'reset_game',
            timestamp: new Date().toISOString()
        };

        this.sendMQTTMessage(message);
        this.log('Sent: Reset game', 'mqtt');

        // Reset local Orchestrator state immediately for responsive UI
        this.gameState.currentChapter = null;
        this.gameState.currentChoices = [];
        this.gameState.currentSelection = 0;
        this.gameState.playerState = {};
        this.gameState.awaitingInputType = null;
        this.gameState.minigameActive = false;

        // Update UI immediately
        this.modules.ui.updateChoices([]);
        this.modules.ui.updateInputState('story', 'proceed');
        this.modules.ui.updateStatus();
        
        this.log('🔄 Local state reset - waiting for Presenter confirmation...', 'system');
    }

    // Utility Methods
    canSendInput() {
        return this.gameState.connected && this.gameState.presenterConnected;
    }

    sendMQTTMessage(message) {
        if (this.modules.mqtt && this.modules.mqtt.isConnected()) {
            this.modules.mqtt.publish(message);
        } else {
            this.log('Cannot send message - MQTT not connected', 'error');
        }
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = { timestamp, message, type };
        
        this.messageLog.unshift(logEntry);
        if (this.messageLog.length > CONFIG.UI.MAX_LOG_ENTRIES) {
            this.messageLog.pop();
        }
        
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        if (this.modules.ui) {
            this.modules.ui.updateLog(this.messageLog);
        }
    }

    clearLog() {
        this.messageLog = [];
        if (this.modules.ui) {
            this.modules.ui.updateLog(this.messageLog);
        }
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
        a.download = `orchestrator-log-${new Date().getTime()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.log('Log exported', 'system');
    }

    connectToMQTT() {
        if (this.modules.mqtt) {
            this.modules.mqtt.connect();
        }
    }

    getCurrentState() {
        return {
            connected: this.gameState.connected,
            presenterConnected: this.gameState.presenterConnected,
            currentChapter: this.gameState.currentChapter,
            currentChoices: this.gameState.currentChoices,
            currentSelection: this.gameState.currentSelection,
            minigameActive: this.gameState.minigameActive,
            awaitingInputType: this.gameState.awaitingInputType
        };
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        window.orchestratorApp = new WhiskersOrchestrator();
        await window.orchestratorApp.initialize();
    } catch (error) {
        console.error('❌ Failed to start Orchestrator:', error);
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WhiskersOrchestrator;
}