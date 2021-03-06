/*
*  YOUTUBE API WRAPPER
*  Contains all functionallity for interacting with the youtube API
*/
//Dependencies
const config = require('./../config.js');
const https = require('https');
const discordHelpers = require('./../discord-bot/discord_helpers.js');
const log = require('./log.js');

//Create the container
var youtube = {};

//Create a global variable that always contains the newest youtube video
global.newestVideo = {};

//Check what the newest video is
youtube.getNewestVideo = function () {
  var options = {
    host: 'www.googleapis.com',
    port: 443,
    path: `/youtube/v3/activities?part=snippet%2CcontentDetails&channelId=UC3bXl38E3-KtJdXHBUKg_Dw&maxResults=1&fields=items&key=${config["google-api-key"]}`
  };
  https.get(options, function (res) {
    res.setEncoding('utf8');
    let data = '';
    res.on('data', function (chunk) {
      data += chunk;
    }).on('end', function () {
      //Parse the data object
      data = JSON.parse(data);

      //Check if the response from youtube is valid
      if(data['items']){
        if(data.items[0].hasOwnProperty('contentDetails')){
          //Data object seems valid
          var latestVideo = {
            id: data.items[0].contentDetails.upload.videoId,
            title: data.items[0].snippet.title,
            url: 'https://youtu.be/' + data.items[0].contentDetails.upload.videoId,
            date: new Date(data.items[0].snippet.publishedAt)
          };
          global.newestVideo = latestVideo;
          youtube.postIfNew(latestVideo);
        }else{
          //Data object isnt valid
          log.write(3, 'Youtube: Retrieved data from youtube is invalid', data);
        }
      }else{
        //Data object isnt valid
        log.write(3, 'Youtube: Retrieved data from youtube is invalid', data);
      }
    }).on('error', function (e) {
      log.write(3, 'Youtube: Cant retrieve video data from youtube', null);
    });
  });
};

//Check if a given video is new
youtube.postIfNew = function (video) {
  if (video.date > new Date(Date.now() - 2 * 60 * 1000)) {
    //Video was posted within the last two minutes - check if the last message in the channel is about the new video
    discordHelpers.getLastMessage(config["youtube-video-announcement-channel"], function (message) {
      if (message) {
        //Check if the message contains the last video id
        if (!message.includes(video.id)) {
          //The last message does not contain the video id of the newest video -> make a post
          discordHelpers.sendMessage(`New Video: ${video.title}\n${video.url} \n <@&${config["upload-role"]}>`, config["youtube-video-announcement-channel"], function (err) {
            if (err) {
              log.write(3, 'YouTube: Cant send message about new video', { Error: err });
            }
          });
        }
      } else {
        log.write(3, 'YouTube: Couldnt find the last message', null);
      }
    });
  }
};

//Export the container
module.exports = youtube;
