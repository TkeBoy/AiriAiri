module.exports.config = {
	name: "sing",
	version: "1.0.2",
	hasPermssion: 0,
	credits: "CatalizCS",
	description: "Phát nhạc thông qua link youtube, soundcloud hoặc từ khoá tìm kiếm",
	commandCategory: "media",
	usages: "sing Text",
	cooldowns: 5,
	credits: "CatalizCS",
	args: [
		{
			key: 'Text',
			prompt: 'Nhập link youtube, soundcloud hoặc là từ khoá tìm kiếm.',
			type: 'Văn Bản',
			example: 'rap chậm thôi'
		}
	]
};



module.exports.run = async (api, event, args) => {
	const ytdl = require("ytdl-core");
	const YouTubeAPI = require("simple-youtube-api");
	const scdl = require("soundcloud-downloader");
	const { createReadStream, createWriteStream, unlinkSync } = require("fs");
	
	const play = (body) => {
		return api.sendMessage({body, attachment: createReadStream(__dirname + "/cache/music.mp3")}, event.threadID, () => unlinkSync(__dirname + "/cache/music.mp3"), event.messageID);
	}
	
	let YOUTUBE_API, SOUNDCLOUD_API;
	try {
		const config = require('../config.json');
		YOUTUBE_API = config.YOUTUBE_API;
		SOUNDCLOUD_API= config.SOUNDCLOUD_API;
	} catch (error) {
		YOUTUBE_API = process.env.YOUTUBE_API;
		SOUNDCLOUD_API= process.env.SOUNDCLOUD_API;
	}
	const youtube = new YouTubeAPI(YOUTUBE_API);
	
	if (args.length == 0 || !args) return api.sendMessage('Phần tìm kiếm không được để trống!', event.threadID, event.messageID);
	const keywordSearch = args.join(" ");
	const urlVideo = args[0];
	const videoPattern = /^(https?:\/\/)?(www\.)?(m\.)?(youtube\.com|youtu\.?be)\/.+$/gi;
	const scRegex = /^https?:\/\/(soundcloud\.com)\/(.*)$/;
	const urlValid = videoPattern.test(args[0]);
	
	if (urlValid) {
		try {
			var songInfo = await ytdl.getInfo(args[0]);
			if ((songInfo.videoDetails.lengthSeconds) > 600) return api.sendMessage("Độ dài video vượt quá mức cho phép, tối đa là 10 phút!", event.threadID, event.messageID);
			var body = `Tiêu đề: ${songInfo.videoDetails.title} | [${(songInfo.videoDetails.lengthSeconds-(songInfo.videoDetails.lengthSeconds%=60))/60+(9<songInfo.videoDetails.lengthSeconds?':':':0')+songInfo.videoDetails.lengthSeconds}]`;
			ytdl(args[0], {filter: 'audioonly', format: 'mp3'}).pipe(createWriteStream(__dirname + "/cache/music.mp3")).on("close", play(body));
		} catch (error) {
			api.sendMessage("thông tin của youtube đã xảy ra sự cố, lỗi: " + error.message, event.threadID, event.messageID);
		}
		ytdl(args[0], {filter: 'audioonly', format: 'mp3'}).pipe(createWriteStream(__dirname + "/cache/music.mp3")).on("close", play);
	}
	else if (scRegex.test(args[0])) {
		try {
			var songInfo = await scdl.getInfo(args[0], SOUNDCLOUD_API);
			var timePlay = Math.ceil(songInfo.duration / 1000);
			if (timePlay > 600) return api.sendMessage("Độ dài video vượt quá mức cho phép, tối đa là 10 phút!", event.threadID, event.messageID);
			var body = `Tiêu đề: ${songInfo.title} | [${(timePlay-(timePlay%=60))/60+(9<timePlay?':':':0')+timePlay}]`;
		} catch (error) {
			if (error.statusCode == "404") return api.sendMessage("Không tìm thấy bài nhạc của bạn thông qua link trên ;w;", event.threadID, event.messageID);
			api.sendMessage("thông tin của soundcloud đã xảy ra sự cố, lỗi: " + error.message, event.threadID, event.messageID);
		}
		try {
			scdl.downloadFormat(args[0], scdl.FORMATS.OPUS, SOUNDCLOUD_API ? SOUNDCLOUD_API : undefined).then(songs => songs.pipe(createWriteStream(__dirname + "/cache/music.mp3")).on("close", play(body)));
		} catch (error) {
			scdl.downloadFormat(args[0], scdl.FORMATS.MP3, SOUNDCLOUD_API ? SOUNDCLOUD_API : undefined).then(songs => songs.pipe(createWriteStream(__dirname + "/cache/music.mp3")).on("close", play(body)));
		}
	} else {
		try {
			const results = await youtube.searchVideos(keywordSearch, 1);
			songInfo = await ytdl.getInfo(results[0].url);
			var body = `Tiêu đề: ${songInfo.videoDetails.title} | [${(songInfo.videoDetails.lengthSeconds-(songInfo.videoDetails.lengthSeconds%=60))/60+(9<songInfo.videoDetails.lengthSeconds?':':':0')+songInfo.videoDetails.lengthSeconds}]`;
			ytdl(results[0].url, {filter: 'audioonly', format: 'mp3'}).pipe(createWriteStream(__dirname + "/cache/music.mp3")).on("close", play(body));
		} catch (error) {
			api.sendMessage("thông tin của youtube đã xảy ra sự cố, lỗi: " + error.message, event.threadID, event.messageID);
		}
	}
}