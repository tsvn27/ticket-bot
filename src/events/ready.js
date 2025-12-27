const { ActivityType } = require('discord.js');
const { registerCommands } = require('../handlers/commandHandler');
const { startAutoCloseChecker } = require('../utils/autoclose');
const { startAttendantsSync } = require('../utils/syncAttendants');
const { printReady } = require('../utils/logger');
const { connectDB, setGuildId, loadCache } = require('../database');
const { setupAPI, startAPI } = require('../api/server');

module.exports = {
    name: 'clientReady',
    once: true,
    async execute(client) {
        await connectDB();
        
        const firstGuild = client.guilds.cache.first();
        if (firstGuild) {
            setGuildId(firstGuild.id);
            await loadCache(firstGuild.id);
        }

        if (process.env.API_SECRET) {
            setupAPI(client);
            const port = parseInt(process.env.API_PORT) || 3001;
            await startAPI(port);
        }

        client.user.setPresence({
            activities: [{ name: 'tickets', type: ActivityType.Watching }],
            status: 'online'
        });

        await registerCommands(client);
        startAutoCloseChecker(client);
        startAttendantsSync(client);
        
        printReady(client.user.tag, client.guilds.cache.size);
    }
};
