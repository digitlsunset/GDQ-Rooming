const { SlashCommandBuilder } = require('discord.js');
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
                    .setName('name')
                    .setDescription('The name of the room to create')
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
                    .setName('name')
                    .setDescription('The name of the room to join')
                    .setRequired(true))
    )
    // Leave Room
    .addSubcommand(subcommand =>
        subcommand
            .setName('leave')
            .setDescription('Leave a room')
            .addStringOption((option) =>
                option
                    .setName('name')
                    .setDescription('The name of the room to leave')
                    .setRequired(false))
    )
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
                    .setName('name')
                    .setDescription('The name of the room to view')
                    .setRequired(true))
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
    const NAME = interaction.options.getString('name');
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
    
    template.guildId = GUILD_ID;
    template.name = NAME;
    template.maxSize = SIZE || null;
    template.members = [USER_ID];

    appData.rooms.push(template);
    
    fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));
    
    return SIZE ? `> ## Room *${NAME}* created with a limit of ${SIZE} members.` : `> ## Room *${NAME}* created with no member limit.`;
}

async function ViewRooms(interaction) {
    RefreshAppData();
    const GUILD_ID = interaction.guildId;

    let rooms = appData.rooms.filter(room => room.guildId === GUILD_ID);

    if (interaction.options.getSubcommand() === 'view') {
        const ROOM_NAME = interaction.options.getString('name');
        rooms = rooms.filter(room => room.name === ROOM_NAME);
    }

    if (rooms.length === 0) {
        return '> ## There are currently no rooms created.';
    }

    let roomList = '';
    rooms.forEach(room => {
        roomList += `> ## *${room.name}*`;

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
    const ROOM_NAME = interaction.options.getString('name');

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
    let ROOM_NAME = interaction.options.getString('name');
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
            await interaction.reply({
                content: result,
                allowedMentions: { parse: [] }
            })
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
};