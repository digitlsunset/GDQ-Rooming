const { SlashCommandBuilder, EmbedBuilder, Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
let appData = require('../data.json');

const data = new SlashCommandBuilder()
    .setName('user')
    .setDescription('See user data')
    .addUserOption(option =>
        option
            .setName('target')
            .setDescription('The user to view')
            .setRequired(false)
    );

async function RefreshAppData() {
    appData = JSON.parse(fs.readFileSync('./data.json'));
}

async function ViewUser(interaction) {
    RefreshAppData();
    const user = interaction.options.getUser('target') || interaction.user;
    const userRooms = [];
    const userGroups = [];
    const userRoles = [];
    const userRuns = [];
    const userHotspots = [];

    let exampleEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(user.globalName ? user.globalName : user.username)
        .setTimestamp()
        .setThumbnail(user.displayAvatarURL())
        .setFooter({ text: 'CH x GDQ', iconURL: 'https://avatars.githubusercontent.com/u/10563385?s=200&v=4' });
    ;

    appData.rooms.forEach(room => {
        if (room.guildId !== interaction.guildId) return;

        room.members.forEach(memberId => {
            if (memberId !== user.id) return;
            userRooms.push(room.name);
        });
    });

    appData.groups.forEach(group => {
        if (group.guildId !== interaction.guildId) return;

        group.members.forEach(memberId => {
            if (memberId !== user.id) return;
            userGroups.push(group.name);
        });
    });

    exampleEmbed.addFields(
        { name: 'Room:', value: userRooms.length ? userRooms.join('\n') : 'None', inline: true },
    );

    exampleEmbed.addFields(
        { name: 'Groups:', value: userGroups.length ? userGroups.join('\n') : 'None', inline: true },
    );

    await interaction.reply({ embeds: [exampleEmbed] });
}

module.exports = {
	data: data,
	async execute(interaction) {
        await ViewUser(interaction);
	},
};