const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { colors, settings } = require('../config');
const db = require('../database');

const INACTIVITY_WARNING_MS = (settings.inactivityWarningHours || 24) * 60 * 60 * 1000;
const AUTO_CLOSE_MS = (settings.autoCloseHours || 48) * 60 * 60 * 1000;

async function checkInactiveTickets(client) {
    const guild = client.guilds.cache.first();
    if (!guild) return;
    
    const guildId = guild.id;
    db.setGuildId(guildId);
    
    const openTickets = await db.tickets.getOpen(guildId);
    const now = Date.now();

    for (const ticket of openTickets) {
        if (ticket.status !== 'open') continue;

        const panel = await db.panels.getById(ticket.panelId, guildId);
        if (panel?.preferences?.autoCloseInactive === false) continue;

        const lastActivity = new Date(ticket.lastActivity || ticket.createdAt).getTime();
        const inactiveTime = now - lastActivity;

        try {
            const channel = await client.channels.fetch(ticket.channelId).catch(() => null);
            if (!channel) {
                await db.tickets.delete(ticket.ticketId, guildId);
                continue;
            }

            if (inactiveTime >= AUTO_CLOSE_MS) {
                await autoCloseTicket(channel, ticket, guildId);
                continue;
            }

            if (inactiveTime >= INACTIVITY_WARNING_MS && !ticket.inactivityWarned) {
                await sendInactivityWarning(channel, ticket);
                await db.tickets.update(ticket.ticketId, { inactivityWarned: true }, guildId);
            }

        } catch (error) {
            console.error(`[AutoClose] Erro no ticket ${ticket.channelId}:`, error.message);
        }
    }
}

async function sendInactivityWarning(channel, ticket) {
    const hoursLeft = Math.round((AUTO_CLOSE_MS - INACTIVITY_WARNING_MS) / (60 * 60 * 1000));

    const container = new ContainerBuilder()
        .setAccentColor(colors.primary)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`<@${ticket.userId}>`),
            new TextDisplayBuilder().setContent(`### Ticket inativo`),
            new TextDisplayBuilder().setContent(`-# Será fechado em ${hoursLeft}h sem atividade`)
        );

    await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
}

async function autoCloseTicket(channel, ticket, guildId) {
    await db.tickets.update(ticket.ticketId, {
        status: 'closed',
        closedAt: new Date(),
        closedBy: 'auto'
    }, guildId);

    await channel.setName(`closed-${ticket.ticketId}`).catch(() => {});
    await channel.permissionOverwrites.edit(ticket.userId, { SendMessages: false }).catch(() => {});

    const container = new ContainerBuilder()
        .setAccentColor(colors.primary)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Ticket fechado`),
            new TextDisplayBuilder().setContent(`-# Fechado automaticamente por inatividade`)
        );

    await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
}

function startAutoCloseChecker(client) {
    setInterval(() => checkInactiveTickets(client), 30 * 60 * 1000);
    setTimeout(() => checkInactiveTickets(client), 10000);
}

module.exports = { startAutoCloseChecker, checkInactiveTickets };
