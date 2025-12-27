const { Schema, model } = require('mongoose');

const ticketSchema = new Schema({
    guildId: { type: String, required: true, index: true },
    ticketId: { type: Number, required: true },
    channelId: { type: String, required: true },
    userId: { type: String, required: true },
    panelId: { type: String, required: true },
    optionIndex: { type: Number, default: 0 },
    optionName: { type: String },
    panelName: { type: String },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    mode: { type: String, enum: ['channel', 'thread'], default: 'channel' },
    claimedBy: { type: String, default: null },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    rating: { type: Number, min: 1, max: 5 },
    addedUsers: [{ type: String }],
    voiceChannelId: { type: String },
    createdAt: { type: Date, default: Date.now },
    closedAt: { type: Date },
    closedBy: { type: String },
    lastActivity: { type: Date, default: Date.now },
    channelName: { type: String }
});

ticketSchema.index({ guildId: 1, ticketId: 1 }, { unique: true });
ticketSchema.index({ guildId: 1, channelId: 1 });
ticketSchema.index({ guildId: 1, status: 1 });

module.exports = model('Ticket', ticketSchema);
