# Whiskers Story Orchestrator

A web-based control interface for the "Whiskers and the Bubbles of Justice" choose-your-own-adventure story presentation system. This orchestrator app sends MQTT commands to control story progression in the Presenter app.

## 🎮 Overview

The Orchestrator serves as the control center for the interactive story experience, providing:
- Story progression controls
- Choice selection interface
- Minigame input forwarding
- Real-time status monitoring
- Multiple input methods (buttons, keyboard, gamepad)

## 🚀 Quick Start

1. **Open `index.html`** in a modern web browser
2. **Configure MQTT connection** if needed (default: mqtt.uvucs.org:8083)
3. **Start the Presenter app** on another device/browser
4. **Select input method** and begin controlling the story

## 📡 MQTT Communication

### Connection Settings
- **Primary Broker**: `mqtt.uvucs.org:8083`
- **Fallback Broker**: `broker.emqx.io:8083`
- **Subscribe Topic**: `catstory/presenter/to/orchestrator`
- **Publish Topic**: `catstory/orchestrator/to/presenter`

### Message Types Sent to Presenter

```javascript
// Proceed to next chapter/section
{ "type": "proceed_chapter", "timestamp": "...", "action": "next" }

// Make a story choice
{ "type": "make_choice", "timestamp": "...", "choiceIndex": 0 }

// Navigate between choices
{ "type": "navigate_choice", "timestamp": "...", "direction": "up" }

// Scroll story text
{ "type": "scroll_up", "timestamp": "..." }
{ "type": "scroll_down", "timestamp": "..." }

// Send minigame input
{ "type": "minigame_input", "timestamp": "...", "input": "w" }

// Reset the story
{ "type": "reset_game", "timestamp": "..." }
```

### Message Types Received from Presenter

```javascript
// Story state updates
{ "type": "chapter_changed", "currentChapter": "start", "playerState": {...} }
{ "type": "choices_available", "choices": [...], "currentSelection": 0 }
{ "type": "ready_for_input", "context": "story", "awaitingInputType": "proceed" }

// Game status updates
{ "type": "minigame_status", "status": "started", "minigameId": "..." }
{ "type": "audio_status", "status": "playing", "audioFile": "..." }
{ "type": "app_ready", "developmentMode": true }
```

## 🎮 Control Methods

### Button Controls (Default)
- Click any button in the interface to send commands
- Visual feedback shows button presses
- Buttons automatically enable/disable based on story state

### Keyboard Controls
- **ENTER** - Proceed chapter or select highlighted choice
- **SPACE** - Proceed chapter or minigame action
- **1, 2, 3** - Select story choices
- **↑↓** - Navigate between choices
- **Page Up/Down** - Scroll story text
- **W, A, S, D** - Minigame movement
- **Ctrl+R** - Reset story
- **Ctrl+C** - Connection settings

### Gamepad Support
- **A Button** - Proceed/Select
- **B Button** - Reset story
- **X/Y Buttons** - Quick choice selection
- **D-Pad** - Navigation and scrolling
- **Left Stick** - Minigame movement (WASD equivalent)

## 🖥️ Interface Sections

### Story Status Panel
- Current chapter information
- Player state (health, courage, location)
- Input type currently awaited

### Control Panel
- Primary action buttons (Proceed, Reset)
- Choice selection buttons (1-3)
- Navigation controls (Up/Down, Scroll)
- Minigame controls (WASD + Space)

### Available Choices Display
- Real-time list of current story choices
- Visual indication of selected choice
- Updates automatically as story progresses

### Message Log
- Real-time MQTT communication log
- Color-coded message types
- Export capability for debugging

## 🔧 Configuration

### MQTT Settings (`config.js`)
```javascript
MQTT: {
    PRIMARY_BROKER: 'mqtt.uvucs.org',
    FALLBACK_BROKER: 'broker.emqx.io',
    PORT: 8083,
    CLIENT_ID_PREFIX: 'WhiskersOrchestrator'
}
```

### Input Settings
```javascript
INPUT: {
    KEYBOARD_ENABLED: true,
    GAMEPAD_ENABLED: true,
    REPEAT_DELAY: 200,
    DEBOUNCE_TIME: 50
}
```

## 🏗️ Architecture

### Core Components

**App Controller (`js/app.js`)**
- Main application logic and state management
- MQTT message routing
- Game state synchronization

**MQTT Client (`js/mqtt-client.js`)**
- Broker connection management
- Message publishing/subscribing
- Automatic reconnection with fallback

**UI Manager (`js/ui-manager.js`)**
- Interface updates and status display
- Button state management
- Visual feedback systems

**Input Handler (`js/input-handler.js`)**
- Keyboard, mouse, and gamepad input
- Input method switching
- Debouncing and repeat handling

### Data Flow
```
User Input → Input Handler → App Controller → MQTT Client → Presenter App
                                  ↑                            ↓
UI Updates ← UI Manager ← App Controller ← MQTT Client ← Presenter App
```

## 🎨 Styling

The interface uses an **80s retro terminal aesthetic** with:
- Dark background with green accent colors
- Courier New monospace typography
- Glowing borders and text shadows
- Color-coded message types and status indicators

## 🔍 Debugging

### Message Log
- View all MQTT communication in real-time
- Export logs for analysis
- Color-coded message types (system, MQTT, presenter, error)

### Browser Console
- Detailed logging of all operations
- Error reporting with stack traces
- Connection status and statistics

### Development Features
- Connection statistics display
- Message validation and error handling
- Automatic broker fallback

## 📱 Browser Compatibility

### Requirements
- **WebSocket Support** - For MQTT communication
- **ES6+ Support** - Modern JavaScript features
- **Gamepad API** - For controller support (optional)

### Tested Browsers
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 🚨 Troubleshooting

### Connection Issues
1. Check broker URLs and ports in connection modal
2. Verify firewall/network settings allow WebSocket connections
3. Try fallback broker if primary fails
4. Check browser console for detailed error messages

### Input Not Working
1. Verify MQTT connection status (green indicator)
2. Check that Presenter app is connected and ready
3. Ensure correct input method is selected
4. Check for proper story state (awaiting correct input type)

### Message Delays
1. Check network latency to MQTT broker
2. Verify broker isn't overloaded
3. Check for message queuing during disconnections

## 🔐 Security Considerations

- Uses unencrypted MQTT over WebSocket (suitable for educational use)
- No authentication required for public brokers
- All communication is visible to anyone monitoring the topics

For production deployment, consider:
- SSL/TLS encryption (wss://)
- MQTT authentication
- Private broker deployment

## 📄 License

Educational project for CS3660 Web Programming II

---

**Ready to control the adventure! 🐱✨**
