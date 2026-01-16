const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
let appData = require('../data.json');

const data = new SlashCommandBuilder()
    .setName('user')
    .setDescription('See user data')
    .addSubcommandGroup(group =>
        group
            .setName('view')
            .setDescription('View user information')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('all')
                    .setDescription('View all roles in the server and who has them')
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('single')
                    .setDescription('View user info. To view your own profile, do not specify a user')
                    .addUserOption(option =>
                        option
                            .setName('target')
                            .setDescription('The user to view')
                            .setRequired(false)
                    )
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('toggle-pings')
            .setDescription('Toggle whether you want to be pinged when someone uses the ping commands with this app')
    );

async function RefreshAppData() {
    appData = JSON.parse(fs.readFileSync('./data.json'));
}

async function ViewUser(interaction) {
    RefreshAppData();
    const targetUser = interaction.options.getUser('target');
    // console.log('ViewUser target:', targetUser ? `${targetUser.username}#${targetUser.discriminator} (${targetUser.id})` : 'none');
    const user = targetUser || interaction.user;
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

    if (appData.rooms) {
        appData.rooms.forEach(room => {
            if (room.guildId !== interaction.guildId) return;

            room.members.forEach(memberId => {
                if (memberId !== user.id) return;
                userRooms.push(room.name);
            });
        });
    }

    if (appData.groups) {
        appData.groups.forEach(group => {
            if (group.guildId !== interaction.guildId) return;

            group.members.forEach(memberId => {
                if (memberId !== user.id) return;
                userGroups.push(group.name);
            });
        });
    }

    if (appData.roles) {
        appData.roles.forEach(role => {
            if (role.guildId !== interaction.guildId) return;

            role.members.forEach(memberId => {
                if (memberId !== user.id) return;
                userRoles.push(role.name);
            });
        });
    }

    if (appData.runs) {
    appData.runs.forEach(run => {
        if (run.guildId !== interaction.guildId) return;

            run.members.forEach(memberId => {
                if (memberId !== user.id) return;
                userRuns.push(run.name);
            });
        });
    }

    if (appData.hotspots) {
        appData.hotspots.forEach(hotspot => {
            if (hotspot.guildId !== interaction.guildId) return;

            hotspot.members.forEach(memberId => {
                if (memberId !== user.id) return;
                userHotspots.push(hotspot.name);
            });
        });
    }

    exampleEmbed.addFields(
        { name: 'Room:', value: userRooms.length ? userRooms.join('\n') : 'None', inline: true },
    );

    exampleEmbed.addFields(
        { name: 'Groups:', value: userGroups.length ? userGroups.join('\n') : 'None', inline: true },
    );

    exampleEmbed.addFields(
        { name: 'Roles:', value: userRoles.length ? userRoles.join('\n') : 'None', inline: true },
    );

    exampleEmbed.addFields(
        { name: 'Runs:', value: userRuns.length ? userRuns.join('\n') : 'None', inline: true },
    );

    exampleEmbed.addFields(
        { name: 'Hotspots:', value: userHotspots.length ? userHotspots.join('\n') : 'None', inline: true },
    );

    await interaction.reply({ embeds: [exampleEmbed], flags: MessageFlags.Ephemeral });
} 

async function ViewAll(interaction) {
    RefreshAppData();
    // console.log(interaction);
    // console.log(await interaction.guild.roles.fetch());

    const roles = await interaction.guild.roles.fetch();
    const members = await interaction.guild.members.fetch();
    let exampleEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('CH x GDQ User Data')
        .setTimestamp()
        .setThumbnail('https://avatars.githubusercontent.com/u/10563385?s=200&v=4')
        .setFooter({ text: 'CH x GDQ', iconURL: 'https://avatars.githubusercontent.com/u/10563385?s=200&v=4' });
    ;
    
    roles.forEach(role => {
        if (role.name === '@everyone') return;
        if (role.name === 'Testing-Jack') return;
        if (role.name === 'Rooming') return;
        let roleMembers = [];
        members.forEach(member => {
            if (member.roles.cache.has(role.id)) {
                roleMembers.push(member.user.globalName ? member.user.globalName : member.user.username);
            }
        });

        if (roleMembers.length === 0) {
            exampleEmbed.addFields(
                { name: role.name, value: 'None', inline: true },
            );
        } else {
            exampleEmbed.addFields(
                { name: role.name, value: roleMembers.join('\n'), inline: true },
            );
        }
    });

    await interaction.reply({ embeds: [exampleEmbed] });
}

async function TogglePings(interaction) {
    RefreshAppData();
    const USER_ID = interaction.user.id;
    const denyUser = appData.denyPings.find(user => user === USER_ID);

    if (!denyUser) {
        appData.denyPings.push(USER_ID);
    } else {
        appData.denyPings = appData.denyPings.filter(user => user !== USER_ID);
    }

    fs.writeFileSync('./data.json', JSON.stringify(appData, null, 2));

    await interaction.reply({ content: `You have ${denyUser ? 'enabled' : 'disabled'} pings.`, flags: MessageFlags.Ephemeral });
}

module.exports = {
	data: data,
	async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'single') {
            await ViewUser(interaction);
            return;
        }

        if (subcommand === 'all') {
            const result = await ViewAll(interaction);
            return;
        }

        if (subcommand === 'toggle-pings') {
            await TogglePings(interaction);
            return;
        }
	},
};