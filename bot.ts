import { Client, Collection, Intents, Message, TextChannel, EmojiIdentifierResolvable } from "discord.js";

// TODO: point this lad to the correct channel - this is just for dev purposes
const channelID: string = '900566991130206280'

const fakeTweet = (tweet: any) => {
    console.log(`Fake Tweeting "${tweet}"`);
}

const client: Client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ]
});

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    const channel: TextChannel = client.channels.cache.get(channelID) as any;
    const messages:  Collection<string, Message> = await channel.messages.fetch({limit: 100})
    console.log(`Received ${messages.size} messages`);
    // Clear all the old reacts for debugging
    //messages.forEach(m => m.reactions.cache.forEach(r => r.users.remove(client!.user!.id!)))

    // Sort by reaction counts and print messages. Use reacts to track whether Hugh has considered a post
    let sorted = messages
        .filter(a => a.author.id !== client.user.id && (!a.reactions.cache.has('🤖') || !a.reactions.cache.get('🤖').me))
        // this should probably be counts of users who reacted or something - this is definitely very wrong!
        .sort((a, b) => b.reactions.cache.size - a.reactions.cache.size)
    // see sorted for debugging purposes
    // console.log('Top 3 unposted by reacts:')
    // sorted.forEach(message => console.log(`  ${message.reactions.cache.size} "${message.content}"`))
    
    const msg: Message = sorted.first();
    // React so Hugh won't check this message again
    await msg.react('🤖');
    const j = ['Jim', 'Jimmy', 'James', 'Jim-Jam', 'Jimbo', 'uh... Son']
    await msg.reply(`Should I post this up, ${j[Math.floor(Math.random() * 6)]}?`)
});

client.on('messageReactionAdd', async reaction => {
    if (reaction.message.author.id === client.user.id && 
        reaction.message.reference && 
        !reaction.message.reactions.cache.get('🐓')?.me) {
        const repliedTo: Message = await reaction.message.channel.messages.fetch(reaction.message.reference.messageId);
        await reaction.message.react('🐓');
        fakeTweet(repliedTo.content)
    }
})

// Jim jam for debugging purposes
// client.on('messageCreate', (msg: Message) => {
//     if (msg.content === 'jim') {
//         msg.reply('jam');
//     }
// });

// Run dotenv
require('dotenv').config();
client.login(process.env.DISCORD_TOKEN);