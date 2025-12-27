require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const { loadEvents } = require('./handlers/eventHandler');
const { loadCommands } = require('./handlers/commandHandler');
const { printBanner, printSection, log } = require('./utils/logger');

const token = process.env.DISCORD_TOKEN;

printBanner('Ticket Bot', '2.0.0');
printSection('Loading...');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();
client.cooldowns = new Collection();

loadEvents(client);
loadCommands(client);

process.on('unhandledRejection', () => {});
process.on('uncaughtException', () => {});

client.login(token).catch((err) => {
    log.error(`Login failed: ${err.message}`);
});

module.exports = client;
