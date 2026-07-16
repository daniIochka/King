const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, Events } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Хранилище розыгрышей (в памяти – при перезапуске бота данные сбросятся)
const giveaways = new Map();

// Парсинг длительности
function parseDuration(duration) {
    const match = duration.match(/^(\d+)([hmd])$/);
    if (!match) return parseInt(duration) * 1000; // если просто число – считаем секундами
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
        case 'h': return value * 3600 * 1000;
        case 'm': return value * 60 * 1000;
        case 'd': return value * 86400 * 1000;
        default: return value * 1000;
    }
}

// Завершение розыгрыша
async function finishGiveaway(messageId) {
    const data = giveaways.get(messageId);
    if (!data || data.ended) return;
    data.ended = true;
    if (data.timer) clearTimeout(data.timer);

    const channel = await client.channels.fetch(data.channelId).catch(() => null);
    if (!channel) return;
    const msg = await channel.messages.fetch(data.messageId).catch(() => null);
    if (!msg) return;

    const participants = data.participants;
    const winnerCount = data.winnersCount;

    let resultText = '';
    if (participants.length === 0) {
        resultText = '😞 Никто не участвовал, победителей нет.';
    } else {
        const shuffled = participants.sort(() => Math.random() - 0.5);
        const winners = shuffled.slice(0, Math.min(winnerCount, shuffled.length));
        const mentions = winners.map(id => `<@${id}>`).join(' ');
        resultText = `🎉 **Победитель${winners.length > 1 ? 'и' : ''}:** ${mentions}`;
    }

    const embed = EmbedBuilder.from(msg.embeds[0])
        .setTitle('🏁 Розыгрыш завершён')
        .setColor(0x00FF00)
        .spliceFields(1, 2,
            { name: '👥 Участников', value: `${participants.length}`, inline: true },
            { name: '🎲 Шанс', value: '—', inline: true }
        )
        .addFields({ name: '📋 Результат', value: resultText, inline: false });

    await msg.edit({ embeds: [embed], components: [] });
    giveaways.delete(messageId);
}

// Событие: взаимодействие (команды и кнопки)
client.on(Events.InteractionCreate, async (interaction) => {
    // ----- Слэш-команда /мероприятие -----
    if (interaction.isChatInputCommand() && interaction.commandName === 'мероприятие') {
        const prize = interaction.options.getString('приз');
        const conditions = interaction.options.getString('условия');
        const duration = interaction.options.getString('длительность');
        const winners = interaction.options.getInteger('победителей') || 1;

        const ms = parseDuration(duration);
        if (isNaN(ms) || ms <= 0) {
            return interaction.reply({ content: '❌ Неверный формат длительности. Используйте: 1h, 30m, 2d или число (секунды).', ephemeral: true });
        }

        const endTime = Date.now() + ms;

        const embed = new EmbedBuilder()
            .setTitle('🎉 Розыгрыш')
            .setDescription(`**Приз:** ${prize}\n**Условия:** ${conditions}\n**Победителей:** ${winners}`)
            .setColor(0xFFD700)
            .addFields(
                { name: '⏳ Завершится', value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: false },
                { name: '👥 Участников', value: '0', inline: true },
                { name: '🎲 Шанс', value: '—', inline: true }
            )
            .setFooter({ text: `Создал ${interaction.user.displayName}` });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('join_giveaway')
                    .setLabel('Участвовать')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.reply({ embeds: [embed], components: [row] });
        const msg = await interaction.fetchReply();

        giveaways.set(msg.id, {
            prize,
            conditions,
            endTime,
            hostId: interaction.user.id,
            channelId: interaction.channel.id,
            messageId: msg.id,
            participants: [],
            winnersCount: winners,
            ended: false,
            timer: setTimeout(() => finishGiveaway(msg.id), ms)
        });
    }

    // ----- Обработка кнопки "Участвовать" -----
    if (interaction.isButton() && interaction.customId === 'join_giveaway') {
        const msg = interaction.message;
        const data = giveaways.get(msg.id);
        if (!data) {
            return interaction.reply({ content: '❌ Розыгрыш уже завершён или удалён.', ephemeral: true });
        }
        if (data.ended) {
            return interaction.reply({ content: '❌ Розыгрыш завершён.', ephemeral: true });
        }
        if (Date.now() > data.endTime) {
            await finishGiveaway(msg.id);
            return interaction.reply({ content: '❌ Розыгрыш завершён.', ephemeral: true });
        }

        const userId = interaction.user.id;
        if (data.participants.includes(userId)) {
            return interaction.reply({ content: '✅ Вы уже участвуете!', ephemeral: true });
        }

        data.participants.push(userId);
        const count = data.participants.length;
        const chance = count > 0 ? (1 / count * 100).toFixed(2) : '—';

        const embed = EmbedBuilder.from(interaction.message.embeds[0]);
        embed.spliceFields(1, 2,
            { name: '👥 Участников', value: `${count}`, inline: true },
            { name: '🎲 Шанс', value: `${chance}%`, inline: true }
        );
        await interaction.update({ embeds: [embed], components: interaction.message.components });
        await interaction.followUp({ content: '✅ Вы участвуете в розыгрыше!', ephemeral: true });
    }
});

// Регистрация слэш-команды при запуске
client.once(Events.ClientReady, async () => {
    const command = new SlashCommandBuilder()
        .setName('мероприятие')
        .setDescription('Создать розыгрыш с призом и условиями')
        .addStringOption(opt => opt.setName('приз').setDescription('Что разыгрываем').setRequired(true))
        .addStringOption(opt => opt.setName('условия').setDescription('Условия участия').setRequired(true))
        .addStringOption(opt => opt.setName('длительность').setDescription('Например: 1h, 30m, 2d').setRequired(true))
        .addIntegerOption(opt => opt.setName('победителей').setDescription('Количество победителей').setRequired(false));

    await client.application.commands.create(command);
    console.log('✅ Бот готов! Команда /мероприятие зарегистрирована.');
});
