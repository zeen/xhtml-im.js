// XHTML-IM sanitizer

(function() {

var url_regex = /^(https?|ftp|xmpp|mailto|irc):/i;
var int_regex = /^\s*[0-9]+$/; // TODO allow garbage after?
var color_regex = /(rgba?|hsla?)\([\-+0-9\.%,\s]+\)|#?[a-zA-Z0-9]+/i;
var margin_regex = /auto|inherit|[+\-]?(\d+|\d*\.\d+)(em|ex|in|cm|mm|pt|pc|px|%|)/i;

// Note: we specifically disallow special characters in CSS value output
// Font families are restricted to alphabet, hyphen and space
// CSS escape sequences are never present in the output

var css_regex = {
	"background-color": color_regex,
	"color": color_regex,
	"font-family": /([a-z\-]+|'[a-z\- ]*'|"[a-z\- ]*")(\s*,\s*([a-z\-]+|'[a-z\- ]*'|"[a-z\- ]*"))*/i,
	"font-size": /xx-small|x-small|small|medium|large|x-large|xx-large|larger|smaller|[+\-]?(\d+|\d*\.\d+)(em|ex|in|cm|mm|pt|pc|px|%|)|inherit/i,
	"font-style": /normal|italic|oblique|inherit/i,
	"font-weight": /normal|bold|bolder|lighter|inherit|\d\d\d/i,
	"margin-left": margin_regex,
	"margin-right": margin_regex,
	"text-align": /left|right|center|justify|inherit/i,
	"text-decoration": /none|underline|overline|line-through|blink|inherit/i
};

function sanitize_css(css) {
	var declarations = (";" + css)
		.replace(/\/\*[^*]*\*+([^\/*][^*]*\*+)*\//g, "") // strip comments
		.replace(/\/\*.*/, "") // strip unclosed comment
		.replace(/\\([a-fA-F0-9]{1,6})\s?/, function(_, x) { return String.fromCharCode(parseInt(x, 16)); }) // decode escape sequences
		.match(/;\s*([a-z\-]+)\s*:\s*([^;]*[^\s;])\s*/g) || []; // match declarations
	var result = [];
	for (var i = 0; i < declarations.length; i++) {
		var parts = declarations[i].match(/^;\s*([a-z\-]+)\s*:\s*([^;]*[^\s])\s*$/); // parts = [";a:b", "a", "b"]
		var regex = css_regex.hasOwnProperty(parts[1]) && css_regex[parts[1]];
		var match = regex && parts[2].match(regex);
		if (match) {
			result.push(parts[1] + ":" + match[0]);
		}
	}
	return result.join(";");
}

var sanitizers = {
	"href": function(s) { return s.match(url_regex) && s; },
	"type": function(s) { return null; }, // discard for now
	"style": function(s) { return sanitize_css(s); },
	"alt": function(s) { return s; },
	"src": function(s) { return s.match(url_regex) && s; },
	"height": function(s) { return s.match(int_regex) && s; },
	"width": function(s) { return s.match(int_regex) && s; }
};

var allowed_text =
	" a.href a.type a.style" +
	" blockquote.style" +
	" br." +
	" cite.style" +
	" em." +
	" img.alt img.height img.src img.style img.width" +
	" li.style" +
	" ol.style" +
	" p.style" +
	" span.style" +
	" strong." +
	" ul.style" +
	" ";

function is_tag_allowed(tag) {
	return allowed_text.indexOf(" "+tag+".") >= 0;
}
function is_attr_allowed(tag, attr) {
	return allowed_text.indexOf(" " + tag + "." + attr + " ");
}

function sanitize(stanza, targetDoc) {
	var tagName = stanza.nodeName;
	if (!is_tag_allowed(tagName)) { return null; }
	var elem = targetDoc.createElement(tagName);

	for (var i = 0, attr; attr = stanza.attributes[i]; i++) {
		var k = attr.nodeName;
		if (is_attr_allowed(tagName, k)) {
			var v = sanitizers[k](attr.nodeValue);
			if (v) { elem.setAttribute(k, v); }
		}
	}
	for (var childNode = stanza.firstChild; childNode; childNode = childNode.nextSibling) {
		switch (childNode.nodeType) {
			case 1: // Node.ELEMENT_NODE
				var child = sanitize(childNode, targetDoc);
				if (child) { elem.appendChild(child); }
				break;
			case 3: // Node.TEXT_NODE
				elem.appendChild(targetDoc.createTextNode(childNode.nodeValue));
				break;
		}
	}
	return elem;
}

var name = "xhtmlim";
var obj = { "sanitize": sanitize };
var root = this;

var _old = root[name];
obj['noConflict'] = function() { if (root[name] == obj) { root[name] = _old; } return obj; };

if (typeof define == 'function' && define['amd']) { define(name, obj); }
else if (typeof module != 'undefined' && module['exports']) { module['exports'] = obj; }
else { root[name] = obj; }

})();
