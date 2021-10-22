import { Client, Collection, Intents, Message, TextChannel, EmojiIdentifierResolvable } from "discord.js";
const config = require('./config');
const Twitter = require('twitter-lite');

// Clear old reaccs for debugging purposes
const blankSlate = false
// TODO: point this lad to the correct channel - this is just for dev purposes
const channelID: string = '900566991130206280'
let reacc = '🐓'

const twitterClient = new Twitter(config);

const fakeTweet = async (tweet: any) => {
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

discordClient.on('ready', async () => {
    console.log(`Logged in as ${discordClient.user.tag}!`);

    const channel: TextChannel = discordClient.channels.cache.get(channelID) as any;
    const hughmoji = channel.guild.emojis.cache.find(emoji => emoji.name === 'hugh');
    console.log(hughmoji)
    if (hughmoji) {
        reacc = `${hughmoji.name}:${hughmoji.id}`
    }

    const messages: Collection<string, Message> = await channel.messages.fetch({ limit: 100 })
    console.log(`Received ${messages.size} messages`);
    // Clear all the old reacts for debugging
    if (blankSlate) {
        for (let m of Array.from(messages.values())) {
            for (let r of Array.from(m.reactions.cache.values())) {
                await r.users.remove(discordClient.user.id);
            }
        }
    }


    // Sort by reaction counts and print messages. Use reacts to track whether Hugh has considered a post
    let sorted = messages
        .filter(a => a.author.id !== discordClient.user.id && 
                     (!a.reactions.cache.has(reacc) || !a.reactions.cache.get(reacc).me))
        // this should probably be counts of users who reacted or something - this is definitely very wrong!
        .sort((a, b) => b.reactions.cache.size - a.reactions.cache.size)
    // see sorted for debugging purposes
    // console.log('Top 3 unposted by reacts:')
    // sorted.forEach(message => console.log(`  ${message.reactions.cache.size} "${message.content}"`))

    const msg: Message = sorted.first();
    // React so Hugh won't check this message again
    await msg.react(reacc);
    console.log(`${reacc} Consider posting "${msg.content}`)
    const j = ['Jim', 'Jimmy', 'James', 'Jim-Jam', 'Jimbo', 'Jethan Jamble', 'Jimmothy', 'uh... Son']
    await msg.reply(`Should I post this up, ${j[Math.floor(Math.random() * j.length)]}?\n*...reacc 2 tweet*`)
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