/** 
	This file specifies custom search rules for artist and track names
	The removal / replacement happens before the search is made on Genius
 **/

var searchRules = {
	// Tracks
	tracks: {
		// If found substring key replace by value
		replace: {

		},

		// If found substring value, ignore value
		ignore: [
			"(Official Music Video)",
			"(Official Video)",
			"(Official Audio)",
			"(Explicit)",
			"(Lyric Video)",
		]
	},

	// Artists
	artists: {
		// If found substring key replace by value
		replace: {
			"EminemMusic": "Eminem"
		},

		// If found substring value, ignore value
		ignore: [

		]
	}
};