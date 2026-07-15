import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { saveGiveaway } from '../../utils/giveaways.js';
import { 
    parseDuration, 
    validatePrize, 
    validateWinnerCount,
    createGiveawayEmbed, 
    createGiveawayButtons 
} from '../../services/giveawayService.js';
import { logEvent, EVENT_TYPES } from '../../services/loggingService.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

import { botConfig } from '../../config/bot.js';

const GIVEAWAY_MIN_WINNERS = botConfig.giveaways?.minimumWinners ?? 1;
const GIVEAWAY_MAX_WINNERS = botConfig.giveaways?.maximumWinners ?? 10;

export default {
    data: new SlashCommandBuilder()
        .setName("gcreate")
        .setDescription("Запустить новый розыгрыш в указанном канале.")
        .addStringOption((option) =>
            option
                .setName("время")
                .setDescription("Длительность розыгрыша (например: 1h, 30m, 5d).")
                .setRequired(true),
        )
        .addIntegerOption((option) =>
            option
                .setName("победители")
                .setDescription("Количество призовых мест.")
                .setMinValue(GIVEAWAY_MIN_WINNERS)
                .setMaxValue(GIVEAWAY_MAX_WINNERS)
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName("приз")
                .setDescription("Что разыгрывается в конкурсе.")
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
        await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });

        if (!interaction.inGuild()) {
            throw new TitanBotError(
                'Giveaway command used outside guild',
                ErrorTypes.VALIDATION,
                'Эту команду можно использовать только на сервере.',
                { userId: interaction.user.id }
            );
        }

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            throw new TitanBotError(
                'User lacks ManageGuild permission',
                ErrorTypes.PERMISSION,
                "У вас недостаточно прав. Требуется разрешение 'Управление сервером'.",
                { userId: interaction.user.id, guildId: interaction.guildId }
            );
        }

        logger.info(`Начался розыгрыш от ${interaction.user.tag} на сервере ${interaction.guildId}`);

        const durationString = interaction.options.getString("время");
        const winnerCount = interaction.options.getInteger("победители");
        const prize = interaction.options.getString("приз");
        const targetChannel = interaction.options.getChannel("канал") || interaction.channel;

        const durationMs = parseDuration(durationString);
        validateWinnerCount(winnerCount);
        const prizeName = validatePrize(prize);

        if (!targetChannel.isTextBased()) {
            throw new TitanBotError(
                'Target channel is not text-based',
                ErrorTypes.VALIDATION,
                'Указанный канал должен быть текстовым.',
                { channelId: targetChannel.id, channelType: targetChannel.type }
            );
        }

        const endTime = Date.now() + durationMs;

        const initialGiveawayData = {
            messageId: "placeholder",
            channelId: targetChannel.id,
            guildId: interaction.guildId,
            prize: prizeName,
            hostId: interaction.user.id,
            endTime: endTime,
            endsAt: endTime,
            winnerCount: winnerCount,
            participants: [],
            isEnded: false,
            ended: false,
            createdAt: new Date().toISOString()
        };

        const embed = createGiveawayEmbed(initialGiveawayData, "active");
        const row = createGiveawayButtons(false);

        // Текст сообщения изменен под стиль вашего скриншота
        const giveawayMessage = await targetChannel.send({
            content: "🎉 **РОЗЫГРЫШ** 🎉",
            embeds: [embed],
            components: [row],
        });

        initialGiveawayData.messageId = giveawayMessage.id;
        const saved = await saveGiveaway(
            interaction.client,
            interaction.guildId,
            initialGiveawayData,
        );

        if (!saved) {
            logger.warn(`Не удалось сохранить розыгрыш в базу данных: ${giveawayMessage.id}`);
        }

        try {
            await logEvent({
                client: interaction.client,
                guildId: interaction.guildId,
                eventType: EVENT_TYPES.GIVEAWAY_CREATE,
                data: {
                    description: `🎁 Приз: ${prizeName}`,
                    channelId: targetChannel.id,
                    userId: interaction.user.id,
                    fields: [
                        {
                            name: '🎁 Приз',
                            value: prizeName,
                            inline: true
                        },
                        {
                            name: '🏆 Победителей',
                            value: winnerCount.toString(),
                            inline: true
                        },
                        {
                            name: '🕐 Длительность',
                            value: durationString,
                            inline: true
                        },
                        {
                            name: 'Канал',
                            value: targetChannel.toString(),
                            inline: true
                        }
                    ]
                }
            });
        } catch (logError) {
            logger.debug('Ошибка логирования создания розыгрыша:', logError);
        }

        logger.info(`Розыгрыш успешно запущен: ${giveawayMessage.id} в канале ${targetChannel.name}`);

        await InteractionHelper.safeReply(interaction, {
            embeds: [
                successEmbed(
                    `Розыгрыш успешно запущен 🎉`,
                    `Новый розыгрыш приза **${prizeName}** начат в канале ${targetChannel} и завершится через **${durationString}**.`,
                ),
            ],
            flags: MessageFlags.Ephemeral,
        });
    },
};
                
