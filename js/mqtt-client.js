// MQTT Client for Whiskers Orchestrator
class MQTTClient {
    constructor(app) {
        this.app = app;
        this.client = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectTimer = null;
        this.messageQueue = [];
        this.initialized = false;
    }

    async initialize() {
        try {
            console.log('📡 Initializing MQTT Client...');

            if (typeof mqtt === 'undefined') {
                throw new Error('MQTT.js library not found');
            }

            this.clientId = `${CONFIG.MQTT.CLIENT_ID_PREFIX}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            this.connectionOptions = {
                clientId: this.clientId,
                keepalive: CONFIG.MQTT.KEEP_ALIVE,
                clean: CONFIG.MQTT.CLEAN_SESSION,
                connectTimeout: CONFIG.MQTT.CONNECT_TIMEOUT,
                reconnectPeriod: 0, // Manual reconnection
                rejectUnauthorized: false,
                protocolVersion: 4
            };

            this.initialized = true;
            console.log('✅ MQTT Client initialized');

            // Start connection attempt
            this.connect();

        } catch (error) {
            console.error('❌ Failed to initialize MQTT Client:', error);
            throw error;
        }
    }

    async connect() {
        try {
            // Try primary broker first
            let brokerUrl = this.buildBrokerUrl(CONFIG.MQTT.PRIMARY_BROKER, CONFIG.MQTT.PORT);
            
            console.log(`📡 Connecting to primary broker: ${brokerUrl}`);
            
            await this.attemptConnection(brokerUrl);

        } catch (primaryError) {
            console.warn('Primary broker failed, trying fallback:', primaryError);
            
            try {
                // Try fallback broker if configured
                if (CONFIG.MQTT.FALLBACK_BROKER) {
                    let fallbackUrl = this.buildBrokerUrl(CONFIG.MQTT.FALLBACK_BROKER, CONFIG.MQTT.PORT);
                    console.log(`📡 Connecting to fallback broker: ${fallbackUrl}`);
                    
                    await this.attemptConnection(fallbackUrl);
                } else {
                    throw primaryError;
                }
                
            } catch (fallbackError) {
                console.error('Both brokers failed:', fallbackError);
                this.handleConnectionError(fallbackError);
            }
        }
    }

    buildBrokerUrl(broker, port) {
        const protocol = CONFIG.MQTT.USE_SSL ? 'wss' : 'ws';
        return `${protocol}://${broker}:${port}/mqtt`;
    }

    async attemptConnection(brokerUrl) {
        return new Promise((resolve, reject) => {
            if (this.client) {
                this.client.end(true);
                this.client = null;
            }

            this.client = mqtt.connect(brokerUrl, this.connectionOptions);
            this.setupEventHandlers();

            const timeout = setTimeout(() => {
                reject(new Error(`Connection timeout to ${brokerUrl}`));
            }, CONFIG.MQTT.CONNECT_TIMEOUT);

            this.client.once('connect', () => {
                clearTimeout(timeout);
                resolve();
            });

            this.client.once('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }

    setupEventHandlers() {
        this.client.on('connect', () => {
            console.log('📡 Connected to MQTT broker successfully!');
            this.connected = true;
            this.reconnectAttempts = 0;
            this.app.gameState.connected = true;

            // Update UI
            this.app.modules.ui.updateConnectionStatus(true);

            // Subscribe to topic
            this.subscribe();

            // Send queued messages
            this.sendQueuedMessages();

            // Request current status from Presenter after a brief delay
            setTimeout(() => {
                this.requestPresenterStatus();
            }, 1000);

            this.app.log('MQTT connected successfully', 'success');
        });

        this.client.on('message', (topic, message) => {
            this.handleMessage(topic, message);
        });

        this.client.on('error', (error) => {
            console.error('📡 MQTT Error:', error);
            this.handleConnectionError(error);
        });

        this.client.on('close', () => {
            console.log('📡 MQTT connection closed');
            this.connected = false;
            this.app.gameState.connected = false;
            this.app.modules.ui.updateConnectionStatus(false);
            this.scheduleReconnect();
        });

        this.client.on('offline', () => {
            console.log('📡 MQTT client offline');
            this.connected = false;
            this.app.gameState.connected = false;
            this.app.modules.ui.updateConnectionStatus(false);
        });
    }

    subscribe() {
        const topic = CONFIG.TOPICS.SUBSCRIBE;
        console.log(`📡 Subscribing to topic: ${topic}`);

        this.client.subscribe(topic, (error) => {
            if (error) {
                console.error(`📡 Failed to subscribe to ${topic}:`, error);
                this.app.log(`Failed to subscribe: ${error.message}`, 'error');
            } else {
                console.log(`📡 Successfully subscribed to ${topic}`);
                this.app.log(`Subscribed to: ${topic}`, 'success');
            }
        });
    }

    handleMessage(topic, message) {
        try {
            const messageStr = message.toString();
            console.log(`📡 Received message on ${topic}:`, messageStr);

            let parsedMessage;
            try {
                parsedMessage = JSON.parse(messageStr);
            } catch (error) {
                console.error('📡 Failed to parse JSON message:', error);
                this.app.log('Received invalid JSON message', 'error');
                return;
            }

            // Validate message structure
            if (!this.validateMessage(parsedMessage)) {
                console.error('📡 Invalid message structure:', parsedMessage);
                this.app.log('Received invalid message structure', 'error');
                return;
            }

            // Forward to app
            this.app.handleMQTTMessage(parsedMessage);

        } catch (error) {
            console.error('📡 Error handling message:', error);
            this.app.log(`Message handling error: ${error.message}`, 'error');
        }
    }

    validateMessage(message) {
        return message &&
               typeof message.type === 'string' &&
               typeof message.timestamp === 'string';
    }

    publish(message) {
        try {
            if (!this.connected) {
                console.log('📡 Not connected, queuing message:', message);
                this.messageQueue.push(message);
                return;
            }

            // Add timestamp if not present
            if (!message.timestamp) {
                message.timestamp = new Date().toISOString();
            }

            const topic = CONFIG.TOPICS.PUBLISH;
            const messageStr = JSON.stringify(message);

            console.log(`📡 Publishing to ${topic}:`, message);

            this.client.publish(topic, messageStr, (error) => {
                if (error) {
                    console.error('📡 Failed to publish message:', error);
                    this.app.log(`Publish failed: ${error.message}`, 'error');
                }
            });

        } catch (error) {
            console.error('📡 Error publishing message:', error);
            this.app.log(`Publish error: ${error.message}`, 'error');
        }
    }

    sendQueuedMessages() {
        if (this.messageQueue.length === 0) return;

        console.log(`📡 Sending ${this.messageQueue.length} queued messages`);

        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.publish(message);
        }
    }

    requestPresenterStatus() {
        console.log('📡 Requesting status from Presenter...');
        this.publish({
            type: 'status_request',
            timestamp: new Date().toISOString(),
            requestId: Math.random().toString(36).substr(2, 9)
        });
    }

    handleConnectionError(error) {
        console.error('📡 Connection error:', error);
        this.connected = false;
        this.app.gameState.connected = false;
        this.app.modules.ui.updateConnectionStatus(false);
        this.app.log(`Connection error: ${error.message}`, 'error');
        this.scheduleReconnect();
    }

    scheduleReconnect() {
        if (this.reconnectTimer) return;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('📡 Max reconnection attempts reached');
            this.app.log('Max reconnection attempts reached', 'error');
            return;
        }

        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        console.log(`📡 Scheduling reconnection in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            this.reconnectAttempts++;

            try {
                await this.connect();
            } catch (error) {
                console.error('📡 Reconnection failed:', error);
            }
        }, delay);
    }

    disconnect() {
        console.log('📡 Disconnecting from MQTT broker');

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.client && this.connected) {
            this.client.end();
        }

        this.connected = false;
        this.app.gameState.connected = false;
        this.app.modules.ui.updateConnectionStatus(false);
    }

    // Getters
    isConnected() {
        return this.connected;
    }

    isInitialized() {
        return this.initialized;
    }

    getConnectionStats() {
        return {
            connected: this.connected,
            clientId: this.clientId,
            reconnectAttempts: this.reconnectAttempts,
            queuedMessages: this.messageQueue.length,
            primaryBroker: CONFIG.MQTT.PRIMARY_BROKER,
            fallbackBroker: CONFIG.MQTT.FALLBACK_BROKER || 'None'
        };
    }
}