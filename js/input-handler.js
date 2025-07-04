// Input Handler for Whiskers Orchestrator
class InputHandler {
    constructor(app) {
        this.app = app;
        this.initialized = false;
        this.keyboardEnabled = true;
        this.gamepadEnabled = false;
        this.gamepadIndex = -1;
        this.lastInputTime = 0;
        this.repeatInputTimer = null;
        this.currentInputMethod = 'buttons';
    }

    async initialize() {
        try {
            console.log('⌨️ Initializing Input Handler...');

            // Set up keyboard event listeners
            this.setupKeyboardInput();

            // Set up gamepad support
            this.setupGamepadInput();

            // Set up input method selection
            this.setupInputMethodSelection();

            this.initialized = true;
            console.log('✅ Input Handler initialized');

        } catch (error) {
            console.error('❌ Failed to initialize Input Handler:', error);
            throw error;
        }
    }

    setupKeyboardInput() {
        document.addEventListener('keydown', (event) => {
            // Don't handle inputs when typing in form fields
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }

            if (!this.keyboardEnabled || this.currentInputMethod !== 'keyboard') {
                return;
            }

            this.handleKeyboardInput(event);
        });

        document.addEventListener('keyup', (event) => {
            if (this.repeatInputTimer) {
                clearTimeout(this.repeatInputTimer);
                this.repeatInputTimer = null;
            }
        });
    }

    handleKeyboardInput(event) {
        // Prevent default browser behavior
        event.preventDefault();

        // Check debounce
        const now = Date.now();
        if (now - this.lastInputTime < CONFIG.INPUT.DEBOUNCE_TIME) {
            return;
        }
        this.lastInputTime = now;

        // Handle different key inputs
        switch (event.key) {
            // Navigation
            case 'ArrowUp':
                this.app.navigateChoice('up');
                this.flashButtonFeedback('nav-up');
                break;

            case 'ArrowDown':
                this.app.navigateChoice('down');
                this.flashButtonFeedback('nav-down');
                break;

            case 'PageUp':
                this.app.scrollStory('up');
                this.flashButtonFeedback('scroll-up');
                break;

            case 'PageDown':
                this.app.scrollStory('down');
                this.flashButtonFeedback('scroll-down');
                break;

            // Primary actions
            case 'Enter':
                if (this.app.gameState.currentChoices.length > 0) {
                    this.app.makeChoice(this.app.gameState.currentSelection);
                    this.flashButtonFeedback(`choice-${this.app.gameState.currentSelection + 1}`);
                } else {
                    this.app.proceedChapter();
                    this.flashButtonFeedback('proceed-btn');
                }
                break;

            case ' ':
                if (this.app.gameState.minigameActive) {
                    this.app.sendMinigameInput('space');
                    this.flashButtonFeedback('game-space');
                } else {
                    this.app.proceedChapter();
                    this.flashButtonFeedback('proceed-btn');
                }
                break;

            // Choice shortcuts
            case '1':
                this.app.makeChoice(0);
                this.flashButtonFeedback('choice-1');
                break;

            case '2':
                this.app.makeChoice(1);
                this.flashButtonFeedback('choice-2');
                break;

            case '3':
                this.app.makeChoice(2);
                this.flashButtonFeedback('choice-3');
                break;

            // Minigame controls
            case 'w':
            case 'W':
                this.app.sendMinigameInput('w');
                this.flashButtonFeedback('game-w');
                this.setupRepeatInput(() => this.app.sendMinigameInput('w'));
                break;

            case 'a':
            case 'A':
                this.app.sendMinigameInput('a');
                this.flashButtonFeedback('game-a');
                this.setupRepeatInput(() => this.app.sendMinigameInput('a'));
                break;

            case 's':
            case 'S':
                this.app.sendMinigameInput('s');
                this.flashButtonFeedback('game-s');
                this.setupRepeatInput(() => this.app.sendMinigameInput('s'));
                break;

            case 'd':
            case 'D':
                this.app.sendMinigameInput('d');
                this.flashButtonFeedback('game-d');
                this.setupRepeatInput(() => this.app.sendMinigameInput('d'));
                break;

            // Utility
            case 'r':
            case 'R':
                if (event.ctrlKey || event.metaKey) {
                    this.app.resetStory();
                    this.flashButtonFeedback('reset-btn');
                }
                break;

            // Connection modal
            case 'c':
            case 'C':
                if (event.ctrlKey || event.metaKey) {
                    this.app.modules.ui.showConnectionModal();
                }
                break;

            default:
                // Ignore unknown keys
                return;
        }
    }

    setupRepeatInput(action) {
        if (this.repeatInputTimer) {
            clearTimeout(this.repeatInputTimer);
        }

        this.repeatInputTimer = setTimeout(() => {
            action();
            this.setupRepeatInput(action); // Continue repeating
        }, CONFIG.INPUT.REPEAT_DELAY);
    }

    setupGamepadInput() {
        // Check for gamepad support
        if (!navigator.getGamepads) {
            console.log('⌨️ Gamepad API not supported');
            return;
        }

        // Listen for gamepad connections
        window.addEventListener('gamepadconnected', (event) => {
            console.log(`⌨️ Gamepad connected: ${event.gamepad.id}`);
            this.gamepadIndex = event.gamepad.index;
            this.gamepadEnabled = true;
            this.app.log(`Gamepad connected: ${event.gamepad.id}`, 'system');
        });

        window.addEventListener('gamepaddisconnected', (event) => {
            console.log(`⌨️ Gamepad disconnected: ${event.gamepad.id}`);
            this.gamepadIndex = -1;
            this.gamepadEnabled = false;
            this.app.log(`Gamepad disconnected: ${event.gamepad.id}`, 'system');
        });

        // Gamepad polling (if enabled)
        this.gamepadPollInterval = setInterval(() => {
            if (this.gamepadEnabled && this.currentInputMethod === 'gamepad') {
                this.pollGamepad();
            }
        }, 100); // Poll at 10Hz
    }

    pollGamepad() {
        const gamepads = navigator.getGamepads();
        if (!gamepads[this.gamepadIndex]) return;

        const gamepad = gamepads[this.gamepadIndex];
        const now = Date.now();

        // Debounce
        if (now - this.lastInputTime < CONFIG.INPUT.DEBOUNCE_TIME) {
            return;
        }

        // Check buttons
        if (gamepad.buttons[0].pressed) { // A button - Proceed/Select
            if (this.app.gameState.currentChoices.length > 0) {
                this.app.makeChoice(this.app.gameState.currentSelection);
            } else {
                this.app.proceedChapter();
            }
            this.lastInputTime = now;
        }

        if (gamepad.buttons[1].pressed) { // B button - Reset
            this.app.resetStory();
            this.lastInputTime = now;
        }

        if (gamepad.buttons[2].pressed) { // X button - Choice 1
            this.app.makeChoice(0);
            this.lastInputTime = now;
        }

        if (gamepad.buttons[3].pressed) { // Y button - Choice 2
            this.app.makeChoice(1);
            this.lastInputTime = now;
        }

        // D-pad navigation
        if (gamepad.buttons[12].pressed) { // D-pad up
            this.app.navigateChoice('up');
            this.lastInputTime = now;
        }

        if (gamepad.buttons[13].pressed) { // D-pad down
            this.app.navigateChoice('down');
            this.lastInputTime = now;
        }

        if (gamepad.buttons[14].pressed) { // D-pad left
            this.app.scrollStory('up');
            this.lastInputTime = now;
        }

        if (gamepad.buttons[15].pressed) { // D-pad right
            this.app.scrollStory('down');
            this.lastInputTime = now;
        }

        // Analog sticks for minigame input
        const leftStickX = gamepad.axes[0];
        const leftStickY = gamepad.axes[1];
        const deadzone = 0.3;

        if (this.app.gameState.minigameActive) {
            if (leftStickY < -deadzone) { // Up
                this.app.sendMinigameInput('w');
                this.lastInputTime = now;
            } else if (leftStickY > deadzone) { // Down
                this.app.sendMinigameInput('s');
                this.lastInputTime = now;
            }

            if (leftStickX < -deadzone) { // Left
                this.app.sendMinigameInput('a');
                this.lastInputTime = now;
            } else if (leftStickX > deadzone) { // Right
                this.app.sendMinigameInput('d');
                this.lastInputTime = now;
            }

            if (gamepad.buttons[0].pressed) { // A button as space for minigames
                this.app.sendMinigameInput('space');
                this.lastInputTime = now;
            }
        }
    }

    setupInputMethodSelection() {
        const inputMethodRadios = document.querySelectorAll('input[name="input-method"]');
        
        inputMethodRadios.forEach(radio => {
            radio.addEventListener('change', (event) => {
                this.currentInputMethod = event.target.value;
                
                switch (this.currentInputMethod) {
                    case 'buttons':
                        this.keyboardEnabled = false;
                        this.app.log('Input method: Button controls', 'system');
                        break;
                        
                    case 'keyboard':
                        this.keyboardEnabled = true;
                        this.app.log('Input method: Keyboard controls', 'system');
                        break;
                        
                    case 'gamepad':
                        this.keyboardEnabled = false;
                        if (this.gamepadEnabled) {
                            this.app.log('Input method: Gamepad controls', 'system');
                        } else {
                            this.app.log('Gamepad not connected - falling back to buttons', 'system');
                            this.currentInputMethod = 'buttons';
                            document.querySelector('input[value="buttons"]').checked = true;
                        }
                        break;
                }
            });
        });
    }

    flashButtonFeedback(buttonId) {
        this.app.modules.ui.flashButton(buttonId);
    }

    // Getters and Setters
    setKeyboardEnabled(enabled) {
        this.keyboardEnabled = enabled;
    }

    isKeyboardEnabled() {
        return this.keyboardEnabled;
    }

    isGamepadConnected() {
        return this.gamepadEnabled;
    }

    getCurrentInputMethod() {
        return this.currentInputMethod;
    }

    // Cleanup
    cleanup() {
        if (this.gamepadPollInterval) {
            clearInterval(this.gamepadPollInterval);
            this.gamepadPollInterval = null;
        }

        if (this.repeatInputTimer) {
            clearTimeout(this.repeatInputTimer);
            this.repeatInputTimer = null;
        }
    }

    // Getters
    isInitialized() {
        return this.initialized;
    }
}
