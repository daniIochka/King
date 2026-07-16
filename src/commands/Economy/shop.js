import { SlashCommandBuilder } from 'discord.js';
import shopBrowse from './modules/shop_browse.js';

export default {
    slashOnly: true,
    data: new SlashCommandBuilder()
        .setName('магазин')
        .setDescription('Магазин сервера'),

    async execute(interaction, config, client) {
        return shopBrowse.execute(interaction, config, client);
    },
};
