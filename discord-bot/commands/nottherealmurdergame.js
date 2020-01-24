const minigames = require('../../lib/mc_minigame.js')

module.exports = {
    name: 'nottherealmurdergame',
    description: 'a sketch command for the murdergame',
    aliases: ['testmurdergame', 'murdergametest'],
 
    execute(message, args) {
        switch (args[0]) {
            case "init":
                if (message.mentions.users.array().length<1) {
                    message.channel.send("Too few participants mentioned!")
                } else {
                    message.channel.send("Murdergame is being initialized")
                    init(message.mentions.users.array().length)
                }

                break;

            case "start":
                if (args[1]!=null) {
                    message.channel.send("May the murder game begin!")
                    createNewMurdergame(args[1])
                } else {
                    message.channel.send("Usage: "+ this.name + " start <minigame name>")
                }
                break;

            case "end":
                message.channel.send("The murder game is now over")
                break;

            case "status":
                message.channel.send("status is status")
                break;

            default:
                message.reply(args[0] + " is not a valid argument")
                
        }
        
    },
    
};
const init = (participants) => {
    let murderer_index = randomIndex(participants)
        let victim_index
        while (victim_index===murderer_index) {
            victim_index = randomIndex(participants)
        }
    
}

const randomIndex = (array) => Math.floor(Math.random() * array.length)