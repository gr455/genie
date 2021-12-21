const GENIUS_ENDPOINT = "https://genius.com"

/**
 * Listen to messages from frontend script and perform requests accordingly
 */
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
	let action = request.action;
	if (action === "search_track") {
		const response = geniusSearchTrack({ track: request.track, artist: request.artist })
		.then((response) => { console.log(request, response); sendResponse(response); });
	}

	else if (action === "get_lyrics") {
		const response = geniusGetLyrics(request.lyricsURL)
		.then((response) => { sendResponse(response); });
	}

	else if (action === "get_annotation") {
		console.log("bg for annottatintoos");
		const response = geniusGetAnnotation(request.annotationURL)
		.then((response) => { sendResponse(response); });
	}

	return true;
});

/**
 * @param options {Object} - { track: string, artist: string }
 * returns {Object} - { ok: bool, responseJSON: String }
 *
 * searches `${track} by ${artist}`
 */
function geniusSearchTrack(options) {
	const track = options.track;
	const artist = options.artist;

	const query = `${track} by ${artist}`;
	const result = fetch(`${GENIUS_ENDPOINT}/api/search/multi?per_page=5&q=${query}`, { method: "GET" })
	.then((response) => response.text())
	.then((responseText) => { return { ok: true, responseJSON: JSON.parse(responseText) }; })
	.catch((err) => { return { ok: false, err: err.message }; });

	console.log(result);
	return result;
}

/**
 * @param lyricsURL {String} - Lyrics URL of the track
 * returns {Object} - { ok: bool, responseHTML: String }
 *
 * fetches lyrics of track at `lyricsURL`
 */
function geniusGetLyrics(lyricsURL) {
	const result = fetch(lyricsURL, { method: "GET" })
	.then((response) => response.text())
	.then((responseText) => { return { ok: true, responseHTML: responseText }; })
	.catch((err) => { return { ok: false, err: err.message }; });

	return result;
}

/**
 * @param annotationURL {String} - Lyrics URL of the annotation
 * returns {Object} - { ok: bool, responseHTML: String }
 *
 * fetches annotation at `annotationURL`
 */
function geniusGetAnnotation(annotationURL) {
	const result = fetch(annotationURL, { method: "GET" })
	.then((response) => response.text())
	.then((responseText) => { return { ok: true, responseHTML: responseText }; })
	.catch((err) => { return { ok: false, err: err.message }; });

	return result;
}