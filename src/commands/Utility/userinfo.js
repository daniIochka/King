import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
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
        const totalRoles = member ? member.roles.cache.size - 1 : 0;
        const isOwner = member?.id === interaction.guild.ownerId ? "Да" : "Нет";

        // Получаем все роли пользователя (кроме @everyone)
        const roles = member ? member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => r) : [];
        const rolesList = roles.length > 0 
            ? roles.map(r => `${r}`).join(' ') 
            : 'Нет';

        // Получаем высшую роль
        const highestRole = member?.roles?.highest && member.roles.highest.id !== interaction.guild.id 
            ? member.roles.highest 
            : null;

        // Формируем строку с активностью (статусом)
        const presence = member?.presence;
        let statusEmoji = '⬛';
        let statusText = 'Не в сети';
        
        if (presence) {
            const status = presence.status;
            switch (status) {
                case 'online':
                    statusEmoji = '🟢';
                    statusText = 'В сети';
                    break;
                case 'idle':
                    statusEmoji = '🟡';
                    statusText = 'Не активен';
                    break;
                case 'dnd':
                    statusEmoji = '🔴';
                    statusText = 'Не беспокоить';
                    break;
                case 'offline':
                    statusEmoji = '⬛';
                    statusText = 'Не в сети';
                    break;
            }
        }

        // Активность (игра)
        let activityText = 'Нет';
        if (presence?.activities?.length > 0) {
            const activity = presence.activities[0];
            if (activity.type === 0) activityText = `Играет в **${activity.name}**`;
            else if (activity.type === 1) activityText = `Стримит **${activity.name}**`;
            else if (activity.type === 2) activityText = `Слушает **${activity.name}**`;
            else if (activity.type === 3) activityText = `Смотрит **${activity.name}**`;
            else if (activity.type === 4) activityText = `Пользовательский статус: **${activity.name}**`;
            else if (activity.type === 5) activityText = `Соревнуется в **${activity.name}**`;
            else activityText = activity.name;
        }

        // Формируем никнейм с цветом роли (для версии 14.26.4)
        const displayName = member?.displayName || user.username;
        const roleMention = highestRole ? `${highestRole}` : 'Без роли';

        // Создаем эмбед с дизайном как в Discord
        const embed = new EmbedBuilder()
            .setColor(highestRole?.color || 0x5865F2)
            .setAuthor({
                name: `${statusEmoji} ${user.username}`,
                iconURL: user.displayAvatarURL({ size: 256, dynamic: true })
            })
            .setDescription(
                `${statusEmoji} **${statusText}** • ${activityText}\n\n` +
                `${roleMention}\n\n` +
                `**${displayName}**`
            )
            .addFields(
                {
                    name: '📥 Присоединился',
                    value: joinedTimestamp ? `<t:${joinedTimestamp}:d>` : 'Не на сервере',
                    inline: true
                },
                {
                    name: '📅 Создан',
                    value: `<t:${createdTimestamp}:d>`,
                    inline: true
                },
                {
                    name: '🆔 ID пользователя',
                    value: `\`${user.id}\``,
                    inline: false
                }
            )
            .setFooter({
                text: `Роли: ${totalRoles} • ${isBooster === 'Да' ? '💎 Бустер' : 'Не бустер'}${isOwner === 'Да' ? ' • 👑 Владелец' : ''}`,
                iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        // Добавляем поле с ролями, если они есть и не превышают лимит
        if (rolesList !== 'Нет') {
            // В версии 14.26.4 роли отображаются как <@&roleId>
            const rolesDisplay = roles.map(r => `<@&${r.id}>`).join(' ');
            if (rolesDisplay.length <= 1024) {
                embed.addFields({
                    name: '🎭 Роли',
                    value: rolesDisplay,
                    inline: false
                });
            } else {
                // Если слишком много ролей, показываем первые несколько
                const truncatedRoles = roles.slice(0, 20).map(r => `<@&${r.id}>`).join(' ');
                embed.addFields({
                    name: '🎭 Роли (первые 20)',
                    value: truncatedRoles + `\n... и еще ${roles.length - 20} ролей`,
                    inline: false
                });
            }
        }

        await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
        logger.info(`Команда информации выполнена`, {
            userId: interaction.user.id,
            targetUserId: user.id,
            guildId: interaction.guildId
        });
    },
};
