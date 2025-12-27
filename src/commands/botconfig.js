const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, StringSelectMenuBuilder, SectionBuilder, ThumbnailBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../utils/permissions');
const db = require('../database');

const DEFAULT_STATUS = [
    { name: 'tickets', type: 3 },
    { name: 'github.com/tsvn27', type: 0 },
    { name: 'coded by kayo', type: 0 },
    { name: 'suporte', type: 2 }
];

async function getStatus(guildId) {
    const settings = await db.settings.fetch(guildId);
    return settings?.botStatus || DEFAULT_STATUS;
}

async function saveStatus(guildId, status) {
    await db.settings.update({ botStatus: status }, guildId);
}

function buildConfigPanel(client) {
    const activity = client.user.presence?.activities?.[0];
    const statusText = activity?.name || 'Nenhum';
    const avatarUrl = client.user.displayAvatarURL({ size: 128 });

    const section = new SectionBuilder()
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Configurações`),
            new TextDisplayBuilder().setContent([
                `**Nome** \`${client.user.displayName}\``,
                `**Status** \`${statusText}\``
            ].join('\n'))
        );
    
    return new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addSectionComponents(section)
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addActionRowComponents(row => row.addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('botconfig_select')
                .setPlaceholder('Selecione uma opção')
                .addOptions([
                    { label: 'Nome', description: 'Alterar nome do bot', value: 'name' },
                    { label: 'Foto', description: 'Alterar avatar do bot', value: 'avatar' },
                    { label: 'Status Rotativos', description: 'Editar os 4 status', value: 'status' },
                    { label: 'Banner', description: 'Alterar banner do bot', value: 'banner' }
                ])
        ));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botconfig')
        .setDescription('Configurar o bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        if (!isAdmin(interaction.member)) {
            const container = new ContainerBuilder()
                .setAccentColor(0xFFFFFF)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Sem permissão`));
            return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        await interaction.reply({ components: [buildConfigPanel(client)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
    },

    async handleSelect(interaction, client) {
        const value = interaction.values[0];
        const guildId = interaction.guildId;

        if (value === 'status') {
            const status = await getStatus(guildId);
            const typeNames = { 0: 'playing', 2: 'listening', 3: 'watching' };
            
            const modal = new ModalBuilder()
                .setCustomId('botconfig_modal_status')
                .setTitle('Status Rotativos')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('status1').setLabel('Status 1 (tipo:texto)').setStyle(TextInputStyle.Short).setValue(`${typeNames[status[0]?.type] || 'watching'}:${status[0]?.name || 'tickets'}`).setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('status2').setLabel('Status 2 (tipo:texto)').setStyle(TextInputStyle.Short).setValue(`${typeNames[status[1]?.type] || 'playing'}:${status[1]?.name || 'github.com/tsvn27'}`).setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('status3').setLabel('Status 3 (tipo:texto)').setStyle(TextInputStyle.Short).setValue(`${typeNames[status[2]?.type] || 'playing'}:${status[2]?.name || 'coded by kayo'}`).setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('status4').setLabel('Status 4 (tipo:texto)').setStyle(TextInputStyle.Short).setValue(`${typeNames[status[3]?.type] || 'listening'}:${status[3]?.name || 'suporte'}`).setRequired(true)
                    )
                );
            return interaction.showModal(modal);
        }

        const modals = {
            name: new ModalBuilder()
                .setCustomId('botconfig_modal_name')
                .setTitle('Mudar Nome')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('input').setLabel('Novo nome').setStyle(TextInputStyle.Short).setPlaceholder(client.user.displayName).setMaxLength(32).setRequired(true)
                    )
                ),
            avatar: new ModalBuilder()
                .setCustomId('botconfig_modal_avatar')
                .setTitle('Mudar Foto')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('input').setLabel('URL da imagem').setStyle(TextInputStyle.Short).setPlaceholder('https://i.imgur.com/imagem.png').setRequired(true)
                    )
                ),
            banner: new ModalBuilder()
                .setCustomId('botconfig_modal_banner')
                .setTitle('Mudar Banner')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('input').setLabel('URL do banner (ou "remover")').setStyle(TextInputStyle.Short).setPlaceholder('https://i.imgur.com/banner.png').setRequired(true)
                    )
                )
        };

        if (modals[value]) await interaction.showModal(modals[value]);
    },

    async handleModal(interaction, client) {
        const action = interaction.customId.replace('botconfig_modal_', '');
        const guildId = interaction.guildId;

        try {
            if (action === 'name') {
                const input = interaction.fields.getTextInputValue('input');
                await client.user.setUsername(input);
            }

            if (action === 'avatar') {
                const input = interaction.fields.getTextInputValue('input');
                await client.user.setAvatar(input);
            }

            if (action === 'status') {
                const types = { playing: 0, streaming: 1, listening: 2, watching: 3, competing: 5 };
                const newStatus = [];
                
                for (let i = 1; i <= 4; i++) {
                    const value = interaction.fields.getTextInputValue(`status${i}`);
                    const [type, ...textParts] = value.split(':');
                    const text = textParts.join(':');
                    newStatus.push({
                        name: text || value,
                        type: types[type.toLowerCase()] ?? 3
                    });
                }
                
                await saveStatus(guildId, newStatus);
                
                client.user.setPresence({
                    activities: [{ name: newStatus[0].name, type: newStatus[0].type }],
                    status: 'online'
                });
            }

            if (action === 'banner') {
                const input = interaction.fields.getTextInputValue('input');
                const banner = input.toLowerCase() === 'remover' ? null : input;
                await client.user.edit({ banner });
            }

            await interaction.update({ components: [buildConfigPanel(client)], flags: MessageFlags.IsComponentsV2 });

        } catch (err) {
            const msg = err.message.includes('rate') ? 'Rate limit! Aguarde.' : err.message;
            const container = new ContainerBuilder()
                .setAccentColor(0xFFFFFF)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Erro: ${msg}`));
            
            await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral }).catch(() => {});
        }
    },

    getStatus,
    DEFAULT_STATUS
};
