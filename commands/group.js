const { SlashCommandBuilder, MessageFlags } = require('discord.js');
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
                    .setName('group')
                    .setDescription('The name of the group to create')
                    .setRequired(true))
            .addStringOption((option) =>
                option
                    .setName('datetime')
                    .setDescription('A Discord Hammertime of this group\'s event')
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
                    .setName('group')
                    .setDescription('The group to join')
                    .setRequired(true)
                    .setAutocomplete(true))
    )
    // Leave Group
    .addSubcommand(subcommand =>
        subcommand
            .setName('leave')
            .setDescription('Leave a group')
            .addStringOption((option) =>
                option
                    .setName('group')
                    .setDescription('The group to leave')
                    .setRequired(false)
                    .setAutocomplete(true))
    )
    .addSubcommandGroup(group =>
        group
            .setName('view')
            .setDescription('View group information')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('all')
                    .setDescription('View all groups')
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('single')
                    .setDescription('View a single group')
                    .addStringOption(option =>
                        option
                            .setName('group')
                            .setDescription('The group to view')
                            .setRequired(true)
                            .setAutocomplete(true)
                    )
            )
    )
    // Ping Group
    .addSubcommand(subcommand =>
        subcommand
            .setName('ping')
            .setDescription('Ping all members of a group')
            .addStringOption((option) =>
                option
                    .setName('group')
                    .setDescription('The group to ping')
                    .setRequired(true)
                    .setAutocomplete(true))
            .addStringOption((option) =>
                option
                    .setName('message')
                    .setDescription('Message to include with the ping')
                    .setRequired(false))
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
    const NAME = interaction.options.getString('group');
    const SIZE = interaction.options.getInteger('size');
    const template = {...appData.templates.group};

    DATETIME = interaction.options.getString('datetime') !== null && interaction.options.getString('datetime').match(/\d+/) ? 
                interaction.options.getString('datetime').match(/\d+/)[0] : null;

    appData.groups.forEach(group => {
        if (group.guildId === GUILD_ID && group.id >= template.id)
            template.id = group.id + 1;
    });

    // Check if group already exists
    const existingGroup = appData.groups.find(group => group.name.toLowerCase() === NAME.toLowerCase());

    if (existingGroup) {
        return { content: `> # A group with the name "${NAME}" already exists. Please choose a different name.`, flags: MessageFlags.Ephemeral };
    }

    // Create new group object
    const newGroup = {...appData.templates.group};

    newGroup.guildId = GUILD_ID;
    newGroup.name = NAME;
    newGroup.startTime = DATETIME;
    newGroup.status = null;
    newGroup.duration = SIZE || null;
    newGroup.members = [USER_ID];

    appData.groups.push(newGroup);

    fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));
    
    return SIZE ? `> ## Group *${NAME}* created with a limit of ${SIZE} members.` : `> ## Group *${NAME}* created with no member limit.`;
}

async function ViewGroups(interaction) {
    RefreshAppData();

    const GUILD_ID = interaction.guildId;

    let groups = appData.groups.filter(group => group.guildId === GUILD_ID);
    if (interaction.options.getSubcommand() === 'view') {
        const GROUP_NAME = interaction.options.getString('group');
        groups = groups.filter(group => group.name === GROUP_NAME);
    }

    if (groups.length === 0) {
        return '> ## There are currently no groups created.';
    }

    let groupList = '';
    groups.forEach(group => {
        groupList += `> ## *${group.name}*`;

        groupList += group.maxSize ? ` (${group.members.length}/${group.maxSize} members)\n` : ` (${group.members.length} member(s))\n`;

        group.members.forEach(memberId => {
            groupList += `> - <@${memberId}>\n`;
        });

        groupList += group.startTime && group.startTime.length === 10 ? 
                    `> - **Event Time: ** <t:${group.startTime}:s> (<t:${group.startTime}:R>)\n` : `> - **Event Time: ** Not set\n`;

        groupList += '\n';
    });

    return groupList;
}

async function JoinGroup(interaction) {
    RefreshAppData();

    const GUILD_ID = interaction.guildId;
    const USER_ID = interaction.user.id;
    const GROUP_NAME = interaction.options.getString('group');

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
    let GROUP_NAME = interaction.options.getString('group');
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

async function PingGroup(interaction) {
    RefreshAppData();

    const GUILD_ID = interaction.guildId;
    const GROUP_NAME = interaction.options.getString('group');
    const MESSAGE = interaction.options.getString('message') || '';

    const group = appData.groups.find(group => group.guildId === GUILD_ID && group.name === GROUP_NAME);

    if (!group) {
        return `> ## Group *${GROUP_NAME}* does not exist.`;
    }

    const denyPings = appData.denyPings || [];

    group.members = group.members.filter(member => !denyPings.includes(member));

    // Un-comment later
    // if (group.members.length === 1 && group.members[0] === USER_ID) {
    //     return {
    //         content: `> ## Group *${GROUP_NAME}* has no members to ping.`,
    //         allowedMentions: { parse: [] },
    //         ephemeral: true
    //     }
    // }

    if (group.members.length === 0) {
        return {
            content: `> ## Group *${GROUP_NAME}* has no members to ping.`,
            allowedMentions: { parse: [] },
            flags: MessageFlags.Ephemeral
        }
    }

    const mentions = group.members.map(id => `<@${id}>`).join(' ');
    let content = `> ## Members of *${group.name}*:\n> ${mentions}`
    content += MESSAGE != '' ? `\n> ## ${MESSAGE}` : '';

    // Return an object so the caller can use the proper allowedMentions to actually ping the users
    return {
        content,
        allowedMentions: { users: group.members }
    };
}

async function ClearGroups(interaction) {
    RefreshAppData();
    
    const GUILD_ID = interaction.guildId;

    appData.groups = appData.groups.filter(group => group.guildId !== GUILD_ID);

    fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));
    return { content: '> ## All groups have been cleared.' };
}

module.exports = {
	data: data,
	async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'create') {
            const result = await CreateGroup(interaction);
            if (typeof result === 'string') {
                await interaction.reply({ content: result, allowedMentions: { parse: [] } });
            } else {
                await interaction.reply(result);
            }
            return;
        }

        if (subcommand === 'all' || subcommand === 'view') {
            const result = await ViewGroups(interaction);
            await interaction.reply(result);
            return;
        }

        if (subcommand === 'ping') {
            const result = await PingGroup(interaction);
            if (typeof result === 'string') {
                await interaction.reply({ content: result, allowedMentions: { parse: [] } });
            } else {
                await interaction.reply(result);
            }
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
    async autocomplete(interaction) {
        RefreshAppData();
        const OPTION = interaction.options.getFocused(true);
        const VALUE = OPTION.value;
        const GUILD_ID = interaction.guildId;

        const groups = appData.groups
            .filter(group => group.guildId === GUILD_ID && group.name.toLowerCase().startsWith(VALUE.toLowerCase()))
            .map((group) => ({ name: group.name, value: group.name }));

        await interaction.respond(groups.slice(0, 25));
    }
};