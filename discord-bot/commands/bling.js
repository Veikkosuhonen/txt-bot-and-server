/*
 *	COMMAND FILE FOR PING
 *	Test command to see if the bot is working
 */
const log = require('./../../lib/log.js');

 module.exports = {
   name: 'bling',
   description: 'It blings if you are ZyL',
   aliases: ['bling!', 'blang'],

   execute(message, args) {
      if (message.author.username === "ZyL") {
       message.channel.send('blang');
      } else {
        message.channel.send('I dont know you');
      }
      log.write(3, 'blinglog', 'logged succesfully')
   }
 };
