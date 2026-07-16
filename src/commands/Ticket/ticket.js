import { getColor } from '../../config/bot.js';
import { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { createEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getGuildConfig, setGuildConfig } from '../../services/config/guildConfig.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError, replyUserError, ErrorTypes } from '../../utils/errorHandler.js';

import ticketConfig from './modules/ticket_dashboard.js';

export default {
    data: new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Управляет системой тикетов на сервере.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand((subcommand) =>
            subcommand
                .setName("setup")
                .setDescription(
                    "Настраивает панель создания тикетов в указанном канале.",
                )
                .addChannelOption((option) =>
                    option
                        .setName("panel_channel")
                        .setDescription(
                            "Канал, в который будет отправлена панель тикетов.",
                        )
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true),
                )

                .addStringOption((option) =>
                    option
                        .setName("panel_message")
                        .setDescription(
                            "Основное сообщение/описание для панели тикетов.",
                        )
                        .setRequired(true),
                )
                .addStringOption((option) =>
                    option
                        .setName("button_label")
                        .setDescription(
                            "Метка для кнопки создания тикета (по умолчанию: Создать тикет)",
                        )
                        .setRequired(false),
                )
                .addChannelOption((option) =>
                    option
                        .setName("category")
                        .setDescription(
                            "Категория, в которой будут создаваться новые тикеты (опционально).",
                        )
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(false),
                )
                .addChannelOption((option) =>
                    option
                        .setName("closed_category")
                        .setDescription(
                            "Категория, в которую будут перемещаться закрытые тикеты (опционально).",
                        )
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(false),
                )
                .addRoleOption((option) =>
                    option
                        .setName("staff_role")
                        .setDescription(
                            "Роль, которая может просматривать тикеты (опционально).",
                        )
                        .setRequired(false),
                )
                .addIntegerOption((option) =>
                    option
                        .setName("max_tickets_per_user")
                        .setDescription("Максимальное количество тикетов, которое может создать пользователь (по умолчанию: 3)")
                        .setMinValue(1)
                        .setMaxValue(10)
                        .setRequired(false),
                )
                .addBooleanOption((option) =>
                    option
                        .setName("dm_on_close")
                        .setDescription("Отправлять личное сообщение пользователю при закрытии тикета (по умолчанию: вкл)")
                        .setRequired(false),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("dashboard")
                .setDescription("Открыть интерактивную панель управления системой тикетов"),
        ),
    category: "ticket",

    async execute(interaction, config, client) {
        const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
        if (!deferred) {
            return;
        }

        if (
            !interaction.member.permissions.has(
                PermissionFlagsBits.ManageChannels,
            )
        ) {
            logger.warn('Ticket command permission denied', {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'ticket'
            });
            return await replyUserError(interaction, { type: ErrorTypes.PERMISSION, message: 'Для этого действия требуется разрешение «Управление каналами».' });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "dashboard") {
            return ticketConfig.execute(interaction, config, client);
        }

        if (subcommand === "setup") {
            const existingConfig = await getGuildConfig(client, interaction.guildId);
            if (existingConfig?.ticketPanelChannelId) {
                return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: `На этом сервере уже настроена система тикетов (панель в <#${existingConfig.ticketPanelChannelId}>).\n\nПоддерживается только одна система тикетов на сервер. Используйте \`/ticket dashboard\` для редактирования или обновления существующей настройки, или выберите **Удалить систему** на панели управления, чтобы удалить её и начать заново.` });
            }

            const panelChannel =
                interaction.options.getChannel("panel_channel");
            const categoryChannel = interaction.options.getChannel("category");
            const closedCategoryChannel = interaction.options.getChannel("closed_category");
            const staffRole = interaction.options.getRole("staff_role");
            const panelMessage = interaction.options.getString("panel_message") || "Нажмите на кнопку ниже, чтобы создать тикет поддержки.";
            const buttonLabel =
                interaction.options.getString("button_label") ||
                "Создать тикет";
            const maxTicketsPerUser = interaction.options.getInteger("max_tickets_per_user") || 3;
            const dmOnClose = interaction.options.getBoolean("dm_on_close") !== false;

            const setupEmbed = createEmbed({
                description: panelMessage,
                color: getColor('info')
            });

            const ticketButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("create_ticket")
                    .setLabel(buttonLabel)
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji("📩"),
            );

            try {
                const sentPanel = await panelChannel.send({
                    embeds: [setupEmbed],
                    components: [ticketButton],
                });

                if (client.db && interaction.guildId) {
                    const currentConfig = existingConfig;
                    currentConfig.ticketCategoryId = categoryChannel ? categoryChannel.id : null;
                    currentConfig.ticketClosedCategoryId = closedCategoryChannel ? closedCategoryChannel.id : null;
                    currentConfig.ticketStaffRoleId = staffRole ? staffRole.id : null;
                    currentConfig.ticketPanelChannelId = panelChannel.id;
                    currentConfig.ticketPanelMessageId = sentPanel?.id || null;
                    currentConfig.ticketPanelMessage = panelMessage;
                    currentConfig.ticketButtonLabel = buttonLabel;
                    currentConfig.maxTicketsPerUser = maxTicketsPerUser;
                    currentConfig.dmOnClose = dmOnClose;

                    await setGuildConfig(client, interaction.guildId, currentConfig);
                    logger.info('Ticket configuration saved', {
                        guildId: interaction.guildId,
                        categoryId: categoryChannel?.id,
                        closedCategoryId: closedCategoryChannel?.id,
                        staffRoleId: staffRole?.id,
                        maxTickets: maxTicketsPerUser,
                        dmOnClose: dmOnClose,
                    });
                } else {
                    logger.error('Ticket setup: database unavailable, panel sent but configuration was NOT saved', {
                        guildId: interaction.guildId,
                    });
                }

                let successMessage = `Панель создания тикетов отправлена в ${panelChannel}.`;
                
                if (categoryChannel) {
                    successMessage += `Новые тикеты будут создаваться в категории **${categoryChannel.name}**.`;
                } else {
                    successMessage += 'Новые тикеты будут создаваться в новой категории "Тикеты".';
                }
                
                if (closedCategoryChannel) {
                    successMessage += `Закрытые тикеты будут перемещены в **${closedCategoryChannel.name}**.`;
                }
                
                if (staffRole) {
                    successMessage += `Роль **${staffRole.name}** будет иметь доступ к тикетам.`;
                }
                
                successMessage += `\n\n**Максимум тикетов на пользователя:** ${maxTicketsPerUser}\n**ЛС при закрытии:** ${dmOnClose ? 'Включено' : 'Отключено'}`;

                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        successEmbed(
                            "Панель тикетов настроена",
                            successMessage,
                        ),
                    ],
                });

                logger.info('Ticket panel setup completed', {
                    userId: interaction.user.id,
                    userTag: interaction.user.tag,
                    guildId: interaction.guildId,
                    panelChannelId: panelChannel.id,
                    categoryId: categoryChannel?.id,
                    closedCategoryId: closedCategoryChannel?.id,
                    staffRoleId: staffRole?.id,
                    maxTickets: maxTicketsPerUser,
                    dmOnClose: dmOnClose,
                    commandName: 'ticket_setup'
                });

                const logEmbed = createEmbed({
                    title: "Настройка системы тикетов (журнал конфигурации)",
                    description: `Панель тикетов была настроена в ${panelChannel} пользователем ${interaction.user}.`,
                    color: getColor('warning')
                })
                    .addFields(
                        {
                            name: "Канал панели",
                            value: panelChannel.toString(),
                            inline: true,
                        },
                        {
                            name: "Категория тикетов",
                            value: categoryChannel
                                ? categoryChannel.toString()
                                : "Не указана.",
                            inline: true,
                        },
                        {
                            name: "Категория закрытых",
                            value: closedCategoryChannel
                                ? closedCategoryChannel.toString()
                                : "Не указана.",
                            inline: true,
                        },
                        {
                            name: "Роль персонала",
                            value: staffRole
                                ? staffRole.toString()
                                : "Не указана.",
                            inline: true,
                        },
                        {
                            name: "Макс. тикетов на пользователя",
                            value: maxTicketsPerUser.toString(),
                            inline: true,
                        },
                        {
                            name: "ЛС при закрытии",
                            value: dmOnClose ? 'Включено' : 'Отключено',
                            inline: true,
                        },
                        {
                            name: "Модератор",
                            value: `${interaction.user.tag} (${interaction.user.id})`,
                            inline: false,
                        },
                    );

            } catch (error) {
                logger.error('Ticket setup error', {
                    error: error.message,
                    stack: error.stack,
                    userId: interaction.user.id,
                    guildId: interaction.guildId,
                    commandName: 'ticket_setup'
                });
                if (interaction.deferred || interaction.replied) {
                    await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Не удалось отправить панель тикетов или сохранить конфигурацию. Проверьте права бота (особенно возможность отправлять сообщения в целевом канале) и подключение к базе данных.' }).catch(err => {
                        logger.error('Failed to send error reply', {
                            error: err.message,
                            guildId: interaction.guildId
                        });
                    });
                } else {
                    await handleInteractionError(interaction, error, {
                        commandName: 'ticket_setup',
                        source: 'ticket_setup_command'
                    });
                }
            }
        }
    }
};
