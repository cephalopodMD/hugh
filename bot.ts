// This software is provided as is with no guarantees.
// Use it however you wish,
// code for the love of the game,
// and don't you forget, my darlings:
//   IT
//       SHOULD
//     BE
//         ✨FUN!✨

import { Client, Collection, Intents, Message, TextChannel, MessageOptions, MessageEmbed } from "discord.js";
const twitterConfig = require('./config');
const Twitter = require('twitter-lite');
require('dotenv').config();

const j = ['Jim', 'Jimmy', 'James', 'Jim-Jam', 'Jimbo', 'Jethan Jamble', 'Jimmothy', 'Jimster', 'uh... Son']
// Clear old reaccs for debugging purposes
const blankSlate = false
// const channelID: string = '900566991130206280' // test
const channelID: string = '743905509412700202' // #🦆shitter-twitposting🥴
// every 3 days
const postInterval = 3 * 24 * 60 * 60 * 1000
// Minimum # of votes needed to post
const voteThreshold = 3
// reacc to use (get overriden to :hugh: id at runtime)
let reacc = '🦆'

const twitterClient = new Twitter(twitterConfig);

async function postTweet(tweet: any) {
    let result = await twitterClient.post('statuses/update', { status: tweet }).catch(console.error);
    console.log(`🦆 Successfully tweeted "${result.text}"`);
    return result;
}

let discordClient: Client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ]
});

// convert 😒 Collections into 😏 Arrays 
const arr = <K, V>(c: Collection<K, V>) => Array.from(c.values())

discordClient.on('messageReactionAdd', async reaction => {
    if (reaction.message.author.id === discordClient.user.id &&
        reaction.message.channel.id === channelID &&
        reaction.message.reference &&
        !reaction.message.reactions.cache.find(r => r.me)) {
        // Check for 3 votes
        let user_ids = new Set<string>()
        await Promise.all(arr(reaction.message.reactions.cache).map(async r => {
            const users = await r.users.fetch();
            users.forEach(u => user_ids.add(u.id))
        }));
        const repliedTo: Message = reaction.message.channel.messages.cache.get(reaction.message.reference.messageId);
        console.log(`${user_ids.size} votes for ${repliedTo.content}`)
        if (user_ids.size < voteThreshold) {
            return;
        }

        // Reacc & post
        await reaction.message.react(reacc);
        let result = await postTweet(repliedTo.content)
        let embed: MessageEmbed = new MessageEmbed()
        const content = `mmmmmm... ${user_ids.size} reaccs, thanks ${j[Math.floor(Math.random() * j.length)]}!`
        embed.setDescription(`I went ahead and [tweeted this](https://twitter.com/hugh_beta/status/${result.id_str}) for you`)
        let msg: MessageOptions = {content, embeds: [embed]}
        reaction.message.edit(msg)
    }
})

// Get more than 100 messages at a time
async function getChannelHistory(channel: TextChannel) {
    let result: Collection<string, Message> = new Collection<string, Message>()
    let messages: Collection<string, Message>
    let before = undefined
    while((messages = await channel.messages.fetch({ limit: 100, before })).size > 0) {
        messages.forEach((v, k) => result.set(k, v))
        before = messages.lastKey()
        process.stdout.write(`\rfetched ${result.size} messages - last id: ${before}`)
    }
    console.log()
    return result
}

async function setReactionCount(message: Message) {
    // If there's only one react type (or no reacts), we can assume reaction count == count of all reactions
    if (message.reactions.cache.size < 2) {
        // if it's stupid, but it works, it's not stupid
        (message as any).reactionCount = message.reactions.cache.reduce((a, r) => a += r.count, 0);
    // Otherwise we have to account for users having multiple reaccs to the same post
    } else {
        let user_ids = new Set<string>()
        await Promise.all(arr(message.reactions.cache).map(async r => {
            const users = await r.users.fetch();
            users.forEach(u => user_ids.add(u.id))
        }));
        // if it's stupid, but it works, it's not stupid
        (message as any).reactionCount = user_ids.size;
    }
    return message
}

async function run() {
    const channel: TextChannel = discordClient.channels.cache.get(channelID) as any;

    const messages: Collection<string, Message> = await getChannelHistory(channel)
    console.log(`Received ${messages.size} messages from history`);

    // Sort by reaction counts and print messages. Use reacts to track whether Hugh has considered a post
    let filtered = 1, mapped = 1
    let sorted = (await Promise.all(arr(messages)
        .filter(m => m.author.id !== discordClient.user.id && 
                     (m.reactions.cache.size == 0 || !m.reactions.cache.find(r => r.me)))
        .map(async (m, _, arr) => {
            m = await setReactionCount(m)
            process.stdout.write(`\rfetched reaccs for message ${mapped++} of ${arr.length}`)
            return m
        })))
        .sort((a: any, b: any) => b.reactionCount - a.reactionCount)
    console.log()
    // see top 5 for debugging purposes
    console.log('Top 5 unposted by reacts:')
    sorted.slice(0, 5).forEach(message => console.log(`  ${(message as any).reactionCount} "${message.content}"`))

    const msg: Message = sorted[0];
    // React so Hugh won't check this message again
    await msg.react(reacc);
    console.log(`🦆 Consider posting "${msg.content}"`)
    await msg.reply(`Should I post this up, ${j[Math.floor(Math.random() * j.length)]}?\n*...feed me ${voteThreshold} reaccs 2 tweet*`)
}

discordClient.on('ready', async () => {
    console.log(`Logged in as ${discordClient.user.tag}!`);
    const channel: TextChannel = discordClient.channels.cache.get(channelID) as any;

    // const hughmoji = channel.guild.emojis.cache.find(emoji => emoji.name === 'hugh');
    // if (hughmoji) {
    //     reacc = hughmoji.id
    //     console.log(`set emoji to ${hughmoji.id}`)
    // }

    const messages: Collection<string, Message> = await getChannelHistory(channel)
    console.log(`Received ${messages.size} messages from history on boot`);

    // Clear all the old reacts for debugging
    if (blankSlate) {
        await Promise.all(arr(messages).map(async m => {
            if (m.author.id === discordClient.user.id) {
                await m.delete()
            } else if (m.reactions.cache.find(r => r.me)) {
                await m.reactions.cache.forEach(r => r.users.remove(discordClient.user.id));
            }
        }));
    }

    // If there are no stand-alone Hugh messages, introduce yourself
    if (blankSlate || !messages.reduce((a, m) => a || (m.author.id === discordClient.user.id && !m.reference), false)) {
        let embed: MessageEmbed = new MessageEmbed()
        embed.setTitle('WUSS POPPIN JIMBO?')
        embed.setDescription('Follow me on [twitter](https://twitter.com/hugh_beta)\n' +
                            '*...and check out my [github](https://github.com/cephalopodMD/hugh) to see what I do*')
        let msg: MessageOptions = {embeds: [embed]}
        channel.send(msg)
    }

    // run the main job
    // run()
    setInterval(run, postInterval);
});

// Jim jam for debugging purposes
// discordClient.on('messageCreate', (msg: Message) => {
//     if (msg.content === 'jim') {
//         msg.reply('jam');
//     }
// });

discordClient.login(process.env.DISCORD_TOKEN);
