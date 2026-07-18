import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { logger } from '../../utils/logger.js';

// ===== НАСТРОЙКИ =====
const ADMIN_ROLE_ID = '1510803430166495295';
const LOG_CHANNEL_ID = '1523639667952582666';

// ===== ФРАКЦИИ =====
const FACTIONS = [
    { label: '🏛️ Правительство', value: 'government', emoji: '🏛️' },
    { label: '🔐 ФСБ', value: 'fsb', emoji: '🔐' },
    { label: '🚔 МВД', value: 'mvd', emoji: '🚔' },
    { label: '🚦 ГИБДД', value: 'gibdd', emoji: '🚦' },
    { label: '⚔️ ВЧ', value: 'vch', emoji: '⚔️' },
    { label: '🏥 Центральная Больница', value: 'hospital', emoji: '🏥' },
    { label: '📺 СМИ', value: 'media', emoji: '📺' },
    { label: '🔫 Арзамасская ОПГ', value: 'arzamas', emoji: '🔫' },
    { label: '🔪 Батыревское ОПГ', value: 'batyrevo', emoji: '🔪' },
    { label: '💀 Лыткаринское ОПГ', value: 'lytkarino', emoji: '💀' }
];

// ===== ID РОЛЕЙ (ВАШИ) =====
const ROLE_IDS = {
    'government': '1510804026206453790',
    'fsb': '1510804034552987748',
    'mvd': '1510804042924691607',
    'gibdd': '1510804051334402200',
    'vch': '1510804060087910521',
    'hospital': '1510804068145037412',
    'media': '1510804088596725920',
    'arzamas': '1510804096737607962',
    'batyrevo': '1510804105516417085',
    'lytkarino': '1510804113775001900'
};

export async function handleButton(interaction) {
    const customId = interaction.customId;
    const parts = customId.split('_');
    const action = parts[0];
    const userId = parts[1];
    const factionValue = parts[2];

    console.log(`🔘 Кнопка: ${action}, пользователь: ${userId}, фракция: ${factionValue}`);
    
    if (!['approve', 'reject', 'info', 'dm'].includes(action)) {
        return;
    }

    // Проверка прав
    const member = interaction.member;
    const hasAdminRole = member.roles.cache.has(ADMIN_ROLE_ID);
    const hasAdminPerms = member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasAdminRole && !hasAdminPerms) {
        return interaction.reply({
            content: '❌ У вас нет прав для обработки заявок!',
            ephemeral: true
        });
    }

    const faction = FACTIONS.find(f => f.value === factionValue);
    if (!faction) {
        return interaction.reply({
            content: '❌ Фракция не найдена!',
            ephemeral: true
        });
    }

    let targetUser;
    try {
        targetUser = await interaction.guild.members.fetch(userId);
    } catch (error) {
        return interaction.reply({
            content: '❌ Пользователь не найден на сервере!',
            ephemeral: true
        });
    }

    // Обработка "Информация"
    if (action === 'info') {
        const infoEmbed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle(`ℹ️ Информация о фракции: ${faction.label}`)
            .addFields(
                { name: '📋 Название', value: faction.label },
                { name: '🆔 ID', value: `\`${factionValue}\`` },
                { name: '👤 Заявитель', value: `${targetUser.user.tag} (${targetUser.id})` }
            )
            .setTimestamp();
        
        return interaction.reply({
            embeds: [infoEmbed],
            ephemeral: true
        });
    }

    // Обработка "Написать в ЛС"
    if (action === 'dm') {
        try {
            await targetUser.send({
                content: `📩 Вам написал администратор **${interaction.user.tag}** по поводу вашей заявки во фракцию **${faction.label}**.\nОжидайте ответа в этом чате.`
            });
        } catch (error) {
            console.log(`Не удалось отправить ЛС ${targetUser.user.tag}`);
        }
        
        return interaction.reply({
            content: `✅ Сообщение отправлено пользователю ${targetUser.user.tag}!`,
            ephemeral: true
        });
    }

    // Обработка "Принять" или "Отклонить"
    const isApproved = action === 'approve';
    
    // Выдача роли если принято
    if (isApproved) {
        try {
            const roleId = ROLE_IDS[factionValue];
            if (roleId) {
                await targetUser.roles.add(roleId);
                console.log(`✅ Роль ${faction.label} выдана ${targetUser.user.tag}`);
            } else {
                console.log(`⚠️ Роль не найдена для фракции ${factionValue}`);
            }
        } catch (error) {
            console.error('Ошибка выдачи роли:', error);
        }
    }

    // Отправка результата пользователю
    const resultEmbed = new EmbedBuilder()
        .setColor(isApproved ? '#00FF00' : '#FF0000')
        .setTitle(isApproved ? '✅ Заявка одобрена!' : '❌ Заявка отклонена')
        .setDescription(
            isApproved 
                ? `Поздравляем! Ваша заявка на вступление во фракцию **${faction.label}** одобрена! ${faction.emoji}`
                : `Ваша заявка на вступление во фракцию **${faction.label}** была отклонена.`
        )
        .addFields(
            { name: '📋 Фракция', value: `${faction.emoji} ${faction.label}`, inline: true },
            { name: '👤 Администратор', value: interaction.user.tag, inline: true },
            { name: '📅 Дата', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setTimestamp();

    try {
        await targetUser.send({ embeds: [resultEmbed] });
    } catch (error) {
        console.log(`Не удалось отправить результат ${targetUser.user.tag}`);
    }

    // Обновление сообщения с заявкой
    const statusEmoji = isApproved ? '✅' : '❌';
    const statusText = isApproved ? 'одобрена' : 'отклонена';
    
    await interaction.update({
        content: `${statusEmoji} Заявка от **${targetUser.user.tag}** ${statusText} администратором **${interaction.user.tag}**`,
        embeds: [],
        components: []
    });

    // Логирование
    if (LOG_CHANNEL_ID) {
        try {
            const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(isApproved ? '#00FF00' : '#FF0000')
                    .setTitle(`📋 Заявка ${isApproved ? 'одобрена' : 'отклонена'}`)
                    .setDescription(`Заявка от ${targetUser.user.tag} на фракцию ${faction.label}`)
                    .addFields(
                        { name: 'Статус', value: isApproved ? '✅ Одобрена' : '❌ Отклонена' },
                        { name: 'Администратор', value: interaction.user.tag }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
        } catch (error) {
            console.error('Ошибка логирования:', error);
        }
    }

    console.log(`✅ Заявка ${isApproved ? 'одобрена' : 'отклонена'} для ${targetUser.user.tag}`);
