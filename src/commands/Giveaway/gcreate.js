                    import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName("gcreate")
        .setDescription("Запустить новый розыгрыш в канале.")
        .addStringOption((option) =>
            option
                .setName("длительность")
                .setDescription("Длительность розыгрыша (например: 1h, 30m).")
                .setRequired(true),
        )
        .addIntegerOption((option) =>
            option
                .setName("победители")
                .setDescription("Количество победителей.")
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName("приз")
                .setDescription("Приз розыгрыша.")
                .setRequired(true),
        )
        .addChannelOption((option) =>
            option
                .setName("канал")
                .setDescription("Канал для отправки (по умолчанию текущий).")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        if (!interaction.inGuild()) {
            return interaction.editReply({ content: "❌ Эту команду можно использовать только на сервере." });
        }

        const durationString = interaction.options.getString("duration");
        const winnerCount = interaction.options.getInteger("winners");
        const prize = interaction.options.getString("prize");
        const targetChannel = interaction.options.getChannel("channel") || interaction.channel;

        const giveawayEmbed = new EmbedBuilder()
            .setTitle("🎉 РОЗЫГРЫШ 🎉")
            .setColor("#FEE75C") 
            .setDescription(
                `🎁 **Приз**\n${prize}\n\n` +
                `🏆 **Победителей**\n${winnerCount}\n\n` +
                `👤 **Участников**\n0\n\n` +
                `🎯 **Организатор**\n${interaction.user}\n\n` +
                `*Нажмите кнопку ниже, чтобы участвовать!*`
            );
        
        const buttonsRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("giveaway_join")
                .setLabel("Участвовать")
                .setEmoji("🎉")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId("giveaway_leave")
                .setLabel("Выйти")
                .setEmoji("❌")
                .setStyle(ButtonStyle.Danger) // 
        );

        try {
            await targetChannel.send({
                content: "🎉 **РОЗЫГРЫШ** 🎉",
                embeds: [giveawayEmbed],
                components: [buttonsRow],
            });

            await interaction.editReply({
                content: `✅ Розыгрыш приза **${prize}** успешно запущен в канале ${targetChannel}!`,
            });
        } catch (error) {
            console.error("Ошибка при отправке розыгрыша:", error);
            await interaction.editReply({
                content: "❌ Произошла ошибка при отправке сообщения в канал. Проверьте права бота.",
            });
        }
    },
};
