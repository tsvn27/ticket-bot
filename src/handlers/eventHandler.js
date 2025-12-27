const fs = require('fs');
const path = require('path');
const { printLoaded } = require('../utils/logger');

function loadEvents(client) {
    const eventsPath = path.join(__dirname, '../events');
    
    if (!fs.existsSync(eventsPath)) {
        fs.mkdirSync(eventsPath, { recursive: true });
        return;
    }

    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    const loaded = [];

    for (const file of eventFiles) {
        const event = require(path.join(eventsPath, file));
        
        if (!event.name || typeof event.execute !== 'function') continue;

        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }

        loaded.push(event.name);
    }

    printLoaded('Events', loaded);
}

module.exports = { loadEvents };
