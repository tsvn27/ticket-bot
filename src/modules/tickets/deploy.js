const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    MessageFlags
} = require('discord.js');
const { colors } = require('../../config');
const db = require('../../database');

function getDefaultPanelContent(panel) {
    return `# ${panel.name}\n\nSelecione uma opção abaixo para abrir um ticket.`;
}

async function deployPanel(client, guildId, panelId, channelId) {
    const panel = await db.panels.getById(panelId, guildId);
    if (!panel) {
        return { success: false, error: 'Painel não encontrado' };
    }

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) {
        return { success: false, error: 'Servidor não encontrado' };
    }

    const targetChannel = await guild.channels.fetch(channelId).catch(() => null);
    if (!targetChannel) {
        return { success: false, error: 'Canal não encontrado' };
    }

    const options = panel.options || [];
    if (options.length === 0) {
        return { success: false, error: 'Painel sem opções configuradas' };
    }

    const messages = panel.messages || {};
    const panelMsg = messages.panel || {};
    const panelStyle = panel.preferences?.panelStyle || 'buttons';
    const msgStyle = panelMsg.style || 'container';
    const content = panelMsg.content || getDefaultPanelContent(panel);

    try {
        let message;

        if (msgStyle === 'text') {
            const components = buildComponents(options, panelId, panelStyle);
            message = await targetChannel.send({ content, components });
        } else if (msgStyle === 'embed') {
            const embed = new EmbedBuilder()
                .setDescription(content)
                .setColor(parseInt((panelMsg.color || '#FFFFFF').replace('#', ''), 16));
            if (panelMsg.image) embed.setImage(panelMsg.image);
            if (panelMsg.thumbnail) embed.setThumbnail(panelMsg.thumbnail);
            const components = buildComponents(options, panelId, panelStyle);
            message = await targetChannel.send({ embeds: [embed], components });
        } else {
            const container = new ContainerBuilder()
                .setAccentColor(parseInt((panelMsg.color || '#FFFFFF').replace('#', ''), 16));
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
            container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
            addContainerComponents(container, options, panelId, panelStyle);
            message = await targetChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        await db.deployedPanels.create({
            panelId,
            messageId: message.id,
            channelId: targetChannel.id
        }, guildId);

        await db.panels.update(panelId, { deployedMessageId: message.id }, guildId);

        return { 
            success: true, 
            messageId: message.id, 
            channelId: targetChannel.id 
        };
    } catch (error) {
        console.error('[Deploy] Erro:', error);
        return { success: false, error: error.message };
    }
}

function buildComponents(options, panelId, panelStyle) {
    const components = [];
    if (panelStyle === 'select' || options.length > 5) {
        const selectOptions = options.map((opt, index) => ({
            label: opt.name,
            description: (opt.description || '').substring(0, 50) || 'Sem descrição',
            value: `${panelId}_${index}`
        }));
        components.push(new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('ticket_option_select')
                .setPlaceholder('Selecione uma opção')
                .addOptions(selectOptions)
        ));
    } else {
        for (let i = 0; i < options.length; i += 5) {
            const chunk = options.slice(i, i + 5);
            const row = new ActionRowBuilder();
            chunk.forEach((opt, index) => {
                const btn = new ButtonBuilder()
                    .setCustomId(`open_ticket_${panelId}_${i + index}`)
                    .setLabel(opt.name)
                    .setStyle(ButtonStyle.Secondary);
                row.addComponents(btn);
            });
            components.push(row);
        }
    }
    return components;
}

function addContainerComponents(container, options, panelId, panelStyle) {
    if (panelStyle === 'select' || options.length > 5) {
        const selectOptions = options.map((opt, index) => ({
            label: opt.name,
            description: (opt.description || '').substring(0, 50) || 'Sem descrição',
            value: `${panelId}_${index}`
        }));
        container.addActionRowComponents(row => row.addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('ticket_option_select')
                .setPlaceholder('Selecione uma opção')
                .addOptions(selectOptions)
        ));
    } else {
        for (let i = 0; i < options.length; i += 5) {
            const chunk = options.slice(i, i + 5);
            container.addActionRowComponents(row => {
                chunk.forEach((opt, index) => {
                    const btn = new ButtonBuilder()
                        .setCustomId(`open_ticket_${panelId}_${i + index}`)
                        .setLabel(opt.name)
                        .setStyle(ButtonStyle.Secondary);
                    row.addComponents(btn);
                });
                return row;
            });
        }
    }
}

async function deployTicketPanel(interaction, client, panelId) {
    const guildId = interaction.guild.id;
    const panel = await db.panels.getById(panelId, guildId);

    if (!panel) {
        return interaction.reply({ content: 'Painel não encontrado', ephemeral: true });
    }

    const missing = [];

    if (panel.mode === 'channel') {
        if (!panel.categoryId) {
            missing.push('**Categoria** - Defina a categoria onde os tickets serão criados');
        }
    } else {
        if (!panel.channelId) {
            missing.push('**Canal** - Defina o canal onde os tópicos serão criados');
        }
    }

    if (!panel.options || panel.options.length === 0) {
        missing.push('**Opções** - Adicione pelo menos uma opção de atendimento');
    }

    if (missing.length > 0) {
        const container = new ContainerBuilder()
            .setAccentColor(colors.primary)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`Para publicar o painel, você precisa configurar:`),
                new TextDisplayBuilder().setContent(missing.join('\n\n')),
                new TextDisplayBuilder().setContent(`\n-# Configure os itens acima e tente novamente.`)
            );

        return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
    }

    let targetChannel;

    if (panel.mode === 'channel') {
        if (panel.channelId) {
            targetChannel = await interaction.guild.channels.fetch(panel.channelId).catch(() => null);
        }
        if (!targetChannel) {
            targetChannel = interaction.channel;
        }
    } else {
        targetChannel = await interaction.guild.channels.fetch(panel.channelId).catch(() => null);
        if (!targetChannel) {
            return interaction.reply({ content: 'Canal não encontrado', ephemeral: true });
        }
    }

    const result = await deployPanel(client, guildId, panelId, targetChannel.id);

    if (!result.success) {
        return interaction.reply({ content: result.error, ephemeral: true });
    }

    const successContainer = new ContainerBuilder()
        .setAccentColor(colors.primary)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Painel enviado em ${targetChannel}!`));

    await interaction.reply({ components: [successContainer], flags: MessageFlags.IsComponentsV2, ephemeral: true });
}

module.exports = { deployTicketPanel, deployPanel };
