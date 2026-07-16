import { getColor } from '../../config/bot.js';
import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } from 'discord.js';
import { getWelcomeConfig, updateWelcomeConfig } from '../../utils/database.js';
import { formatWelcomeMessage, truncateForEmbedField } from '../../utils/welcome.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { ErrorTypes, replyUserError } from '../../utils/errorHandler.js';

export default {
    data: new SlashCommandBuilder()
        .setName('приветствие')
        .setDescription('Настройка системы приветствия')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('настройка')
                .setDescription('Настройка приветственного сообщения')
                .addChannelOption(option =>
                    option.setName('канал')
                        .setDescription('Канал для отправки приветственных сообщений')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('сообщение')
                        .setDescription('Приветственное сообщение. Переменные: {user}, {username}, {server}, {memberCount}')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('изображение')
                        .setDescription('URL изображения для включения в приветственное сообщение')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('упоминание')
                        .setDescription('Упоминать ли пользователя в приветственном сообщении')
                        .setRequired(false))),

    async execute(interaction) {
        try {
            const deferSuccess = await InteractionHelper.safeDefer(interaction);
            if (!deferSuccess) {
                logger.warn(`Welcome interaction defer failed`, {
                    userId: interaction.user.id,
                    guildId: interaction.guildId,
                    commandName: 'приветствие'
                });
                return;
            }
        } catch (deferError) {
            logger.error(`Welcome defer error`, { error: deferError.message });
            return;
        }

        const { options, guild, client } = interaction;

        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
            return await replyUserError(interaction, { type: ErrorTypes.PERMISSION, message: 'Для использования `/приветствие` требуется право **Управлять сервером**.' });
        }

        const subcommand = options.getSubcommand();

        if (subcommand === 'настройка') {
            const channel = options.getChannel('канал');
            const message = options.getString('сообщение');
            const image = options.getString('изображение');
            const ping = options.getBoolean('упоминание') ?? false;

            const existingConfig = await getWelcomeConfig(client, guild.id);
            if (existingConfig?.channelId) {
                logger.info(`[Welcome] Setup blocked because config already exists in channel ${existingConfig.channelId} for guild ${guild.id}`);
                return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: `Приветствие уже настроено в <#${existingConfig.channelId}>. Используйте **/приветствие панель**, чтобы настроить канал, сообщение, упоминание или изображение.` });
            }
            
            if (!message || message.trim().length === 0) {
                logger.warn(`[Welcome] Empty message provided by ${interaction.user.tag} in ${guild.name}`);
                return await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: 'Приветственное сообщение не может быть пустым' });
            }

            if (image) {
                try {
                    new URL(image);
                } catch (e) {
                    logger.warn(`[Welcome] Invalid image URL provided by ${interaction.user.tag}: ${image}`);
                    return await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: 'Пожалуйста, укажите корректный URL изображения (должен начинаться с http:// или https://)' });
                }
            }

            try {
                await updateWelcomeConfig(client, guild.id, {
                    enabled: true,
                    channelId: channel.id,
                    welcomeMessage: message,
                    welcomeImage: image || undefined,
                    welcomePing: ping
                });

                logger.info(`[Welcome] Setup configured by ${interaction.user.tag} for guild ${guild.name} (${guild.id})`);

                const previewMessage = formatWelcomeMessage(message, {
                    user: interaction.user,
                    guild
                });

                const embed = new EmbedBuilder()
                    .setColor(getColor('success'))
                    .setTitle('Система приветствия настроена')
                    .setDescription(`Приветственные сообщения теперь будут отправляться в ${channel}`)
                    .addFields(
                        { name: 'Предпросмотр сообщения', value: truncateForEmbedField(previewMessage) },
                        { name: 'Упоминать пользователя', value: ping ? 'Да' : 'Нет' },
                        { name: 'Статус', value: 'Включено' }
                    )
                    .setFooter({ text: 'Совет: используйте /приветствие панель для настройки параметров приветствия' });

                if (image) {
                    embed.setImage(image);
                }

                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
            } catch (error) {
                logger.error(`[Welcome] Failed to setup welcome system for guild ${guild.id}:`, error);
                await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Произошла ошибка при настройке системы приветствия. Пожалуйста, попробуйте снова.' });
            }
        }
    },
};
