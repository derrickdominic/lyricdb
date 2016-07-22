var add_row = function(type, text) {
    var encoded = encodeURIComponent(text)
    $("#" + type + "s tbody")
        .append("<tr><td><a href=/" + type + "?name=" + encoded +
                ">" + text + "</a></td></tr>")
};
