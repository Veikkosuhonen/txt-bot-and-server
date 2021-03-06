/*
 *  MINECRAFT HELPERS
 *  Contains various helper functions for different Minecraft related operations
 */

//Dependencies
const config = require('./../config.js');
const https = require('https');
const data = require('./data.js');
const log = require('./log.js');
const fs = require('fs');
const path = require('path');
const Rcon = require('rcon');
const { exec } = require('child_process');

//Create a global variable
global.minecraft = {};
global.minecraft.statsObjectTemplate = {};

//Create the container
var mc = {};

//Create the global variable that holds the current player count
global.mcPlayerCount = 0;

/*
 *  Stuff about UUID -> IGN and IGN -> UUID conversion
 *
 */

//Updates all UUIDs from all members, if forceUpdate is true all UUIDs get overwritten, otherwise only check for users without an UUID
mc.updateAllUUIDs = function(forceUpdate){
  //Get all members from the db
  data.listAllMembers(function(members){
    members.forEach((member) => {
      //Check if we need to update this members UUID
      if(forceUpdate || member.mcName != null && member.mcUUID == null){
        //Get the UUID for the current member
        mc.getUUID(member.mcName, function(uuid){
          if(uuid){
            //Save UUID
            member.mcUUID = uuid;
            data.updateUserData(member.discord, member, function(err){});
          }else{
            //Something bad happened, log it
            log.write(2, 'mc_helpers.updateAllUUIDs couldnt get valid UUID for user', member);
          }
        });
      }else{}
    });
  });
};

//Updates all IGNs from all members based on their UUID
mc.updateAllIGNs = function(){
  //Get all members from db
  data.listAllMembers(function(members){
    members.forEach((member) => {
      //Check if the user has a ign, if not, then we have nothing to do
      if(member.mcUUID != null){
        //Get the ign for the uuid
        mc.getIGN(member.mcUUID, function(ign){
          if(ign){
            //Save ign
            member.mcName = ign;
            data.updateUserData(member.discord, member, function(err){});
          }else{
            log.write(2, 'mc_helpers.updateAllIGNs couldnt get a valid IGN for user', member);
          }
        })
      }
    });
  });
};

//Takes an IGN and returns the UUID
mc.getUUID = function(ign, callback){
  //Check if the ign is ok
  ign = typeof(ign) == 'string' && ign.length >= 3 && ign.length <= 16 ? ign : false;
  if(ign){
    //Make the web request
    https.get({
      host: 'api.mojang.com',
      port: 443,
      path: `/users/profiles/minecraft/${encodeURIComponent(ign)}?at=${Date.now()}`
    }, function(res){
      res.setEncoding('utf8');
      let data = '';
      res.on('data', function (chunk) {
          data += chunk;
      }).on('end', function () {
        //Do something with the data the webrequest returned
        //Try to parse the data
        try{
          data = JSON.parse(data);
        }catch(e){
          log.write(2, 'mc_helpers.getUUID couldnt pare the JSON returned from Mojangs API', {error: e, data: data,ign: ign});
        }

        //Check if the returned data makes sense
        if(data.hasOwnProperty('id')){
          if(data.id.length == 32){
            //Returned object is valid
            callback(data.id);
          }else{
            callback(false);
          }
        }else{
          //Data isnt valid
          callback(false);
        }
      });
    });
  }else{
    //The ign isnt ok
    callback(false);
  }
};

//Takes an UUID and returns the current IGN
mc.getIGN = function(uuid, callback){
  //Check if the uuid is ok
  uuid = typeof(uuid) == 'string' && uuid.length == 32 ? uuid : false;
  if(uuid){
    //Make the web request
    https.get({
      host: 'api.mojang.com',
      port: 443,
      path: `/user/profiles/${uuid}/names`
    }, function(res){
      res.setEncoding('utf8');
      let data = '';
      res.on('data', function (chunk) {
          data += chunk;
      }).on('end', function () {
        //Do something with the data the webrequest returned
        //Try to parse the data
        let dataOK;
        try{
          data = JSON.parse(data);
          dataOK = true;
        }catch(e){
          log.write(2, 'mc_helpers.getIGN couldnt pare the JSON returned from Mojangs API', {error: e, data: data, uuid: uuid});
          dataOK = false;
        }
        if(dataOK){
          //Only save the latest entry
          data = data[data.length - 1];
          //Check if the returned data makes sense
          if(data.hasOwnProperty('name')){
            //Returned object is valid
            callback(data.name);
          }else{
            //Data isnt valid
            callback(false);
          }
        }else{
          callback(false);
        }
      });
    });
  }else{
    //The ign isnt ok
    callback(false);
  }
};

mc.getRenderUrl = function(mcUUID){
  return `https://crafatar.com/renders/body/${mcUUID}?overlay=true`;
};

/*
 *  Stuff about stats
 *
 */

mc.updateStats = function(){
  //Get all files from the directory
  fs.readdir(path.join(__dirname, './../mc_stats/'), function(err, files){
    if(!err){
      //Lets read every file in
      files.forEach((file) => {
        //Check if we already logged this file by comparing write times
        fs.stat(path.join(__dirname, './../mc_stats/' + file), function(err, stats){
          if(!err){
            let fileWriteTime = stats.mtimeMs;
            //Get the uuid from the filename
            let uuid = file.replace('.json', '').replace('-','').replace('-','').replace('-','').replace('-','');
            data.getLastTimestampMcStats(uuid, function(dbWriteTime){
              //Compare both timestamps
              console.log(new Date(dbWriteTime).getTime(), fileWriteTime)
              if (new Date(dbWriteTime).getTime() < fileWriteTime){
                console.log('UPDATE!!')
                //DB version is older
                //Read the stats file for the current member
                fs.readFile(path.join(__dirname, './../mc_stats/' + file), 'utf8', function(err, fileData){
                  if(!err && fileData.length > 0){
                    //Read in some file which seems valid, try to parse it to an object
                    let stats = false;
                    try{
                      stats = JSON.parse(fileData);
                    }catch(e){
                      log.write(2, 'mc_helpers.updateStats couldnt save the new data', {err: e, data: fileData});
                    }
                    if(stats){
                      data.addMcStats(uuid, stats, function(err){
                        if(err) log.write(2, 'mc_helpers.updateStats couldnt parse the data read from disk', {err: e, data: fileData});
                      });
                    }
                  }else{
                    log.write(2, 'mc_helpers.updateStats couldnt read the stats from disk', {err: err, file: file});
                  }
                });
              }
            });
          }else{
            log.write(2, 'mc_helpers.updateStats couldnt read the modified data of the file', {err: err, mcUUID: member.mcUUID});
          }
        });
      });
    }else{
      log.write(2, 'mc_helpers.updateStats couldnt read the files from the directory', {err: err});
    }
  });
};

//Downloads all stats from the server
mc.downloadStats = function(){
  exec(`rclone copy ${config['mc-stats-remote']}:/stats ./mc_stats`), (err, stdout, stderr) => {
    if (err) {
      log.write(2, 'Couldnt start the process to mount the sftp server', {error: err});
    }
  }
}

/*
 *  statistics templates
 *
 */

//rank = true -> export the rank as well
mc.getStatTemplate = function(uuid, collection, rank, callback){
  //If uuid == false, get stats for all players combined, else get the stats for the given user
  if(uuid){
    //Now check if we need to include the rank as well
    if(rank){
      data.getNewestMcStats(uuid, function(stats){
        if(stats){
          //Add stats for distances that might not be present and set them to 0
          stats = mc.fixDistances(stats);

          let finalStats = {};
          let allStats = [];
          //Get the templates data
          stats = _statsTemplates[collection](stats);
          //Get stats from all players, so we can compare and rank
          data.getNewestMcStats(false, function(allStatsFull){
            if(allStatsFull){
              //Add stats for distances that might not be present and set them to 0
              allStatsFull = mc.fixDistances(allStatsFull);

              //Send all stats through the correct template, and save that in a new array
              allStatsFull.forEach((cur) => {
                try{
                  allStats.push(_statsTemplates[collection](cur));
                }catch(e){}
              });
              //For each stat sort the array and figure out what rank the requested user is in
              for(key in stats){
                //Build a new array that only contains all values for the current stat
                let curAllStat = [];
                allStats.forEach((cur) => {
                  if(typeof cur[key] == 'undefined') cur[key] = 0;
                  curAllStat.push(parseInt(cur[key]));
                });
                //Sort that array
                curAllStat = curAllStat.sort(function(a, b){
                  return b - a;
                });
                //Get the rank for the given player and build the finished object
                finalStats[key] = {
                  stat: stats[key],
                  rank: curAllStat.indexOf(parseInt(stats[key])) + 1
                };
              }
            }else{
              log.write(0, 'mc_helpers.getStatTemplate couldnt find the specified user', {user: uuid});
              callback('I couldnt find any stats for the specified player', false);
            }

            //Add total players to the final object
            finalStats._totalPlayers = allStats.length;

            //We are done, so callback the finished object
            callback(false, finalStats);
          });
        }else{
          log.write(0, 'mc_helpers.getStatTemplate couldnt find the specified user', {user: uuid});
          callback('I couldnt find any stats for the specified player', false);
        }
      });
    }else{
      //Get stats for one specified player
      data.getNewestMcStats(uuid, function(stats){
        if(stats){
          //Add stats for distances that might not be present and set them to 0
          stats = mc.fixDistances(stats);
          //Pass the stats to the template and callback the result
          callback(false, _statsTemplates[collection](stats));
        }else{
          log.write(0, 'mc_helpers.getStatTemplate couldnt find the specified user', {user: uuid});
          callback('I couldnt find any stats for the specified player', false);
        }
      });
    }
  //Get the stats for all players
  }else{
    data.getNewestMcStats(false, function(stats){
      if(stats){
        //Add stats for distances that might not be present and set them to 0
        stats = mc.fixDistances(stats);
        //Pass the stats to the function which sums it all together and give its output to the template and callback the result
        callback(false, _statsTemplates[collection](mc.sumStats(stats)));
      }else{
        log.write(0, 'mc_helpers.getStatTemplate couldnt find the specified user', {user: 'All'});
        callback('I couldnt find any stats for the specified player', false);
      }
    });
  }
};

/*
 *  the actual statistics templates
 *
 */

//Holder for all stats templates (collections)
var _statsTemplates = {};

//Contains number of deaths, player kills, mob kills, playtime, Total distance by foot (walking + sprinting + crouching)
_statsTemplates.general = function(stats){
  let output = {};

  output.deaths = stats['minecraft:custom']['minecraft:deaths'];
  output.playerKills = stats['minecraft:custom']['minecraft:player_kills'];
  output.mobKills = stats['minecraft:custom']['minecraft:mob_kills'];
  output.damageDealt = stats['minecraft:custom']['minecraft:damage_dealt'];
  output.damageTaken = stats['minecraft:custom']['minecraft:damage_taken'];
  output.playtime = mc.prettifyDuration(stats['minecraft:custom']['minecraft:play_one_minute']);
  output.distanceByFoot = mc.prettiyDistance(stats['minecraft:custom']['minecraft:walk_on_water_one_cm'] + stats['minecraft:custom']['minecraft:crouch_one_cm'] + stats['minecraft:custom']['minecraft:walk_one_cm'] + stats['minecraft:custom']['minecraft:walk_under_water_one_cm'] + stats['minecraft:custom']['minecraft:sprint_one_cm']);

  return output;
};

//Contains all different distances (walking, sprinting, boat, pig, climb, fall, elytra, ...)
_statsTemplates.distances = function(stats){
  let output = {};

  output.sprint = mc.prettiyDistance(stats['minecraft:custom']['minecraft:sprint_one_cm']);
  output.walkOnWater = mc.prettiyDistance(stats['minecraft:custom']['minecraft:walk_on_water_one_cm']);
  output.crouch = mc.prettiyDistance(stats['minecraft:custom']['minecraft:crouch_one_cm']);
  output.climb = mc.prettiyDistance(stats['minecraft:custom']['minecraft:climb_one_cm']);
  output.walk = mc.prettiyDistance(stats['minecraft:custom']['minecraft:walk_one_cm']);
  output.walkUnderWater = mc.prettiyDistance(stats['minecraft:custom']['minecraft:walk_under_water_one_cm']);
  output.boat = mc.prettiyDistance(stats['minecraft:custom']['minecraft:boat_one_cm']);
  output.swim = mc.prettiyDistance(stats['minecraft:custom']['minecraft:swim_one_cm']);
  output.fly = mc.prettiyDistance(stats['minecraft:custom']['minecraft:fly_one_cm']);
  output.aviate = mc.prettiyDistance(stats['minecraft:custom']['minecraft:aviate_one_cm']);
  output.fall = mc.prettiyDistance(stats['minecraft:custom']['minecraft:fall_one_cm']);

  return output;
}

//Contains mined ores (Diamond, Iron, Gold, Emerald, Coal, Lapis Lazuli, Redstone)
_statsTemplates.minedOres = function(stats){
  let output = {};

  output.diamond = stats['minecraft:mined']['minecraft:diamond_ore'];
  output.iron = stats['minecraft:mined']['minecraft:iron_ore'];
  output.gold = stats['minecraft:mined']['minecraft:gold_ore'];
  output.emerald = stats['minecraft:mined']['minecraft:emerald_ore'];
  output.coal = stats['minecraft:mined']['minecraft:coal_ore'];
  output.lapis = stats['minecraft:mined']['minecraft:lapis_ore'];
  output.redstone = stats['minecraft:mined']['minecraft:redstone_ore'];

  return output;
};

//Contains totals for blocks mined, items used, items crafted, items broken, items dropped, distance travelled
_statsTemplates.totals = function(stats){
  let output = {};

  output.mined = mc.sumOfObject(stats['minecraft:mined']);
  output.used = mc.sumOfObject(stats['minecraft:used']);
  output.crafted = mc.sumOfObject(stats['minecraft:crafted']);
  output.broken = mc.sumOfObject(stats['minecraft:broken']);
  output.dropped = mc.sumOfObject(stats['minecraft:dropped']);
  output.picked_up = mc.sumOfObject(stats['minecraft:picked_up']);
  output.travelled = mc.prettiyDistance(stats['minecraft:custom']['minecraft:sprint_one_cm'] + stats['minecraft:custom']['minecraft:walk_on_water_one_cm'] + stats['minecraft:custom']['minecraft:crouch_one_cm'] + stats['minecraft:custom']['minecraft:climb_one_cm'] + stats['minecraft:custom']['minecraft:walk_one_cm'] + stats['minecraft:custom']['minecraft:walk_under_water_one_cm'] + stats['minecraft:custom']['minecraft:boat_one_cm'] + stats['minecraft:custom']['minecraft:swim_one_cm'] + stats['minecraft:custom']['minecraft:fly_one_cm'] + stats['minecraft:custom']['minecraft:aviate_one_cm'] + stats['minecraft:custom']['minecraft:fall_one_cm']);


  return output;
};

//Contains top 10 used items with number of times used
_statsTemplates.topUsageItems = function(stats){
  let output = {};

  output = mc.top10(stats['minecraft:used']);

  return output;
};

//Contains top 10 picked up items
_statsTemplates.topPickedUpItems = function(stats){
  let output = {};

  output = mc.top10(stats['minecraft:picked_up']);

  return output;
};

//Contains top 10 dropped items
_statsTemplates.topDroppedItems = function(stats){
  let output = {};

  output = mc.top10(stats['minecraft:dropped']);

  return output;
};

//Contains top 10 crafted items
_statsTemplates.topCraftedItems = function(stats){
  let output = {};

  output = mc.top10(stats['minecraft:crafted']);

  return output;
};

//Contains top 10 broken items
_statsTemplates.topBrokenItems = function(stats){
  let output = {};

  output = mc.top10(stats['minecraft:broken']);

  return output;
};

//Contains top 10 mined blocks with number of times mined
_statsTemplates.topMinedBlocks = function(stats){
  let output = {};

  output = mc.top10(stats['minecraft:mined']);

  return output;
};

//Contains top 10 killed mobs with number of times killed
_statsTemplates.topKilledMobs = function(stats){
  let output = {};

  output = mc.top10(stats['minecraft:killed']);

  return output;
};

//Contains top 10 caused of death with number of times died
_statsTemplates.topKilledByMobs = function(stats){
  let output = {};

  output = mc.top10(stats['minecraft:killed_by']);

  return output;
};

//Contains some stats per death stats like k/d blocks mined per death, etc
_statsTemplates.totalPerDeath = function(stats){
  let output = {};

  output.mined = Math.round(mc.sumOfObject(stats['minecraft:mined']) / stats['minecraft:custom']['minecraft:deaths']);
  output.used = Math.round(mc.sumOfObject(stats['minecraft:used']) / stats['minecraft:custom']['minecraft:deaths']);
  output.crafted = Math.round(mc.sumOfObject(stats['minecraft:crafted']) / stats['minecraft:custom']['minecraft:deaths']);
  output.broken = Math.round(mc.sumOfObject(stats['minecraft:broken']) / stats['minecraft:custom']['minecraft:deaths']);
  output.dropped = Math.round(mc.sumOfObject(stats['minecraft:dropped']) / stats['minecraft:custom']['minecraft:deaths']);
  output.picked_up = Math.round(mc.sumOfObject(stats['minecraft:picked_up']) / stats['minecraft:custom']['minecraft:deaths']);
  output.travelled = mc.prettiyDistance(Math.round((stats['minecraft:custom']['minecraft:sprint_one_cm'] + stats['minecraft:custom']['minecraft:walk_on_water_one_cm'] + stats['minecraft:custom']['minecraft:crouch_one_cm'] + stats['minecraft:custom']['minecraft:climb_one_cm'] + stats['minecraft:custom']['minecraft:walk_one_cm'] + stats['minecraft:custom']['minecraft:walk_under_water_one_cm'] + stats['minecraft:custom']['minecraft:boat_one_cm'] + stats['minecraft:custom']['minecraft:swim_one_cm'] + stats['minecraft:custom']['minecraft:fly_one_cm'] + stats['minecraft:custom']['minecraft:aviate_one_cm'] + stats['minecraft:custom']['minecraft:fall_one_cm'])  / stats['minecraft:custom']['minecraft:deaths']));

  return output;
};

//Contains only playtime
_statsTemplates.playtime = function(stats){
  let output = {};

  output.playtime = mc.prettifyDuration(stats['minecraft:custom']['minecraft:play_one_minute']);

  return output;
};

/*
 *  RCON
 *
 */

//Initializes the connection to the rcon server, sends a message and terminates the connection again
mc.rcon = function(cmd, callback){
  try{
  //Establish the connection
  let rconCon = new Rcon(config['rcon-server'], config['rcon-port'], config['rcon-password']);
  rconCon.on('response', function(str) {
    if(typeof callback == 'function') callback(str);
  });
  rconCon.on('auth', function(){
    //Everything fine, send the command
    log.write(0, 'mc_helpers successfully authenticated to the rcon server', {cmd: cmd});
    rconCon.send(cmd);

    //We can disconnect again
    rconCon.disconnect();
  });

  
    //rconCon.connect();
  }catch(e){
    //Dont do anything
  }
}

mc.getOnlinePlayers = function(callback){
  mc.rcon('list', function(str){
    callback(parseInt(str.replace('There are ', '')));
  });
};

mc.updateOnlinePlayers = function(){
  mc.getOnlinePlayers(function(count){
    global.mcPlayerCount = count;
  });
};

/*
 *  Helper functions
 *
 */

//Adds certain stat entries that cause issues if left undefined and sets them to 0
mc.fixDistances = function(stats){
  //Check if we already have the stats object template
  if(global.minecraft.statsObjectTemplate != {}){
    //It exists, we can go on
    if(!Array.isArray(stats)){
      //Its a single stat
      stats = mc.sumStats([stats, global.minecraft.statsObjectTemplate]);
      return stats;
    }else{
      //Its an array of stats
      for(let i = 0; i < stats.length; i++) stats[i] = mc.sumStats([stats[i], global.minecraft.statsObjectTemplate]);
      return stats;
    }
  }else{
    //We need to create the stats object template
    mc.createStatsObjectTemplate(function(err){
      if(err){
        log.write(3, 'mc.fixDistances didnt get data from the database', {});
        return false;
      }else{
        //Object got created, lets try again
        mc.fixDistances(stats);
      }
    });
  }
};

mc.createStatsObjectTemplate = function(callback){
  //Retrieve all stats
  data.getNewestMcStats(false, function(stats) {
    if(stats){
      stats = mc.sumStats(stats);

      //Set all values to 0
      for(topkey in stats) {
        for(key in stats[topkey]) {
          stats[topkey][key] = 0;
        }
      }
      global.minecraft.statsObjectTemplate = stats;
      callback(false);
    }else{
      callback(true);
    }
  });
};

//accepts an array of objects and adds them together
mc.sumStats = function(stats){
  let finishedObject = {};
  for(let i = 0; i < stats.length; i++){
    for(topkey in stats[i]){
      if(!finishedObject.hasOwnProperty(topkey)) finishedObject[topkey] = {};
      for(key in stats[i][topkey]){
        finishedObject[topkey].hasOwnProperty(key) ? finishedObject[topkey][key] += stats[i][topkey][key] : finishedObject[topkey][key] = stats[i][topkey][key];
      }
    }
  }
  return finishedObject;
}

mc.convertUUIDtoWeirdFormat = function(uuid){
  var newUUID = '';
  for(var i = 0; i < 32; i++){
    newUUID += uuid[i];
    if(i == 7 || i == 11 || i == 15 || i == 19) newUUID += '-';
  }
  return newUUID;
};

mc.prettiyDistance = function(distance){
  var prettyDistance = '';
  if(typeof distance == 'undefined') return '0km'

  //Are we in the centimeter range?
  if(distance < 100){
    prettyDistance = distance + 'cm';
  }else{
    //Are we in the meter range?
    if(distance < 99950){
      prettyDistance = Math.round(distance / 100) + 'm';
    }else{
      //We are in the kilometer range
      prettyDistance = Math.round(distance / 100 / 1000) + 'km';
    }
  }

  return prettyDistance;
};

mc.prettifyDuration = function(duration){
  var prettyDuration = Math.round(duration / 20 / 60 / 60) + 'h';
  return prettyDuration;
};

mc.sumOfObject = function(object){
  var sum = 0;

  for(let key in object){
    sum += object[key];
  }

  return sum;
};

mc.top10 = function(object){
  var values = [];
  var i = 0;

  //Fill array with an object for each key value pair
  for(let key in object){
    values[i] = {key: key, value: object[key]};
    i++;
  }

  //Sort array
  values.sort(function(a, b){
    return b.value - a.value
  });

  //Only use the top 10 values, discard the rest
  let top10Values = [];
  for(let j = 0; j < (10 <= values.length ? 10 : values.length); j++){
    top10Values[j] = values[j];
  }

  //Cut the minecraft: suffix off
  i = 0;
  top10Values.forEach((entry) => {
    top10Values[i] = {key: entry.key.replace('minecraft:', ''), value: entry.value};
    i++;
  });

  //Return the finished object
  return top10Values;
};

//Export the container
module.exports = mc;
