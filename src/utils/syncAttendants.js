const fs = require('fs');
const path = require('path');
const db = require('../database');

const ATTENDANTS_PATH = path.join(__dirname, '..', '..', 'data', 'attendants.json');

async function syncAttendants(client) {
    try {
        const staffRoleIds = new Set();
        
        const guild = client.guilds.cache.first();
        if (!guild) return;
        
        db.setGuildId(guild.id);
        
        const settingsData = await db.settings.get(guild.id);
        if (settingsData?.roles?.staff) {
            staffRoleIds.add(settingsData.roles.staff);
        }
        
        const panelsData = await db.panels.getAll(guild.id);
        for (const panel of panelsData) {
            if (panel.roles?.staff) staffRoleIds.add(panel.roles.staff);
        }

        if (staffRoleIds.size === 0) return;

        const attendants = [];

        for (const [, g] of client.guilds.cache) {
            const members = await g.members.fetch().catch(() => null);
            if (!members) continue;

            for (const [, member] of members) {
                const hasStaffRole = [...staffRoleIds].some(roleId => member.roles.cache.has(roleId));
                
                if (hasStaffRole && !member.user.bot) {
                    const existing = attendants.find(a => a.odiscordId === member.id);
                    if (!existing) {
                        attendants.push({
                            odiscordId: member.id,
                            name: member.user.displayName,
                            odiscordTag: member.user.tag,
                            avatar: member.user.displayAvatarURL({ size: 128 }),
                            status: member.presence?.status || 'offline',
                            role: 'Atendente'
                        });
                    }
                }
            }
        }

        const openTickets = await db.tickets.getOpen(guild.id);
        const closedTickets = await db.tickets.getClosed(guild.id);
        const allTickets = [...openTickets, ...closedTickets];

        for (const attendant of attendants) {
            const claimed = openTickets.filter(t => t.claimedBy === attendant.odiscordId);
            const closedByAttendant = allTickets.filter(t => t.closedBy === attendant.odiscordId);
            
            attendant.ticketsOpen = claimed.filter(t => t.status === 'open').length;
            attendant.ticketsClosed = closedByAttendant.length;
            attendant.totalTickets = attendant.ticketsOpen + attendant.ticketsClosed;
        }

        const dataDir = path.dirname(ATTENDANTS_PATH);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        fs.writeFileSync(ATTENDANTS_PATH, JSON.stringify({ attendants, lastSync: Date.now() }, null, 2));
    } catch (error) {
        console.error('[Sync] Erro ao sincronizar atendentes:', error.message);
    }
}

function startAttendantsSync(client) {
    setInterval(() => syncAttendants(client), 30000);
    setTimeout(() => syncAttendants(client), 5000);
}

module.exports = { syncAttendants, startAttendantsSync };
