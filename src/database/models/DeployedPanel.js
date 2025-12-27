const { Schema, model } = require('mongoose');

const deployedPanelSchema = new Schema({
    guildId: { type: String, required: true, index: true },
    panelId: { type: String, required: true },
    messageId: { type: String, required: true },
    channelId: { type: String, required: true },
    deployedAt: { type: Date, default: Date.now }
});

deployedPanelSchema.index({ guildId: 1, panelId: 1 });

module.exports = model('DeployedPanel', deployedPanelSchema);
