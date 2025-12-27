const fs = require('fs');
const path = require('path');
const { printLoaded, log } = require('../utils/logger');

function loadCommands(client) {
    const commandsPath = path.join(__dirname, '../commands');
    
    if (!fs.existsSync(commandsPath)) {
        fs.mkdirSync(commandsPath, { recursive: true });
        return;
    }

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    const loaded = [];

    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        
        if (!command.data || !command.execute) continue;

        client.commands.set(command.data.name, command);
        loaded.push(command.data.name);
    }

    printLoaded('Commands', loaded);
}

async function registerCommands(client) {
    const commands = client.commands.map(cmd => cmd.data.toJSON());
    const guilds = [];
    
    for (const [id, guild] of client.guilds.cache) {
        try {
            await guild.commands.set(commands);
            guilds.push(guild.name);
        } catch (error) {
            log.error(`Failed: ${guild.name}`);
        }
    }
}

module.exports = { loadCommands, registerCommands };
