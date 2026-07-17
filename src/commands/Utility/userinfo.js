import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("информация_о_пользователи")
        .setDescription("Получить подробную информацию о пользователе")
        .addUserOption((option) =>
            option
                .setName("пользователь")
                .setDescription("Пользователь для просмотра (по умолчанию — вы)")
        ),

    async execute(interaction) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Ошибка отложенного ответа для команды информации`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'информация_о_пользователи'
            });
            return;
        }

        const user = interaction.options.getUser("пользователь") || interaction.user;
        const member = interaction.guild.members.cache.get(user.id);

        const createdTimestamp = Math.floor(user.createdAt.getTime() / 1000);
        const joinedTimestamp = member?.joinedAt ? Math.floor(member.joinedAt.getTime() / 1000) : null;

        // Дополнительные данные
        const nickname = member?.nickname || "Нет";
        const isBooster = member?.premiumSince ? "Да" : "Нет";
        const boosterSince = member?.premiumSince ? Math.floor(member.premiumSince.getTime() / 1000) : null;
        const totalRoles = member ? member.roles.cache.size - 1 : 0; // исключаем @everyone
        const isOwner = member?.id === interaction.guild.ownerId ? "Да" : "Нет";

        const embed = createEmbed({ title: `Информация о пользователе: ${user.username}` })
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: "🆔 ID", value: user.id, inline: true },
                { name: "🤖 Бот", value: user.bot ? "Да" : "Нет", inline: true },
                { name: "👤 Никнейм на сервере", value: nickname, inline: true },
                {
                    name: "🎭 Роли (первые 5)",
                    value: member && member.roles.cache.size > 1
                        ? member.roles.cache
                            .map((r) => r.name)
                            .slice(0, 5)
                            .join(", ")
                        : "Нет",
                    inline: false,
                },
                {
                    name: "📅 Аккаунт создан",
                    value: `<t:${createdTimestamp}:R>`,
                    inline: false,
                },
                {
                    name: "📥 Присоединился к серверу",
                    value: joinedTimestamp ? `<t:${joinedTimestamp}:R>` : "Не на сервере",
                    inline: false,
                },
                {
                    name: "👑 Высшая роль",
                    value: member?.roles?.highest?.name || "Нет",
                    inline: true,
                },
                {
                    name: "📊 Всего ролей",
                    value: `${totalRoles}`,
                    inline: true,
                },
                {
                    name: "💎 Буст сервера",
                    value: isBooster + (boosterSince ? ` (с <t:${boosterSince}:R>)` : ""),
                    inline: true,
                },
                {
                    name: "👔 Владелец сервера",
                    value: isOwner,
                    inline: true,
                }
            );

        await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
        logger.info(`Команда информации выполнена`, {
            userId: interaction.user.id,
            targetUserId: user.id,
            guildId: interaction.guildId
        });
    },
};
