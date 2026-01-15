const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
let appData = require('../data.json');

 const data = new SlashCommandBuilder()
 	.setName('run')
 	.setDescription('Run functions')
    // Create Group
    .addSubcommand(subcommand =>
        subcommand
            .setName('create')
            .setDescription('Upload a speedrun on the schedule you are interested in seeing')
            .addStringOption((option) =>
                option
                    .setName('run')
                    .setDescription('The name of the run')
                    .setRequired(true))
            .addStringOption((option) =>
                option
                    .setName('category')
                    .setDescription('The category of the run')
                    .setRequired(true))
            .addIntegerOption((option) =>
                option
                    .setName('estimated')
                    .setDescription('The estimated time of the run in minutes')
                    .setRequired(true))
            .addStringOption((option) =>
                option
                    .setName('datetime')
                    .setDescription('A Discord Hammertime of this run\'s event')
                    .setRequired(false))
    )
    // Join Group
    .addSubcommand(subcommand =>
        subcommand
            .setName('join')
            .setDescription('Show interest in a run others want to see')
            .addStringOption((option) =>
                option
                    .setName('run')
                    .setDescription('The run to join')
                    .setRequired(true)
                    .setAutocomplete(true))
    )
    // Leave Group
    .addSubcommand(subcommand =>
        subcommand
            .setName('leave')
            .setDescription('Remove interest in a run')
            .addStringOption((option) =>
                option
                    .setName('run')
                    .setDescription('The run to leave')
                    .setRequired(true)
                    .setAutocomplete(true))
    )
    .addSubcommandGroup(group =>
        group
            .setName('view')
            .setDescription('View run information')
            // View All Groups
            .addSubcommand(subcommand =>
                subcommand
                    .setName('all')
                    .setDescription('View all runs that people have shown interest in')
            )
            // View Single Group
            .addSubcommand(subcommand =>
                subcommand
                    .setName('single')
                    .setDescription('View a single run people have shown interest in')
                    .addStringOption((option) =>
                        option
                            .setName('run')
                            .setDescription('The run to view')
                            .setRequired(true)
                            .setAutocomplete(true))
            )
    )
    
    // Ping Group
    .addSubcommand(subcommand =>
        subcommand
            .setName('ping')
            .setDescription('Ping all members of a run of interest')
            .addStringOption((option) =>
                option
                    .setName('run')
                    .setDescription('The run to ping')
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
            .setDescription('Clear all runs.')
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

async function CreateRun(interaction) {
    RefreshAppData();

    const GUILD_ID = interaction.guildId;
    const USER_ID = interaction.user.id;
    const NAME = interaction.options.getString('run');
    const CATEGORY = interaction.options.getString('category');
    const template = {...appData.templates.run};

    DATETIME = interaction.options.getString('datetime') !== null && interaction.options.getString('datetime').match(/\d+/) ? 
                interaction.options.getString('datetime').match(/\d+/)[0] : null;

    ESTIMATE = interaction.options.getInteger('estimated');
    const ESTIMATE_FORMATTED = 'in ' + Math.floor(ESTIMATE / 60) + ' hours and ' + ESTIMATE % 60 + ' minutes';

    appData.runs.forEach(run => {
        if (run.guildId === GUILD_ID && run.id >= template.id)
            template.id = run.id + 1;
    });

    template.guildId = GUILD_ID;
    template.name = NAME;
    template.category = CATEGORY;
    template.startTime = DATETIME;
    template.status = null;
    template.duration = ESTIMATE_FORMATTED;
    template.members = [USER_ID];

    appData.runs.push(template);
    
    fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));
    
    return `> ## Interest in run *${NAME} (${CATEGORY})* has been created.`;
}

async function ViewRuns(interaction) {
    RefreshAppData();

    const GUILD_ID = interaction.guildId;

    let runs = appData.runs.filter(run => run.guildId === GUILD_ID);
    if (interaction.options.getSubcommand() === 'single') {
        const RUN_NAME = interaction.options.getString('run');
        runs = runs.filter(run => run.name === RUN_NAME);
    }

    if (runs.length === 0) {
        return '> ## Interest in this run does not currently exist.';
    }

    let runList = '';
    runs.forEach(run => {
        runList += `> ## *${run.name} (${run.category})* ${run.duration}\n`;

        run.members.forEach(memberId => {
            runList += `> - <@${memberId}>\n`;
        });

        runList += run.startTime && run.startTime.length === 10 ? 
                    `> - **Event Time: ** <t:${run.startTime}:s> (<t:${run.startTime}:R>)\n` : `> - **Event Time: ** Not set\n`;
        runList += '\n';
    });

    return runList;
}

async function JoinRun(interaction) {
    RefreshAppData();

    const GUILD_ID = interaction.guildId;
    const USER_ID = interaction.user.id;
    const RUN_NAME = interaction.options.getString('run');

    const run = appData.runs.find(run => run.guildId === GUILD_ID && run.name === RUN_NAME);

    if (!run) {
        return `> ## Interest in run *${RUN_NAME}* does not exist.`;
    }

    if (run.members.includes(USER_ID)) {
        return `> ## You are already interested in run *${RUN_NAME}*.`;
    }

    run.members.push(USER_ID);
    fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));

    return `> ## You have joined run *${RUN_NAME}*.`;
}

async function LeaveRun(interaction) {
    RefreshAppData();

    const GUILD_ID = interaction.guildId;
    const USER_ID = interaction.user.id;
    let RUN_NAME = interaction.options.getString('run');
    let run = null;

    if (RUN_NAME) {
        run = appData.runs.find(run => run.guildId === GUILD_ID && run.name === RUN_NAME);

        if (!run) {
            return `> ## Interest in run *${RUN_NAME}* does not exist.`;
        }

        if (!run.members.includes(USER_ID)) {
            return `> ## You are already not interested in run *${RUN_NAME}*.`;
        }

        run.members = run.members.filter(memberId => memberId !== USER_ID);

        if (run.members.length === 0) {
            appData.runs = appData.runs.filter(r => r.guildId === run.guildId && r.id !== run.id);
        }

        fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));
    }
    else {
        run = appData.runs.find(run => run.guildId === GUILD_ID && run.members.includes(USER_ID));

        if (!run) {
            return `> ## You are not interested in any runs.`;
        }

        run.members = run.members.filter(memberId => memberId !== USER_ID);
        if (run.members.length === 0) {
            appData.runs = appData.runs.filter(r => r.guildId === run.guildId && r.id !== run.id);
        }

        fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));
    }

    let outcome = `> ## You have left run *${run.name}*.`;

    if (appData.runs.find(r => r.guildId === GUILD_ID && r.id === run.id) === undefined) {
        outcome += `\n> ## Run *${run.name}* has been deleted as it is now empty.`;
    }

    return outcome;
}

async function PingRun(interaction) {
    RefreshAppData();
    const USER_ID = interaction.user.id;
    const GUILD_ID = interaction.guildId;
    const RUN_NAME = interaction.options.getString('run');
    const MESSAGE = interaction.options.getString('message') || '';

    const run = appData.runs.find(run => run.guildId === GUILD_ID && run.name === RUN_NAME);

    if (!run) {
        return `> ## Run *${RUN_NAME}* does not exist.`;
    }

    // Un-comment later
    // if (run.members.length === 1 && run.members[0] === USER_ID) {
    //     return `> ## Run *${RUN_NAME}* has no other members to ping.`;
    // }

    const mentions = run.members.map(id => `<@${id}>`).join(' ');
    const content = `> ## Members of *${run.name}*:\n> ${mentions}\n> ## ${MESSAGE}`;

    // Return an object so the caller can use the proper allowedMentions to actually ping the users
    return {
        content,
        allowedMentions: { users: run.members }
    };
}

async function ClearRuns(interaction) {
    RefreshAppData();
    
    const GUILD_ID = interaction.guildId;

    appData.runs = appData.runs.filter(run => run.guildId !== GUILD_ID);

    fs.writeFileSync('./data.json', JSON.stringify(appData, null, 4));
    await interaction.reply('> ## All runs have been cleared.');
}

module.exports = {
	data: data,
	async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'create') {
            const result = await CreateRun(interaction);
            await interaction.reply({
                content: result,
                allowedMentions: { parse: [] }
            })
            return;
        }

        if (subcommand === 'all' || subcommand === 'single') {
            const result = await ViewRuns(interaction);
            await interaction.reply({
                content: result,
                allowedMentions: { parse: [] },
                ephemeral: true
            })
            return;
        }

        if (subcommand === 'ping') {
            const result = await PingRun(interaction);
            if (typeof result === 'string') {
                await interaction.reply({ content: result, allowedMentions: { parse: [] } });
            } else {
                await interaction.reply(result);
            }
            return;
        }


        if (subcommand === 'join') {
            const result = await JoinRun(interaction);
            await interaction.reply({
                content: result,
                allowedMentions: { parse: [] }
            })
            return;
        }

        if (subcommand === 'leave') {
            const result = await LeaveRun(interaction);
            await interaction.reply({
                content: result,
                allowedMentions: { parse: [] }
            })
            return;
        }

        if (subcommand === 'clear') {
            const confirm = interaction.options.getBoolean('confirm');
            if (confirm) {
                ClearRuns(interaction);
            } else {
                await interaction.reply('Run clearing cancelled.');
            }
            return;
        }
	},
    async autocomplete(interaction) {
        RefreshAppData();
        const OPTION = interaction.options.getFocused(true);
        const VALUE = OPTION.value;
        const GUILD_ID = interaction.guildId;

        const runs = appData.runs
            .filter(run => run.guildId === GUILD_ID && run.name.toLowerCase().startsWith(VALUE.toLowerCase()))
            .map((run) => ({ name: run.name, value: run.name }));

        await interaction.respond(runs.slice(0, 25));
    }
};