const { Schema, model } = require('mongoose');

const attendantSchema = new Schema({
    guildId: { type: String, required: true, index: true },
    odiscordId: { type: String, required: true },
    name: { type: String },
    odiscordTag: { type: String },
    avatar: { type: String },
    status: { type: String, default: 'offline' },
    role: { type: String, default: 'staff' },
    ticketsClosed: { type: Number, default: 0 },
    ticketsOpen: { type: Number, default: 0 },
    totalTickets: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now }
});

attendantSchema.index({ guildId: 1, odiscordId: 1 }, { unique: true });

module.exports = model('Attendant', attendantSchema);
