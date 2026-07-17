import { SlashCommandBuilder } from 'discord.js';
import { EmbedBuilder } from '@discordjs/builders';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
    .setName("сервер_инфо")
    .setDescription("Получить подробную информацию о сервере"),

  async execute(interaction) {
    const deferSuccess = await InteractionHelper.safeDefer(interaction);
    if (!deferSuccess) {
      logger.warn(`ServerInfo interaction defer failed`, {
        userId: interaction.user.id,
        guildId: interaction.guildId,
        commandName: 'сервер_инфо'
      });
      return;
    }

    const guild = interaction.guild;
    const owner = await guild.fetchOwner();
    const createdTimestamp = Math.floor(guild.createdAt.getTime() / 1000);

    // Статистика участников
    const totalMembers = guild.memberCount;
    const members = guild.members.cache;
    const botCount = members.filter(m => m.user.bot).size;
    const humanCount = totalMembers - botCount;

    // Статусы (онлайн, бездействует, не беспокоить, оффлайн) — только для закешированных участников
    const statuses = {
      online: members.filter(m => m.presence?.status === 'online').size,
      idle: members.filter(m => m.presence?.status === 'idle').size,
      dnd: members.filter(m => m.presence?.status === 'dnd').size,
      offline: members.filter(m => !m.presence || m.presence.status === 'offline').size
    };

    // Каналы
    const channels = guild.channels.cache;
    const textChannels = channels.filter(c => c.type === 0).size; // GUILD_TEXT
    const voiceChannels = channels.filter(c => c.type === 2).size; // GUILD_VOICE
    const categoryChannels = channels.filter(c => c.type === 4).size; // GUILD_CATEGORY
    const newsChannels = channels.filter(c => c.type === 5).size; // GUILD_NEWS
    const stageChannels = channels.filter(c => c.type === 13).size; // GUILD_STAGE_VOICE

    // Эмодзи
    const emojis = guild.emojis.cache;
    const totalEmojis = emojis.size;
    const animatedEmojis = emojis.filter(e => e.animated).size;
    const staticEmojis = totalEmojis - animatedEmojis;

    // Бусты
    const boostLevel = guild.premiumTier;
    const boostCount = guild.premiumSubscriptionCount;

    // Баннер (если есть)
    const bannerUrl = guild.bannerURL({ size: 1024 });

    // Создаём embed
    const embed = createEmbed({ 
      title: `📊 Информация о сервере: ${guild.name}`,
      description: `🆔 **ID:** ${guild.id}`,
      color: 0x2B2D31,
      thumbnail: guild.iconURL({ size: 256 })
    });

    // Добавляем баннер как изображение, если есть
    if (bannerUrl) {
      embed.setImage(bannerUrl);
    }

    // Поля с эмодзи
    embed.addFields(
      { name: '👑 Владелец', value: `${owner.user.tag} (${owner.id})`, inline: true },
      { name: '📅 Дата создания', value: `<t:${createdTimestamp}:R>`, inline: true },
      { name: '🌐 Регион', value: guild.preferredLocale || 'Не указан', inline: true },
      { name: '\u200b', value: '\u200b', inline: false }, // разделитель
      { name: '👥 Участники', value: [
        `**Всего:** ${totalMembers}`,
        `👤 Люди: ${humanCount}`,
        `🤖 Боты: ${botCount}`
      ].join('\n'), inline: true },
      { name: '🟢 Статусы (кеш)', value: [
        `🟢 Онлайн: ${statuses.online}`,
        `🟡 Бездействует: ${statuses.idle}`,
        `🔴 Не беспокоить: ${statuses.dnd}`,
        `⚫ Оффлайн/неизвестно: ${statuses.offline}`
      ].join('\n'), inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: '📁 Каналы', value: [
        `**Всего:** ${channels.size}`,
        `💬 Текстовые: ${textChannels}`,
        `🔊 Голосовые: ${voiceChannels}`,
        `📂 Категории: ${categoryChannels}`,
        `📰 Новостные: ${newsChannels}`,
        `🎤 Сцена: ${stageChannels}`
      ].join('\n'), inline: true },
      { name: '🎭 Роли', value: `**Всего:** ${guild.roles.cache.size}`, inline: true },
      { name: '😀 Эмодзи', value: [
        `**Всего:** ${totalEmojis}`,
        `✨ Обычные: ${staticEmojis}`,
        `🎞️ Анимированные: ${animatedEmojis}`
      ].join('\n'), inline: true },
      { name: '\u200b', value: '\u200b', inline: false },
      { name: '💎 Бусты', value: [
        `**Уровень:** ${boostLevel} (${boostCount} бустов)`,
        `⏳ Следующий уровень: ${boostLevel < 3 ? `ещё ${[2, 7, 14][boostLevel] - boostCount} бустов` : 'достигнут максимум'}`
      ].join('\n'), inline: true },
      { name: '🔒 Уровень проверки', value: `${guild.verificationLevel} (${['Нет', 'Низкий', 'Средний', 'Высокий', 'Максимальный'][guild.verificationLevel] || 'Неизвестно'})`, inline: true },
      { name: '📢 Уровень явного контента', value: `${guild.explicitContentFilter} (${['Отключён', 'Сканировать без роли', 'Сканировать всех'][guild.explicitContentFilter] || 'Неизвестно'})`, inline: true }
    );

    await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    logger.info(`ServerInfo command executed`, {
      userId: interaction.user.id,
      guildId: guild.id,
      guildName: guild.name,
      memberCount: guild.memberCount
    });
  },
};
