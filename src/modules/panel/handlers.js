const { 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    MessageFlags
} = require('discord.js');
const { 
    showTicketManager, showPanelEditor, showOptionsEditor, showChannelEditor,
    showCategoryEditor, showPanelRolesEditor, showPreferencesEditor, showPreferenceDetail, showButtonsConfig, showStyleConfig, showCloseSettings,
    showEditPanelSelect, showEditOptionSelect, showRemoveOptionSelect, showDeleteConfirm,
    showAIConfig, showScheduleEditor, showClosedDaysSelect, showMessagesEditor, showMessageEditor
} = require('./views');
const { deployTicketPanel } = require('../tickets/deploy');
const db = require('../../database');
const { colors } = require('../../config');

const divider = () => new SeparatorBuilder().setDivider(true);

const defaultMessages = {
    panel: {
        content: '# Suporte\nSelecione uma opção abaixo para abrir um ticket e receber atendimento.',
        style: 'container'
    },
    open: {
        content: '# Ticket Aberto\nOlá {user}! Descreva seu problema detalhadamente.\n\n-# Um atendente irá te ajudar em breve.',
        style: 'container'
    },
    close: {
        content: '# Ticket Fechado\nEste ticket foi encerrado por {staff}.\n\n-# Obrigado por entrar em contato!',
        style: 'container'
    },
    notify: {
        content: '{user}, você tem uma atualização no seu ticket!',
        style: 'text'
    },
    add_user: {
        content: '{target} foi adicionado ao ticket por {staff}.',
        style: 'text'
    },
    remove_user: {
        content: '{target} foi removido do ticket por {staff}.',
        style: 'text'
    },
    claim: {
        content: '{staff} assumiu este ticket.',
        style: 'text'
    },
    transfer: {
        content: 'Ticket transferido de {old_staff} para {new_staff}.',
        style: 'text'
    },
    call: {
        content: '{staff} criou uma call de voz para este ticket.',
        style: 'text'
    },
    transcript: {
        content: '# Transcript\nO histórico deste ticket foi salvo.',
        style: 'container'
    }
};

function getMessageDefault(messageType) {
    return defaultMessages[messageType] || { content: '', style: 'text' };
}

async function handlePanelButton(interaction, client) {
    const id = interaction.customId;

    try {
        if (id === 'back_to_panel' || id === 'panel_tickets') return showTicketManager(interaction);
        if (id === 'panel_ticket_create') return showCreatePanelModal(interaction);
        if (id === 'panel_ticket_edit_select') return showEditPanelSelect(interaction);

        if (id.startsWith('panel_editor_')) return showPanelEditor(interaction, id.replace('panel_editor_', ''));
        if (id.startsWith('panel_edit_options_')) return showOptionsEditor(interaction, id.replace('panel_edit_options_', ''));
        if (id.startsWith('panel_add_option_')) return showAddOptionModal(interaction, id.replace('panel_add_option_', ''));
        if (id.startsWith('panel_edit_option_select_')) return showEditOptionSelect(interaction, id.replace('panel_edit_option_select_', ''));
        if (id.startsWith('panel_remove_option_select_')) return showRemoveOptionSelect(interaction, id.replace('panel_remove_option_select_', ''));
        if (id.startsWith('panel_toggle_status_')) return togglePanelStatus(interaction, id.replace('panel_toggle_status_', ''));
        if (id.startsWith('panel_toggle_mode_')) return togglePanelMode(interaction, id.replace('panel_toggle_mode_', ''));
        if (id.startsWith('panel_set_category_')) return showCategoryEditor(interaction, id.replace('panel_set_category_', ''));
        if (id.startsWith('panel_set_channel_')) return showChannelEditor(interaction, id.replace('panel_set_channel_', ''));
        if (id.startsWith('panel_edit_roles_')) return showPanelRolesEditor(interaction, id.replace('panel_edit_roles_', ''));
        if (id.startsWith('panel_edit_schedule_')) return showScheduleEditor(interaction, id.replace('panel_edit_schedule_', ''));
        if (id.startsWith('panel_edit_messages_select_')) return showMessagesEditor(interaction, id.replace('panel_edit_messages_select_', ''));
        if (id.startsWith('panel_edit_preferences_')) return showPreferencesEditor(interaction, id.replace('panel_edit_preferences_', ''));
        if (id.startsWith('panel_close_settings_')) return showCloseSettings(interaction, id.replace('panel_close_settings_', ''));
        if (id.startsWith('panel_pref_toggle_')) {
            const parts = id.replace('panel_pref_toggle_', '').split('_');
            return togglePreference(interaction, parts[0], parts[1]);
        }
        if (id.startsWith('panel_pref_style_')) {
            const parts = id.replace('panel_pref_style_', '').split('_');
            return setStylePreference(interaction, parts[0], parts[1], parts[2]);
        }
        if (id.startsWith('panel_edit_ai_')) return showAIConfig(interaction, id.replace('panel_edit_ai_', ''));
        if (id.startsWith('panel_ai_toggle_')) return toggleAI(interaction, id.replace('panel_ai_toggle_', ''));
        if (id.startsWith('panel_ai_context_')) return toggleAIContext(interaction, id.replace('panel_ai_context_', ''));
        if (id.startsWith('panel_ai_instructions_')) return showAIInstructionsModal(interaction, id.replace('panel_ai_instructions_', ''));
        if (id.startsWith('panel_schedule_toggle_')) return toggleSchedule(interaction, id.replace('panel_schedule_toggle_', ''));
        if (id.startsWith('panel_schedule_times_')) return showScheduleTimesModal(interaction, id.replace('panel_schedule_times_', ''));
        if (id.startsWith('panel_schedule_days_')) {
            if (id.includes('_set_')) return;
            return showClosedDaysSelect(interaction, id.replace('panel_schedule_days_', ''));
        }
        if (id.startsWith('panel_schedule_message_')) return showScheduleMessageModal(interaction, id.replace('panel_schedule_message_', ''));
        if (id.startsWith('panel_msg_style_')) {
            const parts = id.replace('panel_msg_style_', '').split('_');
            return toggleMessageStyle(interaction, parts[0], parts[1]);
        }
        if (id.startsWith('panel_msg_content_')) {
            const parts = id.replace('panel_msg_content_', '').split('_');
            return showMessageContentModal(interaction, parts[0], parts[1]);
        }
        if (id.startsWith('panel_msg_button_')) {
            const parts = id.replace('panel_msg_button_', '').split('_');
            return showMessageButtonModal(interaction, parts[0], parts[1]);
        }
        if (id.startsWith('panel_msg_preview_')) {
            const parts = id.replace('panel_msg_preview_', '').split('_');
            return showMessagePreview(interaction, parts[0], parts[1]);
        }
        if (id.startsWith('panel_deploy_')) return deployTicketPanel(interaction, client, id.replace('panel_deploy_', ''));
        if (id.startsWith('panel_delete_confirm_')) return deletePanel(interaction, id.replace('panel_delete_confirm_', ''));
        if (id.startsWith('panel_delete_')) return showDeleteConfirm(interaction, id.replace('panel_delete_', ''));
    } catch (error) {
        console.error('[Panel] Erro:', error);
    }
}


async function handlePanelSelect(interaction, client) {
    const id = interaction.customId;
    const value = interaction.values[0];

    try {
        if (id === 'panel_edit_select') return showPanelEditor(interaction, value);
        if (id.startsWith('panel_option_edit_')) return showEditOptionModal(interaction, id.replace('panel_option_edit_', ''), parseInt(value));
        if (id.startsWith('panel_option_remove_')) return removeOption(interaction, id.replace('panel_option_remove_', ''), parseInt(value));
        if (id.startsWith('panel_channel_set_')) return setPanelChannel(interaction, id.replace('panel_channel_set_', ''), value);
        if (id.startsWith('panel_logs_channel_set_')) return setLogsChannel(interaction, id.replace('panel_logs_channel_set_', ''), value);
        if (id.startsWith('panel_category_set_')) return setPanelCategory(interaction, id.replace('panel_category_set_', ''), value);
        if (id.startsWith('panel_role_set_')) {
            const parts = id.replace('panel_role_set_', '').split('_');
            const panelId = parts[0];
            const roleType = parts[1];
            return setPanelRole(interaction, panelId, roleType, value);
        }
        if (id.startsWith('panel_pref_select_')) {
            const panelId = id.replace('panel_pref_select_', '');
            if (value === 'closeSettings') return showCloseSettings(interaction, panelId);
            return showPreferenceDetail(interaction, panelId, value);
        }
        if (id.startsWith('panel_style_select_')) return showPreferenceDetail(interaction, id.replace('panel_style_select_', ''), value);
        if (id.startsWith('panel_close_select_')) return showPreferenceDetail(interaction, id.replace('panel_close_select_', ''), value);
        if (id.startsWith('panel_pref_buttons_')) {
            const parts = id.replace('panel_pref_buttons_', '').split('_');
            return saveDisabledButtons(interaction, parts[0], parts[1], interaction.values);
        }
        if (id.startsWith('panel_message_type_')) {
            const panelId = id.replace('panel_message_type_', '');
            const textOnlyMessages = ['notify', 'add_user', 'remove_user', 'claim', 'transfer', 'call', 'transcript'];
            if (textOnlyMessages.includes(value)) {
                return showMessageContentModal(interaction, panelId, value);
            }
            return showMessageEditor(interaction, panelId, value);
        }
        if (id.startsWith('panel_schedule_days_set_')) return setClosedDays(interaction, id.replace('panel_schedule_days_set_', ''), interaction.values);
    } catch (error) {
        console.error('[Panel] Erro:', error);
    }
}

async function handlePanelModal(interaction, client) {
    const id = interaction.customId;

    try {
        if (id === 'panel_create_modal') return createPanel(interaction);
        if (id.startsWith('panel_add_option_modal_')) return addOption(interaction, id.replace('panel_add_option_modal_', ''));
        if (id.startsWith('panel_edit_option_modal_')) {
            const parts = id.replace('panel_edit_option_modal_', '').split('_');
            return updateOption(interaction, parts[0], parseInt(parts[1]));
        }
        if (id.startsWith('panel_schedule_modal_')) return savePanelSchedule(interaction, id.replace('panel_schedule_modal_', ''));
        if (id.startsWith('panel_messages_modal_')) return savePanelMessages(interaction, id.replace('panel_messages_modal_', ''));
        if (id.startsWith('panel_ai_instructions_modal_')) return saveAIInstructions(interaction, id.replace('panel_ai_instructions_modal_', ''));
        if (id.startsWith('panel_schedule_times_modal_')) return saveScheduleTimes(interaction, id.replace('panel_schedule_times_modal_', ''));
        if (id.startsWith('panel_schedule_message_modal_')) return saveScheduleMessage(interaction, id.replace('panel_schedule_message_modal_', ''));
        if (id.startsWith('panel_msg_content_modal_')) {
            const parts = id.replace('panel_msg_content_modal_', '').split('_');
            return saveMessageContent(interaction, parts[0], parts[1]);
        }
        if (id.startsWith('panel_msg_button_modal_')) {
            const parts = id.replace('panel_msg_button_modal_', '').split('_');
            return saveMessageButton(interaction, parts[0], parts[1]);
        }
    } catch (error) {
        console.error('[Panel] Erro:', error);
    }
}

function showCreatePanelModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('panel_create_modal')
        .setTitle('Criar Novo Painel de Ticket')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('name').setLabel('Nome do Painel').setPlaceholder('Ex: Suporte Geral').setStyle(TextInputStyle.Short).setMaxLength(32).setRequired(true)
            )
        );
    return interaction.showModal(modal);
}

async function createPanel(interaction) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const name = interaction.fields.getTextInputValue('name');
    const panelId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    
    const existingPanels = await db.panels.getAll(guildId);
    if (existingPanels.length >= 10) {
        return interaction.reply({ content: 'Máximo de 10 painéis atingido.', ephemeral: true });
    }

    await db.panels.create({
        panelId,
        name, 
        enabled: true, 
        mode: 'channel', 
        options: [], 
        categoryId: null, 
        channelId: null,
        roles: { staff: null, admin: null }, 
        schedule: { enabled: false, open: '09:00', close: '18:00' },
        messages: { title: name, description: 'Selecione uma opção para abrir um ticket' },
        preferences: {}
    }, guildId);
    
    console.log(`[Panel] Painel ${panelId} criado para guild ${guildId}`);
    return showPanelEditor(interaction, panelId);
}


async function togglePanelStatus(interaction, panelId) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const panel = await db.panels.getById(panelId, guildId);
    await db.panels.update(panelId, { enabled: !panel?.enabled }, guildId);
    await showPanelEditor(interaction, panelId);
}

async function togglePanelMode(interaction, panelId) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const panel = await db.panels.getById(panelId, guildId);
    const newMode = panel?.mode === 'channel' ? 'thread' : 'channel';
    await db.panels.update(panelId, { mode: newMode }, guildId);
    await showPanelEditor(interaction, panelId);
}

async function deletePanel(interaction, panelId) {
    const guildId = interaction.guild?.id || interaction.guildId;
    await db.panels.delete(panelId, guildId);
    await showTicketManager(interaction);
}

function showAddOptionModal(interaction, panelId) {
    const modal = new ModalBuilder()
        .setCustomId(`panel_add_option_modal_${panelId}`)
        .setTitle('Adicionar Nova Opção')
        .addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel('Nome da Opção').setPlaceholder('Ex: Suporte para Vendas').setStyle(TextInputStyle.Short).setMaxLength(32).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('Descrição da Opção').setPlaceholder('Clique aqui para tirar dúvidas').setStyle(TextInputStyle.Paragraph).setMaxLength(100).setRequired(true))
        );
    return interaction.showModal(modal);
}

async function addOption(interaction, panelId) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const name = interaction.fields.getTextInputValue('name');
    const description = interaction.fields.getTextInputValue('description');
    const panel = await db.panels.getById(panelId, guildId);
    const options = panel?.options || [];
    
    if (options.length >= 25) {
        return interaction.reply({ content: 'Máximo de 25 opções atingido.', ephemeral: true });
    }
    
    options.push({ name, description, createdAt: Date.now() });
    await db.panels.update(panelId, { options }, guildId);
    
    return showOptionsEditor(interaction, panelId);
}

async function showEditOptionModal(interaction, panelId, optIndex) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const panel = await db.panels.getById(panelId, guildId);
    const options = panel?.options || [];
    const opt = options[optIndex];
    if (!opt) return;

    const modal = new ModalBuilder()
        .setCustomId(`panel_edit_option_modal_${panelId}_${optIndex}`)
        .setTitle('Editar Opção')
        .addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel('Nome da Opção').setValue(opt.name).setStyle(TextInputStyle.Short).setMaxLength(32).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('Descrição da Opção').setValue(opt.description).setStyle(TextInputStyle.Paragraph).setMaxLength(100).setRequired(true))
        );
    return interaction.showModal(modal);
}

async function updateOption(interaction, panelId, optIndex) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const name = interaction.fields.getTextInputValue('name');
    const description = interaction.fields.getTextInputValue('description');
    const panel = await db.panels.getById(panelId, guildId);
    const options = panel?.options || [];
    options[optIndex] = { name, description, updatedAt: Date.now() };
    await db.panels.update(panelId, { options }, guildId);
    
    return showOptionsEditor(interaction, panelId);
}

async function removeOption(interaction, panelId, optIndex) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const panel = await db.panels.getById(panelId, guildId);
    const options = panel?.options || [];
    options.splice(optIndex, 1);
    await db.panels.update(panelId, { options }, guildId);
    await showOptionsEditor(interaction, panelId);
}


async function setPanelChannel(interaction, panelId, channelId) {
    const guildId = interaction.guild?.id || interaction.guildId;
    await db.panels.update(panelId, { channelId }, guildId);
    await showChannelEditor(interaction, panelId);
}

async function setLogsChannel(interaction, panelId, channelId) {
    const guildId = interaction.guild?.id || interaction.guildId;
    console.log('[Settings] Salvando canal de logs:', channelId, 'para guild:', guildId);
    const result = await db.settings.update({ 'channels.logs': channelId }, guildId);
    console.log('[Settings] Resultado:', JSON.stringify(result?.channels));
    await showChannelEditor(interaction, panelId);
}

async function setPanelCategory(interaction, panelId, categoryId) {
    const guildId = interaction.guild?.id || interaction.guildId;
    await db.panels.update(panelId, { categoryId }, guildId);
    await showPanelEditor(interaction, panelId);
}

async function setPanelRole(interaction, panelId, roleType, roleId) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const panel = await db.panels.getById(panelId, guildId);
    const roles = panel?.roles || {};
    roles[roleType] = roleId;
    await db.panels.update(panelId, { roles }, guildId);
    await showPanelRolesEditor(interaction, panelId);
}

async function togglePreference(interaction, panelId, pref) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const panel = await db.panels.getById(panelId, guildId);
    const preferences = panel?.preferences || {};
    const current = preferences[pref] ?? true;
    preferences[pref] = !current;
    await db.panels.update(panelId, { preferences }, guildId);
    await showPreferenceDetail(interaction, panelId, pref);
}

async function saveDisabledButtons(interaction, panelId, prefKey, values) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const panel = await db.panels.getById(panelId, guildId);
    const preferences = panel?.preferences || {};
    preferences[`${prefKey}Disabled`] = values;
    await db.panels.update(panelId, { preferences }, guildId);
    await showButtonsConfig(interaction, panelId, prefKey, { name: prefKey === 'memberSetup' ? 'Setup Membro' : 'Setup Atendente', desc: 'Configuração salva!' });
}

async function setStylePreference(interaction, panelId, prefKey, style) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const panel = await db.panels.getById(panelId, guildId);
    const preferences = panel?.preferences || {};
    preferences[prefKey] = style === 'select' ? 'select' : 'buttons';
    await db.panels.update(panelId, { preferences }, guildId);
    const prefInfo = {
        panelStyle: { name: 'Estilo do Painel', desc: 'Define como as opções do painel de tickets serão exibidas.' },
        staffPanelStyle: { name: 'Estilo Painel Atendente', desc: 'Define como as ações do painel do atendente serão exibidas.' },
        memberPanelStyle: { name: 'Estilo Painel Membro', desc: 'Define como as ações do painel do membro serão exibidas.' }
    };
    await showStyleConfig(interaction, panelId, prefKey, prefInfo[prefKey]);
}

async function savePanelSchedule(interaction, panelId) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const open = interaction.fields.getTextInputValue('open');
    const close = interaction.fields.getTextInputValue('close');
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (!timeRegex.test(open) || !timeRegex.test(close)) {
        return interaction.reply({ content: 'Formato inválido. Use HH:MM', ephemeral: true });
    }
    
    await db.panels.update(panelId, { schedule: { enabled: true, open, close } }, guildId);
    
    return showScheduleEditor(interaction, panelId);
}

async function savePanelMessages(interaction, panelId) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const title = interaction.fields.getTextInputValue('title');
    const description = interaction.fields.getTextInputValue('description');
    await db.panels.update(panelId, { messages: { title, description } }, guildId);
    
    return showPanelEditor(interaction, panelId);
}

async function toggleAI(interaction, panelId) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const panel = await db.panels.getById(panelId, guildId);
    const ai = panel?.ai || {};
    ai.enabled = !ai.enabled;
    await db.panels.update(panelId, { ai }, guildId);
    await showAIConfig(interaction, panelId);
}

async function toggleAIContext(interaction, panelId) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const panel = await db.panels.getById(panelId, guildId);
    const ai = panel?.ai || {};
    ai.useContext = ai.useContext === false ? true : false;
    await db.panels.update(panelId, { ai }, guildId);
    await showAIConfig(interaction, panelId);
}

async function showAIInstructionsModal(interaction, panelId) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const panel = await db.panels.getById(panelId, guildId);
    const ai = panel?.ai || {};

    const modal = new ModalBuilder()
        .setCustomId(`panel_ai_instructions_modal_${panelId}`)
        .setTitle('Instruções da IA')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('instructions')
                    .setLabel('Instruções Adicionais')
                    .setPlaceholder('Ex: Seja educado e responda em português...')
                    .setValue(ai.instructions || '')
                    .setStyle(TextInputStyle.Paragraph)
                    .setMaxLength(1000)
                    .setRequired(false)
            )
        );
    return interaction.showModal(modal);
}

async function saveAIInstructions(interaction, panelId) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const instructions = interaction.fields.getTextInputValue('instructions');
    const panel = await db.panels.getById(panelId, guildId);
    const ai = panel?.ai || {};
    ai.instructions = instructions;
    await db.panels.update(panelId, { ai }, guildId);
    
    return showAIConfig(interaction, panelId);
}


async function toggleSchedule(interaction, panelId) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const panel = await db.panels.getById(panelId, guildId);
    const schedule = panel?.schedule || {};
    schedule.enabled = !schedule.enabled;
    await db.panels.update(panelId, { schedule }, guildId);
    await showScheduleEditor(interaction, panelId);
}

async function showScheduleTimesModal(interaction, panelId) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const panel = await db.panels.getById(panelId, guildId);
    const schedule = panel?.schedule || {};

    const modal = new ModalBuilder()
        .setCustomId(`panel_schedule_times_modal_${panelId}`)
        .setTitle('Horários de Atendimento')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('open').setLabel('Horário de Abertura (HH:MM)').setPlaceholder('Ex: 09:00').setValue(schedule.open || '09:00').setStyle(TextInputStyle.Short).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('close').setLabel('Horário de Fechamento (HH:MM)').setPlaceholder('Ex: 18:00').setValue(schedule.close || '18:00').setStyle(TextInputStyle.Short).setRequired(true)
            )
        );
    return interaction.showModal(modal);
}

async function saveScheduleTimes(interaction, panelId) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const open = interaction.fields.getTextInputValue('open');
    const close = interaction.fields.getTextInputValue('close');
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (!timeRegex.test(open) || !timeRegex.test(close)) {
        return interaction.reply({ content: 'Formato inválido. Use HH:MM', ephemeral: true });
    }
    
    const panel = await db.panels.getById(panelId, guildId);
    const schedule = panel?.schedule || {};
    schedule.open = open;
    schedule.close = close;
    await db.panels.update(panelId, { schedule }, guildId);
    
    return showScheduleEditor(interaction, panelId);
}

async function showScheduleMessageModal(interaction, panelId) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const panel = await db.panels.getById(panelId, guildId);
    const schedule = panel?.schedule || {};

    const modal = new ModalBuilder()
        .setCustomId(`panel_schedule_message_modal_${panelId}`)
        .setTitle('Mensagem Fora do Horário')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('message').setLabel('Mensagem').setPlaceholder('Ex: Estamos fechados. Volte no horário de atendimento.').setValue(schedule.closedMessage || '').setStyle(TextInputStyle.Paragraph).setMaxLength(500).setRequired(false)
            )
        );
    return interaction.showModal(modal);
}

async function saveScheduleMessage(interaction, panelId) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const message = interaction.fields.getTextInputValue('message');
    const panel = await db.panels.getById(panelId, guildId);
    const schedule = panel?.schedule || {};
    schedule.closedMessage = message;
    await db.panels.update(panelId, { schedule }, guildId);
    
    return showScheduleEditor(interaction, panelId);
}

async function setClosedDays(interaction, panelId, values) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const days = values.map(v => parseInt(v));
    const panel = await db.panels.getById(panelId, guildId);
    const schedule = panel?.schedule || {};
    schedule.closedDays = days;
    await db.panels.update(panelId, { schedule }, guildId);
    await showScheduleEditor(interaction, panelId);
}


async function toggleMessageStyle(interaction, panelId, messageType) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const panel = await db.panels.getById(panelId, guildId);
    const messages = panel?.messages || {};
    const msg = messages[messageType] || {};
    const defaults = getMessageDefault(messageType);
    const styles = ['embed', 'text', 'container'];
    const currentIndex = styles.indexOf(msg.style || defaults.style);
    const newStyle = styles[(currentIndex + 1) % 3];
    
    if (!messages[messageType]) messages[messageType] = {};
    messages[messageType].style = newStyle;
    await db.panels.update(panelId, { messages }, guildId);
    return showMessageEditor(interaction, panelId, messageType);
}

async function showMessageContentModal(interaction, panelId, messageType) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const panel = await db.panels.getById(panelId, guildId);
    const messages = panel?.messages || {};
    const msg = messages[messageType] || {};
    const defaults = getMessageDefault(messageType);
    const style = msg.style || defaults.style;
    const content = msg.content || defaults.content;

    const typeLabels = {
        panel: 'Painel', open: 'Abertura', close: 'Fechamento', notify: 'Notificação',
        add_user: 'Adicionar Usuário', remove_user: 'Remover Usuário', claim: 'Assumir Ticket',
        transfer: 'Transferir', call: 'Call', transcript: 'Transcript'
    };

    const textOnlyMessages = ['notify', 'add_user', 'remove_user', 'claim', 'transfer', 'call', 'transcript'];
    const isTextOnly = textOnlyMessages.includes(messageType);

    const modal = new ModalBuilder()
        .setCustomId(`panel_msg_content_modal_${panelId}_${messageType}`)
        .setTitle(`Editar Mensagem de ${typeLabels[messageType]}`);

    if (messageType === 'notify') {
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('notify_user').setLabel('Notificação para Usuário').setValue(msg.notify_user || 'Olá {user_mention}, você está sendo notificado sobre o seu ticket `{channel_name}`. A equipe de suporte está aguardando sua resposta.').setStyle(TextInputStyle.Paragraph).setMaxLength(2000).setRequired(false)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('notify_staff').setLabel('Notificação para Staff').setValue(msg.notify_staff || '{user_mention} está solicitando sua atenção no ticket `{channel_name}`.').setStyle(TextInputStyle.Paragraph).setMaxLength(2000).setRequired(false)
            )
        );
    } else if (messageType === 'add_user') {
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('channel_msg').setLabel('Mensagem ao adicionar').setValue(msg.channel_msg || '{alvo_mention} foi adicionado a este ticket por {autor_mention}.').setStyle(TextInputStyle.Paragraph).setMaxLength(2000).setRequired(false)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('dm_msg').setLabel('Mensagem na DM ao adicionar').setValue(msg.dm_msg || 'Olá {alvo_mention}, você foi adicionado ao ticket `{channel_name}` por {autor_mention}.').setStyle(TextInputStyle.Paragraph).setMaxLength(2000).setRequired(false)
            )
        );
    } else if (messageType === 'remove_user') {
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('channel_msg').setLabel('Mensagem ao remover').setValue(msg.channel_msg || '{alvo_mention} foi removido deste ticket por {autor_mention}.').setStyle(TextInputStyle.Paragraph).setMaxLength(2000).setRequired(false)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('dm_msg').setLabel('Mensagem na DM ao remover').setValue(msg.dm_msg || 'Olá {alvo_mention}, você foi removido do ticket `{channel_name}` por {autor_mention}.').setStyle(TextInputStyle.Paragraph).setMaxLength(2000).setRequired(false)
            )
        );
    } else if (messageType === 'claim') {
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('channel_msg').setLabel('Mensagem no canal do ticket').setValue(msg.channel_msg || '{autor_mention} assumiu o atendimento deste ticket.').setStyle(TextInputStyle.Paragraph).setMaxLength(2000).setRequired(false)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('dm_msg').setLabel('Mensagem na DM do usuário').setValue(msg.dm_msg || 'Olá {user_mention}, o atendente {autor_mention} assumiu seu ticket `{channel_name}`.').setStyle(TextInputStyle.Paragraph).setMaxLength(2000).setRequired(false)
            )
        );
    } else if (messageType === 'transfer') {
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('channel_msg').setLabel('Mensagem ao transferir').setValue(msg.channel_msg || 'O ticket foi transferido por {autor_mention}.').setStyle(TextInputStyle.Paragraph).setMaxLength(2000).setRequired(false)
            )
        );
    } else if (messageType === 'call') {
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('channel_msg').setLabel('Mensagem no ticket ao criar call').setValue(msg.channel_msg || 'Uma call de voz foi iniciada para este ticket por {autor_mention}.').setStyle(TextInputStyle.Paragraph).setMaxLength(2000).setRequired(false)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('dm_msg').setLabel('Mensagem na DM ao criar call').setValue(msg.dm_msg || 'Olá! Uma call de voz foi criada para o seu ticket `{channel_name}`.').setStyle(TextInputStyle.Paragraph).setMaxLength(2000).setRequired(false)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('request_msg').setLabel('Mensagem ao solicitar call').setValue(msg.request_msg || 'O usuário {autor_mention} solicitou a criação de uma call.').setStyle(TextInputStyle.Paragraph).setMaxLength(2000).setRequired(false)
            )
        );
    } else if (messageType === 'transcript') {
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('close_msg').setLabel('Mensagem (Fechamento de Ticket)').setValue(msg.close_msg || 'Olá {user_mention}, aqui está o transcript do seu ticket `{channel_name}` no servidor `{guild_name}`.').setStyle(TextInputStyle.Paragraph).setMaxLength(2000).setRequired(false)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('request_msg').setLabel('Mensagem (Solicitação)').setValue(msg.request_msg || 'Olá {user_mention}, aqui está o transcript que você solicitou para o ticket `{channel_name}` no servidor `{guild_name}`.').setStyle(TextInputStyle.Paragraph).setMaxLength(2000).setRequired(false)
            )
        );
    } else if (style === 'text') {
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('content').setLabel('Conteúdo').setValue(content).setStyle(TextInputStyle.Paragraph).setMaxLength(2000).setRequired(false)
            )
        );
    } else if (style === 'embed') {
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('content').setLabel('Conteúdo').setValue(content).setStyle(TextInputStyle.Paragraph).setMaxLength(2000).setRequired(false)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('image').setLabel('URL da Imagem').setPlaceholder('https://i.imgur.com/imagem.png').setValue(msg.image || '').setStyle(TextInputStyle.Short).setRequired(false)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('thumbnail').setLabel('URL da Thumbnail').setPlaceholder('https://i.imgur.com/thumbnail.png').setValue(msg.thumbnail || '').setStyle(TextInputStyle.Short).setRequired(false)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('color').setLabel('Cor (Hex)').setPlaceholder('#FFFFFF').setValue(msg.color || '').setStyle(TextInputStyle.Short).setRequired(false)
            )
        );
    } else {
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('content').setLabel('Conteúdo').setValue(content).setStyle(TextInputStyle.Paragraph).setMaxLength(2000).setRequired(false)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('image').setLabel('URL da Imagem').setPlaceholder('https://i.imgur.com/imagem.png').setValue(msg.image || '').setStyle(TextInputStyle.Short).setRequired(false)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('color').setLabel('Cor (Hex)').setPlaceholder('#FFFFFF').setValue(msg.color || '').setStyle(TextInputStyle.Short).setRequired(false)
            )
        );
    }

    return interaction.showModal(modal);
}

async function showMessageButtonModal(interaction, panelId, messageType) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const panel = await db.panels.getById(panelId, guildId);
    const messages = panel?.messages || {};
    const msg = messages[messageType] || {};
    const btn = msg.button || {};

    const modal = new ModalBuilder()
        .setCustomId(`panel_msg_button_modal_${panelId}_${messageType}`)
        .setTitle('Editar Botão')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('text').setLabel('Texto do Botão').setPlaceholder('Abrir Ticket').setValue(btn.text || '').setStyle(TextInputStyle.Short).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('emoji').setLabel('Emoji do Botão (Opcional)').setPlaceholder('🎫').setValue(btn.emoji || '').setStyle(TextInputStyle.Short).setRequired(false)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('style').setLabel('Estilo (verde, cinza, vermelho, azul)').setPlaceholder('verde').setValue(btn.style || 'verde').setStyle(TextInputStyle.Short).setRequired(true)
            )
        );

    return interaction.showModal(modal);
}

async function saveMessageContent(interaction, panelId, messageType) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const textOnlyMessages = ['notify', 'add_user', 'remove_user', 'claim', 'transfer', 'call', 'transcript'];
    
    const panel = await db.panels.getById(panelId, guildId);
    const messages = panel?.messages || {};
    if (!messages[messageType]) messages[messageType] = {};
    
    if (messageType === 'notify') {
        try { messages[messageType].notify_user = interaction.fields.getTextInputValue('notify_user'); } catch {}
        try { messages[messageType].notify_staff = interaction.fields.getTextInputValue('notify_staff'); } catch {}
    } else if (messageType === 'add_user' || messageType === 'remove_user' || messageType === 'claim') {
        try { messages[messageType].channel_msg = interaction.fields.getTextInputValue('channel_msg'); } catch {}
        try { messages[messageType].dm_msg = interaction.fields.getTextInputValue('dm_msg'); } catch {}
    } else if (messageType === 'transfer') {
        try { messages[messageType].channel_msg = interaction.fields.getTextInputValue('channel_msg'); } catch {}
    } else if (messageType === 'call') {
        try { messages[messageType].channel_msg = interaction.fields.getTextInputValue('channel_msg'); } catch {}
        try { messages[messageType].dm_msg = interaction.fields.getTextInputValue('dm_msg'); } catch {}
        try { messages[messageType].request_msg = interaction.fields.getTextInputValue('request_msg'); } catch {}
    } else if (messageType === 'transcript') {
        try { messages[messageType].close_msg = interaction.fields.getTextInputValue('close_msg'); } catch {}
        try { messages[messageType].request_msg = interaction.fields.getTextInputValue('request_msg'); } catch {}
    } else {
        try { messages[messageType].content = interaction.fields.getTextInputValue('content'); } catch {}
        try { messages[messageType].image = interaction.fields.getTextInputValue('image'); } catch {}
        try { messages[messageType].thumbnail = interaction.fields.getTextInputValue('thumbnail'); } catch {}
        try { messages[messageType].color = interaction.fields.getTextInputValue('color'); } catch {}
    }

    await db.panels.update(panelId, { messages }, guildId);

    if (textOnlyMessages.includes(messageType)) {
        return showMessagesEditor(interaction, panelId);
    }
    return showMessageEditor(interaction, panelId, messageType);
}

async function saveMessageButton(interaction, panelId, messageType) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const text = interaction.fields.getTextInputValue('text');
    const emoji = interaction.fields.getTextInputValue('emoji');
    const style = interaction.fields.getTextInputValue('style').toLowerCase();

    const styleMap = { verde: 'Success', cinza: 'Secondary', vermelho: 'Danger', azul: 'Primary' };

    const panel = await db.panels.getById(panelId, guildId);
    const messages = panel?.messages || {};
    if (!messages[messageType]) messages[messageType] = {};
    messages[messageType].button = {
        text,
        emoji: emoji || null,
        style: styleMap[style] || 'Secondary'
    };
    await db.panels.update(panelId, { messages }, guildId);

    return showMessageEditor(interaction, panelId, messageType);
}

async function showMessagePreview(interaction, panelId, messageType) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const panel = await db.panels.getById(panelId, guildId);
    const messages = panel?.messages || {};
    const msg = messages[messageType] || {};
    const defaults = getMessageDefault(messageType);
    const style = msg.style || defaults.style;

    if (messageType === 'panel') {
        const options = panel?.options || [];
        const panelStyle = panel?.preferences?.panelStyle || 'buttons';
        
        const defaultContent = `# ${panel?.name || 'Painel'}\n\nSelecione uma opção abaixo para abrir um ticket.`;
        const content = msg.content || defaultContent;

        if (style === 'text') {
            const components = [];
            if (panelStyle === 'select' || options.length > 5) {
                const selectOptions = options.map((opt, i) => ({ label: opt.name, description: opt.description?.substring(0, 50) || '', value: `preview_${i}` }));
                if (selectOptions.length > 0) {
                    components.push(new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder().setCustomId('preview_select').setPlaceholder('Selecione uma opção').addOptions(selectOptions).setDisabled(true)
                    ));
                }
            } else {
                for (let i = 0; i < options.length; i += 5) {
                    const chunk = options.slice(i, i + 5);
                    const row = new ActionRowBuilder();
                    chunk.forEach((opt, index) => {
                        row.addComponents(new ButtonBuilder().setCustomId(`preview_${i + index}`).setLabel(opt.name).setStyle(ButtonStyle.Secondary).setDisabled(true));
                    });
                    components.push(row);
                }
            }
            return interaction.reply({ content, components, ephemeral: true });
        }

        if (style === 'embed') {
            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder().setDescription(content);
            if (msg.color) embed.setColor(parseInt(msg.color.replace('#', ''), 16));
            if (msg.image) embed.setImage(msg.image);
            if (msg.thumbnail) embed.setThumbnail(msg.thumbnail);

            const components = [];
            if (panelStyle === 'select' || options.length > 5) {
                const selectOptions = options.map((opt, i) => ({ label: opt.name, description: opt.description?.substring(0, 50) || '', value: `preview_${i}` }));
                if (selectOptions.length > 0) {
                    components.push(new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder().setCustomId('preview_select').setPlaceholder('Selecione uma opção').addOptions(selectOptions).setDisabled(true)
                    ));
                }
            } else {
                for (let i = 0; i < options.length; i += 5) {
                    const chunk = options.slice(i, i + 5);
                    const row = new ActionRowBuilder();
                    chunk.forEach((opt, index) => {
                        row.addComponents(new ButtonBuilder().setCustomId(`preview_${i + index}`).setLabel(opt.name).setStyle(ButtonStyle.Secondary).setDisabled(true));
                    });
                    components.push(row);
                }
            }
            return interaction.reply({ embeds: [embed], components, ephemeral: true });
        }

        const container = new ContainerBuilder().setAccentColor(parseInt((msg.color || '#FFFFFF').replace('#', ''), 16));
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

        if (panelStyle === 'select' || options.length > 5) {
            const selectOptions = options.map((opt, i) => ({ label: opt.name, description: opt.description?.substring(0, 50) || '', value: `preview_${i}` }));
            if (selectOptions.length > 0) {
                container.addActionRowComponents(row => row.addComponents(
                    new StringSelectMenuBuilder().setCustomId('preview_select').setPlaceholder('Selecione uma opção').addOptions(selectOptions).setDisabled(true)
                ));
            }
        } else {
            for (let i = 0; i < options.length; i += 5) {
                const chunk = options.slice(i, i + 5);
                container.addActionRowComponents(row => {
                    chunk.forEach((opt, index) => {
                        row.addComponents(new ButtonBuilder().setCustomId(`preview_${i + index}`).setLabel(opt.name).setStyle(ButtonStyle.Secondary).setDisabled(true));
                    });
                    return row;
                });
            }
        }
        return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
    }

    const content = msg.content || defaults.content;

    if (style === 'text') {
        return interaction.reply({ content, ephemeral: true });
    }

    if (style === 'container') {
        const container = new ContainerBuilder().setAccentColor(parseInt((msg.color || '#FFFFFF').replace('#', ''), 16));
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
        return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
    }

    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder().setDescription(content);
    if (msg.color) embed.setColor(parseInt(msg.color.replace('#', ''), 16));
    if (msg.image) embed.setImage(msg.image);
    if (msg.thumbnail) embed.setThumbnail(msg.thumbnail);

    return interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { handlePanelButton, handlePanelSelect, handlePanelModal };
