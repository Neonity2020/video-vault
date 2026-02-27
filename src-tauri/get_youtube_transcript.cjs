const { getSubtitles } = require('youtube-captions-scraper');

const videoId = process.argv[2];

if (!videoId) {
    console.error('Please provide a Video ID');
    process.exit(1);
}

getSubtitles({
    videoID: videoId,
    lang: 'zh',
}).then(captions => {
    console.log(JSON.stringify(captions));
}).catch(_err => {
    // Fallback to english if chinese is not available
    getSubtitles({
        videoID: videoId,
        lang: 'en',
    }).then(captions => {
        console.log(JSON.stringify(captions));
    }).catch(err => {
        console.error('Failed to parse transcript:', err);
        process.exit(1);
    });
});
