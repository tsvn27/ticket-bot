const { Schema, model } = require('mongoose');

const settingsSchema = new Schema({
    guildId: { type: String, required: true, unique: true, index: true },
    dmNotifications: { type: Boolean, default: true },
    ratingSystem: { type: Boolean, default: true },
    transcripts: { type: Boolean, default: true },
    autoClose: { type: Boolean, default: true },
    inactivityTime: { type: Number, default: 24 },
    maxTicketsPerUser: { type: Number, default: 2 },
    staffRole: { type: String, default: null },
    adminRole: { type: String, default: null },
    logsChannel: { type: String, default: null },
    channels: {
        logs: { type: String, default: null },
        transcripts: { type: String, default: null }
    },
    roles: {
        staff: { type: String, default: null },
        admin: { type: String, default: null }
    },
    preferences: { type: Schema.Types.Mixed, default: {} },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = model('Settings', settingsSchema);
