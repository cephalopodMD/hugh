import { Client, Collection, Intents, Message, TextChannel } from "discord.js";
const twitterConfig = require('./config');
const Twitter = require('twitter-lite');

// Clear old reaccs for debugging purposes
const blankSlate = true
// TODO: point this lad to the correct channel - this is just for dev purposes
const channelID: string = '900566991130206280'
let reacc = '🐓'

const twitterClient = new Twitter(twitterConfig);

async function fakeTweet(tweet: any) {
    console.log(`${reacc} Fake Tweeting "${tweet}"`);
    twitterClient.post('statuses/update', { status: tweet }).then(result => {
        console.log('You successfully tweeted this : "' + result.text + '"');
    }).catch(console.error);
}

const discordClient: Client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ]
});

async function getChannelHistory(channel: TextChannel) {
    let result: Collection<string, Message> = new Collection<string, Message>()
    let messages: Collection<string, Message>
    let before = undefined
    // TODO set to 100 instead of 10
    while((messages = await channel.messages.fetch({ limit: 10, before })).size > 0) {
        messages.forEach((v, k) => result.set(k, v))
        before = messages.lastKey()
    }
    return result
}

function reactionCount(message: Message) {
    let user_ids = new Set<string>()
    message.reactions.cache.forEach(r => {
        r.users.cache.forEach(u => user_ids.add(u.id))
    })
    return user_ids.size
}

async function run() {
    const channel: TextChannel = discordClient.channels.cache.get(channelID) as any;

    const messages: Collection<string, Message> = await getChannelHistory(channel)
    console.log(`Received ${messages.size} messages from history`);
    messages.forEach(m => console.log(`  ${m.id} ${m.content}`))

    // Sort by reaction counts and print messages. Use reacts to track whether Hugh has considered a post
    let sorted = messages
        .filter(a => a.author.id !== discordClient.user.id && 
                     (!a.reactions.cache.has(reacc) || !a.reactions.cache.get(reacc).me))
        .sort((a, b) => reactionCount(b) - reactionCount(a))
    // see sorted for debugging purposes
    console.log('Top 3 unposted by reacts:')
    sorted.forEach(message => console.log(`  ${message.reactions.cache.size} "${message.content}"`))

    const msg: Message = sorted.first();
    // React so Hugh won't check this message again
    await msg.react(reacc);
    console.log(`${reacc} Consider posting "${msg.content}`)
    const j = ['Jim', 'Jimmy', 'James', 'Jim-Jam', 'Jimbo', 'Jethan Jamble', 'Jimmothy', 'uh... Son']
    await msg.reply(`Should I post this up, ${j[Math.floor(Math.random() * j.length)]}?\n*...reacc 2 tweet*`)
}

discordClient.on('ready', async () => {
    console.log(`Logged in as ${discordClient.user.tag}!`);

    const channel: TextChannel = discordClient.channels.cache.get(channelID) as any;
    const hughmoji = channel.guild.emojis.cache.find(emoji => emoji.name === 'hugh');
    if (hughmoji) {
        reacc = `${hughmoji.name}:${hughmoji.id}`
        console.log(`set emoji to ${reacc}`)
    }

    const messages: Collection<string, Message> = await getChannelHistory(channel)
    console.log(`Received ${messages.size} messages from history`);
    messages.forEach(m => console.log(`  ${m.id} ${m.content}`))
    // Clear all the old reacts for debugging
    if (blankSlate) {
        for (let m of Array.from(messages.values())) {
            for (let r of Array.from(m.reactions.cache.values())) {
                await r.users.remove(discordClient.user.id);
            }
        }
    }

    setInterval(run, 30 * 1000)
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