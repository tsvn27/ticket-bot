const { 
    ContainerBuilder, 
    TextDisplayBuilder, 
    SeparatorBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ActionRowBuilder,
    ChannelType,
    MessageFlags
} = require('discord.js');
const { colors } = require('../../config');
const db = require('../../database');

const divider = () => new SeparatorBuilder().setDivider(true);
const getGuildId = (interaction) => interaction.guild?.id || interaction.guildId;

const defaultMessages = {
    panel: { style: 'container' },
    open: { style: 'container' },
    close: { style: 'container' },
    notify: { style: 'text' },
    add_user: { style: 'text' },
    remove_user: { style: 'text' },
    claim: { style: 'text' },
    transfer: { style: 'text' },
    call: { style: 'text' },
    transcript: { style: 'container' }
};

async function safeReply(interaction, container, extraRows = []) {
    const components = [container, ...extraRows];
    const payload = { components, flags: MessageFlags.IsComponentsV2 };
    if (interaction.deferred) return interaction.editReply(payload);
    if (interaction.replied) return interaction.editReply(payload);
    if (interaction.isModalSubmit?.() || !interaction.message) return interaction.reply({ ...payload, ephemeral: true });
    return interaction.update(payload);
}

async function showTicketManagerDirect(interaction) {
    const guildId = getGuildId(interaction);
    const panelsList = await db.panels.getAll(guildId);
    const count = panelsList.length;

    const container = new ContainerBuilder()
        .setAccentColor(colors.primary)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Gerenciar Tickets`),
            new TextDisplayBuilder().setContent(`**Painéis:** \`${count}\``)
        )
        .addSeparatorComponents(divider());

    if (count > 0) {
        const list = panelsList.slice(0, 5).map(p => `**${p.name || 'Sem nome'}**\n-# ${p.options?.length || 0} opções · ${p.enabled ? 'Ativo' : 'Desligado'}`).join('\n\n');
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(list));
        if (count > 5) container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# +${count - 5} mais painéis`));
    } else {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Nenhum painel criado ainda`));
    }

    container.addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(
            new ButtonBuilder().setCustomId('panel_ticket_create').setLabel('Criar Painel').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('panel_ticket_edit_select').setLabel('Editar Painel').setStyle(ButtonStyle.Secondary).setDisabled(count === 0)
        ));

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
}


async function showTicketManager(interaction) {
    const guildId = getGuildId(interaction);
    const panelsList = await db.panels.getAll(guildId);
    const count = panelsList.length;

    const container = new ContainerBuilder()
        .setAccentColor(colors.primary)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Gerenciar Tickets`),
            new TextDisplayBuilder().setContent(`**Painéis:** \`${count}\``)
        )
        .addSeparatorComponents(divider());

    if (count > 0) {
        const list = panelsList.slice(0, 5).map(p => `**${p.name || 'Sem nome'}**\n-# ${p.options?.length || 0} opções · ${p.enabled ? 'Ativo' : 'Desligado'}`).join('\n\n');
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(list));
        if (count > 5) container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# +${count - 5} mais painéis`));
    } else {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Nenhum painel criado ainda`));
    }

    container.addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(
            new ButtonBuilder().setCustomId('panel_ticket_create').setLabel('Criar Painel').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('panel_ticket_edit_select').setLabel('Editar Painel').setStyle(ButtonStyle.Secondary).setDisabled(count === 0)
        ));

    await safeReply(interaction, container, []);
}

async function showEditPanelSelect(interaction) {
    const guildId = getGuildId(interaction);
    const panelsList = await db.panels.getAll(guildId);
    const options = panelsList.slice(0, 25).map(p => ({
        label: p.name,
        description: `${p.options?.length || 0} opções · ${p.enabled ? 'Ativo' : 'Desligado'}`,
        value: p.panelId
    }));

    const container = new ContainerBuilder()
        .setAccentColor(colors.primary)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# Selecionar Painel`))
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(
            new StringSelectMenuBuilder().setCustomId('panel_edit_select').setPlaceholder('Selecione um painel').addOptions(options.length > 0 ? options : [{ label: 'Nenhum', value: 'none' }])
        ));

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('back_to_panel').setLabel('Voltar').setStyle(ButtonStyle.Secondary)
    );

    await safeReply(interaction, container, [actionRow]);
}


async function showPanelEditor(interaction, panelId) {
    const guildId = getGuildId(interaction);
    const panel = await db.panels.getById(panelId, guildId);
    if (!panel) {
        try {
            if (interaction.deferred || interaction.replied) {
                return interaction.editReply({ content: 'Painel não encontrado', components: [] });
            }
            return interaction.reply({ content: 'Painel não encontrado', components: [], ephemeral: true });
        } catch {
            return;
        }
    }

    const mode = panel.mode === 'thread' ? 'Tópico' : 'Canal';
    const modeNum = panel.mode === 'thread' ? '2' : '1';
    const status = panel.enabled ? 'Ligado' : 'Desligado';
    const schedule = panel.schedule?.enabled ? `${panel.schedule.open} - ${panel.schedule.close}` : 'Não configurado';
    const ai = panel.ai?.enabled ? 'Ativada' : 'Desativada';
    const isDisabled = !panel.enabled;

    const info = [
        `**Status:** \`${status}\``,
        `**Modo de Atendimento:** \`${mode}\``,
        `**Horário:** \`${schedule}\``,
        `**IA:** \`${ai}\``,
        `**Categoria:** ${panel.categoryId ? `<#${panel.categoryId}>` : '\`Não Definida\`'}`,
        `**Canal:** ${panel.channelId ? `<#${panel.channelId}>` : '\`Não Definido\`'}`
    ];

    const container = new ContainerBuilder()
        .setAccentColor(colors.primary)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# ${panel.name}`),
            new TextDisplayBuilder().setContent(info.join('\n'))
        )
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(
            new ButtonBuilder().setCustomId(`panel_edit_options_${panelId}`).setLabel('Editar Opções').setStyle(ButtonStyle.Secondary).setDisabled(isDisabled),
            new ButtonBuilder().setCustomId(`panel_edit_messages_select_${panelId}`).setLabel('Editar Mensagens').setStyle(ButtonStyle.Secondary).setDisabled(isDisabled),
            new ButtonBuilder().setCustomId(`panel_toggle_mode_${panelId}`).setLabel(`Alterar Modo (${modeNum}/2)`).setStyle(ButtonStyle.Secondary).setDisabled(isDisabled)
        ))
        .addActionRowComponents(row => row.addComponents(
            new ButtonBuilder().setCustomId(`panel_edit_schedule_${panelId}`).setLabel('Horário de Atendimento').setStyle(ButtonStyle.Secondary).setDisabled(isDisabled),
            new ButtonBuilder().setCustomId(`panel_edit_ai_${panelId}`).setLabel('IA').setStyle(ButtonStyle.Secondary).setDisabled(isDisabled),
            new ButtonBuilder().setCustomId(`panel_edit_preferences_${panelId}`).setLabel('Preferências').setStyle(ButtonStyle.Secondary).setDisabled(isDisabled)
        ))
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(
            new ButtonBuilder().setCustomId(`panel_toggle_status_${panelId}`).setLabel(panel.enabled ? 'Desligar' : 'Ligar').setStyle(panel.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`panel_set_category_${panelId}`).setLabel('Definir Categoria').setStyle(ButtonStyle.Primary).setDisabled(isDisabled),
            new ButtonBuilder().setCustomId(`panel_set_channel_${panelId}`).setLabel('Definir Canal').setStyle(ButtonStyle.Primary).setDisabled(isDisabled),
            new ButtonBuilder().setCustomId(`panel_edit_roles_${panelId}`).setLabel('Editar Cargos').setStyle(ButtonStyle.Primary).setDisabled(isDisabled)
        ));

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('back_to_panel').setLabel('Voltar').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`panel_deploy_${panelId}`).setLabel('Enviar Painel').setStyle(ButtonStyle.Success).setDisabled(isDisabled),
        new ButtonBuilder().setCustomId(`panel_delete_${panelId}`).setLabel('Deletar Painel').setStyle(ButtonStyle.Danger)
    );

    await safeReply(interaction, container, [actionRow]);
}


async function showOptionsEditor(interaction, panelId) {
    const guildId = getGuildId(interaction);
    const panel = await db.panels.getById(panelId, guildId);
    if (!panel) return;

    const options = panel.options || [];
    const count = options.length;

    const container = new ContainerBuilder()
        .setAccentColor(colors.primary)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Editar Opções`),
            new TextDisplayBuilder().setContent(`**Opções configuradas:** \`${count}/25\``)
        )
        .addSeparatorComponents(divider());

    if (count > 0) {
        const list = options.slice(0, 10).map((opt, i) => `**${i + 1}.** ${opt.name}\n-# ${opt.description}`).join('\n\n');
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(list));
        if (count > 10) container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# +${count - 10} mais opções`));
    } else {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Nenhuma opção criada`));
    }

    container.addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(
            new ButtonBuilder().setCustomId(`panel_add_option_${panelId}`).setLabel('Adicionar Opção').setStyle(ButtonStyle.Success).setDisabled(count >= 25)
        ));

    if (count > 0) {
        const selectOptions = options.map((opt, i) => ({ label: opt.name, description: opt.description.substring(0, 50), value: i.toString() }));
        container.addActionRowComponents(row => row.addComponents(
            new StringSelectMenuBuilder().setCustomId(`panel_option_edit_${panelId}`).setPlaceholder('Editar opção').addOptions(selectOptions)
        ));
        container.addActionRowComponents(row => row.addComponents(
            new StringSelectMenuBuilder().setCustomId(`panel_option_remove_${panelId}`).setPlaceholder('Remover opção').addOptions(selectOptions)
        ));
    }

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`panel_editor_${panelId}`).setLabel('Voltar').setStyle(ButtonStyle.Secondary)
    );

    await safeReply(interaction, container, [actionRow]);
}

async function showEditOptionSelect(interaction, panelId) {
    const guildId = getGuildId(interaction);
    const panel = await db.panels.getById(panelId, guildId);
    if (!panel || !panel.options?.length) return;

    const options = panel.options.map((opt, i) => ({ label: opt.name, description: opt.description.substring(0, 50), value: i.toString() }));

    const container = new ContainerBuilder()
        .setAccentColor(colors.primary)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# Editar Opção`))
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(
            new StringSelectMenuBuilder().setCustomId(`panel_option_edit_${panelId}`).setPlaceholder('Selecione uma opção').addOptions(options)
        ));

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`panel_edit_options_${panelId}`).setLabel('Voltar').setStyle(ButtonStyle.Secondary)
    );

    await safeReply(interaction, container, [actionRow]);
}

async function showRemoveOptionSelect(interaction, panelId) {
    const guildId = getGuildId(interaction);
    const panel = await db.panels.getById(panelId, guildId);
    if (!panel || !panel.options?.length) return;

    const options = panel.options.map((opt, i) => ({ label: opt.name, description: opt.description.substring(0, 50), value: i.toString() }));

    const container = new ContainerBuilder()
        .setAccentColor(colors.primary)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# Remover Opção`))
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(
            new StringSelectMenuBuilder().setCustomId(`panel_option_remove_${panelId}`).setPlaceholder('Selecione para remover').addOptions(options)
        ));

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`panel_edit_options_${panelId}`).setLabel('Voltar').setStyle(ButtonStyle.Secondary)
    );

    await safeReply(interaction, container, [actionRow]);
}


async function showChannelEditor(interaction, panelId) {
    const guildId = getGuildId(interaction);
    const panel = await db.panels.getById(panelId, guildId);
    if (!panel) return;

    const settings = await db.settings.fetch(guildId);
    const logsChannel = settings?.channels?.logs;

    const container = new ContainerBuilder()
        .setAccentColor(colors.primary)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Definir Canais`),
            new TextDisplayBuilder().setContent([
                `**Canal do Painel:** ${panel.channelId ? `<#${panel.channelId}>` : '\`Não definido\`'}`,
                `-# Canal onde o painel/tópicos serão criados`,
                ``,
                `**Canal de Logs:** ${logsChannel ? `<#${logsChannel}>` : '\`Não definido\`'}`,
                `-# Canal onde os logs serão enviados`
            ].join('\n'))
        )
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(
            new ChannelSelectMenuBuilder().setCustomId(`panel_channel_set_${panelId}`).setPlaceholder('Canal do Painel').setChannelTypes(ChannelType.GuildText)
        ))
        .addActionRowComponents(row => row.addComponents(
            new ChannelSelectMenuBuilder().setCustomId(`panel_logs_channel_set_${panelId}`).setPlaceholder('Canal de Logs').setChannelTypes(ChannelType.GuildText)
        ));

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`panel_editor_${panelId}`).setLabel('Voltar').setStyle(ButtonStyle.Secondary)
    );

    await safeReply(interaction, container, [actionRow]);
}

async function showCategoryEditor(interaction, panelId) {
    const guildId = getGuildId(interaction);
    const panel = await db.panels.getById(panelId, guildId);
    if (!panel) return;

    const container = new ContainerBuilder()
        .setAccentColor(colors.primary)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Definir Categoria`),
            new TextDisplayBuilder().setContent(`Categoria atual: ${panel.categoryId ? `<#${panel.categoryId}>` : '\`Não definida\`'}\n\n-# Selecione a categoria onde os tickets serão criados`)
        )
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(
            new ChannelSelectMenuBuilder().setCustomId(`panel_category_set_${panelId}`).setPlaceholder('Selecione uma categoria').setChannelTypes(ChannelType.GuildCategory)
        ));

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`panel_editor_${panelId}`).setLabel('Voltar').setStyle(ButtonStyle.Secondary)
    );

    await safeReply(interaction, container, [actionRow]);
}

async function showPanelRolesEditor(interaction, panelId) {
    const guildId = getGuildId(interaction);
    const panel = await db.panels.getById(panelId, guildId);
    if (!panel) return;

    const container = new ContainerBuilder()
        .setAccentColor(colors.primary)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Editar Cargos`),
            new TextDisplayBuilder().setContent([
                `**Staff:** ${panel.roles?.staff ? `<@&${panel.roles.staff}>` : '\`Não definido\`'}`,
                `-# Cargo que pode ver e atender tickets`,
                ``,
                `**Admin:** ${panel.roles?.admin ? `<@&${panel.roles.admin}>` : '\`Não definido\`'}`,
                `-# Cargo com permissões administrativas`
            ].join('\n'))
        )
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(
            new RoleSelectMenuBuilder().setCustomId(`panel_role_set_${panelId}_staff`).setPlaceholder('Selecionar cargo Staff')
        ))
        .addActionRowComponents(row => row.addComponents(
            new RoleSelectMenuBuilder().setCustomId(`panel_role_set_${panelId}_admin`).setPlaceholder('Selecionar cargo Admin')
        ));

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`panel_editor_${panelId}`).setLabel('Voltar').setStyle(ButtonStyle.Secondary)
    );

    await safeReply(interaction, container, [actionRow]);
}


async function showMessagesEditor(interaction, panelId) {
    const guildId = getGuildId(interaction);
    const panel = await db.panels.getById(panelId, guildId);
    if (!panel) return;

    const messages = panel.messages || {};
    const messageTypes = [
        { label: 'Painel', description: messages.panel?.content ? 'Configurado' : 'Não configurado', value: 'panel' },
        { label: 'Abertura', description: messages.open?.content ? 'Configurado' : 'Não configurado', value: 'open' },
        { label: 'Fechamento', description: messages.close?.content ? 'Configurado' : 'Não configurado', value: 'close' },
        { label: 'Notificar', description: messages.notify?.content ? 'Configurado' : 'Não configurado', value: 'notify' },
        { label: 'Adicionar Usuário', description: messages.add_user?.content ? 'Configurado' : 'Não configurado', value: 'add_user' },
        { label: 'Remover Usuário', description: messages.remove_user?.content ? 'Configurado' : 'Não configurado', value: 'remove_user' },
        { label: 'Assumir', description: messages.claim?.content ? 'Configurado' : 'Não configurado', value: 'claim' },
        { label: 'Transferir', description: messages.transfer?.content ? 'Configurado' : 'Não configurado', value: 'transfer' },
        { label: 'Criar Call', description: messages.call?.content ? 'Configurado' : 'Não configurado', value: 'call' },
        { label: 'Transcript', description: messages.transcript?.content ? 'Configurado' : 'Não configurado', value: 'transcript' }
    ];

    const container = new ContainerBuilder()
        .setAccentColor(colors.primary)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Editar Mensagens`),
            new TextDisplayBuilder().setContent(`-# Selecione qual mensagem deseja editar`)
        )
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(
            new StringSelectMenuBuilder().setCustomId(`panel_message_type_${panelId}`).setPlaceholder('Selecione o tipo de mensagem').addOptions(messageTypes)
        ));

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`panel_editor_${panelId}`).setLabel('Voltar').setStyle(ButtonStyle.Secondary)
    );

    await safeReply(interaction, container, [actionRow]);
}

async function showMessageEditor(interaction, panelId, messageType) {
    const guildId = getGuildId(interaction);
    const panel = await db.panels.getById(panelId, guildId);
    if (!panel) return;

    const messages = panel.messages || {};
    const msg = messages[messageType] || {};

    const typeNames = {
        panel: 'Painel', open: 'Abertura', close: 'Fechamento', notify: 'Notificar',
        add_user: 'Adicionar Usuário', remove_user: 'Remover Usuário', claim: 'Assumir',
        transfer: 'Transferir', call: 'Criar Call', transcript: 'Transcript'
    };

    const hasStyleOption = ['panel', 'open', 'close'].includes(messageType);

    const hasContent = msg.content ? 'Personalizado' : 'Padrão';

    if (hasStyleOption) {
        const defaults = defaultMessages[messageType] || { style: 'text' };
        const styles = ['embed', 'text', 'container'];
        const styleNames = { embed: 'Embed', text: 'Texto Simples', container: 'Container V2' };
        const currentStyle = msg.style || defaults.style;
        const styleIndex = styles.indexOf(currentStyle) + 1;

        const infoList = [
            `**Estilo Atual:** \`${styleNames[currentStyle]}\``,
            `**Conteúdo:** \`${hasContent}\``
        ];

        const container = new ContainerBuilder()
            .setAccentColor(colors.primary)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# Editar: ${typeNames[messageType]}`),
                new TextDisplayBuilder().setContent(infoList.join('\n'))
            )
            .addSeparatorComponents(divider())
            .addActionRowComponents(row => {
                row.addComponents(
                    new ButtonBuilder().setCustomId(`panel_msg_style_${panelId}_${messageType}`).setLabel(`Trocar Estilo (${styleIndex}/3)`).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`panel_msg_content_${panelId}_${messageType}`).setLabel('Editar Conteúdo').setStyle(ButtonStyle.Primary)
                );
                return row;
            });

        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`panel_edit_messages_select_${panelId}`).setLabel('Voltar').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`panel_msg_preview_${panelId}_${messageType}`).setLabel('Preview').setStyle(ButtonStyle.Secondary)
        );

        return safeReply(interaction, container, [actionRow]);
    }

    const container = new ContainerBuilder()
        .setAccentColor(colors.primary)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Editar: ${typeNames[messageType]}`),
            new TextDisplayBuilder().setContent(`**Conteúdo:** \`${hasContent}\`\n\n-# Esta mensagem é apenas texto simples`)
        )
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(
            new ButtonBuilder().setCustomId(`panel_msg_content_${panelId}_${messageType}`).setLabel('Editar Conteúdo').setStyle(ButtonStyle.Primary)
        ));

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`panel_edit_messages_select_${panelId}`).setLabel('Voltar').setStyle(ButtonStyle.Secondary)
    );

    await safeReply(interaction, container, [actionRow]);
}

async function showPreferencesEditor(interaction, panelId) {
    const guildId = getGuildId(interaction);
    const panel = await db.panels.getById(panelId, guildId);
    if (!panel) return;

    const prefs = panel.preferences || {};
    const on = 'Ligado';
    const off = 'Desligado';
    const panelStyleText = prefs.panelStyle === 'select' ? 'Select' : 'Botões';
    const staffStyleText = prefs.staffPanelStyle === 'select' ? 'Select' : 'Botões';
    const memberStyleText = prefs.memberPanelStyle === 'select' ? 'Select' : 'Botões';

    const funcOptions = [
        { label: 'Transcripts', description: 'Salvar histórico do ticket', value: 'transcripts' },
        { label: 'DM Notificações', description: 'Avisar usuário por DM', value: 'dmNotify' },
        { label: 'Avaliação', description: 'Pedir nota ao fechar', value: 'rating' },
        { label: 'Setup Membro', description: 'Configurar botões do usuário', value: 'memberSetup' },
        { label: 'Setup Atendente', description: 'Configurar botões do staff', value: 'staffSetup' },
        { label: 'Fechamento de Tickets', description: 'Configurar auto-close e opções', value: 'closeSettings' }
    ];

    const styleOptions = [
        { label: 'Painel de Tickets', description: 'Opções para abrir ticket', value: 'panelStyle' },
        { label: 'Painel Atendente', description: 'Ações do staff', value: 'staffPanelStyle' },
        { label: 'Painel Membro', description: 'Ações do usuário', value: 'memberPanelStyle' }
    ];

    const prefList = [
        `**Transcripts** \`${prefs.transcripts !== false ? on : off}\``,
        `**DM Notificações** \`${prefs.dmNotify !== false ? on : off}\``,
        `**Avaliação** \`${prefs.rating !== false ? on : off}\``,
        `**Auto-Close** \`${prefs.autoCloseInactive !== false ? on : off}\``
    ];

    const styleList = [
        `**Painel de Tickets** \`${panelStyleText}\``,
        `**Painel Atendente** \`${staffStyleText}\``,
        `**Painel Membro** \`${memberStyleText}\``
    ];

    const container = new ContainerBuilder()
        .setAccentColor(colors.primary)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Preferências`),
            new TextDisplayBuilder().setContent(`### Funcionalidades`),
            new TextDisplayBuilder().setContent(prefList.join('\n'))
        )
        .addSeparatorComponents(divider())
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### Estilos de Exibição`),
            new TextDisplayBuilder().setContent(styleList.join('\n'))
        )
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(
            new StringSelectMenuBuilder().setCustomId(`panel_pref_select_${panelId}`).setPlaceholder('Configurar Funcionalidade').addOptions(funcOptions)
        ))
        .addActionRowComponents(row => row.addComponents(
            new StringSelectMenuBuilder().setCustomId(`panel_style_select_${panelId}`).setPlaceholder('Configurar Estilo').addOptions(styleOptions)
        ));

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`panel_editor_${panelId}`).setLabel('Voltar').setStyle(ButtonStyle.Secondary)
    );

    await safeReply(interaction, container, [actionRow]);
}

async function showCloseSettings(interaction, panelId) {
    const guildId = getGuildId(interaction);
    const panel = await db.panels.getById(panelId, guildId);
    if (!panel) return;

    const prefs = panel.preferences || {};
    const on = 'Ligado';
    const off = 'Desligado';

    const closeOptions = [
        { label: 'Auto por Inatividade', description: 'Fechar após tempo sem mensagens', value: 'autoCloseInactive' },
        { label: 'Auto por Saída do Usuário', description: 'Fechar quando usuário sair', value: 'autoCloseLeave' },
        { label: 'Auto por Horário', description: 'Fechar fora do expediente', value: 'autoCloseSchedule' },
        { label: 'Exigir Motivo', description: 'Pedir motivo ao fechar', value: 'closeReason' },
        { label: 'DM ao Fechar', description: 'Enviar mensagem na DM', value: 'closeDM' }
    ];

    const closeList = [
        `**Auto por Inatividade** \`${prefs.autoCloseInactive !== false ? on : off}\``,
        `**Auto por Saída do Usuário** \`${prefs.autoCloseLeave ? on : off}\``,
        `**Auto por Horário** \`${prefs.autoCloseSchedule ? on : off}\``,
        `**Exigir Motivo** \`${prefs.closeReason ? on : off}\``,
        `**DM ao Fechar** \`${prefs.closeDM !== false ? on : off}\``
    ];

    const container = new ContainerBuilder()
        .setAccentColor(colors.primary)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Fechamento de Tickets`),
            new TextDisplayBuilder().setContent(closeList.join('\n'))
        )
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(
            new StringSelectMenuBuilder().setCustomId(`panel_close_select_${panelId}`).setPlaceholder('Selecione uma opção').addOptions(closeOptions)
        ));

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`panel_edit_preferences_${panelId}`).setLabel('Voltar').setStyle(ButtonStyle.Secondary)
    );

    await safeReply(interaction, container, [actionRow]);
}

async function showPreferenceDetail(interaction, panelId, prefKey) {
    const guildId = getGuildId(interaction);
    const panel = await db.panels.getById(panelId, guildId);
    if (!panel) return;

    const prefs = panel.preferences || {};
    const isEnabled = prefs[prefKey] !== false;
    const isEnabledAlt = prefs[prefKey] === true;

    const prefInfo = {
        transcripts: { name: 'Transcripts', desc: 'Ao ativar, o transcript será enviado ao usuário ao fechar o ticket.' },
        memberSetup: { name: 'Setup Membro', desc: 'Selecione quais botões o membro poderá ver no painel do usuário.', hasButtons: true },
        staffSetup: { name: 'Setup Atendente', desc: 'Selecione quais botões o atendente poderá ver no painel do staff.', hasButtons: true },
        dmNotify: { name: 'DM Notificações', desc: 'Envia notificações por mensagem direta para o usuário sobre atualizações do ticket.' },
        rating: { name: 'Avaliação', desc: 'Solicita uma avaliação do atendimento quando o ticket é fechado.' },
        panelStyle: { name: 'Estilo do Painel', desc: 'Define como as opções do painel de tickets serão exibidas.', isStyle: true },
        staffPanelStyle: { name: 'Estilo Painel Atendente', desc: 'Define como as ações do painel do atendente serão exibidas.', isStyle: true },
        memberPanelStyle: { name: 'Estilo Painel Membro', desc: 'Define como as ações do painel do membro serão exibidas.', isStyle: true },
        autoCloseInactive: { name: 'Auto por Inatividade', desc: 'Fecha automaticamente tickets sem mensagens após o período configurado.', isClose: true },
        autoCloseLeave: { name: 'Auto por Saída', desc: 'Fecha automaticamente quando o usuário sai do servidor.', isClose: true, defaultOff: true },
        autoCloseSchedule: { name: 'Auto por Horário', desc: 'Fecha automaticamente tickets fora do horário de atendimento.', isClose: true, defaultOff: true },
        closeReason: { name: 'Exigir Motivo', desc: 'Exige que o atendente informe um motivo ao fechar o ticket.', isClose: true, defaultOff: true },
        closeDM: { name: 'DM ao Fechar', desc: 'Envia uma mensagem na DM do usuário quando o ticket é fechado.', isClose: true }
    };

    const info = prefInfo[prefKey] || { name: prefKey, desc: 'Sem descrição' };

    if (info.hasButtons) {
        return showButtonsConfig(interaction, panelId, prefKey, info);
    }

    if (info.isStyle) {
        return showStyleConfig(interaction, panelId, prefKey, info);
    }

    const status = info.defaultOff ? isEnabledAlt : isEnabled;
    const backButton = info.isClose ? `panel_close_settings_${panelId}` : `panel_edit_preferences_${panelId}`;

    const container = new ContainerBuilder()
        .setAccentColor(colors.primary)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# ${info.name}`),
            new TextDisplayBuilder().setContent(info.desc),
            new TextDisplayBuilder().setContent(`\n**Status:** \`${status ? 'Ativado' : 'Desativado'}\``)
        )
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(
            new ButtonBuilder().setCustomId(`panel_pref_toggle_${panelId}_${prefKey}`).setLabel(status ? 'Desativar' : 'Ativar').setStyle(status ? ButtonStyle.Danger : ButtonStyle.Success)
        ));

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(backButton).setLabel('Voltar').setStyle(ButtonStyle.Secondary)
    );

    await safeReply(interaction, container, [actionRow]);
}

async function showStyleConfig(interaction, panelId, prefKey, info) {
    const guildId = getGuildId(interaction);
    const panel = await db.panels.getById(panelId, guildId);
    if (!panel) return;

    const prefs = panel.preferences || {};
    const currentStyle = prefs[prefKey] === 'select' ? 'Select Menu' : 'Botões';
    const isButtons = prefs[prefKey] !== 'select';

    const container = new ContainerBuilder()
        .setAccentColor(colors.primary)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# ${info.name}`),
            new TextDisplayBuilder().setContent(info.desc),
            new TextDisplayBuilder().setContent(`\n**Estilo atual:** \`${currentStyle}\``)
        )
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(
            new ButtonBuilder().setCustomId(`panel_pref_style_${panelId}_${prefKey}_buttons`).setLabel('Botões').setStyle(isButtons ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`panel_pref_style_${panelId}_${prefKey}_select`).setLabel('Select Menu').setStyle(!isButtons ? ButtonStyle.Success : ButtonStyle.Secondary)
        ));

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`panel_edit_preferences_${panelId}`).setLabel('Voltar').setStyle(ButtonStyle.Secondary)
    );

    await safeReply(interaction, container, [actionRow]);
}

async function showButtonsConfig(interaction, panelId, prefKey, info) {
    const guildId = getGuildId(interaction);
    const panel = await db.panels.getById(panelId, guildId);
    if (!panel) return;

    const prefs = panel.preferences || {};
    const disabledButtons = prefs[`${prefKey}Disabled`] || [];

    const memberButtons = [
        { label: 'Fechar Ticket', description: 'Permite que o membro feche o próprio ticket', value: 'close' },
        { label: 'Notificar Atendente', description: 'Envia uma notificação para a equipe de suporte', value: 'notify_staff' },
        { label: 'Adicionar Usuário', description: 'Permite que o membro adicione outros usuários ao ticket', value: 'add_user' },
        { label: 'Remover Usuário', description: 'Permite que o membro remova outros usuários do ticket', value: 'remove_user' },
        { label: 'Transferir', description: 'Permite que o membro transfira o ticket para outro usuário', value: 'transfer' },
        { label: 'Solicitar Call', description: 'Permite que o membro solicite uma chamada de voz', value: 'call' },
        { label: 'Transcript', description: 'Permite que o membro salve um transcript da conversa', value: 'transcript' }
    ];

    const staffButtons = [
        { label: 'Fechar Ticket', description: 'Permite fechar o ticket', value: 'close' },
        { label: 'Assumir Ticket', description: 'Permite assumir o ticket', value: 'claim' },
        { label: 'Notificar Usuário', description: 'Envia notificação ao usuário', value: 'notify' },
        { label: 'Renomear Ticket', description: 'Permite renomear o canal', value: 'rename' },
        { label: 'Definir Prioridade', description: 'Permite alterar a prioridade', value: 'priority' },
        { label: 'Adicionar Usuário', description: 'Adiciona usuário ao ticket', value: 'add_user' },
        { label: 'Remover Usuário', description: 'Remove usuário do ticket', value: 'remove_user' },
        { label: 'Transcript', description: 'Gera transcript', value: 'transcript' },
        { label: 'Histórico', description: 'Ver histórico do usuário', value: 'history' },
        { label: 'Gerenciar Call', description: 'Criar/gerenciar call de voz', value: 'call' },
        { label: 'Transferir', description: 'Transferir para outro atendente', value: 'transfer' }
    ];

    const buttons = prefKey === 'memberSetup' ? memberButtons : staffButtons;
    const options = buttons.map(btn => ({
        ...btn,
        default: disabledButtons.includes(btn.value)
    }));

    const container = new ContainerBuilder()
        .setAccentColor(colors.primary)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# ${info.name}`),
            new TextDisplayBuilder().setContent(info.desc + `\n\n-# Selecione os botões que deseja **desativar**`)
        )
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`panel_pref_buttons_${panelId}_${prefKey}`)
                .setPlaceholder('Selecione os botões para desativar')
                .setMinValues(0)
                .setMaxValues(options.length)
                .addOptions(options)
        ));

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`panel_edit_preferences_${panelId}`).setLabel('Voltar').setStyle(ButtonStyle.Secondary)
    );

    await safeReply(interaction, container, [actionRow]);
}


async function showAIConfig(interaction, panelId) {
    const guildId = getGuildId(interaction);
    const panel = await db.panels.getById(panelId, guildId);
    if (!panel) return;

    const ai = panel.ai || {};
    const status = ai.enabled ? 'Ligado' : 'Desligado';
    const useContext = ai.useContext !== false ? 'Sim' : 'Não';

    const container = new ContainerBuilder()
        .setAccentColor(colors.primary)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Configurar IA`),
            new TextDisplayBuilder().setContent([
                `**Status:** \`${status}\``,
                `**Usar Contexto:** \`${useContext}\``,
                ``,
                `**Instruções Adicionais:**`,
                ai.instructions ? `\`\`\`${ai.instructions.substring(0, 200)}${ai.instructions.length > 200 ? '...' : ''}\`\`\`` : '\`Não definidas\`'
            ].join('\n'))
        )
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(
            new ButtonBuilder().setCustomId(`panel_ai_toggle_${panelId}`).setLabel(ai.enabled ? 'Desligar' : 'Ligar').setStyle(ai.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`panel_ai_context_${panelId}`).setLabel(`Contexto: ${useContext}`).setStyle(ButtonStyle.Secondary).setDisabled(!ai.enabled),
            new ButtonBuilder().setCustomId(`panel_ai_instructions_${panelId}`).setLabel('Editar Instruções').setStyle(ButtonStyle.Secondary).setDisabled(!ai.enabled)
        ));

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`panel_editor_${panelId}`).setLabel('Voltar').setStyle(ButtonStyle.Secondary)
    );

    await safeReply(interaction, container, [actionRow]);
}

async function showScheduleEditor(interaction, panelId) {
    const guildId = getGuildId(interaction);
    const panel = await db.panels.getById(panelId, guildId);
    if (!panel) return;

    const schedule = panel.schedule || {};
    const status = schedule.enabled ? 'Ligado' : 'Desligado';
    const days = schedule.closedDays || [];
    const daysNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const closedDaysText = days.length > 0 ? days.map(d => daysNames[d]).join(', ') : 'Nenhum';

    const container = new ContainerBuilder()
        .setAccentColor(colors.primary)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Horário de Atendimento`),
            new TextDisplayBuilder().setContent([
                `**Status:** \`${status}\``,
                `**Abertura:** \`${schedule.open || '09:00'}\``,
                `**Fechamento:** \`${schedule.close || '18:00'}\``,
                `**Dias fechados:** \`${closedDaysText}\``,
                ``,
                `**Mensagem fora do horário:**`,
                schedule.closedMessage ? `\`${schedule.closedMessage.substring(0, 100)}\`` : '\`Padrão\`'
            ].join('\n'))
        )
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(
            new ButtonBuilder().setCustomId(`panel_schedule_toggle_${panelId}`).setLabel(schedule.enabled ? 'Desligar' : 'Ligar').setStyle(schedule.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`panel_schedule_times_${panelId}`).setLabel('Editar Horários').setStyle(ButtonStyle.Secondary).setDisabled(!schedule.enabled),
            new ButtonBuilder().setCustomId(`panel_schedule_days_${panelId}`).setLabel('Dias Fechados').setStyle(ButtonStyle.Secondary).setDisabled(!schedule.enabled),
            new ButtonBuilder().setCustomId(`panel_schedule_message_${panelId}`).setLabel('Mensagem').setStyle(ButtonStyle.Secondary).setDisabled(!schedule.enabled)
        ));

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`panel_editor_${panelId}`).setLabel('Voltar').setStyle(ButtonStyle.Secondary)
    );

    await safeReply(interaction, container, [actionRow]);
}


async function showClosedDaysSelect(interaction, panelId) {
    const guildId = getGuildId(interaction);
    const panel = await db.panels.getById(panelId, guildId);
    if (!panel) return;

    const schedule = panel.schedule || {};
    const closedDays = schedule.closedDays || [];
    const daysOptions = [
        { label: 'Domingo', value: '0', default: closedDays.includes(0) },
        { label: 'Segunda', value: '1', default: closedDays.includes(1) },
        { label: 'Terça', value: '2', default: closedDays.includes(2) },
        { label: 'Quarta', value: '3', default: closedDays.includes(3) },
        { label: 'Quinta', value: '4', default: closedDays.includes(4) },
        { label: 'Sexta', value: '5', default: closedDays.includes(5) },
        { label: 'Sábado', value: '6', default: closedDays.includes(6) }
    ];

    const container = new ContainerBuilder()
        .setAccentColor(colors.primary)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Dias Fechados`),
            new TextDisplayBuilder().setContent(`-# Selecione os dias que não haverá atendimento`)
        )
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`panel_schedule_days_set_${panelId}`)
                .setPlaceholder('Selecione os dias')
                .setMinValues(0)
                .setMaxValues(7)
                .addOptions(daysOptions)
        ));

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`panel_edit_schedule_${panelId}`).setLabel('Voltar').setStyle(ButtonStyle.Secondary)
    );

    await safeReply(interaction, container, [actionRow]);
}

async function showDeleteConfirm(interaction, panelId) {
    const guildId = getGuildId(interaction);
    const panel = await db.panels.getById(panelId, guildId);
    if (!panel) return;

    const container = new ContainerBuilder()
        .setAccentColor(colors.primary)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Excluir Painel`),
            new TextDisplayBuilder().setContent(`Tem certeza que deseja excluir **${panel.name}**?\n\n-# Esta ação não pode ser desfeita`)
        )
        .addSeparatorComponents(divider())
        .addActionRowComponents(row => row.addComponents(
            new ButtonBuilder().setCustomId(`panel_delete_confirm_${panelId}`).setLabel('Confirmar Exclusão').setStyle(ButtonStyle.Danger)
        ));

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`panel_editor_${panelId}`).setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
    );

    await safeReply(interaction, container, [actionRow]);
}


module.exports = {
    showTicketManagerDirect,
    showTicketManager,
    showEditPanelSelect,
    showPanelEditor,
    showOptionsEditor,
    showEditOptionSelect,
    showRemoveOptionSelect,
    showChannelEditor,
    showCategoryEditor,
    showPanelRolesEditor,
    showMessagesEditor,
    showMessageEditor,
    showPreferencesEditor,
    showPreferenceDetail,
    showButtonsConfig,
    showStyleConfig,
    showCloseSettings,
    showAIConfig,
    showScheduleEditor,
    showClosedDaysSelect,
    showDeleteConfirm
};
