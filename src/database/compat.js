const { connectDB, disconnectDB, isDBConnected, setGuildId, getGuildId } = require('./connection');
const { Ticket, Panel, Settings, Attendant, Log, DeployedPanel, Transcript } = require('./models');

const cache = {
    panels: {},
    settings: {},
    tickets: {}
};

function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
        if (!current[key]) current[key] = {};
        return current[key];
    }, obj);
    target[lastKey] = value;
}

function deleteNestedValue(obj, path) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => current?.[key], obj);
    if (target) delete target[lastKey];
}

const tickets = {
    get(path) {
        const guildId = getGuildId();
        if (!guildId) return undefined;
        if (!cache.tickets[guildId]) cache.tickets[guildId] = {};
        return getNestedValue(cache.tickets[guildId], path);
    },

    set(path, value) {
        const guildId = getGuildId();
        if (!guildId) {
            console.error('[DB] set() chamado sem guildId definido');
            return;
        }
        if (!cache.tickets[guildId]) cache.tickets[guildId] = {};
        setNestedValue(cache.tickets[guildId], path, value);
        this._persist(guildId, path, value).catch(err => {
            console.error('[DB] Erro ao persistir:', err.message);
        });
    },

    delete(path) {
        const guildId = getGuildId();
        if (!guildId) return;
        if (!cache.tickets[guildId]) return;
        deleteNestedValue(cache.tickets[guildId], path);
        this._persistDelete(guildId, path);
    },

    async _persist(guildId, path, value) {
        try {
            if (path.startsWith('ticketPanels.')) {
                const panelPath = path.replace('ticketPanels.', '');
                const parts = panelPath.split('.');
                const panelId = parts[0];
                if (parts.length === 1) {
                    await Panel.findOneAndUpdate(
                        { guildId, panelId },
                        { ...value, guildId, panelId, updatedAt: new Date() },
                        { upsert: true, new: true }
                    );
                } else {
                    const updatePath = parts.slice(1).join('.');
                    await Panel.findOneAndUpdate(
                        { guildId, panelId },
                        { $set: { [updatePath]: value, updatedAt: new Date() } },
                        { upsert: true }
                    );
                }
            } else if (path.startsWith('open.')) {
                const ticketPath = path.replace('open.', '');
                const parts = ticketPath.split('.');
                const channelId = parts[0];
                if (parts.length === 1) {
                    await Ticket.findOneAndUpdate(
                        { guildId, channelId },
                        { ...value, guildId, channelId, lastActivity: new Date() },
                        { upsert: true, new: true }
                    );
                } else {
                    const updatePath = parts.slice(1).join('.');
                    await Ticket.findOneAndUpdate(
                        { guildId, channelId },
                        { $set: { [updatePath]: value, lastActivity: new Date() } },
                        { upsert: true }
                    );
                }
            } else if (path === 'ticketPanels') {
                for (const [panelId, panelData] of Object.entries(value)) {
                    await Panel.findOneAndUpdate(
                        { guildId, panelId },
                        { ...panelData, guildId, panelId, updatedAt: new Date() },
                        { upsert: true }
                    );
                }
            }
        } catch (error) {
            console.error('[DB Compat] Erro ao persistir:', error.message);
        }
    },

    async _persistDelete(guildId, path) {
        try {
            if (path.startsWith('ticketPanels.')) {
                const panelId = path.replace('ticketPanels.', '').split('.')[0];
                await Panel.findOneAndDelete({ guildId, panelId });
            } else if (path.startsWith('open.')) {
                const channelId = path.replace('open.', '').split('.')[0];
                await Ticket.findOneAndDelete({ guildId, channelId });
            }
        } catch (error) {
            console.error('[DB Compat] Erro ao deletar:', error.message);
        }
    },

    async getAll(guildId) {
        const gid = guildId || getGuildId();
        return await Ticket.find({ guildId: gid }).lean();
    },

    async getOpen(guildId) {
        const gid = guildId || getGuildId();
        return await Ticket.find({ guildId: gid, status: 'open' }).lean();
    },

    async getClosed(guildId) {
        const gid = guildId || getGuildId();
        return await Ticket.find({ guildId: gid, status: 'closed' }).lean();
    },

    async getById(ticketId, guildId) {
        const gid = guildId || getGuildId();
        return await Ticket.findOne({ guildId: gid, ticketId }).lean();
    },

    async getByChannelId(channelId, guildId) {
        const gid = guildId || getGuildId();
        return await Ticket.findOne({ guildId: gid, channelId }).lean();
    },

    async create(data, guildId) {
        const gid = guildId || getGuildId();
        const ticket = new Ticket({ ...data, guildId: gid });
        return await ticket.save();
    },

    async update(ticketId, data, guildId) {
        const gid = guildId || getGuildId();
        return await Ticket.findOneAndUpdate(
            { guildId: gid, ticketId },
            { ...data, lastActivity: new Date() },
            { new: true }
        ).lean();
    },

    async updateByChannelId(channelId, data, guildId) {
        const gid = guildId || getGuildId();
        return await Ticket.findOneAndUpdate(
            { guildId: gid, channelId },
            { ...data, lastActivity: new Date() },
            { new: true }
        ).lean();
    },

    async getNextId(guildId) {
        const gid = guildId || getGuildId();
        const lastTicket = await Ticket.findOne({ guildId: gid }).sort({ ticketId: -1 }).lean();
        return lastTicket ? lastTicket.ticketId + 1 : 1;
    },

    async getStats(guildId) {
        const gid = guildId || getGuildId();
        const [total, opened, closed] = await Promise.all([
            Ticket.countDocuments({ guildId: gid }),
            Ticket.countDocuments({ guildId: gid, status: 'open' }),
            Ticket.countDocuments({ guildId: gid, status: 'closed' })
        ]);
        return { total, opened, closed };
    }
};

const panels = {
    async getAll(guildId) {
        const gid = guildId || getGuildId();
        return await Panel.find({ guildId: gid }).lean();
    },

    async getById(panelId, guildId) {
        const gid = guildId || getGuildId();
        return await Panel.findOne({ guildId: gid, panelId }).lean();
    },

    async create(data, guildId) {
        const gid = guildId || getGuildId();
        const panel = new Panel({ ...data, guildId: gid });
        return await panel.save();
    },

    async update(panelId, data, guildId) {
        const gid = guildId || getGuildId();
        return await Panel.findOneAndUpdate(
            { guildId: gid, panelId },
            { ...data, updatedAt: new Date() },
            { new: true, upsert: true }
        ).lean();
    },

    async delete(panelId, guildId) {
        const gid = guildId || getGuildId();
        return await Panel.findOneAndDelete({ guildId: gid, panelId });
    },

    async getAllAsObject(guildId) {
        const gid = guildId || getGuildId();
        const panelsList = await Panel.find({ guildId: gid }).lean();
        const obj = {};
        for (const panel of panelsList) {
            obj[panel.panelId] = panel;
        }
        return obj;
    }
};

const settings = {
    get(pathOrGuildId) {
        const guildId = getGuildId();
        if (typeof pathOrGuildId === 'string' && pathOrGuildId.includes('.')) {
            if (!guildId || !cache.settings[guildId]) return undefined;
            return getNestedValue(cache.settings[guildId], pathOrGuildId);
        }
        const gid = pathOrGuildId || guildId;
        if (!gid) return undefined;
        return cache.settings[gid] || undefined;
    },

    set(path, value) {
        const guildId = getGuildId();
        if (!guildId) return;
        if (!cache.settings[guildId]) cache.settings[guildId] = {};
        setNestedValue(cache.settings[guildId], path, value);
        this._persist(guildId, path, value);
    },

    async _persist(guildId, path, value) {
        try {
            await Settings.findOneAndUpdate(
                { guildId },
                { $set: { [path]: value, updatedAt: new Date() } },
                { upsert: true }
            );
        } catch (error) {
            console.error('[DB Compat] Erro ao persistir settings:', error.message);
        }
    },

    async fetch(guildId) {
        const gid = guildId || getGuildId();
        let doc = await Settings.findOne({ guildId: gid }).lean();
        if (!doc) {
            doc = await this.create({}, gid);
        }
        cache.settings[gid] = doc;
        return doc;
    },

    async create(data, guildId) {
        const gid = guildId || getGuildId();
        const setting = new Settings({ ...data, guildId: gid });
        const saved = await setting.save();
        cache.settings[gid] = saved.toObject();
        return saved;
    },

    async update(data, guildId) {
        const gid = guildId || getGuildId();
        const updated = await Settings.findOneAndUpdate(
            { guildId: gid },
            { $set: { ...data, updatedAt: new Date() } },
            { new: true, upsert: true }
        ).lean();
        cache.settings[gid] = updated;
        return updated;
    }
};

const deployedPanels = {
    async getAll(guildId) {
        const gid = guildId || getGuildId();
        return await DeployedPanel.find({ guildId: gid }).lean();
    },

    async create(data, guildId) {
        const gid = guildId || getGuildId();
        const deployed = new DeployedPanel({ ...data, guildId: gid });
        return await deployed.save();
    },

    async deleteByMessageId(messageId, guildId) {
        const gid = guildId || getGuildId();
        return await DeployedPanel.findOneAndDelete({ guildId: gid, messageId });
    },

    async deleteByPanelId(panelId, guildId) {
        const gid = guildId || getGuildId();
        return await DeployedPanel.deleteMany({ guildId: gid, panelId });
    }
};

const attendants = {
    async getAll(guildId) {
        const gid = guildId || getGuildId();
        return await Attendant.find({ guildId: gid }).lean();
    },

    async upsert(odiscordId, data, guildId) {
        const gid = guildId || getGuildId();
        return await Attendant.findOneAndUpdate(
            { guildId: gid, odiscordId },
            { ...data, odiscordId, updatedAt: new Date() },
            { new: true, upsert: true }
        ).lean();
    },

    async bulkUpsert(attendantsList, guildId) {
        const gid = guildId || getGuildId();
        const operations = attendantsList.map(att => ({
            updateOne: {
                filter: { guildId: gid, odiscordId: att.odiscordId },
                update: { $set: { ...att, guildId: gid, updatedAt: new Date() } },
                upsert: true
            }
        }));
        if (operations.length > 0) {
            await Attendant.bulkWrite(operations);
        }
        return await this.getAll(gid);
    }
};

const logs = {
    async add(data, guildId) {
        const gid = guildId || getGuildId();
        const log = new Log({ ...data, guildId: gid, timestamp: new Date() });
        return await log.save();
    },

    async getAll(guildId, limit = 500) {
        const gid = guildId || getGuildId();
        return await Log.find({ guildId: gid })
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();
    }
};

async function loadCache(guildId) {
    try {
        cache.tickets[guildId] = cache.tickets[guildId] || {};
        cache.tickets[guildId].ticketPanels = {};
        cache.tickets[guildId].open = {};
        cache.settings[guildId] = {};

        const panelsList = await Panel.find({ guildId }).lean();
        for (const panel of panelsList) {
            cache.tickets[guildId].ticketPanels[panel.panelId] = panel;
        }

        let settingsDoc = await Settings.findOne({ guildId }).lean();
        if (!settingsDoc) {
            const newSettings = new Settings({ guildId, channels: {}, roles: {} });
            settingsDoc = await newSettings.save();
            settingsDoc = settingsDoc.toObject();
        }
        cache.settings[guildId] = settingsDoc;

        const openTickets = await Ticket.find({ guildId, status: 'open' }).lean();
        for (const ticket of openTickets) {
            cache.tickets[guildId].open[ticket.channelId] = ticket;
        }

        console.log(`[DB] Cache carregado para guild ${guildId} (${panelsList.length} painéis, ${openTickets.length} tickets)`);
    } catch (error) {
        console.error('[DB] Erro ao carregar cache:', error.message);
    }
}

const transcripts = {
    async save(data, guildId) {
        const gid = guildId || getGuildId();
        return await Transcript.findOneAndUpdate(
            { channelId: data.channelId, guildId: gid },
            { ...data, guildId: gid },
            { upsert: true, new: true }
        ).lean();
    },

    async get(channelId, guildId) {
        const gid = guildId || getGuildId();
        return await Transcript.findOne({ channelId, guildId: gid }).lean();
    },

    async getByTicketId(ticketId, guildId) {
        const gid = guildId || getGuildId();
        return await Transcript.findOne({ ticketId, guildId: gid }).lean();
    }
};

module.exports = {
    connectDB,
    disconnectDB,
    isDBConnected,
    setGuildId,
    getGuildId,
    loadCache,
    tickets,
    panels,
    deployedPanels,
    settings,
    attendants,
    logs,
    transcripts,
    models: { Ticket, Panel, Settings, Attendant, Log, DeployedPanel, Transcript }
};
