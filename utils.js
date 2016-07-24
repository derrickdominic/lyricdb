module.exports = {
    unescape: function(str) {
        return str.replace(/&amp;/g, "&")
            .replace(/&quot;/g, "\"")
            .replace(/&#39;/g, "'");
    }
}
