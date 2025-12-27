const fastify = require('fastify')({ logger: false });
const websocket = require('@fastify/websocket');

let discordClient = null;
const wsClients = new Set();

function broadcast(event, data) {
    const message = JSON.stringify({ event, data, timestamp: Date.now() });
    for (const client of wsClients) {
        if (client.readyState === 1) {
            client.send(message);
        }
    }
}

function notifyChange(collection, action, data) {
    broadcast('db_change', { collection, action, data });
}

async function setupAPI(client) {
    discordClient = client;

    await fastify.register(websocket);

    fastify.addHook('preHandler', async (request, reply) => {
        if (request.url === '/health' || request.url === '/ws') return;

        const apiSecret = request.headers['x-api-secret'];
        if (!apiSecret || apiSecret !== process.env.API_SECRET) {
            return reply.code(401).send({ error: 'Unauthorized' });
        }
    });

    fastify.get('/ws', { websocket: true }, (socket, req) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const secret = url.searchParams.get('secret');
        
        if (secret !== process.env.API_SECRET) {
            socket.close(4001, 'Unauthorized');
            return;
        }

        wsClients.add(socket);
        console.log(`[WS] Cliente conectado (${wsClients.size} total)`);

        socket.send(JSON.stringify({
            event: 'connected',
            data: {
                bot: discordClient?.user?.tag || 'offline',
                guilds: discordClient?.guilds?.cache?.size || 0
            },
            timestamp: Date.now()
        }));

        socket.on('message', (message) => {
            try {
                const { event, data } = JSON.parse(message.toString());
                handleWSMessage(socket, event, data);
            } catch (e) {}
        });

        socket.on('close', () => {
            wsClients.delete(socket);
            console.log(`[WS] Cliente desconectado (${wsClients.size} total)`);
        });
    });

    fastify.get('/health', async () => ({ 
        status: 'ok', 
        timestamp: Date.now(),
        bot: discordClient?.user?.tag || 'offline',
        wsClients: wsClients.size
    }));

    fastify.get('/status', async () => ({
        online: discordClient?.isReady() || false,
        guilds: discordClient?.guilds?.cache?.size || 0,
        uptime: discordClient?.uptime || 0,
        wsClients: wsClients.size
    }));

    fastify.post('/deploy/:panelId', async (request, reply) => {
        const { panelId } = request.params;
        const { guildId, channelId } = request.body || {};

        if (!guildId || !channelId) {
            return reply.code(400).send({ error: 'guildId and channelId required' });
        }

        try {
            const { deployPanel } = require('../modules/tickets/deploy');
            const result = await deployPanel(discordClient, guildId, panelId, channelId);
            if (result.success) {
                notifyChange('panels', 'deployed', { panelId, ...result });
            }
            return result;
        } catch (error) {
            console.error('[API] Deploy error:', error);
            return reply.code(500).send({ error: error.message });
        }
    });

    fastify.get('/tickets', async (request) => {
        const { status, limit = 100 } = request.query;
        const guildId = process.env.GUILD_ID;
        const db = require('../database');
        
        let tickets;
        if (status === 'open') {
            tickets = await db.tickets.getOpen(guildId);
        } else if (status === 'closed') {
            tickets = await db.tickets.getClosed(guildId);
        } else {
            tickets = await db.tickets.getAll(guildId);
        }
        
        const stats = await db.tickets.getStats(guildId);
        return { tickets: tickets.slice(0, parseInt(limit)), ...stats };
    });

    fastify.get('/panels', async () => {
        const guildId = process.env.GUILD_ID;
        const db = require('../database');
        const panels = await db.panels.getAll(guildId);
        const tickets = await db.tickets.getAll(guildId);
        
        return {
            panels: panels.map(p => ({
                id: p.panelId,
                ...p,
                total: tickets.filter(t => t.panelId === p.panelId).length,
                open: tickets.filter(t => t.panelId === p.panelId && t.status === 'open').length
            }))
        };
    });

    fastify.get('/panels/:id', async (request, reply) => {
        const { id } = request.params;
        const guildId = process.env.GUILD_ID;
        const db = require('../database');
        const panel = await db.panels.getById(id, guildId);
        if (!panel) return reply.code(404).send({ error: 'Painel não encontrado' });
        return { id: panel.panelId, ...panel };
    });

    fastify.put('/panels/:id', async (request, reply) => {
        const { id } = request.params;
        const guildId = process.env.GUILD_ID;
        const db = require('../database');
        const panel = await db.panels.update(id, request.body, guildId);
        if (!panel) return reply.code(404).send({ error: 'Painel não encontrado' });
        notifyChange('panels', 'updated', { panelId: id, ...panel });
        return { id: panel.panelId, ...panel };
    });

    fastify.post('/panels', async (request) => {
        const { name } = request.body;
        const guildId = process.env.GUILD_ID;
        const db = require('../database');
        const panelId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        
        const panel = await db.panels.create({
            panelId,
            name,
            enabled: true,
            mode: 'channel',
            options: [],
            categoryId: null,
            channelId: null,
            roles: { staff: null, admin: null },
            schedule: { enabled: false, open: '09:00', close: '18:00' },
            messages: {},
            preferences: {}
        }, guildId);
        
        notifyChange('panels', 'created', { panelId, ...panel });
        return { id: panelId, ...panel };
    });

    fastify.delete('/panels/:id', async (request, reply) => {
        const { id } = request.params;
        const guildId = process.env.GUILD_ID;
        const db = require('../database');
        await db.panels.delete(id, guildId);
        notifyChange('panels', 'deleted', { panelId: id });
        return { success: true };
    });

    fastify.get('/stats', async () => {
        const guildId = process.env.GUILD_ID;
        const db = require('../database');
        
        const stats = await db.tickets.getStats(guildId);
        const panels = await db.panels.getAll(guildId);
        const tickets = await db.tickets.getAll(guildId);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const closedToday = tickets.filter(t => 
            t.status === 'closed' && 
            t.closedAt && 
            new Date(t.closedAt) >= today
        ).length;
        
        const withRating = tickets.filter(t => t.rating);
        const avgRating = withRating.length > 0
            ? (withRating.reduce((a, t) => a + t.rating, 0) / withRating.length).toFixed(1)
            : '4.7';
        
        return {
            totalTickets: stats.total,
            openTickets: stats.opened,
            closedToday,
            avgRating,
            panelsCount: panels.length
        };
    });

    fastify.get('/attendants', async () => {
        const guildId = process.env.GUILD_ID;
        const db = require('../database');
        
        const panels = await db.panels.getAll(guildId);
        const settings = await db.settings.fetch(guildId);
        
        const staffRoleIds = new Set();
        panels.forEach(p => {
            if (p.roles?.staff) staffRoleIds.add(p.roles.staff);
        });
        if (settings?.roles?.staff) staffRoleIds.add(settings.roles.staff);
        
        if (staffRoleIds.size === 0 || !discordClient) {
            return { attendants: [], lastSync: Date.now() };
        }
        
        try {
            const guild = discordClient.guilds.cache.get(guildId);
            if (!guild) {
                return { attendants: [], lastSync: Date.now() };
            }
            
            const attendantsMap = new Map();
            
            for (const roleId of staffRoleIds) {
                const role = guild.roles.cache.get(roleId);
                if (!role) continue;
                
                role.members.forEach(member => {
                    if (!attendantsMap.has(member.id)) {
                        attendantsMap.set(member.id, member);
                    }
                });
            }
            
            const tickets = await db.tickets.getAll(guildId);
            
            const attendants = Array.from(attendantsMap.values()).map(member => {
                const userTickets = tickets.filter(t => t.claimedBy === member.id);
                const closedTickets = userTickets.filter(t => t.status === 'closed' || t.status === 'deleted');
                const openTickets = userTickets.filter(t => t.status === 'open');
                
                return {
                    odiscordId: member.id,
                    name: member.displayName,
                    odiscordTag: member.user.tag,
                    avatar: member.user.displayAvatarURL({ size: 128 }),
                    status: member.presence?.status || 'offline',
                    role: 'staff',
                    ticketsClosed: closedTickets.length,
                    ticketsOpen: openTickets.length,
                    totalTickets: userTickets.length
                };
            });
            
            return { attendants, lastSync: Date.now() };
        } catch (error) {
            console.error('[API] Attendants error:', error);
            return { attendants: [], lastSync: Date.now() };
        }
    });

    fastify.get('/logs', async (request) => {
        const { limit = 50, type } = request.query;
        const guildId = process.env.GUILD_ID;
        const db = require('../database');
        let logs = await db.logs.getAll(guildId, parseInt(limit));
        if (type && type !== 'all') {
            logs = logs.filter(l => l.type === type);
        }
        return { logs };
    });

    fastify.get('/settings', async () => {
        const guildId = process.env.GUILD_ID;
        const db = require('../database');
        const settings = await db.settings.get(guildId);
        return {
            dmNotifications: settings.dmNotifications !== false,
            ratingSystem: settings.ratingSystem !== false,
            transcripts: settings.transcripts !== false,
            autoClose: settings.autoClose || false,
            inactivityTime: settings.inactivityTime || 24,
            maxTicketsPerUser: settings.maxTicketsPerUser || 2,
            logsChannelId: settings.logsChannel || null,
            staffRoleId: settings.staffRole || null,
            adminRoleId: settings.adminRole || null
        };
    });

    fastify.put('/settings', async (request) => {
        const guildId = process.env.GUILD_ID;
        const db = require('../database');
        const body = request.body;
        
        const settings = await db.settings.update({
            dmNotifications: body.dmNotifications,
            ratingSystem: body.ratingSystem,
            transcripts: body.transcripts,
            autoClose: body.autoClose,
            inactivityTime: body.inactivityTime,
            maxTicketsPerUser: body.maxTicketsPerUser,
            logsChannel: body.logsChannelId,
            staffRole: body.staffRoleId,
            adminRole: body.adminRoleId
        }, guildId);
        
        notifyChange('settings', 'updated', settings);
        return settings;
    });

    fastify.get('/tickets/:id/transcript', async (request, reply) => {
        const { id } = request.params;
        const guildId = process.env.GUILD_ID;
        const db = require('../database');

        try {
            const savedTranscript = await db.transcripts.get(id, guildId);
            if (savedTranscript && savedTranscript.messages?.length > 0) {
                return { 
                    messages: savedTranscript.messages,
                    messageCount: savedTranscript.messageCount,
                    savedAt: savedTranscript.savedAt,
                    closedBy: savedTranscript.closedBy
                };
            }

            if (!discordClient) {
                return { messages: [], error: 'Transcript não encontrado' };
            }

            try {
                const guild = await discordClient.guilds.fetch(guildId);
                const channel = await guild.channels.fetch(id);
                
                if (!channel || !channel.isTextBased()) {
                    return { messages: [], error: 'Transcript não disponível' };
                }

                const fetchedMessages = await channel.messages.fetch({ limit: 100 });
                const messages = Array.from(fetchedMessages.values())
                    .reverse()
                    .map(msg => ({
                        id: msg.id,
                        author: {
                            id: msg.author.id,
                            username: msg.author.username,
                            displayName: msg.member?.displayName || msg.author.globalName || msg.author.username,
                            avatar: msg.author.displayAvatarURL({ size: 128 }),
                            bot: msg.author.bot
                        },
                        content: msg.content,
                        timestamp: msg.createdAt.toISOString(),
                        attachments: Array.from(msg.attachments.values()).map(att => ({
                            name: att.name,
                            url: att.url,
                            contentType: att.contentType
                        })),
                        embeds: msg.embeds.map(embed => ({
                            title: embed.title,
                            description: embed.description,
                            color: embed.color
                        }))
                    }));

                return { messages };
            } catch {
                return { messages: [], error: 'Transcript não disponível' };
            }
        } catch (error) {
            console.error('[API] Transcript error:', error);
            return { messages: [], error: 'Erro ao buscar transcript' };
        }
    });

    return fastify;
}

function handleWSMessage(socket, event, data) {
    switch (event) {
        case 'ping':
            socket.send(JSON.stringify({ event: 'pong', timestamp: Date.now() }));
            break;
        case 'subscribe':
            break;
    }
}

async function startAPI(port = 3001) {
    try {
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`✅ API + WebSocket rodando na porta ${port}`);
        return true;
    } catch (error) {
        console.error('❌ Erro ao iniciar API:', error.message);
        return false;
    }
}

async function stopAPI() {
    await fastify.close();
}

module.exports = { setupAPI, startAPI, stopAPI, fastify, broadcast, notifyChange };
