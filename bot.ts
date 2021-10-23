import { Client, Collection, Intents, Message, TextChannel } from "discord.js";
const twitterConfig = require('./config');
const Twitter = require('twitter-lite');

// Clear old reaccs for debugging purposes
const blankSlate = false
// const channelID: string = '900566991130206280' // test
const channelID: string = '743905509412700202' // #🐓shitter-twitposting🥴
// every 3 days
const postInterval = 3 * 24 * 60 * 60 * 1000
// reacc to use (get overriden to :hugh: id at runtime)
let reacc = '🐓'

const twitterClient = new Twitter(twitterConfig);

async function fakeTweet(tweet: any) {
    twitterClient.post('statuses/update', { status: tweet }).then(result => {
        console.log(`🐓 Successfully tweeted "${result.text}"`);
    }).catch(console.error);
}

const discordClient: Client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ]
});

const arr = <K, V>(c: Collection<K, V>) => Array.from(c.values())

async function getChannelHistory(channel: TextChannel) {
    let result: Collection<string, Message> = new Collection<string, Message>()
    let messages: Collection<string, Message>
    let before = undefined
    while((messages = await channel.messages.fetch({ limit: 100, before })).size > 0) {
        messages.forEach((v, k) => result.set(k, v))
        before = messages.lastKey()
        process.stdout.write(`\rfetched ${messages.size} messages - last id: ${before}`)
    }
    console.log()
    return result
}

async function setReactionCount(message: Message) {
    let user_ids = new Set<string>()
    await Promise.all(arr(message.reactions.cache).map(async r => {
        const users = await r.users.fetch();
        users.forEach(u => user_ids.add(u.id))
    }));
    (message as any).reactionCount = user_ids.size;
    return message
}

async function run() {
    console.log('reacc is ', reacc)
    const channel: TextChannel = discordClient.channels.cache.get(channelID) as any;

    const messages: Collection<string, Message> = await getChannelHistory(channel)
    console.log(`Received ${messages.size} messages from history`);

    // Sort by reaction counts and print messages. Use reacts to track whether Hugh has considered a post
    let sorted = (await Promise.all(arr(messages)
        .filter(a => a.author.id !== discordClient.user.id && 
                     (!a.reactions.cache.has(reacc) || !a.reactions.cache.get(reacc).me))
        .map(setReactionCount)))
        .sort((a: any, b: any) => b.reactionCount - a.reactionCount)
    // see sorted for debugging purposes
    console.log('Top 5 unposted by reacts:')
    sorted.slice(0, 5).forEach(message => console.log(`  ${(message as any).reactionCount} "${message.content}"`))

    const msg: Message = sorted[0];
    // React so Hugh won't check this message again
    await msg.react(reacc);
    console.log(`🐓 Consider posting "${msg.content}"`)
    const j = ['Jim', 'Jimmy', 'James', 'Jim-Jam', 'Jimbo', 'Jethan Jamble', 'Jimmothy', 'Jimster', 'uh... Son']
    // await msg.reply(`Should I post this up, ${j[Math.floor(Math.random() * j.length)]}?\n*...reacc 2 tweet*`)
}

discordClient.on('ready', async () => {
    console.log(`Logged in as ${discordClient.user.tag}!`);

    const channel: TextChannel = discordClient.channels.cache.get(channelID) as any;
    const hughmoji = channel.guild.emojis.cache.find(emoji => emoji.name === 'hugh');
    if (hughmoji) {
        reacc = hughmoji.id
        console.log(`set emoji to ${hughmoji.id}`)
    }

    const messages: Collection<string, Message> = await getChannelHistory(channel)
    console.log(`Received ${messages.size} messages from history`);
    // Clear all the old reacts for debugging
    if (blankSlate) {
        await Promise.all(arr(messages).map(async m => {
            if (m.author.id === discordClient.user.id) {
                await m.delete()
            } else if (m.reactions.cache.has(reacc) &&
                       m.reactions.cache.get(reacc).me) {
                await m.reactions.cache.get(reacc).users.remove(discordClient.user.id);
            }
        }));
    }

    // If there are no Hugh messages, introduce yourself
    if (blankSlate || !messages.reduce((a, m) => a || m.author.id === discordClient.user.id, false)) {
        // channel.send('WUSS POPPIN JIMBO? https://twitter.com/hugh_beta\n' +
        //              '*...check out https://github.com/cephalopodMD/hugh to see what I do*')
    }

    run()
    setInterval(run, postInterval)
});

discordClient.on('messageReactionAdd', async reaction => {
    if (reaction.message.author.id === discordClient.user.id &&
        reaction.message.reference &&
        !reaction.message.reactions.cache.get(reacc)?.me) {
        const repliedTo: Message = await reaction.message.channel.messages.fetch(reaction.message.reference.messageId);
        await reaction.message.react(reacc);
        fakeTweet(repliedTo.content)
    }
})

// Jim jam for debugging purposes
// discordClient.on('messageCreate', (msg: Message) => {
//     if (msg.content === 'jim') {
//         msg.reply('jam');
//     }
// });

// Run dotenv
require('dotenv').config();
discordClient.login(process.env.DISCORD_TOKEN);