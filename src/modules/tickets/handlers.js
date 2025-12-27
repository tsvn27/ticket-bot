const { 
    ChannelType, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
    ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder,
    TextInputStyle, ActionRowBuilder, MessageFlags
} = require('discord.js');
const { colors, priorities, settings, quickResponses } = require('../../config');
const db = require('../../database');
const { isStaff } = require('../../utils/permissions');

const divider = () => new SeparatorBuilder().setDivider(true);

const getGuildId = (interaction) => interaction.guild?.id || interaction.guildId;

async function handleTicketButton(interaction, client) {
    const id = interaction.customId;
    db.setGuildId(getGuildId(interaction));
    try {
        if (id.startsWith('open_ticket_')) {
            const parts = id.replace('open_ticket_', '').split('_');
            return openTicket(interaction, client, parts[0], parseInt(parts[1]));
        }
        if (id.startsWith('quick_')) return sendQuickResponse(interaction, id.replace('quick_', ''));

        const handlers = {
            'ticket_close': () => showCloseConfirm(interaction),
            'ticket_close_confirm': () => closeTicket(interaction, client),
            'ticket_close_cancel': () => reply(interaction, 'Cancelado', true),
            'ticket_claim': () => claimTicket(interaction, client),
            'ticket_unclaim': () => unclaimTicket(interaction),
            'ticket_panel': () => showStaffPanel(interaction),
            'ticket_staff_panel': () => showStaffPanelFull(interaction, client),
            'ticket_user_panel': () => showUserPanel(interaction, client),
            'ticket_info': () => showTicketInfo(interaction),
            'ticket_transcript': () => generateTranscript(interaction),
            'ticket_delete_channel': () => deleteChannel(interaction),
            'ticket_add_user': () => showAddUserSelect(interaction, client),
            'ticket_remove_user': () => showRemoveUserSelect(interaction, client),
            'ticket_priority': () => showPrioritySelect(interaction),
            'ticket_notify': () => notifyUser(interaction, client),
            'ticket_notify_staff': () => notifyStaff(interaction, client),
            'ticket_reopen': () => reopenTicket(interaction),
            'ticket_quick': () => showQuickResponses(interaction),
            'ticket_rename': () => showRenameModal(interaction),
            'ticket_history': () => showUserHistorySelect(interaction, client),
            'ticket_call': () => createCall(interaction, client),
            'ticket_request_call': () => requestCall(interaction, client),
            'ticket_transfer': () => showTransferSelect(interaction, client),
            'rating_1': () => saveRating(interaction, 1),
            'rating_2': () => saveRating(interaction, 2),
            'rating_3': () => saveRating(interaction, 3),
            'rating_4': () => saveRating(interaction, 4),
            'rating_5': () => saveRating(interaction, 5)
        };
        if (handlers[id]) return handlers[id]();
    } catch (error) {
        console.error('[Ticket] Erro:', error);
        await reply(interaction, 'Erro ao processar', true);
    }
}


async function handleTicketSelect(interaction, client) {
    const id = interaction.customId;
    const value = interaction.values[0];
    db.setGuildId(getGuildId(interaction));
    try {
        if (id === 'ticket_option_select') {
            const [panelId, optionIndex] = value.split('_');
            return openTicket(interaction, client, panelId, parseInt(optionIndex));
        }
        if (id === 'ticket_staff_action') {
            const actions = { priority: showPrioritySelect, add_user: showAddUserModal, remove_user: () => showRemoveUserSelect(interaction, client), quick: showQuickResponses, notify: () => notifyUser(interaction, client), close: showCloseConfirm };
            if (actions[value]) return typeof actions[value] === 'function' ? actions[value](interaction) : actions[value]();
        }
        if (id === 'ticket_staff_action_select') {
            const staffActions = {
                close: () => showCloseConfirm(interaction),
                claim: () => claimTicket(interaction, client),
                notify: () => notifyUser(interaction, client),
                rename: () => showRenameModal(interaction),
                priority: () => showPrioritySelect(interaction),
                add_user: () => showAddUserSelect(interaction, client),
                remove_user: () => showRemoveUserSelect(interaction, client),
                transcript: () => generateTranscript(interaction),
                history: () => showUserHistorySelect(interaction, client),
                call: () => createCall(interaction, client),
                transfer: () => showTransferSelect(interaction, client)
            };
            if (staffActions[value]) return staffActions[value]();
        }
        if (id === 'ticket_user_action_select') {
            const userActions = {
                close: () => showCloseConfirm(interaction),
                notify_staff: () => notifyStaff(interaction, client),
                add_user: () => showAddUserSelect(interaction, client),
                remove_user: () => showRemoveUserSelect(interaction, client),
                request_call: () => requestCall(interaction, client),
                transcript: () => generateTranscript(interaction)
            };
            if (userActions[value]) return userActions[value]();
        }
        if (id === 'ticket_priority_select') return setPriority(interaction, value);
        if (id === 'ticket_add_user_select') return addUserFromSelect(interaction, value, client);
        if (id === 'ticket_remove_user_select') return removeUserFromTicket(interaction, value, client);
        if (id === 'ticket_history_user_select') return showUserHistory(interaction, client, value);
        if (id === 'ticket_transfer_select') return transferTicket(interaction, client, value);
    } catch (error) { console.error('[Ticket] Erro:', error); }
}

async function handleTicketModal(interaction, client) {
    db.setGuildId(getGuildId(interaction));
    if (interaction.customId === 'ticket_add_user_modal') return addUserToTicket(interaction, client);
    if (interaction.customId === 'ticket_rename_modal') return renameTicket(interaction);
}

async function openTicket(interaction, client, panelId, optionIndex) {
    await interaction.deferReply({ ephemeral: true });
    const guildId = getGuildId(interaction);
    try {
        const panel = await db.panels.getById(panelId, guildId);
        if (!panel) return reply(interaction, 'Painel não encontrado', false, true);
        if (!panel.enabled) return reply(interaction, 'Este painel está desativado', false, true);

        const option = panel.options[optionIndex];
        if (!option) return reply(interaction, 'Opção não encontrada', false, true);
        if (await isBlacklisted(interaction.user.id, guildId)) return reply(interaction, 'Você está bloqueado de abrir tickets', false, true);

        if (!isWithinSchedule(panel)) {
            const s = panel.schedule || {};
            const closedMsg = s.closedMessage || `Atendimento fechado\n-# Horário: ${s.open || '09:00'} às ${s.close || '18:00'}`;
            return reply(interaction, closedMsg, false, true);
        }

        const guildSettings = await db.settings.fetch(guildId);
        const maxTickets = panel.preferences?.maxTickets || guildSettings?.preferences?.maxTicketsPerUser || settings.maxTicketsPerUser || 2;
        if (await countUserTickets(interaction.user.id, guildId) >= maxTickets) return reply(interaction, `Limite de ${maxTickets} tickets atingido`, false, true);

        const existing = await findExistingTicket(interaction, guildId);
        if (existing) {
            const container = new ContainerBuilder().setAccentColor(colors.primary)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Ticket existente`), new TextDisplayBuilder().setContent(`-# Você já possui um ticket aberto`))
                .addActionRowComponents(row => row.addComponents(new ButtonBuilder().setURL(existing.url).setLabel('Ir para ticket').setStyle(ButtonStyle.Link)));
            return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const ticketChannel = await createTicketChannel(interaction, client, panel, option, panelId, optionIndex, guildId);
        if (!ticketChannel) return reply(interaction, 'Falha ao criar ticket', false, true);

        const container = new ContainerBuilder().setAccentColor(colors.primary)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Ticket criado`), new TextDisplayBuilder().setContent(`-# Acesse seu ticket abaixo`))
            .addActionRowComponents(row => row.addComponents(new ButtonBuilder().setURL(ticketChannel.url).setLabel('Acessar').setStyle(ButtonStyle.Link)));
        await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
        console.error('[Ticket] Erro:', error);
        await reply(interaction, 'Erro interno', false, true);
    }
}


async function createTicketChannel(interaction, client, panel, option, panelId, optionIndex, guildId) {
    const guildSettings = await db.settings.fetch(guildId);
    const staffRole = panel.roles?.staff || guildSettings?.roles?.staff;
    const adminRole = panel.roles?.admin || guildSettings?.roles?.admin;
    const ticketNumber = await db.tickets.getNextId(guildId);
    const isThreadMode = panel.mode === 'thread';

    let ticketChannel;

    if (isThreadMode) {
        const parentChannel = await interaction.guild.channels.fetch(panel.channelId).catch(() => null);
        if (!parentChannel) return null;

        ticketChannel = await parentChannel.threads.create({
            name: `ticket-${ticketNumber}`,
            type: ChannelType.PrivateThread,
            reason: `Ticket de ${interaction.user.tag}`
        });

        await ticketChannel.members.add(interaction.user.id);
        if (staffRole) {
            const staffMembers = interaction.guild.members.cache.filter(m => m.roles.cache.has(staffRole));
            for (const [, member] of staffMembers) {
                await ticketChannel.members.add(member.id).catch(() => {});
            }
        }
    } else {
        const categoryId = panel.categoryId || guildSettings?.channels?.category;
        const ticketCategory = categoryId ? await interaction.guild.channels.fetch(categoryId).catch(() => null) : null;

        ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${ticketNumber}`,
            type: ChannelType.GuildText,
            parent: ticketCategory?.id,
            topic: `${interaction.user.tag} | ${option.name} | ${panel.name}`,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory] },
                { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages] },
                ...(staffRole ? [{ id: staffRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] }] : []),
                ...(adminRole ? [{ id: adminRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }] : [])
            ]
        });
    }

    const ticketData = { 
        ticketId: ticketNumber, 
        channelId: ticketChannel.id,
        userId: interaction.user.id, 
        panelId, 
        optionIndex, 
        optionName: option.name, 
        panelName: panel.name, 
        mode: panel.mode, 
        createdAt: new Date(), 
        lastActivity: new Date(), 
        status: 'open', 
        priority: 'medium', 
        claimedBy: null, 
        addedUsers: [] 
    };
    await db.tickets.create(ticketData, guildId);

    await sendTicketWelcome(ticketChannel, interaction, panel, option, ticketData, guildId);
    await logAction(interaction.guild, 'criado', { user: interaction.user, channel: ticketChannel, option: option.name, panel: panel.name, ticketId: ticketNumber, ticketData }, guildId);

    const dmNotify = panel.preferences?.dmNotify !== false && guildSettings?.preferences?.dmNotifications !== false;
    if (dmNotify) await interaction.user.send({ content: `Ticket **#${ticketNumber}** criado em **${interaction.guild.name}**` }).catch(() => {});

    return ticketChannel;
}

async function sendTicketWelcome(channel, interaction, panel, option, ticketData, guildId) {
    const guildSettings = await db.settings.fetch(guildId);
    const staffRole = panel.roles?.staff || guildSettings?.roles?.staff;
    const panelName = panel?.name || 'Suporte';
    const optionName = option?.name || 'Geral';
    
    const container = new ContainerBuilder().setAccentColor(colors.primary)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Ticket Aberto`),
            new TextDisplayBuilder().setContent([
                `Olá ${interaction.user}!`,
                `-# Descreva seu problema e aguarde atendimento`,
                ``,
                `Ticket \`#${ticketData.ticketId}\``,
                `Categoria \`${optionName}\``,
                `Aberto <t:${Math.floor(Date.now() / 1000)}:R>`
            ].join('\n'))
        )
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(
            new ButtonBuilder().setCustomId('ticket_staff_panel').setLabel('Painel do Atendente').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ticket_user_panel').setLabel('Painel do Usuário').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ticket_info').setLabel('Info').setStyle(ButtonStyle.Secondary)
        ));

    const mentions = [interaction.user.toString(), staffRole ? `<@&${staffRole}>` : ''].filter(Boolean).join(' ');
    if (mentions) await channel.send(mentions);
    await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
}


async function showCloseConfirm(interaction) {
    const container = new ContainerBuilder().setAccentColor(colors.primary)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Fechar ticket?`), new TextDisplayBuilder().setContent(`-# Esta ação pode ser revertida`))
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(new ButtonBuilder().setCustomId('ticket_close_confirm').setLabel('Confirmar').setStyle(ButtonStyle.Danger), new ButtonBuilder().setCustomId('ticket_close_cancel').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
}

async function closeTicket(interaction, client) {
    const guildId = getGuildId(interaction);
    const ticketData = await db.tickets.getByChannelId(interaction.channel.id, guildId);
    if (!ticketData) return reply(interaction, 'Ticket não encontrado', true);

    const channelName = interaction.channel.name;
    const channelId = interaction.channel.id;
    const panel = await db.panels.getById(ticketData.panelId, guildId);

    await db.tickets.updateByChannelId(interaction.channel.id, {
        status: 'closed',
        closedAt: new Date(),
        closedBy: interaction.user.id,
        channelName,
        channelId
    }, guildId);

    await interaction.channel.setName(`closed-${ticketData.ticketId}`).catch(() => {});
    
    if (ticketData.mode !== 'thread' && interaction.channel.permissionOverwrites) {
        await interaction.channel.permissionOverwrites.edit(ticketData.userId, { SendMessages: false }).catch(() => {});
    }

    const transcriptEnabled = panel?.preferences?.transcripts !== false;
    const buttons = [];
    if (transcriptEnabled) buttons.push(new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary));
    buttons.push(new ButtonBuilder().setCustomId('ticket_reopen').setLabel('Reabrir').setStyle(ButtonStyle.Secondary));
    buttons.push(new ButtonBuilder().setCustomId('ticket_delete_channel').setLabel('Fechar Definitivo').setStyle(ButtonStyle.Danger));

    const container = new ContainerBuilder().setAccentColor(colors.primary)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# Ticket fechado`), new TextDisplayBuilder().setContent([`Por ${interaction.user}`, `<t:${Math.floor(Date.now() / 1000)}:R>`].join('\n')))
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(...buttons));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

    const updatedTicketData = { ...ticketData, channelName, channelId, closedAt: Date.now(), closedBy: interaction.user.id };
    
    await logAction(interaction.guild, 'fechado', { user: interaction.user, channel: interaction.channel, ticketId: ticketData.ticketId, ticketData: updatedTicketData }, guildId);
}

async function sendRatingRequest(client, ticketData, channel) {
    const user = await client.users.fetch(ticketData.userId).catch(() => null);
    if (!user) return;
    const container = new ContainerBuilder().setAccentColor(colors.primary)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${user}`), new TextDisplayBuilder().setContent(`### Avalie o atendimento`), new TextDisplayBuilder().setContent(`-# Sua opinião é importante`))
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(new ButtonBuilder().setCustomId('rating_1').setLabel('1').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('rating_2').setLabel('2').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('rating_3').setLabel('3').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('rating_4').setLabel('4').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('rating_5').setLabel('5').setStyle(ButtonStyle.Secondary)));
    await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
}

async function saveRating(interaction, rating) {
    const guildId = getGuildId(interaction);
    const ticketData = await db.tickets.getByChannelId(interaction.channel.id, guildId);
    if (!ticketData) return;
    await db.tickets.updateByChannelId(interaction.channel.id, { rating }, guildId);
    const container = new ContainerBuilder().setAccentColor(colors.primary).addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Obrigado!`), new TextDisplayBuilder().setContent(`-# Avaliação: ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`));
    await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

async function reopenTicket(interaction) {
    if (!isStaff(interaction.member)) return reply(interaction, 'Sem permissão', true);
    const guildId = getGuildId(interaction);
    const ticketData = await db.tickets.getByChannelId(interaction.channel.id, guildId);
    if (!ticketData) return reply(interaction, 'Ticket não encontrado', true);

    await db.tickets.updateByChannelId(interaction.channel.id, {
        status: 'open',
        lastActivity: new Date(),
        closedAt: null
    }, guildId);

    await interaction.channel.setName(`ticket-${ticketData.ticketId}`).catch(() => {});
    
    if (ticketData.mode !== 'thread' && interaction.channel.permissionOverwrites) {
        await interaction.channel.permissionOverwrites.edit(ticketData.userId, { SendMessages: true }).catch(() => {});
    }
    
    await reply(interaction, 'Ticket reaberto');
    await logAction(interaction.guild, 'reaberto', { user: interaction.user, ticketId: ticketData.ticketId, ticketData }, guildId);
}

async function deleteChannel(interaction) {
    if (!isStaff(interaction.member)) return reply(interaction, 'Sem permissão', true);
    
    const guildId = getGuildId(interaction);
    const ticketData = await db.tickets.getByChannelId(interaction.channel.id, guildId);
    
    const container = new ContainerBuilder().setAccentColor(colors.primary)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### Salvando transcript...`),
            new TextDisplayBuilder().setContent(`-# Canal será deletado em instantes`)
        );
    await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    
    if (ticketData) {
        await saveTranscript(interaction.channel, ticketData, interaction.user.id, guildId);
    }
    
    setTimeout(async () => {
        await interaction.channel.delete().catch(() => {});
    }, 2000);
}

async function saveTranscript(channel, ticket, closedBy, guildId) {
    try {
        let allMessages = [];
        let lastId = null;
        
        while (true) {
            const options = { limit: 100 };
            if (lastId) options.before = lastId;
            
            const fetchedMessages = await channel.messages.fetch(options);
            if (fetchedMessages.size === 0) break;
            
            allMessages.push(...fetchedMessages.values());
            lastId = fetchedMessages.last().id;
            
            if (fetchedMessages.size < 100) break;
        }

        allMessages.reverse();

        const messages = allMessages.map(msg => ({
            id: msg.id,
            author: {
                id: msg.author.id,
                username: msg.author.username,
                displayName: msg.member?.displayName || msg.author.globalName || msg.author.username,
                avatar: msg.author.displayAvatarURL({ size: 128 }),
                bot: msg.author.bot
            },
            content: msg.content,
            timestamp: msg.createdAt.toISOString(),
            attachments: Array.from(msg.attachments.values()).map(att => ({
                name: att.name,
                url: att.url,
                contentType: att.contentType
            })),
            embeds: msg.embeds.map(embed => ({
                title: embed.title,
                description: embed.description,
                color: embed.color
            }))
        }));

        await db.transcripts.save({
            channelId: channel.id,
            ticketId: ticket.ticketId,
            userId: ticket.userId,
            closedBy: closedBy,
            messages: messages,
            messageCount: messages.length
        }, guildId);

        console.log(`[Transcript] Salvo ticket #${ticket.ticketId} com ${messages.length} mensagens`);
        return messages;
    } catch (error) {
        console.error('[Transcript] Erro ao salvar:', error);
        return [];
    }
}


async function claimTicket(interaction, client) {
    if (!isStaff(interaction.member)) return reply(interaction, 'Sem permissão', true);
    const guildId = getGuildId(interaction);
    const ticketData = await db.tickets.getByChannelId(interaction.channel.id, guildId);
    if (!ticketData) return reply(interaction, 'Ticket não encontrado', true);
    if (ticketData.claimedBy) return reply(interaction, `Já assumido por <@${ticketData.claimedBy}>`, true);

    await db.tickets.updateByChannelId(interaction.channel.id, {
        claimedBy: interaction.user.id,
        lastActivity: new Date()
    }, guildId);

    const panel = await db.panels.getById(ticketData.panelId, guildId);
    const msgConfig = panel?.messages?.claim || {};
    let channelMsg = msgConfig.channel_msg || '{autor_mention} assumiu o atendimento deste ticket.';
    let dmMsg = msgConfig.dm_msg || 'Olá {user_mention}, o atendente {autor_mention} assumiu seu ticket `{channel_name}`.';

    channelMsg = channelMsg
        .replace(/{autor_mention}/g, interaction.user.toString())
        .replace(/{channel_name}/g, interaction.channel.name)
        .replace(/{guild_name}/g, interaction.guild.name);

    const container = new ContainerBuilder().setAccentColor(colors.primary)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Ticket assumido`), new TextDisplayBuilder().setContent(`-# ${channelMsg}`))
        .addActionRowComponents(row => row.addComponents(new ButtonBuilder().setCustomId('ticket_unclaim').setLabel('Desassociar').setStyle(ButtonStyle.Secondary)));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    await logAction(interaction.guild, 'assumido', { user: interaction.user, ticketId: ticketData.ticketId, staffId: interaction.user.id, ticketData }, guildId);

    const guildSettings = await db.settings.fetch(guildId);
    const user = await client.users.fetch(ticketData.userId).catch(() => null);
    if (user && guildSettings?.preferences?.dmNotifications !== false) {
        dmMsg = dmMsg
            .replace(/{user_mention}/g, user.toString())
            .replace(/{autor_mention}/g, interaction.user.toString())
            .replace(/{channel_name}/g, interaction.channel.name)
            .replace(/{guild_name}/g, interaction.guild.name);
        user.send(dmMsg).catch(() => {});
    }
}

async function unclaimTicket(interaction) {
    if (!isStaff(interaction.member)) return reply(interaction, 'Sem permissão', true);
    const guildId = getGuildId(interaction);
    await db.tickets.updateByChannelId(interaction.channel.id, { claimedBy: null }, guildId);
    await reply(interaction, 'Ticket desassociado', true);
}

async function showStaffPanel(interaction) {
    if (!isStaff(interaction.member)) return reply(interaction, 'Sem permissão', true);
    const guildId = getGuildId(interaction);
    const ticketData = await db.tickets.getByChannelId(interaction.channel.id, guildId);
    if (!ticketData) return reply(interaction, 'Ticket não encontrado', true);
    const p = priorities[ticketData.priority] || priorities.medium;

    const container = new ContainerBuilder().setAccentColor(colors.primary)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# Opções do Ticket`), new TextDisplayBuilder().setContent([`Ticket \`#${ticketData.ticketId}\``, `Usuário <@${ticketData.userId}>`, `Painel \`${ticketData.panelName || 'N/A'}\``, `Opção \`${ticketData.optionName || 'N/A'}\``, `Prioridade \`${p.name}\``, `Status \`${ticketData.status === 'open' ? 'Aberto' : 'Fechado'}\``, ticketData.claimedBy ? `Responsável <@${ticketData.claimedBy}>` : ''].filter(Boolean).join('\n')))
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(new StringSelectMenuBuilder().setCustomId('ticket_staff_action').setPlaceholder('Selecione uma ação').addOptions([{ label: 'Prioridade', description: 'Alterar prioridade', value: 'priority' }, { label: 'Adicionar usuário', description: 'Adicionar ao ticket', value: 'add_user' }, { label: 'Remover usuário', description: 'Remover do ticket', value: 'remove_user' }, { label: 'Respostas rápidas', description: 'Mensagens prontas', value: 'quick' }, { label: 'Notificar', description: 'Avisar usuário', value: 'notify' }, { label: 'Fechar ticket', description: 'Encerrar atendimento', value: 'close' }])));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
}

async function showStaffPanelFull(interaction, client) {
    if (!isStaff(interaction.member)) return reply(interaction, 'Sem permissão', true);
    const guildId = getGuildId(interaction);
    const ticketData = await db.tickets.getByChannelId(interaction.channel.id, guildId);
    if (!ticketData) return reply(interaction, 'Ticket não encontrado', true);

    const panel = await db.panels.getById(ticketData.panelId, guildId);
    const staffStyle = panel?.preferences?.staffPanelStyle || 'buttons';

    const container = new ContainerBuilder().setAccentColor(colors.primary)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# Painel do Atendente`))
        .addSeparatorComponents(divider());

    if (staffStyle === 'select') {
        const staffActions = [
            { label: 'Fechar Ticket', value: 'close' },
            { label: 'Assumir Ticket', value: 'claim' },
            { label: 'Notificar Usuário', value: 'notify' },
            { label: 'Renomear Ticket', value: 'rename' },
            { label: 'Definir Prioridade', value: 'priority' },
            { label: 'Adicionar Usuário', value: 'add_user' },
            { label: 'Remover Usuário', value: 'remove_user' },
            { label: 'Transcript', value: 'transcript' },
            { label: 'Histórico', value: 'history' },
            { label: 'Gerenciar Call', value: 'call' },
            { label: 'Transferir', value: 'transfer' }
        ];
        container.addActionRowComponents(row => row.addComponents(
            new StringSelectMenuBuilder().setCustomId('ticket_staff_action_select').setPlaceholder('Selecione uma ação').addOptions(staffActions)
        ));
    } else {
        container.addActionRowComponents(row => row.addComponents(
            new ButtonBuilder().setCustomId('ticket_close').setLabel('Fechar Ticket').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ticket_claim').setLabel('Assumir Ticket').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ticket_notify').setLabel('Notificar Usuário').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ticket_rename').setLabel('Renomear Ticket').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ticket_priority').setLabel('Definir Prioridade').setStyle(ButtonStyle.Secondary)
        ))
        .addActionRowComponents(row => row.addComponents(
            new ButtonBuilder().setCustomId('ticket_add_user').setLabel('Adicionar Usuário').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ticket_remove_user').setLabel('Remover Usuário').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ticket_history').setLabel('Histórico').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ticket_call').setLabel('Gerenciar Call').setStyle(ButtonStyle.Secondary)
        ))
        .addActionRowComponents(row => row.addComponents(
            new ButtonBuilder().setCustomId('ticket_transfer').setLabel('Transferir').setStyle(ButtonStyle.Secondary)
        ));
    }

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
}


async function showUserPanel(interaction, client) {
    const guildId = getGuildId(interaction);
    const ticketData = await db.tickets.getByChannelId(interaction.channel.id, guildId);
    if (!ticketData) return reply(interaction, 'Ticket não encontrado', true);

    const panel = await db.panels.getById(ticketData.panelId, guildId);
    const memberStyle = panel?.preferences?.memberPanelStyle || 'buttons';

    const container = new ContainerBuilder().setAccentColor(colors.primary)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# Painel do Usuário`))
        .addSeparatorComponents(divider());

    if (memberStyle === 'select') {
        const memberActions = [
            { label: 'Fechar Ticket', value: 'close' },
            { label: 'Notificar Atendente', value: 'notify_staff' },
            { label: 'Adicionar Usuário', value: 'add_user' },
            { label: 'Remover Usuário', value: 'remove_user' },
            { label: 'Solicitar Call', value: 'request_call' },
            { label: 'Transcript', value: 'transcript' }
        ];
        container.addActionRowComponents(row => row.addComponents(
            new StringSelectMenuBuilder().setCustomId('ticket_user_action_select').setPlaceholder('Selecione uma ação').addOptions(memberActions)
        ));
    } else {
        container.addActionRowComponents(row => row.addComponents(
            new ButtonBuilder().setCustomId('ticket_close').setLabel('Fechar Ticket').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ticket_notify_staff').setLabel('Notificar Atendente').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ticket_add_user').setLabel('Adicionar Usuário').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ticket_remove_user').setLabel('Remover Usuário').setStyle(ButtonStyle.Secondary)
        ))
        .addActionRowComponents(row => row.addComponents(
            new ButtonBuilder().setCustomId('ticket_request_call').setLabel('Solicitar Call').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary)
        ));
    }

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
}

async function showTicketInfo(interaction) {
    const guildId = getGuildId(interaction);
    const ticketData = await db.tickets.getByChannelId(interaction.channel.id, guildId);
    if (!ticketData) return reply(interaction, 'Ticket não encontrado', true);

    const p = priorities[ticketData.priority] || priorities.medium;
    const createdAt = ticketData.createdAt ? new Date(ticketData.createdAt).toLocaleString('pt-BR') : 'N/A';

    const container = new ContainerBuilder().setAccentColor(colors.primary)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Informações do Ticket`),
            new TextDisplayBuilder().setContent([
                `**Dono do ticket:** <@${ticketData.userId}>`,
                `**Data de abertura:** \`${createdAt}\``,
                `**Staff que assumiu:** ${ticketData.claimedBy ? `<@${ticketData.claimedBy}>` : '\`Ninguém\`'}`,
                `**Prioridade:** \`${p.name}\``,
                `**Status:** \`${ticketData.status === 'open' ? 'Aberto' : 'Fechado'}\``,
                `**Painel:** \`${ticketData.panelName || 'N/A'}\``,
                `**Opção:** \`${ticketData.optionName || 'N/A'}\``
            ].join('\n'))
        );

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
}

async function showQuickResponses(interaction) {
    if (!isStaff(interaction.member)) return reply(interaction, 'Sem permissão', true);
    const container = new ContainerBuilder().setAccentColor(colors.primary)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Respostas rápidas`), new TextDisplayBuilder().setContent(`-# Selecione para enviar`))
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => { quickResponses.slice(0, 5).forEach(r => row.addComponents(new ButtonBuilder().setCustomId(`quick_${r.id}`).setLabel(r.label).setStyle(ButtonStyle.Secondary))); return row; });
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
}

async function sendQuickResponse(interaction, responseId) {
    const response = quickResponses.find(r => r.id === responseId);
    if (!response) return reply(interaction, 'Resposta não encontrada', true);
    const guildId = getGuildId(interaction);
    await db.tickets.updateByChannelId(interaction.channel.id, { lastActivity: new Date() }, guildId);
    await interaction.channel.send({ content: response.text });
    await interaction.reply({ content: 'Enviado', ephemeral: true });
}

async function showPrioritySelect(interaction) {
    const container = new ContainerBuilder().setAccentColor(colors.primary)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Alterar Prioridade`))
        .addActionRowComponents(row => row.addComponents(new StringSelectMenuBuilder().setCustomId('ticket_priority_select').setPlaceholder('Selecione').addOptions([{ label: 'Baixa', value: 'low' }, { label: 'Média', value: 'medium' }, { label: 'Alta', value: 'high' }, { label: 'Urgente', value: 'urgent' }])));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
}

async function setPriority(interaction, priority) {
    const guildId = getGuildId(interaction);
    const ticketData = await db.tickets.getByChannelId(interaction.channel.id, guildId);
    if (!ticketData) return reply(interaction, 'Ticket não encontrado', true);
    await db.tickets.updateByChannelId(interaction.channel.id, { priority }, guildId);
    const p = priorities[priority];
    await logAction(interaction.guild, 'prioridade', { user: interaction.user, ticketId: ticketData?.ticketId, priority: p.name, ticketData }, guildId);
    
    const container = new ContainerBuilder().setAccentColor(colors.primary)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Prioridade alterada`), new TextDisplayBuilder().setContent(`-# Nova prioridade: **${p.name}**`));
    await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
}


async function showAddUserSelect(interaction, client) {
    const guildId = getGuildId(interaction);
    const ticketData = await db.tickets.getByChannelId(interaction.channel.id, guildId);
    if (!ticketData) return reply(interaction, 'Ticket não encontrado', true);

    const addedUsers = ticketData.addedUsers || [];
    const members = interaction.guild.members.cache.filter(m => 
        !m.user.bot && 
        m.id !== ticketData.userId && 
        !addedUsers.includes(m.id)
    );

    if (members.size === 0) return reply(interaction, 'Nenhum usuário disponível', true);

    const options = members.first(25).map(m => ({ label: m.user.tag, description: m.id, value: m.id }));

    const container = new ContainerBuilder().setAccentColor(colors.primary)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Adicionar usuário`), new TextDisplayBuilder().setContent(`-# Selecione um usuário para adicionar ao ticket`))
        .addActionRowComponents(row => row.addComponents(new StringSelectMenuBuilder().setCustomId('ticket_add_user_select').setPlaceholder('Selecione um usuário').addOptions(options)));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
}

async function addUserFromSelect(interaction, userId, client) {
    const guildId = getGuildId(interaction);
    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) return reply(interaction, 'Usuário não encontrado', true);

    const ticketData = await db.tickets.getByChannelId(interaction.channel.id, guildId);
    if (!ticketData) return reply(interaction, 'Ticket não encontrado', true);

    await interaction.channel.permissionOverwrites.edit(userId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
    
    const addedUsers = ticketData.addedUsers || [];
    if (!addedUsers.includes(userId)) { 
        addedUsers.push(userId); 
        await db.tickets.updateByChannelId(interaction.channel.id, { addedUsers }, guildId);
    }
    
    await logAction(interaction.guild, 'usuario_add', { user: interaction.user, ticketId: ticketData.ticketId, targetUser: user.toString(), ticketData }, guildId);
    
    const panel = await db.panels.getById(ticketData.panelId, guildId);
    const msgConfig = panel?.messages?.add_user || {};
    let channelMsg = msgConfig.channel_msg || '{alvo_mention} foi adicionado a este ticket por {autor_mention}.';
    
    channelMsg = channelMsg
        .replace(/{alvo_mention}/g, user.toString())
        .replace(/{autor_mention}/g, interaction.user.toString())
        .replace(/{channel_name}/g, interaction.channel.name)
        .replace(/{guild_name}/g, interaction.guild.name);
    
    const container = new ContainerBuilder().setAccentColor(colors.primary)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Usuário adicionado`), new TextDisplayBuilder().setContent(`-# ${channelMsg}`));
    await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
    
    user.send(`Você foi adicionado ao ticket \`${interaction.channel.name}\` por ${interaction.user.tag}`).catch(() => {});
}

async function addUserToTicket(interaction, client) {
    const guildId = getGuildId(interaction);
    const userId = interaction.fields.getTextInputValue('user_id').trim();
    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) return reply(interaction, 'Usuário não encontrado', true);

    await interaction.channel.permissionOverwrites.edit(userId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
    const ticketData = await db.tickets.getByChannelId(interaction.channel.id, guildId);
    
    const addedUsers = ticketData?.addedUsers || [];
    if (!addedUsers.includes(userId)) { 
        addedUsers.push(userId); 
        await db.tickets.updateByChannelId(interaction.channel.id, { addedUsers }, guildId);
    }
    await logAction(interaction.guild, 'usuario_add', { user: interaction.user, ticketId: ticketData?.ticketId, targetUser: user.toString(), ticketData }, guildId);
    
    const panel = await db.panels.getById(ticketData?.panelId, guildId);
    const msgConfig = panel?.messages?.add_user || {};
    let channelMsg = msgConfig.channel_msg || '{alvo_mention} foi adicionado a este ticket por {autor_mention}.';
    
    channelMsg = channelMsg
        .replace(/{alvo_mention}/g, user.toString())
        .replace(/{autor_mention}/g, interaction.user.toString())
        .replace(/{channel_name}/g, interaction.channel.name)
        .replace(/{guild_name}/g, interaction.guild.name);
    
    await reply(interaction, channelMsg);
    user.send(`Você foi adicionado ao ticket \`${interaction.channel.name}\` por ${interaction.user.tag}`).catch(() => {});
}

async function showRemoveUserSelect(interaction, client) {
    const guildId = getGuildId(interaction);
    const ticketData = await db.tickets.getByChannelId(interaction.channel.id, guildId);
    const addedUsers = ticketData?.addedUsers || [];
    if (addedUsers.length === 0) return reply(interaction, 'Nenhum usuário adicional', true);

    const options = [];
    for (const userId of addedUsers) { const user = await client.users.fetch(userId).catch(() => null); if (user) options.push({ label: user.tag, value: userId }); }
    if (options.length === 0) return reply(interaction, 'Nenhum usuário', true);

    const container = new ContainerBuilder().setAccentColor(colors.primary)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Remover usuário`))
        .addActionRowComponents(row => row.addComponents(new StringSelectMenuBuilder().setCustomId('ticket_remove_user_select').setPlaceholder('Selecione').addOptions(options)));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
}

async function removeUserFromTicket(interaction, userId, client) {
    const guildId = getGuildId(interaction);
    await interaction.channel.permissionOverwrites.delete(userId).catch(() => {});
    const ticketData = await db.tickets.getByChannelId(interaction.channel.id, guildId);
    
    const addedUsers = ticketData?.addedUsers || [];
    await db.tickets.updateByChannelId(interaction.channel.id, { addedUsers: addedUsers.filter(id => id !== userId) }, guildId);
    await logAction(interaction.guild, 'usuario_remove', { user: interaction.user, ticketId: ticketData?.ticketId, targetUser: `<@${userId}>`, ticketData }, guildId);
    
    const container = new ContainerBuilder().setAccentColor(colors.primary)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Usuário removido`), new TextDisplayBuilder().setContent(`-# <@${userId}> foi removido do ticket`));
    await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
    
    if (client) {
        const user = await client.users.fetch(userId).catch(() => null);
        if (user) {
            user.send(`Você foi removido do ticket \`${interaction.channel.name}\``).catch(() => {});
        }
    }
}

async function notifyUser(interaction, client) {
    const guildId = getGuildId(interaction);
    const ticketData = await db.tickets.getByChannelId(interaction.channel.id, guildId);
    if (!ticketData) return reply(interaction, 'Ticket não encontrado', true);
    const user = await client.users.fetch(ticketData.userId).catch(() => null);
    if (!user) return reply(interaction, 'Usuário não encontrado', true);
    
    const panel = await db.panels.getById(ticketData.panelId, guildId);
    const msgConfig = panel?.messages?.notify || {};
    let dmMsg = msgConfig.notify_user || 'Olá {user_mention}, você está sendo notificado sobre o seu ticket `{channel_name}`. A equipe de suporte está aguardando sua resposta.';
    
    dmMsg = dmMsg
        .replace(/{user_mention}/g, user.toString())
        .replace(/{channel_name}/g, interaction.channel.name)
        .replace(/{guild_name}/g, interaction.guild.name);
    
    await user.send({ content: dmMsg }).catch(() => reply(interaction, 'Não foi possível notificar', true));
    await reply(interaction, `${user.tag} notificado`, true);
}

async function notifyStaff(interaction, client) {
    const guildId = getGuildId(interaction);
    const ticketData = await db.tickets.getByChannelId(interaction.channel.id, guildId);
    if (!ticketData) return reply(interaction, 'Ticket não encontrado', true);

    const panel = await db.panels.getById(ticketData.panelId, guildId);
    const msgConfig = panel?.messages?.notify || {};
    let channelMsg = msgConfig.notify_staff || '{user_mention} está solicitando sua atenção no ticket `{channel_name}`.';
    
    channelMsg = channelMsg
        .replace(/{user_mention}/g, interaction.user.toString())
        .replace(/{channel_name}/g, interaction.channel.name)
        .replace(/{guild_name}/g, interaction.guild.name);

    if (ticketData.claimedBy) {
        const staff = await client.users.fetch(ticketData.claimedBy).catch(() => null);
        if (staff) {
            await staff.send({ content: channelMsg }).catch(() => {});
            return reply(interaction, `${staff.tag} notificado`, true);
        }
    }

    const staffRole = panel?.roles?.staff;
    const settings = await db.settings.fetch(guildId);
    const globalStaffRole = settings?.roles?.staff;
    if (staffRole || globalStaffRole) {
        await interaction.channel.send({ content: `<@&${staffRole || globalStaffRole}> ${channelMsg}` });
        return reply(interaction, 'Equipe notificada', true);
    }

    return reply(interaction, 'Nenhum atendente para notificar', true);
}


async function showRenameModal(interaction) {
    if (!isStaff(interaction.member)) return reply(interaction, 'Sem permissão', true);
    const modal = new ModalBuilder().setCustomId('ticket_rename_modal').setTitle('Renomear Ticket')
        .addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('new_name').setLabel('Novo nome do canal').setPlaceholder('Ex: suporte-joao').setStyle(TextInputStyle.Short).setMaxLength(50).setRequired(true)));
    await interaction.showModal(modal);
}

async function renameTicket(interaction) {
    const newName = interaction.fields.getTextInputValue('new_name').toLowerCase().replace(/\s+/g, '-');
    await interaction.channel.setName(newName).catch(() => {});
    await reply(interaction, `Canal renomeado para \`${newName}\``, true);
}

async function generateTranscript(interaction) {
    const guildId = getGuildId(interaction);
    const ticketData = await db.tickets.getByChannelId(interaction.channel.id, guildId);
    const panel = await db.panels.getById(ticketData?.panelId, guildId);
    
    if (panel?.preferences?.transcripts === false) {
        return reply(interaction, 'Transcripts desativados neste painel', true);
    }
    
    await interaction.deferReply({ ephemeral: true });
    try {
        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        let transcript = `TRANSCRIPT - TICKET #${ticketData?.ticketId || '?'}\n${'─'.repeat(40)}\n\nCanal: ${interaction.channel.name}\nCategoria: ${ticketData?.optionName || 'N/A'}\nCriado: ${ticketData?.createdAt ? new Date(ticketData.createdAt).toLocaleString('pt-BR') : 'N/A'}\n\n${'─'.repeat(40)}\n\n`;
        [...messages.values()].reverse().forEach(msg => { transcript += `[${msg.createdAt.toLocaleString('pt-BR')}] ${msg.author.tag}\n${msg.content || '[sem texto]'}\n\n`; });

        const buffer = Buffer.from(transcript, 'utf-8');
        const attachment = { attachment: buffer, name: `transcript-${ticketData?.ticketId || 'ticket'}.txt` };
        const transcriptSettings = await db.settings.fetch(guildId);
        const logsChannelId = transcriptSettings?.channels?.logs;
        if (logsChannelId) { const logsChannel = await interaction.guild.channels.fetch(logsChannelId).catch(() => null); if (logsChannel) await logsChannel.send({ content: `Transcript #${ticketData?.ticketId}`, files: [attachment] }); }
        await interaction.editReply({ content: 'Transcript gerado', files: [attachment] });
    } catch (error) { console.error('[Transcript] Erro:', error); await interaction.editReply({ content: 'Erro ao gerar transcript' }); }
}

async function deleteTicket(interaction, client) {
    if (!isStaff(interaction.member)) return reply(interaction, 'Sem permissão', true);
    const guildId = getGuildId(interaction);
    const ticketData = await db.tickets.getByChannelId(interaction.channel.id, guildId);
    const container = new ContainerBuilder().setAccentColor(colors.primary).addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Deletando`), new TextDisplayBuilder().setContent(`-# Em 5 segundos...`));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    await logAction(interaction.guild, 'deletado', { user: interaction.user, channel: interaction.channel, ticketId: ticketData?.ticketId, ticketData }, guildId);
    if (ticketData) { 
        await db.tickets.update(ticketData.ticketId, { status: 'deleted', deletedAt: new Date(), deletedBy: interaction.user.id }, guildId);
    }
    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
}


async function showUserHistorySelect(interaction, client) {
    if (!isStaff(interaction.member)) return reply(interaction, 'Sem permissão', true);
    const guildId = getGuildId(interaction);

    const allTickets = await db.tickets.getAll(guildId);
    const userIds = new Set();

    allTickets.forEach(t => userIds.add(t.userId));

    if (userIds.size === 0) return reply(interaction, 'Nenhum histórico disponível', true);

    const options = [];
    for (const userId of [...userIds].slice(0, 25)) {
        const user = await client.users.fetch(userId).catch(() => null);
        if (user) options.push({ label: user.tag, description: userId, value: userId });
    }

    if (options.length === 0) return reply(interaction, 'Nenhum usuário encontrado', true);

    const container = new ContainerBuilder().setAccentColor(colors.primary)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# Histórico de Tickets`), new TextDisplayBuilder().setContent(`-# Selecione um usuário para ver o histórico`))
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(new StringSelectMenuBuilder().setCustomId('ticket_history_user_select').setPlaceholder('Selecione um usuário').addOptions(options)));

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
}

async function showUserHistory(interaction, client, userId) {
    const guildId = getGuildId(interaction);
    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) return reply(interaction, 'Usuário não encontrado', true);

    const allTickets = await db.tickets.getAll(guildId);
    const userTickets = allTickets.filter(t => t.userId === userId);
    const opened = userTickets.length;
    const closed = userTickets.filter(t => t.status === 'closed').length;

    const lastTicket = userTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

    const recentActions = userTickets.slice(0, 5).map(t => {
        const date = t.createdAt ? `<t:${Math.floor(new Date(t.createdAt).getTime() / 1000)}:R>` : 'N/A';
        return `Ticket #${t.ticketId} - ${date}`;
    });

    const container = new ContainerBuilder().setAccentColor(colors.primary)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### Histórico de ${user.username}`),
            new TextDisplayBuilder().setContent([
                `Total de tickets \`${opened}\``,
                `Fechados \`${closed}\``,
                ``,
                recentActions.length > 0 ? recentActions.join('\n') : '-# Nenhum ticket'
            ].join('\n'))
        );

    await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
}


async function requestCall(interaction, client) {
    const guildId = getGuildId(interaction);
    const ticketData = await db.tickets.getByChannelId(interaction.channel.id, guildId);
    if (!ticketData) return reply(interaction, 'Ticket não encontrado', true);

    const panel = await db.panels.getById(ticketData.panelId, guildId);
    const guildSettings = await db.settings.fetch(guildId);
    const staffRole = panel?.roles?.staff || guildSettings?.roles?.staff;

    const container = new ContainerBuilder().setAccentColor(colors.primary)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### Solicitação de Call`),
            new TextDisplayBuilder().setContent(`-# ${interaction.user} está solicitando uma call de voz`)
        );
    
    await interaction.channel.send({ 
        content: ticketData.claimedBy ? `<@${ticketData.claimedBy}>` : (staffRole ? `<@&${staffRole}>` : ''),
        components: [container], 
        flags: MessageFlags.IsComponentsV2 
    });
    
    await reply(interaction, 'Solicitação de call enviada', true);
}

async function createCall(interaction, client) {
    const guildId = getGuildId(interaction);
    const ticketData = await db.tickets.getByChannelId(interaction.channel.id, guildId);
    if (!ticketData) return reply(interaction, 'Ticket não encontrado', true);

    if (ticketData.voiceChannelId) {
        const existingChannel = await interaction.guild.channels.fetch(ticketData.voiceChannelId).catch(() => null);
        if (existingChannel) return reply(interaction, `Call já existe: ${existingChannel}`, true);
    }

    const panel = await db.panels.getById(ticketData.panelId, guildId);
    const msgConfig = panel?.messages?.call || {};

    try {
        const voiceChannel = await interaction.guild.channels.create({
            name: `call-ticket-${ticketData.ticketId}`,
            type: ChannelType.GuildVoice,
            parent: panel?.categoryId || interaction.channel.parentId,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: ticketData.userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },
                { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels] }
            ]
        });

        if (ticketData.claimedBy) {
            await voiceChannel.permissionOverwrites.edit(ticketData.claimedBy, { ViewChannel: true, Connect: true, Speak: true });
        }

        await db.tickets.updateByChannelId(interaction.channel.id, { voiceChannelId: voiceChannel.id }, guildId);

        let channelMsg = msgConfig.channel_msg || 'Uma call de voz foi iniciada para este ticket por {autor_mention}.';
        let dmMsg = msgConfig.dm_msg || 'Olá! Uma call de voz foi criada para o seu ticket `{channel_name}`.';
        
        channelMsg = channelMsg
            .replace(/{autor_mention}/g, interaction.user.toString())
            .replace(/{channel_name}/g, interaction.channel.name)
            .replace(/{guild_name}/g, interaction.guild.name);

        const container = new ContainerBuilder().setAccentColor(colors.primary)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Call Criada`), new TextDisplayBuilder().setContent(`-# ${channelMsg}\n-# Entre no canal de voz: ${voiceChannel}`));
        await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

        const user = await client.users.fetch(ticketData.userId).catch(() => null);
        if (user) {
            dmMsg = dmMsg
                .replace(/{user_mention}/g, user.toString())
                .replace(/{channel_name}/g, interaction.channel.name)
                .replace(/{guild_name}/g, interaction.guild.name);
            user.send(dmMsg).catch(() => {});
        }
    } catch (error) {
        console.error('[Call] Erro:', error);
        await reply(interaction, 'Erro ao criar call', true);
    }
}

async function showTransferSelect(interaction, client) {
    const guildId = getGuildId(interaction);
    const ticketData = await db.tickets.getByChannelId(interaction.channel.id, guildId);
    if (!ticketData) return reply(interaction, 'Ticket não encontrado', true);

    const panel = await db.panels.getById(ticketData.panelId, guildId);
    const guildSettings = await db.settings.fetch(guildId);
    const staffRole = panel?.roles?.staff || guildSettings?.roles?.staff;

    if (!staffRole) return reply(interaction, 'Nenhum cargo de staff configurado', true);

    const staffMembers = interaction.guild.members.cache.filter(m => 
        m.roles.cache.has(staffRole) && m.id !== interaction.user.id && m.id !== ticketData.claimedBy
    );

    if (staffMembers.size === 0) return reply(interaction, 'Nenhum atendente disponível', true);

    const options = staffMembers.first(25).map(m => ({ label: m.user.tag, description: m.id, value: m.id }));

    const container = new ContainerBuilder().setAccentColor(colors.primary)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Transferir Ticket`), new TextDisplayBuilder().setContent(`-# Selecione o atendente`))
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(new StringSelectMenuBuilder().setCustomId('ticket_transfer_select').setPlaceholder('Selecione um atendente').addOptions(options)));

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
}

async function transferTicket(interaction, client, newStaffId) {
    const guildId = getGuildId(interaction);
    const ticketData = await db.tickets.getByChannelId(interaction.channel.id, guildId);
    if (!ticketData) return reply(interaction, 'Ticket não encontrado', true);

    const newStaff = await client.users.fetch(newStaffId).catch(() => null);
    if (!newStaff) return reply(interaction, 'Atendente não encontrado', true);

    await db.tickets.updateByChannelId(interaction.channel.id, {
        claimedBy: newStaffId,
        transferredAt: new Date(),
        transferredBy: interaction.user.id
    }, guildId);

    const container = new ContainerBuilder().setAccentColor(colors.primary)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Ticket Transferido`), new TextDisplayBuilder().setContent(`-# Transferido por ${interaction.user}\n-# Novo responsável: ${newStaff}`));
    
    await interaction.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    
    const successContainer = new ContainerBuilder().setAccentColor(colors.primary)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Transferido com sucesso`));
    await interaction.update({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });

    await newStaff.send({ content: `Ticket **#${ticketData.ticketId}** foi transferido para você!` }).catch(() => {});
}


async function reply(interaction, message, ephemeral = false, isEdit = false) {
    const container = new ContainerBuilder().setAccentColor(colors.primary).addTextDisplayComponents(new TextDisplayBuilder().setContent(message));
    const payload = { components: [container], flags: MessageFlags.IsComponentsV2, ephemeral };
    if (isEdit) await interaction.editReply(payload).catch(() => {});
    else await interaction.reply(payload).catch(() => {});
}

function isWithinSchedule(panel) {
    const schedule = panel?.schedule;
    if (!schedule?.enabled) return true;
    
    const now = new Date();
    const currentDay = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const closedDays = schedule.closedDays || [];
    if (closedDays.includes(currentDay)) return false;
    
    const [openH, openM] = (schedule.open || '09:00').split(':').map(Number);
    const [closeH, closeM] = (schedule.close || '18:00').split(':').map(Number);
    return currentMinutes >= (openH * 60 + openM) && currentMinutes <= (closeH * 60 + closeM);
}

async function isBlacklisted(userId, guildId) { 
    const settings = await db.settings.fetch(guildId);
    return (settings?.blacklist || []).includes(userId); 
}

async function countUserTickets(userId, guildId) { 
    const openTickets = await db.tickets.getOpen(guildId);
    return openTickets.filter(t => t.userId === userId).length; 
}

async function findExistingTicket(interaction, guildId) {
    const openTickets = await db.tickets.getOpen(guildId);
    for (const ticket of openTickets) {
        if (ticket.userId === interaction.user.id) {
            const channel = await interaction.guild.channels.fetch(ticket.channelId).catch(() => null);
            if (channel) return channel;
        }
    }
    return null;
}


async function logAction(guild, action, data, guildId) {
    const ticketData = data.ticketData || {};
    
    const actionMap = {
        'criado': 'created',
        'fechado': 'closed',
        'deletado': 'deleted',
        'reaberto': 'reopened',
        'assumido': 'assumed',
        'usuario_add': 'user_added',
        'usuario_remove': 'user_removed',
        'prioridade': 'priority_changed',
        'transferido': 'transferred'
    };

    try {
        await db.logs.add({
            type: actionMap[action] || action,
            ticketId: ticketData.ticketId || data.ticketId || 0,
            channelId: data.channel?.id || ticketData.channelId,
            userId: ticketData.userId || data.user?.id,
            staffId: data.staffId || data.user?.id,
            details: { 
                panelName: ticketData.panelName || data.panel, 
                optionName: ticketData.optionName || data.option,
                priority: data.priority,
                targetUser: data.targetUser
            }
        }, guildId);
    } catch (err) {
        console.error('[Log] Erro ao salvar no MongoDB:', err.message);
    }
    
    const settings = await db.settings.fetch(guildId);
    const logsChannelId = settings?.channels?.logs;
    if (!logsChannelId) return;
    
    const logsChannel = await guild.channels.fetch(logsChannelId).catch(() => null);
    if (!logsChannel) return;

    const now = Math.floor(Date.now() / 1000);
    const ticketId = ticketData.ticketId || data.ticketId || '?';
    const userName = data.user?.tag || data.user?.username || 'Desconhecido';

    const titles = {
        'criado': 'Ticket Aberto',
        'fechado': 'Ticket Fechado',
        'deletado': 'Ticket Deletado',
        'reaberto': 'Ticket Reaberto',
        'assumido': 'Ticket Assumido',
        'usuario_add': 'Usuário Adicionado',
        'usuario_remove': 'Usuário Removido',
        'prioridade': 'Prioridade Alterada',
        'transferido': 'Ticket Transferido'
    };

    const container = new ContainerBuilder().setAccentColor(colors.primary);
    const title = titles[action] || action;

    if (action === 'criado') {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ${title}`),
            new TextDisplayBuilder().setContent([
                `Ticket \`#${ticketId}\``,
                `Usuário \`${userName}\``,
                `Canal <#${data.channel?.id || ticketData.channelId}>`,
                `-# <t:${now}:f>`
            ].join('\n'))
        );
    } else if (action === 'fechado') {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ${title}`),
            new TextDisplayBuilder().setContent([
                `Ticket \`#${ticketId}\``,
                `Fechado por \`${userName}\``,
                `-# <t:${now}:f>`
            ].join('\n'))
        );
    } else if (action === 'deletado') {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ${title}`),
            new TextDisplayBuilder().setContent([
                `Ticket \`#${ticketId}\``,
                `Deletado por \`${userName}\``,
                `-# <t:${now}:f>`
            ].join('\n'))
        );
    } else if (action === 'assumido') {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ${title}`),
            new TextDisplayBuilder().setContent([
                `Ticket \`#${ticketId}\``,
                `Assumido por \`${userName}\``,
                `-# <t:${now}:f>`
            ].join('\n'))
        );
    } else if (action === 'reaberto') {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ${title}`),
            new TextDisplayBuilder().setContent([
                `Ticket \`#${ticketId}\``,
                `Reaberto por \`${userName}\``,
                `-# <t:${now}:f>`
            ].join('\n'))
        );
    } else if (action === 'usuario_add') {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ${title}`),
            new TextDisplayBuilder().setContent([
                `Ticket \`#${ticketId}\``,
                `${data.targetUser} adicionado por \`${userName}\``,
                `-# <t:${now}:f>`
            ].join('\n'))
        );
    } else if (action === 'usuario_remove') {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ${title}`),
            new TextDisplayBuilder().setContent([
                `Ticket \`#${ticketId}\``,
                `${data.targetUser} removido por \`${userName}\``,
                `-# <t:${now}:f>`
            ].join('\n'))
        );
    } else if (action === 'prioridade') {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ${title}`),
            new TextDisplayBuilder().setContent([
                `Ticket \`#${ticketId}\``,
                `Nova prioridade \`${data.priority || 'N/A'}\``,
                `Por \`${userName}\``,
                `-# <t:${now}:f>`
            ].join('\n'))
        );
    } else {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ${title}`),
            new TextDisplayBuilder().setContent([
                `Ticket \`#${ticketId}\``,
                `Por \`${userName}\``,
                `-# <t:${now}:f>`
            ].join('\n'))
        );
    }

    await logsChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
}

module.exports = { handleTicketButton, handleTicketSelect, handleTicketModal };
