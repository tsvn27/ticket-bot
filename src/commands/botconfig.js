const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { isAdmin } = require('../utils/permissions');

const DEFAULT_BIO = '📦 github.com/tsvn27';

function buildConfigPanel(client) {
    return new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Configurações do Bot`),
            new TextDisplayBuilder().setContent(`-# Personalize seu bot`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Nome** \`${client.user.displayName}\``),
            new TextDisplayBuilder().setContent(`**Status** \`${client.user.presence?.activities?.[0]?.name || 'Nenhum'}\``)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addActionRowComponents(row => row.addComponents(
            new ButtonBuilder().setCustomId('botconfig_name').setLabel('Nome').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('botconfig_avatar').setLabel('Foto').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('botconfig_status').setLabel('Status').setStyle(ButtonStyle.Secondary)
        ))
        .addActionRowComponents(row => row.addComponents(
            new ButtonBuilder().setCustomId('botconfig_bio').setLabel('Bio').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('botconfig_banner').setLabel('Banner').setStyle(ButtonStyle.Secondary)
        ));
}

function errorPanel(title, description) {
    const container = new ContainerBuilder()
        .setAccentColor(0xFF0000)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ${title}`),
            new TextDisplayBuilder().setContent(description)
        );
    return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botconfig')
        .setDescription('Configurar o bot (nome, foto, biografia, status)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        if (!isAdmin(interaction.member)) {
            return interaction.reply({ ...errorPanel('Sem Permissão', 'Você precisa ser administrador.'), ephemeral: true });
        }

        if (!client.user.bio) {
            client.user.edit({ bio: DEFAULT_BIO }).catch(() => {});
        }

        await interaction.reply({ components: [buildConfigPanel(client)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
    },

    async handleButton(interaction, client) {
        const action = interaction.customId.replace('botconfig_', '');

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
                        new TextInputBuilder().setCustomId('input').setLabel('URL da imagem').setStyle(TextInputStyle.Short).setPlaceholder('https://exemplo.com/imagem.png').setRequired(true)
                    )
                ),
            bio: new ModalBuilder()
                .setCustomId('botconfig_modal_bio')
                .setTitle('Mudar Biografia')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('input').setLabel('Nova biografia').setStyle(TextInputStyle.Paragraph).setPlaceholder(DEFAULT_BIO).setValue(DEFAULT_BIO).setMaxLength(190).setRequired(true)
                    )
                ),
            status: new ModalBuilder()
                .setCustomId('botconfig_modal_status')
                .setTitle('Mudar Status')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('input').setLabel('Texto do status').setStyle(TextInputStyle.Short).setPlaceholder('Gerenciando tickets...').setMaxLength(128).setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('type').setLabel('Tipo: playing, watching, listening').setStyle(TextInputStyle.Short).setPlaceholder('watching').setValue('watching').setRequired(true)
                    )
                ),
            banner: new ModalBuilder()
                .setCustomId('botconfig_modal_banner')
                .setTitle('Mudar Banner')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('input').setLabel('URL do banner (ou "remover")').setStyle(TextInputStyle.Short).setPlaceholder('https://exemplo.com/banner.png').setRequired(true)
                    )
                )
        };

        if (modals[action]) await interaction.showModal(modals[action]);
    },

    async handleModal(interaction, client) {
        const action = interaction.customId.replace('botconfig_modal_', '');
        const input = interaction.fields.getTextInputValue('input');

        try {
            if (action === 'name') {
                await client.user.setUsername(input);
            }

            if (action === 'avatar') {
                await client.user.setAvatar(input);
            }

            if (action === 'bio') {
                await client.user.edit({ bio: input });
            }

            if (action === 'status') {
                const type = interaction.fields.getTextInputValue('type').toLowerCase();
                const types = { playing: 0, streaming: 1, listening: 2, watching: 3, competing: 5 };
                client.user.setPresence({ activities: [{ name: input, type: types[type] ?? 3 }], status: 'online' });
            }

            if (action === 'banner') {
                const banner = input.toLowerCase() === 'remover' ? null : input;
                await client.user.edit({ banner });
            }

            await interaction.update({ components: [buildConfigPanel(client)], flags: MessageFlags.IsComponentsV2 });

        } catch (err) {
            const msg = err.message.includes('rate') ? 'Rate limit! Aguarde alguns minutos.' : err.message;
            const errorContainer = new ContainerBuilder()
                .setAccentColor(0xFFFFFF)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ✗ ${msg}`));
            
            await interaction.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral }).catch(() => {});
        }
    }
};
