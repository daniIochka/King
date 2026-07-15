import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { formatDistanceToNow } from 'date-fns';
import ruLocale from 'date-fns/locale/ru';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { formatDistanceToNow } = require('date-fns');
const ruLocale = require('date-fns/locale/ru');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Информация о сервере (как в Bloody Dynasty)'),

    async execute(interaction) {
        const guild = interaction.guild;

        // Подсчёты
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

        // Уровень проверки
        const verificationLevels = {
            0: 'Нет',
            1: 'Низкий',
            2: 'Средний',
            3: 'Высокий',
            4: 'Очень высокий'
        };
        const verification = verificationLevels[guild.verificationLevel] || 'Неизвестно';

        // Возраст сервера
        const age = formatDistanceToNow(guild.createdAt, { addSuffix: true, locale: ruLocale });

        // Владелец
        let ownerTag = 'Неизвестно';
        try {
            const owner = await guild.fetchOwner();
            ownerTag = owner.user.tag;
        } catch (e) {
            // если не удалось получить владельца
        }

        const embed = new EmbedBuilder()
            .setTitle('📊 Результаты разведки сервера')
            .setDescription(`${guild.name} — вот что удалось узнать!`)
            .setColor(0x8B00FF) // Фиолетовый как у Bloody Dynasty
            .setThumbnail(guild.iconURL({ size: 512 }))
            .addFields(
                { name: '🆔 ID сервера', value: `${guild.id}`, inline: false },

                {
                    name: '👑 Владелец',
                    value: guild.ownerId ? `<@${guild.ownerId}>\n\`${ownerTag}\`` : 'Неизвестно',
                    inline: false
                },

                {
                    name: '📅 Создан',
                    value: `${guild.createdAt.toLocaleDateString('ru-RU', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}, ${guild.createdAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}\n⏰ Возраст сервера: ${age}`,
                    inline: false
                },

                {
                    name: '👥 Участников',
                    value: `${totalMembers} всего\n${humans} людей\n${bots} ботов`,
                    inline: true
                },

                {
                    name: '📺 Каналов',
                    value: `${totalChannels} всего\n${textChannels} текстовых\n${voiceChannels} голосовых\n${categories} категорий`,
                    inline: true
                },

                {
                    name: '🎨 Ролей',
                    value: `${rolesCount}`,
                    inline: true
                },

                {
                    name: '😄 Эмодзи',
                    value: `${emojisCount}`,
                    inline: true
                },

                {
                    name: '💎 Уровень бустов',
                    value: `Уровень ${boostLevel}\n${boostCount} бустов`,
                    inline: true
                },

                {
                    name: '🛡️ Уровень проверки',
                    value: `${verification}`,
                    inline: true
                }
            );

        // Описание сервера
        if (guild.description) {
            embed.addFields({ name: '📝 Описание', value: guild.description, inline: false });
        } else {
            embed.addFields({
                name: '📝 Описание',
                value: 'KING MOBILE - CRMP PROJECT'
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
