const { SlashCommandBuilder, MessageFlags } = require('discord.js');
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
                    .setName('view')
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

    // Check if room already exists
    const existingRoom = appData.rooms.find(room => room.name.toLowerCase() === NAME.toLowerCase());

    if (existingRoom) {
        return { content: `> # A room with the name "${NAME}" already exists. Please choose a different name.`, flags: MessageFlags.Ephemeral };
    }

    // Create new room object
    const newRoom = {...appData.templates.room};

    newRoom.guildId = GUILD_ID;
    newRoom.name = NAME;
    newRoom.roomNumber = ROOM_NUMBER;
    newRoom.maxSize = SIZE || null;
    newRoom.members = [USER_ID];

    appData.rooms.push(newRoom);
    
    fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));
    
    return SIZE ? `> ## Room *${NAME}* created with a limit of ${SIZE} members.` : `> ## Room *${NAME}* created with no member limit.`;
}

async function ViewRooms(interaction) {
    RefreshAppData();
    const GUILD_ID = interaction.guildId;

    let rooms = appData.rooms.filter(room => room.guildId === GUILD_ID);

    if (interaction.options.getSubcommand() === 'view') {
        const ROOM_NAME = interaction.options.getString('room');
        rooms = rooms.filter(room => room.name === ROOM_NAME);
    }

    if (rooms.length === 0) {
        return '> ## There are currently no rooms created.';
    }

    let roomList = '';
    rooms.forEach(room => {
        roomList += `> ## *${room.name}*`;
        roomList += room.roomNumber !== "N/A" ? ` [${room.roomNumber}]` : '';
        roomList += room.maxSize ? ` (${room.members.length}/${room.maxSize} members)\n` : ` (${room.members.length} member(s))\n`;

        room.members.forEach(memberId => {
            roomList += `> - <@${memberId}>\n`;
        });

        roomList += '\n';
    });

    return roomList;
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
        return { content: `> # Room *${NAME}* does not exist.`, flags: MessageFlags.Ephemeral };
    }

    const denyPings = appData.denyPings || [];

    room.members = room.members.filter(member => !denyPings.includes(member));

    // Un-comment later
    // if (room.members.length === 1 && room.members[0] === USER_ID) {
    //     return { content: `> ## Room *${NAME}* has no other members to ping.`, allowedMentions: { parse: [] } };
    // }

    if (room.members.length === 0) {
        return { content: `> ## Room *${NAME}* has no members to ping.`, flags: MessageFlags.Ephemeral };
    }
    
    const mentions = room.members.map(id => `<@${id}>`).join(' ');
    let content = `> ## Members of *${room.name}*:\n> ${mentions}`
    content += MESSAGE != '' ? `\n> ## ${MESSAGE}` : '';

    return { content: content, allowedMentions: { users: room.members } };

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

        if (subcommand === 'all' || subcommand === 'view') {
            const result = await ViewRooms(interaction);
            await interaction.reply(result);
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