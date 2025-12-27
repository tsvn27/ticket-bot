const { Schema, model } = require('mongoose');

const panelSchema = new Schema({
    guildId: { type: String, required: true, index: true },
    panelId: { type: String, required: true },
    name: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    mode: { type: String, enum: ['channel', 'thread'], default: 'channel' },
    options: [{
        name: { type: String },
        description: { type: String },
        createdAt: { type: Date },
        updatedAt: { type: Date }
    }],
    categoryId: { type: String, default: null },
    channelId: { type: String, default: null },
    roles: {
        staff: { type: String, default: null },
        admin: { type: String, default: null }
    },
    schedule: {
        enabled: { type: Boolean, default: false },
        open: { type: String, default: '09:00' },
        close: { type: String, default: '18:00' },
        closedDays: [{ type: Number }],
        closedMessage: { type: String }
    },
    messages: { type: Schema.Types.Mixed, default: {} },
    preferences: { type: Schema.Types.Mixed, default: {} },
    ai: {
        enabled: { type: Boolean, default: false },
        useContext: { type: Boolean, default: false },
        instructions: { type: String }
    },
    deployedMessageId: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

panelSchema.index({ guildId: 1, panelId: 1 }, { unique: true });

module.exports = model('Panel', panelSchema);
