import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { ModerationService } from '../../services/moderation/moderationService.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';

export default {
    data: new SlashCommandBuilder()
        .setName("бан")
        .setDescription("Забанить пользователя на сервере")
        .addUserOption((option) =>
            option
                .setName("цель")
                .setDescription("Пользователь для бана")
                .setRequired(true),
        )
        .addStringOption((option) =>
            option.setName("причина").setDescription("Причина бана"),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    category: "moderation",

    async execute(interaction, config, client) {
        const user = interaction.options.getUser("цель");
        const reason = interaction.options.getString("причина") || "Причина не указана";

        if (!user) {
            throw new TitanBotError(
                'Отсутствует цель',
                ErrorTypes.USER_INPUT,
                'Вы должны указать пользователя для бана.',
                { subtype: 'invalid_user' },
            );
        }

        if (user.id === interaction.user.id) {
            throw new TitanBotError(
                'Нельзя забанить себя',
                ErrorTypes.VALIDATION,
                'Вы не можете забанить себя.',
            );
        }
        if (user.id === client.user.id) {
            throw new TitanBotError(
                'Нельзя забанить бота',
                ErrorTypes.VALIDATION,
                'Вы не можете забанить бота.',
            );
        }

        const result = await ModerationService.banUser({
            guild: interaction.guild,
            user,
            moderator: interaction.member,
            reason,
        });

        await InteractionHelper.universalReply(interaction, {
            embeds: [
                successEmbed(
                    `🚫 **Забанен** ${user.tag}`,
                    `**Причина:** ${reason}\n**ID дела:** #${result.caseId}`,
                ),
            ],
        });
    },
};
