const { Schema, model } = require('mongoose');

const logSchema = new Schema({
    guildId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    ticketId: { type: Number, required: true },
    channelId: { type: String },
    userId: { type: String, required: true },
    staffId: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
    details: { type: Schema.Types.Mixed }
});

logSchema.index({ guildId: 1, timestamp: -1 });

module.exports = model('Log', logSchema);
