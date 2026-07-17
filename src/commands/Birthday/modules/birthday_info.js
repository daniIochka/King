import { EmbedBuilder } from 'discord.js';
import { getUserBirthday } from '../../../services/birthdayService.js';
import { logger } from '../../../utils/logger.js';

import { InteractionHelper } from '../../../utils/interactionHelper.js';

export default {
    async execute(interaction, config, client) {
        await InteractionHelper.safeDefer(interaction);

        const targetUser = interaction.options.getUser("пользователь") || interaction.user;
        const userId = targetUser.id;
        const guildId = interaction.guildId;

        const birthdayData = await getUserBirthday(client, guildId, userId);

        if (!birthdayData) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ День рождения не найден')
                .setDescription(targetUser.id === interaction.user.id 
                    ? "Вы ещё не установили свой день рождения. Используйте `/деньрождения установить`, чтобы добавить его!"
                    : `${targetUser.username} ещё не установил(а) свой день рождения.`);
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed]
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎂 Информация о дне рождения')
            .setDescription(`**Дата:** ${birthdayData.monthName} ${birthdayData.day}\n**Пользователь:** ${targetUser.toString()}`);

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed]
        });

        logger.info('Информация о дне рождения успешно получена', {
            userId: interaction.user.id,
            targetUserId: targetUser.id,
            guildId,
            commandName: 'инфо_день_рохдения'
        });
    }
};
