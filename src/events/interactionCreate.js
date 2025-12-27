const { handleTicketButton, handleTicketSelect, handleTicketModal } = require('../modules/tickets/handlers');
const { handlePanelButton, handlePanelSelect, handlePanelModal } = require('../modules/panel/handlers');
const botconfig = require('../commands/botconfig');
const { setGuildId } = require('../database');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        try {
            if (interaction.guildId) {
                setGuildId(interaction.guildId);
            }

            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (!command) return;

                try {
                    await command.execute(interaction, client);
                } catch (error) {
                    console.error(`[Command] Error in ${interaction.commandName}:`, error.message);
                    const reply = { content: 'Ocorreu um erro.', ephemeral: true };
                    
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(reply).catch(() => {});
                    } else {
                        await interaction.reply(reply).catch(() => {});
                    }
                }
                return;
            }

            if (interaction.isButton()) {
                const customId = interaction.customId;
                
                if (customId.startsWith('botconfig_')) {
                    return botconfig.handleButton(interaction, client);
                }
                
                if (customId.startsWith('ticket_') || customId.startsWith('open_ticket_') || customId.startsWith('rating_') || customId.startsWith('quick_')) {
                    return handleTicketButton(interaction, client);
                }
                
                if (customId.startsWith('panel_') || customId === 'back_to_panel') {
                    return handlePanelButton(interaction, client);
                }
            }

            if (interaction.isAnySelectMenu()) {
                const customId = interaction.customId;
                
                if (customId.startsWith('ticket_')) {
                    return handleTicketSelect(interaction, client);
                }
                
                if (customId.startsWith('panel_')) {
                    return handlePanelSelect(interaction, client);
                }
            }

            if (interaction.isModalSubmit()) {
                const customId = interaction.customId;
                
                if (customId.startsWith('botconfig_modal_')) {
                    return botconfig.handleModal(interaction, client);
                }
                
                if (customId.startsWith('ticket_')) {
                    return handleTicketModal(interaction, client);
                }
                
                if (customId.startsWith('panel_')) {
                    return handlePanelModal(interaction, client);
                }
            }

        } catch (error) {
            console.error('[Interaction] Error:', error.message);
        }
    }
};
