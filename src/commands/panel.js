const { SlashCommandBuilder } = require('discord.js');
const { showTicketManagerDirect } = require('../modules/panel/views');
const { isAdmin, hasPermission } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('painel')
        .setDescription('Abrir o painel de controle'),

    async execute(interaction, client) {
        if (!isAdmin(interaction.member) && !hasPermission(interaction.user.id)) {
            return interaction.reply({ content: 'Sem permissão', ephemeral: true });
        }

        await showTicketManagerDirect(interaction);
    }
};
