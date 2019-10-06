/*
 *	COMMAND FILE FOR MINECRAFT
 *	Command to handle all minecraft related tasks
 */

const data = require('./../../lib/data.js');
const mc_helpers = require('./../../lib/mc_helpers.js');

module.exports = {
    name: 'minecraft',
    description: 'This command provides different functionality for minecraft server integration',
    aliases: ['mc', 'mcserver'],
    usage: '*Sub-Commands:*\nIGN add OR remove OR show [mention user to view other IGNs]\nstats [mention user to view other stats]',

    execute(message, args) {
        switch(args[0]){
          case 'ign':
            //The user wants to do something with In-Game-Names, figure out what exactly
            switch(args[1]){
              case 'add':
                //Trim input
                args[2] = args[2].trim();
                //Check if provided IGN is somewhat valid
                if(args[2].length >= 3 && args[2].length <= 16){
                  //Everything ok, update User
                  data.getUserData(message.author.id, function(err, userData){
                    if(!err && data){
                      userData.mcName = args[2];
                      //Also get the uuid for the user
                      mc_helpers.getUUID(userData.mcName, function(uuid){
                        if(uuid){
                          data.updateUserData(message.author.id, userData, function(err){
                            if(!err){
                              message.reply('success! Your official Minecraft IGN is now _drumroll_ ' + args[2]);
                            }else{
                              console.log(err)
                              message.reply('I could not update your user object for some weird reason.')
                            }
                          });
                        }else{
                          message.reply('I couldnt validate your name. Maybe you misspelled it, or mojangs api is down');
                        }
                      });

                    }else{
                      message.reply('I could not get your data to update it :()');
                    }
                  });
                }else{
                  //Username isnt valid
                  message.reply('the provided Username (' + args[2] + ') doesnt seem to be valid');
                }
                break;
              case 'remove':
                //Just set the mcName of the user to null
                data.getUserData(message.author.id, function(err, userData){
                  if(!err && data){
                    userData.mcName = null;
                    data.updateUserData(message.author.id, userData, function(err){
                      if(!err){
                        message.reply('success! You no longer have a registered IGN! use +mc add to set it again');
                      }else{
                        console.log(err)
                        message.reply('I could not update your user object for some weird reason.')
                      }
                    });
                  }else{
                    message.reply('I could not get your data to update it :()');
                  }
              });
                break;
              case 'show':
                //User wants to see an IGN
                let userID;
                //Use the userID of the first mentioned user, or the userID of the author
                try {
                  userID = message.mentions.users.first().id;
                } catch (e) {
                  userID = message.author.id;
                }
                //Get the user object
                data.getUserData(userID, function(err, userData){
                  if(!err && userData){
                    //Check if the user has a IGN
                    if(userData.mcName != null){
                      message.reply('The IGN of the specified user is ' + userData.mcName);
                    }else{
                      message.reply('The specified user has no IGN')
                    }
                  }else{
                    message.reply('I could not retrieve the IGN of the specified user');
                  }
                });
                break;
            }


            break;
          case 'stats':
          //User wants to see some stats
          let userID;
          //Use the userID of the first mentioned user, or the userID of the author
          try {
            userID = message.mentions.users.first().id;
          } catch (e) {
            userID = message.author.id;
          }

          //Find the IGN out as well
          data.getUserData(userID, function(err, data){
            if(!err && data.mcName != null){
              let ign = data.mcName;
              switch(args[1]){
                case 'general':
                  mc_helpers.getStatTemplate.general(userID, function(err, stats){
                    if(!err){
                      //Build the message to send back
                      let output = '```';

                      output += `General statistics for ${ign}:\n`;
                      output += `Deaths: ${stats.deaths}\n`;
                      output += `Players killed: ${stats.playerKills}\n`;
                      output += `Mobs killed: ${stats.mobKills}\n`;
                      output += `Playtime: ${stats.playtime}\n`;
                      output += `Distance by foot: ${stats.distanceByFoot}\n`;

                      output += '```';
                      message.channel.send(output);
                    }else{
                      message.reply(err);
                    }
                  });
                  break;
                case 'distance':
                  mc_helpers.getStatTemplate.distances(userID, function(err, stats){
                    if(!err){
                      //Build the message to send back
                      let output = '```';

                      output += `Distance statistics for ${ign}:\n`;
                      output += `Walk: ${stats.walk}\n`;
                      output += `Sprint: ${stats.sprint}\n`;
                      output += `Crouch: ${stats.crouch}\n`;
                      output += `Climb: ${stats.climb}\n`;
                      output += `Fall: ${stats.fall}\n`;
                      output += `Walk on Water: ${stats.walkOnWater}\n`;
                      output += `Walk under Water: ${stats.walkUnderWater}\n`;
                      output += `Swim: ${stats.swim}\n`;
                      output += `Boat: ${stats.boat}\n`;
                      output += `Elytra: ${stats.aviate}\n`;
                      output += `Fly: ${stats.fly}\n`;

                      output += '```';
                      message.channel.send(output);
                    }else{
                      message.reply(err);
                    }
                  });
                  break;
                case 'ores':
                  mc_helpers.getStatTemplate.minedOres(userID, function(err, stats){
                    if(!err){
                      //Build the message to send back
                      let output = '```';

                      output += `Mined ores from ${ign}:\n`;
                      output += `Diamond: ${stats.diamond}\n`;
                      output += `Iron: ${stats.iron}\n`;
                      output += `Gold: ${stats.gold}\n`;
                      output += `Emerald: ${stats.emerald}\n`;
                      output += `Coal: ${stats.coal}\n`;
                      output += `Lapis Lazuli: ${stats.lapis}\n`;
                      output += `Redstone: ${stats.redstone}\n`;

                      output += '```';
                      message.channel.send(output);
                    }else{
                      message.reply(err);
                    }
                  });
                  break;
                case 'total':
                    mc_helpers.getStatTemplate.totals(userID, function(err, stats){
                      if(!err){
                        //Build the message to send back
                        let output = '```';

                        output += `Totals for ${ign}:\n`;
                        output += `Blocks mined: ${stats.mined}\n`;
                        output += `Blocks built / Items used: ${stats.used}\n`;
                        output += `Items crafted: ${stats.crafted}\n`;
                        output += `Items broken: ${stats.broken}\n`;
                        output += `Items dropped: ${stats.dropped}\n`;
                        output += `Distance traveled: ${stats.traveled}\n`;

                        output += '```';
                        message.channel.send(output);
                      }else{
                        message.reply(err);
                      }
                    });
                    break;
                  case 'top_usage':
                    mc_helpers.getStatTemplate.topUsageItems(userID, function(err, stats){
                      if(!err){
                        //Build the message to send back
                        let output = '```';

                        output += `Top used items from ${ign}:\n`;
                        let i = 0;
                        stats.forEach((entry) => {
                          output += `${i + 1}: ${stats[i].key}: ${stats[i].value}\n`
                          i++;
                        });

                        output += '```';
                        message.channel.send(output);
                      }else{
                        message.reply(err);
                      }
                    });
                    break;
                  case 'top_mined':
                    mc_helpers.getStatTemplate.topMinedBlocks(userID, function(err, stats){
                      if(!err){
                        //Build the message to send back
                        let output = '```';

                        output += `Top mined items from ${ign}:\n`;
                        let i = 0;
                        stats.forEach((entry) => {
                          output += `${i + 1}: ${stats[i].key}: ${stats[i].value}\n`
                          i++;
                        });

                        output += '```';
                        message.channel.send(output);
                      }else{
                        message.reply(err);
                      }
                    });
                    break;
                  case 'top_killed':
                    mc_helpers.getStatTemplate.topKilledMobs(userID, function(err, stats){
                      if(!err){
                        //Build the message to send back
                        let output = '```';

                        output += `Top killed mobs from ${ign}:\n`;
                        let i = 0;
                        stats.forEach((entry) => {
                          output += `${i + 1}: ${stats[i].key}: ${stats[i].value}\n`
                          i++;
                        });

                        output += '```';
                        message.channel.send(output);
                      }else{
                        message.reply(err);
                      }
                    });
                    break;
                  case 'top_killed_by':
                    mc_helpers.getStatTemplate.topKilledByMobs(userID, function(err, stats){
                      if(!err){
                        //Build the message to send back
                        let output = '```';

                        output += `Top top mobs killed by for ${ign}:\n`;
                        let i = 0;
                        stats.forEach((entry) => {
                          output += `${i + 1}: ${stats[i].key}: ${stats[i].value}\n`
                          i++;
                        });

                        output += '```';
                        message.channel.send(output);
                      }else{
                        message.reply(err);
                      }
                    });
                    break;
                  case 'total_per_death':
                    mc_helpers.getStatTemplate.totalPerDeath(userID, function(err, stats){
                      if(!err){
                        //Build the message to send back
                        let output = '```';

                        output += `Totals per death from ${ign}:\n`;
                        output += `Blocks mined: ${stats.mined}\n`;
                        output += `Blocks built / Items used: ${stats.used}\n`;
                        output += `Items crafted: ${stats.crafted}\n`;
                        output += `Items broken: ${stats.broken}\n`;
                        output += `Items dropped: ${stats.dropped}\n`;
                        output += `Distance traveled: ${stats.traveled}\n`;

                        output += '```';
                        message.channel.send(output);
                      }else{
                        message.reply(err);
                      }
                    });
                    break;
                  default:
                    message.reply('I couldnt find that collection. Please use one of the following collecitons: general, distance, ores, total, top_usage, top_mined, top_killed, top_killed_by, total_per_death');
                    break;
                  }
            }else{
              message.reply('Couldnt get the IGN for that user');
            }
          });
            break;
          default:
            message.reply('you tried to do something that I dont understand');
            break;
          }
      }
};
