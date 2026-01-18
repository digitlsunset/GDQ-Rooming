const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
let appData = require('../data.json');

const data = new SlashCommandBuilder()
 	.setName('room')
 	.setDescription('Room functions')
    // Create Room
    .addSubcommand(subcommand =>
        subcommand
            .setName('create')
            .setDescription('Create a room for people to join.')
            .addStringOption((option) =>
                option
                    .setName('room')
                    .setDescription('The name of the room to create')
                    .setRequired(true))
            .addStringOption((option) =>
                option
                    .setName('roomnumber')
                    .setDescription('The room number OR address of the room to create. If not applicable, put N/A.')
                    .setRequired(true))
            .addIntegerOption((option) =>
                option
                    .setName('size')
                    .setDescription('The maximum size of the room')
                    .setRequired(false))
    )
    // Join Room
    .addSubcommand(subcommand =>
        subcommand
            .setName('join')
            .setDescription('Join a room')
            .addStringOption((option) =>
                option
                    .setName('room')
                    .setDescription('The room to join')
                    .setRequired(true)
                    .setAutocomplete(true))
    )
    // Leave Room
    .addSubcommand(subcommand =>
        subcommand
            .setName('leave')
            .setDescription('Leave a room')
            .addStringOption((option) =>
                option
                    .setName('room')
                    .setDescription('The room to leave')
                    .setRequired(false)
                    .setAutocomplete(true))
    )
    .addSubcommandGroup(group =>
        group
            .setName('view')
            .setDescription('View room information')
            // View All Rooms
            .addSubcommand(subcommand =>
                subcommand
                    .setName('all')
                    .setDescription('View all rooms')
            )
            // View Single Room
            .addSubcommand(subcommand =>
                subcommand
                    .setName('single')
                    .setDescription('View a single room')
                    .addStringOption((option) =>
                        option
                            .setName('room')
                            .setDescription('The room to view')
                            .setRequired(true)
                            .setAutocomplete(true))
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('ping')
            .setDescription('Ping all members of a room')
            .addStringOption((option) =>
                option
                    .setName('room')
                    .setDescription('The room to ping')
                    .setRequired(true)
                    .setAutocomplete(true))
            .addStringOption((option) =>
                option
                    .setName('message')
                    .setDescription('Message to include with the ping')
                    .setRequired(false))
    )
    // Clear Rooms
    .addSubcommand(subcommand =>
        subcommand
            .setName('clear')
            .setDescription('Clear all rooms.')
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

async function CreateRoom(interaction) {
    RefreshAppData();

    const GUILD_ID = interaction.guildId;
    const USER_ID = interaction.user.id;
    const NAME = interaction.options.getString('room');
    const ROOM_NUMBER = interaction.options.getString('roomnumber');
    const SIZE = interaction.options.getInteger('size');

    // Check if room already exists
    const existingRoom = appData.rooms.find(room => room.name.toLowerCase() === NAME.toLowerCase());

    if (existingRoom) {
        return `> # A room with the name "${NAME}" already exists. Please choose a different name.`;
    }

    const template = {...appData.templates.room};
    let fail = null;

    appData.rooms.forEach(room => {
        if (room.guildId !== GUILD_ID) return;
        room.members.forEach(memberId => {
            if (memberId !== USER_ID) return;
            fail = room.name;
        });
    });

    if (fail) {
        return `> ## You are already in *${fail}*. Please leave it before joining another room.`;
    }

    appData.rooms.forEach(room => {
        if (room.guildId === GUILD_ID && room.id >= template.id)
            template.id = room.id + 1;
    });
    
    template.guildId = GUILD_ID;
    template.name = NAME;
    template.roomNumber = ROOM_NUMBER;
    template.maxSize = SIZE || null;
    template.members = [USER_ID];

    appData.rooms.push(template);
    
    fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));
    
    return SIZE ? `> ## Room *${NAME}* created with a limit of ${SIZE} members.` : `> ## Room *${NAME}* created with no member limit.`;
}

async function ViewSingle(interaction) {
    RefreshAppData();
    const GUILD_ID = interaction.guildId;
    const NAME = interaction.options.getString('room');

    const room = appData.rooms.find(room => room.name.toLowerCase() === NAME.toLowerCase() && room.guildId === GUILD_ID);

    if (room === undefined) {
        await interaction.reply({ content: `> ## There are currently no rooms created`, flags: MessageFlags.Ephemeral });
        return;
    }

    let embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(room.name)
        .setThumbnail('https://avatars.githubusercontent.com/u/10563385?s=200&v=4')

    embed.addFields(
        { name: 'Room #/Address:', value: room.roomNumber ? room.roomNumber : 'None' },
        { name: 'Members:', value: room.members.length ? room.members.map(id => `<@${id}>`).join('\n') : 'None' },
    );

    await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] }, flags: MessageFlags.Ephemeral });
}

async function ViewRooms(interaction) {
    RefreshAppData();
    const GUILD_ID = interaction.guildId;

    let rooms = appData.rooms.filter(room => room.guildId === GUILD_ID);

    if (rooms.length === 0) {
        await interaction.reply({ content: `> ## There are currently no rooms created`, flags: MessageFlags.Ephemeral });
        return;
    }

    let embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('All Rooms')
        .setThumbnail('https://avatars.githubusercontent.com/u/10563385?s=200&v=4')

    rooms.sort((a, b) => a.name.localeCompare(b.name)).forEach(room => {
        embed.addFields(
            { name: `${room.name}`
            , value:
                `- Room #/Address: ${room.roomNumber ? room.roomNumber : 'None'}
                \n- Members: ${room.members.length ? room.members.map(id => `<@${id}>`).join(', ') : 'None'}`
            },
        )
    });

    await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] }, flags: MessageFlags.Ephemeral });
}

async function JoinRoom(interaction) {
    RefreshAppData();
    const GUILD_ID = interaction.guildId;
    const USER_ID = interaction.user.id;
    const ROOM_NAME = interaction.options.getString('room');

    let fail = null;

    appData.rooms.forEach(room => {
        if (room.guildId !== GUILD_ID) return;
        room.members.forEach(memberId => {
            if (memberId !== USER_ID) return;
            fail = room.name;
        });
    });

    if (fail) {
        return `> ## You are already in *${fail}*. Please leave it before joining another room.`;
    }
    
    const room = appData.rooms.find(room => room.guildId === GUILD_ID && room.name === ROOM_NAME);

    if (!room) {
        return `> ## Room *${ROOM_NAME}* does not exist.`;
    }

    if (room.maxSize && room.members.length >= room.maxSize) {
        return `> ## Room *${ROOM_NAME}* is full.`;
    }

    if (room.members.includes(USER_ID)) {
        return `> ## You are already in room *${ROOM_NAME}*.`;
    }

    room.members.push(USER_ID);
    fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));

    return `> ## You have joined room *${ROOM_NAME}*.`;
}

async function LeaveRoom(interaction) {
    RefreshAppData();
    const GUILD_ID = interaction.guildId;
    const USER_ID = interaction.user.id;
    let ROOM_NAME = interaction.options.getString('room');
    let room = null;
    
    if (ROOM_NAME) {
        room = appData.rooms.find(room => room.guildId === GUILD_ID && room.name === ROOM_NAME);

        if (!room) {
            return `> ## Room *${ROOM_NAME}* does not exist.`;
        }

        if (!room.members.includes(USER_ID)) {
            return `> ## You are not in room *${room.name}*.`;
        }
        
        room.members = room.members.filter(memberId => memberId !== USER_ID);

        if (room.members.length === 0) {
            appData.rooms = appData.rooms.filter(r => r.guildId === room.guildId && r.id !== room.id);
        }

        fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));
    }
    else {
        room = appData.rooms.find(room => room.guildId === GUILD_ID && room.members.includes(USER_ID));

        if (!room) {
            return `> ## You are not in any room.`;
        }

        room.members = room.members.filter(memberId => memberId !== USER_ID);

        if (room.members.length === 0) {
            appData.rooms = appData.rooms.filter(r => r.guildId === room.guildId && r.id !== room.id);
        }

        fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));
    }

    let outcome = `> ## You have left room *${room.name}*.`;

    if (appData.rooms.find(r => r.guildId === GUILD_ID && r.id === room.id) === undefined) {
        outcome += `\n> ## Room *${room.name}* has been deleted as it is now empty.`;
    }

    return outcome;
}

async function PingRoom(interaction) {
    RefreshAppData();
    const GUILD_ID = interaction.guildId;
    const USER_ID = interaction.user.id;
    const NAME = interaction.options.getString('room');
    const MESSAGE = interaction.options.getString('message') || '';

    const room = appData.rooms.find(room => room.name.toLowerCase() === NAME.toLowerCase() && room.guildId === GUILD_ID);

    if (!room) {
        await interaction.reply({ content: `> # Room *${NAME}* does not exist.`, flags: MessageFlags.Ephemeral });
        return;
    }

    const denyPings = appData.denyPings || [];

    room.members = room.members.filter(member => !denyPings.includes(member));

    if (room.members.length === 0) {
        await interaction.reply({ content: `> ## Room *${NAME}* has no members to ping.`, flags: MessageFlags.Ephemeral });
        return;
    }
    
    const mentions = room.members.map(id => `<@${id}>`).join(' ');
    let content = `> ## Members of *${room.name}*:\n> ${mentions}`
    content += MESSAGE != '' ? `\n> ## ${MESSAGE}` : '';

    await interaction.reply({ content: content, allowedMentions: { users: room.members } });

}

// Remove later
async function ClearRooms(interaction) {
    RefreshAppData();
    const GUILD_ID = interaction.guildId;

    appData.rooms = appData.rooms.filter(room => room.guildId !== GUILD_ID);

    fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));
    await interaction.reply('> ## All rooms have been cleared.');
}

module.exports = {
	data: data,
	async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'create') {
            const result = await CreateRoom(interaction);
            await interaction.reply({
                content: result,
                allowedMentions: { parse: [] }
            })
            return;
        }

        if (subcommand === 'all') {
            await ViewRooms(interaction);
            return;
        }

        if (subcommand === 'single') {
            await ViewSingle(interaction);
            return;
        }

        if (subcommand === 'join') {
            const result = await JoinRoom(interaction);
            await interaction.reply({
                content: result,
                allowedMentions: { parse: [] }
            })
            return;
        }

        if (subcommand === 'leave') {
            const result = await LeaveRoom(interaction);
            await interaction.reply({
                content: result,
                allowedMentions: { parse: [] }
            })
            return;
        }

        if (subcommand === 'ping') {
            await PingRoom(interaction);
            return;
        }

        if (subcommand === 'clear') {
            const confirm = interaction.options.getBoolean('confirm');
            if (confirm) {
                ClearRooms(interaction);
            } else {
                await interaction.reply('Room clearing cancelled.');
            }
            return;
        }
	},
    async autocomplete(interaction) {
        RefreshAppData();
        const OPTION = interaction.options.getFocused(true);
        const VALUE = OPTION.value;
        const GUILD_ID = interaction.guildId;

        const rooms = appData.rooms
            .filter(room => room.guildId === GUILD_ID && room.name.toLowerCase().startsWith(VALUE.toLowerCase()))
            .map((room) => ({ name: room.name, value: room.name }));

        await interaction.respond(rooms.slice(0, 25));
    }
};