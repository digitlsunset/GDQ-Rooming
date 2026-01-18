const { SlashCommandBuilder, EmbedBuilder, MessageFlags, flatten } = require('discord.js');
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

    // Check if hotspot already exists
    const existingHotspot = appData.hotspots.find(hotspot => hotspot.name.toLowerCase() === NAME.toLowerCase());

    if (existingHotspot) {
        await interaction.reply({ content: `> # A hotspot with the name "${NAME}" already exists. Please choose a different name.`, flags: MessageFlags.Ephemeral });
        return;
    }

    const template = {...appData.templates.hotspot};

    appData.hotspots.forEach(hotspot => {
        if (hotspot.guildId === GUILD_ID && hotspot.id >= template.id)
            template.id = hotspot.id + 1;
    });

    template.name = NAME;
    template.url = URL || '';
    template.address = ADDR || '';
    template.guildId = GUILD_ID;
    template.members = [USER_ID];
    // Add new hotspot to appData
    appData.hotspots.push(template);
    
    fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));

    await interaction.reply({ content: `> # Hotspot *${NAME}* created!` })
};

async function JoinHotspot(interaction) {
    RefreshAppData();
    const GUILD_ID = interaction.guildId;
    const USER_ID = interaction.user.id;
    const NAME = interaction.options.getString('hotspot');

    const hotspot = appData.hotspots.find(hotspot => hotspot.name.toLowerCase() === NAME.toLowerCase() && hotspot.guildId === GUILD_ID);

    if (!hotspot) {
        await interaction.reply({ content: `> # Hotspot *${NAME}* does not exist.`, flags: MessageFlags.Ephemeral });
        return;
    }

    if (hotspot.members.includes(USER_ID)) {
        await interaction.reply({ content: `> # You are already a member of hotspot *${NAME}*.`, flags: MessageFlags.Ephemeral });
        return;
    }

    appData.hotspots.find(hotspot => hotspot.name.toLowerCase() === NAME.toLowerCase() && hotspot.guildId === GUILD_ID).members.push(USER_ID);
    
    fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));

    await interaction.reply({ content: `> # <@${USER_ID}> joined hotspot *${NAME}*.` , allowedMentions: { parse: [] }});
}

async function LeaveHotspot(interaction) {
    RefreshAppData();

    const GUILD_ID = interaction.guildId;
    const USER_ID = interaction.user.id;
    let HOTSPOT_NAME = interaction.options.getString('hotspot');
    let hotspot = null;

    if (HOTSPOT_NAME) {
        hotspot = appData.hotspots.find(hotspot => hotspot.guildId === GUILD_ID && hotspot.name === HOTSPOT_NAME);

        if (!hotspot) {
            return `> ## Interest in Hotspot *${HOTSPOT_NAME}* does not exist.`;
        }

        if (!hotspot.members.includes(USER_ID)) {
            return `> ## You are already not interested in Hotspot *${HOTSPOT_NAME}*.`;
        }

        hotspot.members = hotspot.members.filter(memberId => memberId !== USER_ID);

        if (hotspot.members.length === 0) {
            appData.hotspots = appData.hotspots.filter(h => h.guildId === hotspot.guildId && h.id !== hotspot.id);
        }

        fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));
    }
    else {
        hotspot = appData.hotspots.find(hotspot => hotspot.guildId === GUILD_ID && hotspot.members.includes(USER_ID));

        if (!hotspot) {
            return `> ## You are not interested in any Hotspots.`;
        }

        hotspot.members = hotspot.members.filter(memberId => memberId !== USER_ID);
        if (hotspot.members.length === 0) {
            appData.hotspots = appData.hotspots.filter(h => h.guildId === hotspot.guildId && h.id !== hotspot.id);
        }

        fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));
    }

    let outcome = `> ## You have left Hotspot *${hotspot.name}*.`;

    if (appData.hotspots.find(h => h.guildId === GUILD_ID && h.id === hotspot.id) === undefined) {
        outcome += `\n> ## Hotspot *${hotspot.name}* has been deleted as it is now empty.`;
    }

    return outcome;
}

async function ViewSingle(interaction) {
    RefreshAppData();
    const GUILD_ID = interaction.guildId;
    const NAME = interaction.options.getString('hotspot');

    const hotspot = appData.hotspots.find(hotspot => hotspot.name.toLowerCase() === NAME.toLowerCase() && hotspot.guildId === GUILD_ID);

    if (hotspot === undefined) {
        await interaction.reply({ content: `> ## There are currently no hotspots created`, flags: MessageFlags.Ephemeral });
        return;
    }

    let embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(hotspot.name)
        .setThumbnail('https://avatars.githubusercontent.com/u/10563385?s=200&v=4')

    embed.addFields(
        { name: 'URL:', value: hotspot.url ? `<${hotspot.url}>` : 'None', inline: true },
        { name: 'Address:', value: hotspot.address ? hotspot.address : 'None', inline: true },
        { name: 'Members:', value: hotspot.members.length ? hotspot.members.map(id => `<@${id}>`).join('\n') : 'None' },
    );

    await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] }, flags: MessageFlags.Ephemeral });
}

async function ViewHotspot(interaction) {
    RefreshAppData();
    const GUILD_ID = interaction.guildId;
    const NAME = interaction.options.getString('hotspot');

    let hotspots = appData.hotspots.filter(hotspot => hotspot.guildId === GUILD_ID);

    if (hotspots.length === 0) {
        await interaction.reply({ content: `> ## There are currently no hotspots created`, flags: MessageFlags.Ephemeral });
        return;
    }

    let embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('All Hotspots')
        .setThumbnail('https://avatars.githubusercontent.com/u/10563385?s=200&v=4')

    hotspots.sort((a, b) => a.name.localeCompare(b.name)).forEach(hotspot => {
        embed.addFields(
            { name: `${hotspot.name}`
            , value:
                `- URL: ${hotspot.url ? `<${hotspot.url}>` : 'None'}
                \n- Address: ${hotspot.address ? hotspot.address : 'None'}
                \n- Members: ${hotspot.members.length ? hotspot.members.map(id => `<@${id}>`).join(', ') : 'None'}`
            },
        )
    });

    await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] }, flags: MessageFlags.Ephemeral });
}

async function PingHotspot(interaction) {
    RefreshAppData();
    const GUILD_ID = interaction.guildId;
    const USER_ID = interaction.user.id;
    const NAME = interaction.options.getString('hotspot');
    const MESSAGE = interaction.options.getString('message') || '';

    const hotspot = appData.hotspots.find(hotspot => hotspot.name.toLowerCase() === NAME.toLowerCase() && hotspot.guildId === GUILD_ID);

    if (!hotspot) {
        await interaction.reply({ content: `> # Hotspot *${NAME}* does not exist.`, flags: MessageFlags.Ephemeral });
        return;
    }

    const denyPings = appData.denyPings || [];

    hotspot.members = hotspot.members.filter(member => !denyPings.includes(member));

    if (hotspot.members.length === 0) {
        await interaction.reply({ content: `> ## Hotspot *${NAME}* has no members to ping.`, flags: MessageFlags.Ephemeral });
        return;
    }
    
    const mentions = hotspot.members.map(id => `<@${id}>`).join(' ');
    let content = `> ## Members of *${hotspot.name}*:\n> ${mentions}`
    content += MESSAGE != '' ? `\n> ## ${MESSAGE}` : '';

    await interaction.reply({ content: content, allowedMentions: { users: hotspot.members } });

}

async function ClearHotspots(interaction) {
    RefreshAppData();
    
    const GUILD_ID = interaction.guildId;

    appData.hotspots = appData.hotspots.filter(hotspot => hotspot.guildId !== GUILD_ID);

    fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));
    await interaction.reply('> ## All hotspots have been cleared.');
}

module.exports = {
    data: data,
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'create') {
            await CreateHotspot(interaction);
            return;
        }
        if (subcommand === 'join') {
            await JoinHotspot(interaction);
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
        if (subcommand === 'all') {
            await ViewHotspot(interaction);
            return;
        }
        if (subcommand === 'single') {
            await ViewSingle(interaction);
            return;
        }
        if (subcommand === 'ping') {
            await PingHotspot(interaction);
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