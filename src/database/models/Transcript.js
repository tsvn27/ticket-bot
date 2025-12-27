const { Schema, model } = require('mongoose');

const transcriptSchema = new Schema({
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true },
    ticketId: { type: Number },
    userId: { type: String },
    closedBy: { type: String },
    messages: [{
        id: String,
        author: {
            id: String,
            username: String,
            displayName: String,
            avatar: String,
            bot: Boolean
        },
        content: String,
        timestamp: String,
        attachments: [{
            name: String,
            url: String,
            contentType: String
        }],
        embeds: [{
            title: String,
            description: String,
            color: Number
        }]
    }],
    messageCount: { type: Number, default: 0 },
    savedAt: { type: Date, default: Date.now }
});

transcriptSchema.index({ guildId: 1, channelId: 1 });
transcriptSchema.index({ guildId: 1, ticketId: 1 });

module.exports = model('Transcript', transcriptSchema);
