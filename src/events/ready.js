const { ActivityType } = require('discord.js');
const { registerCommands } = require('../handlers/commandHandler');
const { startAutoCloseChecker } = require('../utils/autoclose');
const { startAttendantsSync } = require('../utils/syncAttendants');
const { printReady } = require('../utils/logger');
const { connectDB, setGuildId, loadCache } = require('../database');
const { setupAPI, startAPI } = require('../api/server');

const DEFAULT_STATUS = [
    { name: 'tickets', type: ActivityType.Watching },
    { name: 'github.com/tsvn27', type: ActivityType.Playing },
    { name: 'coded by kayo', type: ActivityType.Playing },
    { name: 'suporte', type: ActivityType.Listening }
];

let statusIndex = 0;
let currentStatus = DEFAULT_STATUS;

async function loadStatus(guildId) {
    const db = require('../database');
    const settings = await db.settings.fetch(guildId);
    if (settings?.botStatus && settings.botStatus.length > 0) {
        currentStatus = settings.botStatus;
    }
}

function startStatusRotation(client) {
    setInterval(() => {
        statusIndex = (statusIndex + 1) % currentStatus.length;
        const status = currentStatus[statusIndex];
        client.user.setPresence({
            activities: [{ name: status.name, type: status.type }],
            status: 'online'
        });
    }, 30000);
}

module.exports = {
    name: 'clientReady',
    once: true,
    async execute(client) {
        await connectDB();
        
        const guildId = process.env.GUILD_ID || client.guilds.cache.first()?.id;
        if (guildId) {
            setGuildId(guildId);
            await loadCache(guildId);
            await loadStatus(guildId);
        }

        if (process.env.API_SECRET) {
            setupAPI(client);
            const port = parseInt(process.env.API_PORT) || 3001;
            await startAPI(port);
        }

        client.user.setPresence({
            activities: [{ name: currentStatus[0].name, type: currentStatus[0].type }],
            status: 'online'
        });

        startStatusRotation(client);

        await registerCommands(client);
        startAutoCloseChecker(client);
        startAttendantsSync(client);
        
        printReady(client.user.tag, client.guilds.cache.size);
    }
};
