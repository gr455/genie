const EXTENSION_ID = document.currentScript.getAttribute("extension-id");
const ALL_YT_LOADED_EVENT = new Event("all-yt-loaded");

/**
 * When ALL_YT_LOADED_EVENT is fired, gets current video data, sends it to serviceworker,
 * listens for response from serviceworker (which fetches lyrics link from Genius).
 */
document.addEventListener('all-yt-loaded', function() {
	const vidInfo = getCurrentVideoInfo();
	let trackResult;
	try {
		// Only send to serviceworker if music
		if (vidInfo.isMusic) {
			chrome.runtime.sendMessage(EXTENSION_ID, {
				action: "search_track",
				track: vidInfo.trackName,
				artist: vidInfo.artist

			}, (response) => {
				if (!response) return console.error("[genie]: Something went wrong");
				if (!response.ok) return console.error(`[genie]: ${response.err}`);
				const responseJSON = response.responseJSON;
				trackResult = getTopTrackResult(responseJSON, vidInfo.trackName, vidInfo.artist);
				if (trackResult) {
					console.log("[genie]: Found lyrics, setting lyrics");
					setLyrics(trackResult);
				} else if (vidInfo.isMusic) console.error("[genie]: No good result found for the track");
			});
		}

		else console.log("[genie]: Not a music video");

	} catch (err) { console.error(`[genie]: ${err}`); }
});

/**
 * Listens until current video is loaded
 */
document.addEventListener("yt-navigate-finish", function() {
	// Remove lyrics when video is switched
	$(".lyricArea").remove();
	let listenYTLoaded = setInterval(function() {
		const loaded = checkYTLoaded();
		if (loaded) clearInterval(listenYTLoaded);
	});
});

/**
 * Returns the top result from the sesponse Object
 * @param responseJSON {Object} - API response object
 * 
 * returns {Object} track data
 */
function getTopTrackResult(responseJSON, trackName, artistName) {
	const response = responseJSON.response.sections;
	const trackResults = response[1];
	
	// Get the best matching track result
	let topHit = getBestResult(trackResults, trackName, artistName);
	if (!topHit) return null;

	const hitData = topHit.result;

	const topTrackData = {
		fullTitle: hitData.full_title,
		trackTitle: hitData.title,
		trackArtists: hitData.artist_names,
		lyricsURL: hitData.url
	};

	return topTrackData;
}

/**
 * Returns the best result out of the returned results from Genius
 * @param trackResults {Object} - Results from Genius
 * @param trackName {String} - expected track name
 * @param artistName {String} - expected artist name
 *
 * returns {Object} - Best result from the given results
 */
function getBestResult(trackResults, trackName, artistName) {
	let topHit = trackResults.hits[0];

	for (let hit of trackResults.hits) {
		const artists = hit.result.artist_names.split(", ");
		if (artists.includes(artistName)) {
			topHit = hit;
			break;
		}
	}

	return topHit;
}

/**
 * Applies custom search rules as defined in src/searchRules.js
 * @param title {String} - track title
 */
function cleanTitle(title) {
	for (let bad of searchRules.tracks.ignore)
		title = title.replace(bad, "");
	for (let bad in searchRules.tracks.replace)
		title = title.replace(bad, searchRules.tracks.replace[bad]);
	return title;
}

/**
 * Applies custom search rules as defined in src/searchRules.js
 * @param artist {String} - artist name
 */
function cleanArtist(artist) {
	for (let bad of searchRules.artists.ignore)
		artist = artist.replace(bad, "");
	for (let bad in searchRules.artists.replace)
		artist = artist.replace(bad, searchRules.artists.replace[bad]);
	return artist;
}

/** YOUTUBE STUFF **/

/**
 * Gets track information about currently playing video
 * returns {Object} - Current youtube video data
 * 
 */
function getCurrentVideoInfo() {
	const channelName = $("#meta-contents #channel-name a").text();
	const videoTitle = document.title.replace(/^\u25B6\s/, "").replace(/\s-\sYouTube$/, "");
	const isVerifiedArtist = $("#meta-contents #channel-name .badge-style-type-verified-artist").length != 0;

	return { 
		artist: cleanArtist(channelName),
		trackName: cleanTitle(videoTitle),
		isMusic: isVerifiedArtist
	};
}

/** GENIUS STUFF **/

/**
 * Sets lyrics on under the youtube video player
 * @param trackInfo {Object} - track information returned by service worker
 */

function setLyrics(trackInfo) {
	const url = trackInfo.lyricsURL;
	const putBeforeElement = $("#meta.ytd-watch-flexy");

	// Remove lyrics if already exists
	$(".lyricArea").remove();

	chrome.runtime.sendMessage(EXTENSION_ID, {
		action: "get_lyrics",
		lyricsURL: url
	}, (response) => {
		if (response.ok) {

			// Get the HTML from lyricArea.html
			getViewHTML().then((viewHTML) => {
				const dom = new DOMParser();
				const viewDoc = dom.parseFromString(viewHTML, "text/html");

				// Process the response from genius
				const rawHTML = response.responseHTML;
				const lyricDoc = dom.parseFromString(rawHTML, "text/html");
				const putHTML = lyricDoc.querySelector(".lyrics p").innerHTML;

				// Put the lyrics in the HTML template from lyricArea.html
				viewDoc.getElementById("genie-lyrics-div").innerHTML = putHTML;

				const div = document.createElement("div").attachShadow({ mode: "open" });
				div.innerHTML = viewDoc.documentElement.outerHTML;

				putBeforeElement.before(div);

				// Prepare the lyrics view
				readyView();

			});

		} else console.error("[genie]: Could not set lyrics");
	});
}

/**
 * Sets annotation next to the lyrics
 * @param annotationURL {String} - URL for annotation
 */

function setAnnotation(annotationURL) {
	chrome.runtime.sendMessage(EXTENSION_ID, {
		action: "get_annotation",
		annotationURL: annotationURL
	}, (response) => {
		if (response.ok) {
			// Remove the existing annotation
			$("#currentAnnotation").remove();

			const rawHTML = response.responseHTML;
			const dom = new DOMParser();
			const annotationDoc = dom.parseFromString(rawHTML, "text/html");
			const annotationJSON = annotationDoc.documentElement
									.querySelectorAll("preload-content")[1]
									.getAttribute("data-preload_data");
			
			const annotationData = JSON.parse(annotationJSON).preloaded_referent;
			const annotation = annotationData.annotations[0].body.html;

			$("#genie-annotation-div").html(`<div id="currentAnnotation">\n${annotation}\n</div>`);
		}

		else console.error("[genie]: Could not set annotations");
	});
}

/**
 * Called after setting lyrics. Does UI things
 */
function readyView() {
	const GENIUS_URL = "https://genius.com";

	let anchors = document.getElementsByClassName("referent");

	// Remove anchor hrefs and make them a seperate attribute
	for (let anchor of anchors) {
		const annotationId = anchor.hash.split("note-")[1];
		const annotationURL = `${GENIUS_URL}/annotations/${annotationId}/standalone_embed`;
		anchor.setAttribute("genie-annotation-url", annotationURL);
		anchor.removeAttribute("href");
	}

	document.querySelectorAll('.referent').forEach((element) => {
		element.addEventListener('click', (event) => {
			document.getElementById("genie-annotation-div").innerHTML = "Loading annotation..."
			setAnnotation(event.target.getAttribute("genie-annotation-url"));
		});
	});

}

/**
 * When called, checks if the current video is loaded and if so, fires ALL_YT_LOADED_EVENT
 * Checks if the youtube player has started playing the video and waits half a second after that
 * as a load check
 *
 * returns {bool} - Whether the video is loaded
 */
function checkYTLoaded() {
	const video =  document.querySelector('video');
	if (!video) return false;
	let videoTime = video.currentTime;
	if (videoTime > 0) {
		setTimeout(function () {
			document.dispatchEvent(ALL_YT_LOADED_EVENT);
		}, 500);

		return true;
	}

	return false;
}

/** CHROME STUFF **/

/* Get HTML template */
function getViewHTML() {
	const viewURL = getURL("views/lyricArea.html");
	const result = fetch(viewURL, { method: "GET" }).then((response) => { return response.text(); });
	return result;
}

/* Wrapper function similar to chrome.runtime.getURL() */
function getURL(resource) {
	return `chrome-extension://${EXTENSION_ID}/${resource}`;
}
