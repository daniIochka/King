import { getColor } from '../../config/bot.js';
import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } from 'discord.js';
import { createEmbed, successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

import { handleCreate } from './modules/serverstats_create.js';
import { handleList } from './modules/serverstats_list.js';
import { handleUpdate } from './modules/serverstats_update.js';
import { handleDelete } from './modules/serverstats_delete.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
export default {
    data: new SlashCommandBuilder()
        .setName("serverstats")
        .setDescription("Управление статистикой сервера: отслеживание количества участников и данных каналов")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(subcommand =>
            subcommand
                .setName("create")
                .setDescription("Создать новый канал отслеживания статистики в категории")
                .addStringOption(option =>
                    option
                        .setName("type")
                        .setDescription("Тип отслеживаемой статистики")
                        .setRequired(true)
                        .addChoices(
                            { name: "участники + боты", value: "members" },
                            { name: "только участники", value: "members_only" },
                            { name: "только боты", value: "bots" }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName("channel_type")
                        .setDescription("Тип канала для создания")
                        .setRequired(true)
                        .addChoices(
                            { name: "голосовой канал (рекомендуется)", value: "voice" },
                            { name: "текстовый канал", value: "text" }
                        )
                )
                .addChannelOption(option =>
                    option
                        .setName("category")
                        .setDescription("Категория, в которой будет создан канал статистики")
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildCategory)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("list")
                .setDescription("Показать все трекеры статистики для этого сервера")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("update")
                .setDescription("Обновить существующий трекер статистики")
                .addStringOption(option =>
                    option
                        .setName("counter-id")
                        .setDescription("ID трекера для обновления")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("type")
                        .setDescription("Новый тип трекера")
                        .setRequired(false)
                        .addChoices(
                            { name: "участники + боты", value: "members" },
                            { name: "только участники", value: "members_only" },
                            { name: "только боты", value: "bots" }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("delete")
                .setDescription("Удалить существующий трекер статистики")
                .addStringOption(option =>
                    option
                        .setName("counter-id")
                        .setDescription("ID трекера для удаления")
                        .setRequired(true)
                )
        ),

    async execute(interaction, guildConfig, client) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case "create":
                await handleCreate(interaction, client);
                break;
            case "list":
                await handleList(interaction, client);
                break;
            case "update":
                await handleUpdate(interaction, client);
                break;
            case "delete":
                await handleDelete(interaction, client);
                break;
            default:
                await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: 'Неизвестная подкоманда.' });
        }
    }
};
