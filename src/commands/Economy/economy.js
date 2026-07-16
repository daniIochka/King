import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import economyDashboard from './modules/economy_dashboard.js';

export default {
    slashOnly: true,
    data: new SlashCommandBuilder()
        .setName('экономика')
        .setDescription('Команды управления экономикой')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false)
        .addSubcommand(subcommand =>
            subcommand
                .setName('панель')
                .setDescription('Открыть панель управления экономикой')
        ),
    category: 'Economy',

    async execute(interaction, config, client) {
        const deferred = await InteractionHelper.safeDefer(interaction, {
            flags: MessageFlags.Ephemeral,
        });
        if (!deferred) return;

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'панель') {
            await economyDashboard.execute(interaction, config, client);
        }
    }
};
