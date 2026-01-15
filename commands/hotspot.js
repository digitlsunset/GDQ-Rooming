const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
let appData = require('../data.json');

const data = new SlashCommandBuilder()
 	.setName('hotspot')
 	.setDescription('Hotspot functions')
    // Create Hotspot
    .addSubcommand(subcommand =>
        subcommand
            .setName('create')
            .setDescription('Create a hotspot for people to join.')
            .addStringOption((option) =>
                option
                    .setName('hotspot')
                    .setDescription('The name of the hotspot to create')
                    .setRequired(true))
            .addStringOption((option) =>
                option
                    .setName('url')
                    .setDescription('A URL for this hotspot')
                    .setRequired(false))
            .addStringOption((option) =>
                option
                    .setName('address')
                    .setDescription('An address for this hotspot')
                    .setRequired(false))
    )
    // Join Hotspot
    .addSubcommand(subcommand =>
        subcommand
            .setName('join')
            .setDescription('Join a hotspot')
            .addStringOption((option) =>
                option
                    .setName('hotspot')
                    .setDescription('The hotspot to join')
                    .setRequired(true)
                    .setAutocomplete(true))
    )
    // Leave Hotspot
    .addSubcommand(subcommand =>
        subcommand
            .setName('leave')
            .setDescription('Leave a hotspot')
            .addStringOption((option) =>
                option
                    .setName('hotspot')
                    .setDescription('The hotspot to leave')
                    .setRequired(false)
                    .setAutocomplete(true))
    )
    .addSubcommandGroup(group =>
        group
            .setName('view')
            .setDescription('View hotspot information')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('all')
                    .setDescription('View all hotspots')
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('single')
                    .setDescription('View a single hotspot')
                    .addStringOption(option =>
                        option
                            .setName('hotspot')
                            .setDescription('The hotspot to view')
                            .setRequired(true)
                            .setAutocomplete(true)
                    )
            )
    )
    // Ping Hotspot
    .addSubcommand(subcommand =>
        subcommand
            .setName('ping')
            .setDescription('Ping all members of a hotspot')
            .addStringOption((option) =>
                option
                    .setName('hotspot')
                    .setDescription('The hotspot to ping')
                    .setRequired(true)
                    .setAutocomplete(true))
            .addStringOption((option) =>
                option
                    .setName('message')
                    .setDescription('Message to include with the ping')
                    .setRequired(false))
    )
    // Clear Hotspots
    .addSubcommand(subcommand =>
        subcommand
            .setName('clear')
            .setDescription('Clear all hotspots.')
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

async function CreateHotspot(interaction) {
    RefreshAppData();
    const GUILD_ID = interaction.guildId;
    const USER_ID = interaction.user.id;
    const NAME = interaction.options.getString('hotspot');
    let URL = interaction.options.getString('url');
    const ADDR = interaction.options.getString('address');
    const template = {...appData.templates.hotspot};

    appData.hotspots.forEach(hotspot => {
        if (hotspot.guildId === GUILD_ID && hotspot.id >= template.id)
            template.id = hotspot.id + 1;
    });


    // Check if hotspot already exists
    const existingHotspot = appData.hotspots.find(hotspot => hotspot.name.toLowerCase() === NAME.toLowerCase());

    if (existingHotspot) {
        return { content: `> # A hotspot with the name "${NAME}" already exists. Please choose a different name.`, flags: MessageFlags.Ephemeral };
    }

    // Create new hotspot object
    const newHotspot = {...appData.templates.hotspot};
    newHotspot.name = NAME;
    newHotspot.url = URL || '';
    newHotspot.address = ADDR || '';
    newHotspot.guildId = GUILD_ID;
    newHotspot.members = [USER_ID];

    // Add new hotspot to appData
    appData.hotspots.push(newHotspot);
    
    fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));

    return `> ## Interest in hotspot *${NAME}* has been created.`;
};

async function JoinHotspot(interaction) {
    RefreshAppData();
    const GUILD_ID = interaction.guildId;
    const USER_ID = interaction.user.id;
    const NAME = interaction.options.getString('hotspot');

    const hotspot = appData.hotspots.find(hotspot => hotspot.name.toLowerCase() === NAME.toLowerCase() && hotspot.guildId === GUILD_ID);

    if (!hotspot) {
        return { content: `> # Hotspot *${NAME}* does not exist.`, flags: MessageFlags.Ephemeral };
    }

    if (hotspot.members.includes(USER_ID)) {
        return { content: `> # You are already a member of hotspot *${NAME}*.`, flags: MessageFlags.Ephemeral };
    }

    appData.hotspots.find(hotspot => hotspot.name.toLowerCase() === NAME.toLowerCase() && hotspot.guildId === GUILD_ID).members.push(USER_ID);
    
    fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));

    return { content: `> # <@${USER_ID}> joined hotspot *${NAME}*.` , allowedMentions: { parse: [] }};
}

async function LeaveHotspot(interaction) {
    RefreshAppData();
    const GUILD_ID = interaction.guildId;
    const USER_ID = interaction.user.id;
    const NAME = interaction.options.getString('hotspot');

    const hotspot = appData.hotspots.find(hotspot => hotspot.name.toLowerCase() === NAME.toLowerCase() && hotspot.guildId === GUILD_ID);

    if (!hotspot) {
        return { content: `> # Hotspot *${NAME}* does not exist.`, flags: MessageFlags.Ephemeral };
    }

    if (!hotspot.members.includes(USER_ID)) {
        return { content: `> # You are not a member of hotspot *${NAME}*.`, flags: MessageFlags.Ephemeral };
    }

    appData.hotspots.find(hotspot => hotspot.name.toLowerCase() === NAME.toLowerCase() && hotspot.guildId === GUILD_ID).members = hotspot.members.filter(member => member !== USER_ID);
    
    fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));

    return { content: `> # <@${USER_ID}> left hotspot *${NAME}*.` , allowedMentions: { parse: [] }};
}

async function ViewHotspot(interaction) {
    RefreshAppData();
    const GUILD_ID = interaction.guildId;
    const NAME = interaction.options.getString('hotspot');

    let hotspots = appData.hotspots.filter(hotspot => hotspot.guildId === GUILD_ID);

    if (interaction.options.getSubcommand() === 'single') {
        hotspots = hotspots.filter(hotspot => hotspot.name === NAME);
    }

    if (hotspots.length === 0) {
        return { content: `> ## There are currently no hotspots created`, flags: MessageFlags.Ephemeral };
    }

    let hotspotList = '';
    hotspots.forEach(hotspot => {
        hotspotList += `> ## *${hotspot.name}*\n`;
        hotspotList += hotspot.url ? `> - URL: ${hotspot.url}\n` : '';
        hotspotList += hotspot.address ? `> - Address: ${hotspot.address}\n` : '';
        hotspotList += `> - Members:\n`;

        hotspot.members.forEach(memberId => {
            hotspotList += `>   - <@${memberId}>\n`;
        });

        hotspotList += '\n';
    });

    return { content: hotspotList, allowedMentions: { parse: [] }, flags: MessageFlags.Ephemeral };
}

async function PingHotspot(interaction) {
    RefreshAppData();
    const GUILD_ID = interaction.guildId;
    const USER_ID = interaction.user.id;
    const NAME = interaction.options.getString('hotspot');
    const MESSAGE = interaction.options.getString('message') || '';

    const hotspot = appData.hotspots.find(hotspot => hotspot.name.toLowerCase() === NAME.toLowerCase() && hotspot.guildId === GUILD_ID);

    if (!hotspot) {
        return { content: `> # Hotspot *${NAME}* does not exist.`, flags: MessageFlags.Ephemeral };
    }

    const denyPings = appData.denyPings || [];

    hotspot.members = hotspot.members.filter(member => !denyPings.includes(member));

    // Un-comment later
    // if (hotspot.members.length === 1 && hotspot.members[0] === USER_ID) {
    //     await interaction.reply({ content: `> ## Hotspot *${NAME}* has no other members to ping.`, allowedMentions: { parse: [] } });
    // }

    if (hotspot.members.length === 0) {
        return { content: `> ## Hotspot *${NAME}* has no members to ping.`, flags: MessageFlags.Ephemeral };
    }
    
    const mentions = hotspot.members.map(id => `<@${id}>`).join(' ');
    let content = `> ## Members of *${hotspot.name}*:\n> ${mentions}`
    content += MESSAGE != '' ? `\n> ## ${MESSAGE}` : '';

    return { content: content, allowedMentions: { users: hotspot.members } };

}

async function ClearHotspots(interaction) {
    RefreshAppData();
    
    const GUILD_ID = interaction.guildId;

    appData.hotspots = appData.hotspots.filter(hotspot => hotspot.guildId !== GUILD_ID);

    fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));
    return { content: '> ## All hotspots have been cleared.' };
}

module.exports = {
    data: data,
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'create') {
            const result = await CreateHotspot(interaction);
            if (typeof result === 'string') {
                await interaction.reply({ content: result, allowedMentions: { parse: [] } });
            } else {
                await interaction.reply(result);
            }
            return;
        }

        if (subcommand === 'all' || subcommand === 'single') {
            const result = await ViewHotspot(interaction);
            await interaction.reply(result);
            return;
        }

        if (subcommand === 'ping') {
            const result = await PingHotspot(interaction);
            if (typeof result === 'string') {
                await interaction.reply({ content: result, allowedMentions: { parse: [] } });
            } else {
                await interaction.reply(result);
            }
            return;
        }

        if (subcommand === 'join') {
            const result = await JoinHotspot(interaction);
            await interaction.reply({
                content: result,
                allowedMentions: { parse: [] }
            })
            return;
        }

        if (subcommand === 'leave') {
            const result = await LeaveHotspot(interaction);
            await interaction.reply({
                content: result,
                allowedMentions: { parse: [] }
            })
            return;
        }

        if (subcommand === 'clear') {
            const confirm = interaction.options.getBoolean('confirm');
            if (confirm) {
                ClearHotspots(interaction);
            } else {
                await interaction.reply('Hotspot clearing cancelled.');
            }
            return;
        }

        await interaction.reply('Hotspot command is under construction.');
    },
    async autocomplete(interaction) {
        RefreshAppData();
        const OPTION = interaction.options.getFocused(true);
        const VALUE = OPTION.value;
        const GUILD_ID = interaction.guildId;

        const hotspots = appData.hotspots
            .filter(hotspot => hotspot.guildId === GUILD_ID && hotspot.name.toLowerCase().startsWith(VALUE.toLowerCase()))
            .map((hotspot) => ({ name: hotspot.name, value: hotspot.name }));

        await interaction.respond(hotspots.slice(0, 25));
    }
};