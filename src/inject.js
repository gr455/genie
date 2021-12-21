let script = document.createElement("script");
script.setAttribute("extension-id", chrome.runtime.id);
script.src = chrome.runtime.getURL("vendor/jquery.min.js");
script.onload = function () {
	this.remove();
};

(document.head || document.documentElement).appendChild(script);

let script3 = document.createElement("script");
script3.setAttribute("extension-id", chrome.runtime.id);
script3.src = chrome.runtime.getURL("src/searchRules.js");
script3.onload = function () {
	this.remove();
};

(document.head || document.documentElement).appendChild(script3);

let script2 = document.createElement("script");
script2.setAttribute("extension-id", chrome.runtime.id);
script2.src = chrome.runtime.getURL("src/content.js");
script2.onload = function () {
	this.remove();
};

(document.head || document.documentElement).appendChild(script2);