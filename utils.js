var add_row = function(type, text) {
    var encoded = encodeURIComponent(text)
    $("#" + type + "s")
        .append("<tr><td><a href=/" + type + "?name=" + encoded +
                ">" + text + "</a></td></tr>")
};
