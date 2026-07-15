import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { formatDistanceToNow } = require('date-fns');
const ruLocale = require('date-fns/locale/ru');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Информация о сервере (как в Bloody Dynastу)'),

    async execute(interaction) {
        const guild = interaction.guild;

        const totalMembers = guild.memberCount;
        const humans = guild.members.cache.filter(member => !member.user.bot).size;
        const bots = totalMembers - humans;

        const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
        const categories = guild.channels.cache.filter(c => c.type === 4).size;
        const totalChannels = textChannels + voiceChannels + categories;

        const rolesCount = guild.roles.cache.size;
        const emojisCount = guild.emojis.cache.size;
        const boostLevel = guild.premiumTier;
        const boostCount = guild.premiumSubscriptionCount || 0;

        const verificationLevels = {
            0: 'Нет',
            1: 'Низкий',
            2: 'Средний',
            3: 'Высокий',
            4: 'Очень высокий'
        };
        const verification = verificationLevels[guild.verificationLevel] || 'Неизвестно';

        const age = formatDistanceToNow(guild.createdAt, { addSuffix: true, locale: ruLocale });

        let ownerTag = 'Неизвестно';
        try {
            const owner = await guild.fetchOwner();
            ownerTag = owner.user.tag;
        } catch (e) {}

        const embed = new EmbedBuilder()
            .setTitle('\uD83D\uDCCA Результаты разведки сервера') // 📊
            .setDescription(`${guild.name} — вот что удалось узнать!`)
            .setColor(0x8B00FF)
            .setThumbnail(guild.iconURL({ size: 512 }))
            .addFields(
                { name: '\uD83D\uDD19 ID сервера', value: `${guild.id}`, inline: false }, // 🆔
                {
                    name: '\uD83D\uDC51 Владелец', // 👑
                    value: guild.ownerId ? `<@${guild.ownerId}>\n\`${ownerTag}\`` : 'Неизвестно',
                    inline: false
                },
                {
                    name: '\uD83D\uDCC5 Создан', // 📅
                    value: `${guild.createdAt.toLocaleDateString('ru-RU', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}, ${guild.createdAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}\n\u23F0 Возраст сервера: ${age}`, // ⏰
                    inline: false
                },
                {
                    name: '\uD83D\uDC65 Участников', // 👥
                    value: `${totalMembers} всего\n${humans} людей\n${bots} ботов`,
                    inline: true
                },
                {
                    name: '\uD83D\uDCFA Каналов', // 📺
                    value: `${totalChannels} всего\n${textChannels} текстовых\n${voiceChannels} голосовых\n${categories} категорий`,
                    inline: true
                },
                {
                    name: '\uD83C\uDFA8 Ролей', // 🎨
                    value: `${rolesCount}`,
                    inline: true
                },
                {
                    name: '\uD83D\uDE04 Эмодзи', // 😄
                    value: `${emojisCount}`,
                    inline: true
                },
                {
                    name: '\uD83D\uDC8E Уровень бустов', // 💎
                    value: `Уровень ${boostLevel}\n${boostCount} бустов`,
                    inline: true
                },
                {
                    name: '\uD83D\uDEE1\uFE0F Уровень проверки', // 🛡️
                    value: `${verification}`,
                    inline: true
                }
            );

        if (guild.description) {
            embed.addFields({ name: '\uD83D\uDCDD Описание', value: guild.description, inline: false }); // 📝
        } else {
            embed.addFields({
                name: '\uD83D\uDCDD Описание',
                value: 'CRMP PROJECT',
                inline: false
            });
        }

        embed.setFooter({
            text: `Запросил: ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL()
        });

        await interaction.reply({ embeds: [embed] });
    }
};
