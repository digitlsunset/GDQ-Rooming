const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
let appData = require('../data.json');

 const data = new SlashCommandBuilder()
 	.setName('group')
 	.setDescription('Group functions')
    // Create Group
    .addSubcommand(subcommand =>
        subcommand
            .setName('create')
            .setDescription('Create a group for people to join.')
            .addStringOption((option) =>
                option
                    .setName('name')
                    .setDescription('The name of the group to create')
                    .setRequired(true))
                    .addStringOption((option) =>
                option
                    .setName('datetime')
                    .setDescription('The date and time of this group\'s event')
                    .setRequired(false))
            .addIntegerOption((option) =>
                option
                    .setName('size')
                    .setDescription('The maximum size of the group')
                    .setRequired(false))
    )
    // Join Group
    .addSubcommand(subcommand =>
        subcommand
            .setName('join')
            .setDescription('Join a group')
            .addStringOption((option) =>
                option
                    .setName('name')
                    .setDescription('The name of the group to join')
                    .setRequired(true))
    )
    // Leave Group
    .addSubcommand(subcommand =>
        subcommand
            .setName('leave')
            .setDescription('Leave a group')
            .addStringOption((option) =>
                option
                    .setName('name')
                    .setDescription('The name of the group to leave')
                    .setRequired(false))
    )
    // View All Groups
    .addSubcommand(subcommand =>
        subcommand
            .setName('all')
            .setDescription('View all groups')
    )
    // View Single Group
    .addSubcommand(subcommand =>
        subcommand
            .setName('view')
            .setDescription('View a single group')
            .addStringOption((option) =>
                option
                    .setName('name')
                    .setDescription('The name of the group to view')
                    .setRequired(true))
    )
    // Clear Groups
    .addSubcommand(subcommand =>
        subcommand
            .setName('clear')
            .setDescription('Clear all groups.')
            .addBooleanOption((option) =>
                option
                    .setName('confirm')
                    .setDescription('Are you sure?')
                    .setRequired(true))
    )
;

async function RefreshAppData() {
    appData = JSON.parse(fs.readFileSync('./data.json'));
}

async function CreateGroup(interaction) {
    RefreshAppData();

    const GUILD_ID = interaction.guildId;
    const USER_ID = interaction.user.id;
    const NAME = interaction.options.getString('name');
    const DATETIME = interaction.options.getString('datetime');
    const SIZE = interaction.options.getInteger('size');
    const template = {...appData.templates.group};

    appData.groups.forEach(group => {
        if (group.guildId === GUILD_ID && group.id >= template.id)
            template.id = group.id + 1;
    });
    
    template.guildId = GUILD_ID;
    template.name = NAME;
    template.startTime = DATETIME || null;
    template.status = null;
    template.maxSize = SIZE || null;
    template.members = [USER_ID];

    appData.groups.push(template);
    
    fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));
    
    if (SIZE) {
         return `> ## Group *${NAME}* created with a limit of ${SIZE} members.`;
    }
    else {
        return `> ## Group *${NAME}* created with no member limit.`;
    }
}

async function ViewGroups(interaction) {
    RefreshAppData();
    const GUILD_ID = interaction.guildId;

    let groups = appData.groups.filter(group => group.guildId === GUILD_ID);
    if (interaction.options.getSubcommand() === 'view') {
        const GROUP_NAME = interaction.options.getString('name');
        groups = groups.filter(group => group.name === GROUP_NAME);
    }

    if (groups.length === 0) {
        return '> ## There are currently no groups created.';
    }

    let groupList = '';
    groups.forEach(group => {
        groupList += `> ## *${group.name}*`;
        if (group.maxSize) {
            groupList += ` (${group.members.length}/${group.maxSize} members)\n`;
        }
        else {
            groupList += ` (${group.members.length} member(s))\n`;
        }

        group.members.forEach(memberId => {
            groupList += `> - <@${memberId}>\n`;
        });

        groupList += `> - **Event Time:** ${group.startTime || 'Not set'}\n`;

        groupList += '\n';
    });

    return groupList;
}

async function JoinGroup(interaction) {
    RefreshAppData();
    const GUILD_ID = interaction.guildId;
    const USER_ID = interaction.user.id;
    const GROUP_NAME = interaction.options.getString('name');

    const group = appData.groups.find(group => group.guildId === GUILD_ID && group.name === GROUP_NAME);

    if (!group) {
        return `> ## Group *${GROUP_NAME}* does not exist.`;
    }

    if (group.maxSize && group.members.length >= group.maxSize) {
        return `> ## Group *${GROUP_NAME}* is full.`;
    }

    if (group.members.includes(USER_ID)) {
        return `> ## You are already in group *${GROUP_NAME}*.`;
    }

    group.members.push(USER_ID);
    fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));

    return `> ## You have joined group *${GROUP_NAME}*.`;
}

async function LeaveGroup(interaction) {
    RefreshAppData();
    const GUILD_ID = interaction.guildId;
    const USER_ID = interaction.user.id;
    let GROUP_NAME = interaction.options.getString('name');
    let group = null;
    
    if (GROUP_NAME) {
        group = appData.groups.find(group => group.guildId === GUILD_ID && group.name === GROUP_NAME);

        if (!group) {
            return `> ## Group *${GROUP_NAME}* does not exist.`;
        }

        if (!group.members.includes(USER_ID)) {
            return `> ## You are not in group *${group.name}*.`;
        }

        group.members = group.members.filter(memberId => memberId !== USER_ID);

        if (group.members.length === 0) {
            appData.groups = appData.groups.filter(g => g.guildId === group.guildId && g.id !== group.id);
        }

        fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));
    }
    else {
        group = appData.groups.find(group => group.guildId === GUILD_ID && group.members.includes(USER_ID));

        if (!group) {
            return `> ## You are not in any group.`;
        }

        group.members = group.members.filter(memberId => memberId !== USER_ID);
        if (group.members.length === 0) {
            appData.groups = appData.groups.filter(g => g.guildId === group.guildId && g.id !== group.id);
        }

        fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));
    }

    let outcome = `> ## You have left group *${group.name}*.`;

    if (appData.groups.find(g => g.guildId === GUILD_ID && g.id === group.id) === undefined) {
        outcome += `\n> ## Group *${group.name}* has been deleted as it is now empty.`;
    }

    return outcome;
}

async function ClearGroups(interaction) {
    RefreshAppData();
    const GUILD_ID = interaction.guildId;

    appData.groups = appData.groups.filter(group => group.guildId !== GUILD_ID);

    fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));
    await interaction.reply('> ## All groups have been cleared.');
}

module.exports = {
	data: data,
	async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'create') {
            const result = await CreateGroup(interaction);
            await interaction.reply({
                content: result,
                allowedMentions: { parse: [] }
            })
            return;
        }

        if (subcommand === 'all') {
            const result = await ViewGroups(interaction);
            await interaction.reply({
                content: result,
                allowedMentions: { parse: [] }
            })
            return;
        }

        if (subcommand === 'view') {
            const result = await ViewGroups(interaction);
            await interaction.reply({
                content: result,
                allowedMentions: { parse: [] }
            })
            return;
        }

        if (subcommand === 'join') {
            const result = await JoinGroup(interaction);
            await interaction.reply({
                content: result,
                allowedMentions: { parse: [] }
            })
            return;
        }

        if (subcommand === 'leave') {
            const result = await LeaveGroup(interaction);
            await interaction.reply({
                content: result,
                allowedMentions: { parse: [] }
            })
            return;
        }

        if (subcommand === 'clear') {
            const confirm = interaction.options.getBoolean('confirm');
            if (confirm) {
                ClearGroups(interaction);
            } else {
                await interaction.reply('Group clearing cancelled.');
            }
            return;
        }
	},
};