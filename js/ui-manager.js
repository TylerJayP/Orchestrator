// UI Manager for Whiskers Orchestrator
class UIManager {
    constructor(app) {
        this.app = app;
        this.elements = {};
        this.initialized = false;
        this.statusUpdateInterval = null;
    }

    async initialize() {
        try {
            console.log('🎨 Initializing UI Manager...');

            // Cache DOM elements
            this.cacheElements();

            // Set up initial state
            this.initializeDisplay();

            // Start status updates
            this.startStatusUpdates();

            this.initialized = true;
            console.log('✅ UI Manager initialized');

        } catch (error) {
            console.error('❌ Failed to initialize UI Manager:', error);
            throw error;
        }
    }

    cacheElements() {
        // Status elements
        this.elements.mqttStatus = document.getElementById('mqtt-status');
        this.elements.presenterStatus = document.getElementById('presenter-status');
        this.elements.currentChapter = document.getElementById('current-chapter');
        this.elements.playerState = document.getElementById('player-state');
        this.elements.awaitingInput = document.getElementById('awaiting-input');

        // Control buttons
        this.elements.proceedBtn = document.getElementById('proceed-btn');
        this.elements.resetBtn = document.getElementById('reset-btn');
        this.elements.choiceButtons = [
            document.getElementById('choice-1'),
            document.getElementById('choice-2'),
            document.getElementById('choice-3')
        ];

        // Navigation buttons
        this.elements.navButtons = {
            up: document.getElementById('nav-up'),
            down: document.getElementById('nav-down'),
            scrollUp: document.getElementById('scroll-up'),
            scrollDown: document.getElementById('scroll-down')
        };

        // Minigame buttons
        this.elements.minigameButtons = {
            w: document.getElementById('game-w'),
            a: document.getElementById('game-a'),
            s: document.getElementById('game-s'),
            d: document.getElementById('game-d'),
            space: document.getElementById('game-space')
        };

        // Display areas
        this.elements.choicesDisplay = document.getElementById('choices-display');
        this.elements.messageLog = document.getElementById('message-log');

        // Modal
        this.elements.connectionModal = document.getElementById('connection-modal');

        console.log('🎨 UI elements cached');
    }

    initializeDisplay() {
        // Set initial status
        this.updateConnectionStatus(false);
        this.updatePresenterStatus(false);
        
        // Disable control buttons initially
        this.updateInputState('disconnected', null);
        
        // Clear displays
        this.updateChoices([]);
        this.updateLog([]);

        console.log('🎨 UI display initialized');
    }

    startStatusUpdates() {
        this.statusUpdateInterval = setInterval(() => {
            this.updateStatus();
        }, CONFIG.UI.STATUS_UPDATE_INTERVAL);
    }

    // Status Updates
    updateStatus() {
        if (!this.app.gameState) return;

        const gameState = this.app.gameState;

        // Update chapter display
        if (this.elements.currentChapter) {
            this.elements.currentChapter.textContent = gameState.currentChapter || 'Not loaded';
        }

        // Update player state display
        if (this.elements.playerState && gameState.playerState) {
            const playerInfo = [];
            if (gameState.playerState.health !== undefined) {
                playerInfo.push(`Health: ${gameState.playerState.health}`);
            }
            if (gameState.playerState.courage) {
                playerInfo.push(`Courage: ${gameState.playerState.courage}`);
            }
            if (gameState.playerState.location) {
                playerInfo.push(`Location: ${gameState.playerState.location}`);
            }
            
            this.elements.playerState.textContent = playerInfo.length > 0 ? 
                playerInfo.join(', ') : 'Unknown';
        }

        // Update awaiting input display
        if (this.elements.awaitingInput) {
            this.elements.awaitingInput.textContent = gameState.awaitingInputType || 'None';
        }
    }

    updateConnectionStatus(connected) {
        if (this.elements.mqttStatus) {
            if (connected) {
                this.elements.mqttStatus.textContent = '🔗 MQTT: Connected';
                this.elements.mqttStatus.style.color = '#44ff44';
            } else {
                this.elements.mqttStatus.textContent = '❌ MQTT: Disconnected';
                this.elements.mqttStatus.style.color = '#ff4444';
            }
        }
    }

    updatePresenterStatus(connected) {
        if (this.elements.presenterStatus) {
            if (connected) {
                this.elements.presenterStatus.textContent = '📺 Presenter: Connected';
                this.elements.presenterStatus.style.color = '#44ff44';
            } else {
                this.elements.presenterStatus.textContent = '📺 Presenter: Unknown';
                this.elements.presenterStatus.style.color = '#ffaa00';
            }
        }
    }

    updateInputState(context, awaitingInputType) {
        // Enable/disable buttons based on connection and context
        const connected = this.app.gameState.connected;
        
        // Primary buttons
        if (this.elements.proceedBtn) {
            this.elements.proceedBtn.disabled = !connected || 
                (awaitingInputType !== 'proceed' && context !== 'story');
        }

        if (this.elements.resetBtn) {
            this.elements.resetBtn.disabled = !connected;
        }

        // Choice buttons
        this.elements.choiceButtons.forEach((btn, index) => {
            if (btn) {
                btn.disabled = !connected || 
                    (awaitingInputType !== 'choice' && context !== 'choices') ||
                    index >= this.app.gameState.currentChoices.length;
            }
        });

        // Navigation buttons
        Object.values(this.elements.navButtons).forEach(btn => {
            if (btn) {
                btn.disabled = !connected;
            }
        });

        // Minigame buttons
        Object.values(this.elements.minigameButtons).forEach(btn => {
            if (btn) {
                btn.disabled = !connected || !this.app.gameState.minigameActive;
            }
        });
    }

    updateChoices(choices) {
        if (!this.elements.choicesDisplay) return;

        if (choices.length === 0) {
            this.elements.choicesDisplay.innerHTML = '<div class="no-choices">No choices available</div>';
            return;
        }

        let html = '';
        choices.forEach((choice, index) => {
            const selectedClass = index === this.app.gameState.currentSelection ? 'selected' : '';
            html += `
                <div class="choice-item ${selectedClass}">
                    <span class="choice-index">${index + 1}.</span>
                    <span class="choice-text">${choice.text}</span>
                </div>
            `;
        });

        this.elements.choicesDisplay.innerHTML = html;

        // Update choice button labels
        this.elements.choiceButtons.forEach((btn, index) => {
            if (btn) {
                if (index < choices.length) {
                    btn.textContent = `${index + 1}️⃣ ${choices[index].text.substring(0, 20)}...`;
                } else {
                    btn.textContent = `${index + 1}️⃣ Choice ${index + 1}`;
                }
            }
        });
    }

    updateChoiceSelection(selectedIndex) {
        // Update visual selection in choices display
        const choiceItems = this.elements.choicesDisplay.querySelectorAll('.choice-item');
        choiceItems.forEach((item, index) => {
            if (index === selectedIndex) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    updateLog(messageLog) {
        if (!this.elements.messageLog) return;

        let html = '';
        messageLog.slice(0, 20).forEach(entry => { // Show latest 20 entries
            html += `
                <div class="log-entry ${entry.type}">
                    <span class="log-timestamp">[${entry.timestamp}]</span>
                    ${entry.message}
                </div>
            `;
        });

        this.elements.messageLog.innerHTML = html;

        // Auto-scroll to bottom if enabled
        if (CONFIG.UI.LOG_AUTO_SCROLL) {
            this.elements.messageLog.scrollTop = this.elements.messageLog.scrollHeight;
        }
    }

    // Modal Management
    showConnectionModal() {
        if (this.elements.connectionModal) {
            this.elements.connectionModal.classList.add('active');
        }
    }

    hideConnectionModal() {
        if (this.elements.connectionModal) {
            this.elements.connectionModal.classList.remove('active');
        }
    }

    // Visual Feedback
    flashButton(buttonId, duration = 200) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.style.backgroundColor = '#006600';
            setTimeout(() => {
                button.style.backgroundColor = '';
            }, duration);
        }
    }

    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#440000' : '#004400'};
            color: ${type === 'error' ? '#ff6666' : '#66ff66'};
            border: 1px solid ${type === 'error' ? '#ff0000' : '#00ff00'};
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 1000;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            max-width: 300px;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);
    }

    // Cleanup
    cleanup() {
        if (this.statusUpdateInterval) {
            clearInterval(this.statusUpdateInterval);
            this.statusUpdateInterval = null;
        }
    }

    // Getters
    isInitialized() {
        return this.initialized;
    }
}
