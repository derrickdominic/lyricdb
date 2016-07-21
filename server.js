var express = require("express");
var app     = express();
var path    = require("path");
var fs      = require("fs");

app.set('views', __dirname);
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
//app.use(express.static(__dirname));

var unescape_names = function(name) {
    return name.replace('/&amp;/g', '&')
               .replace(/&quot;/g, '"')
               .replace(/&#39;/g, '\'');
};

var get_song_or_prayer = function(type, req, res) {
    var name = unescape_names(req.query.name);
    var words = fs.readFileSync(
        type + "s/" + name + ".html", "utf-8");
    words = encodeURIComponent(words);
    res.render("song.html", {
        name: name,
        words: words
    });
};

app.get('/', function(req, res) {
    var list_songs = fs.readdirSync("songs");
    var list_prayers = fs.readdirSync("prayers");
    //res.sendFile(path.join(__dirname+"/index.html"));
    res.render("index.html", {
        list_songs: list_songs,
        list_prayers: list_prayers
    });
});

app.get("/song", function(req, res) {
    get_song_or_prayer("song", req, res);
});

app.get("/prayer", function(req, res) {
    get_song_or_prayer("prayer", req, res);
});

app.get("/daily", function(req, res) {
    res.sendFile(path.join(__dirname+"/daily.html"));
});

app.get("/(*)\.css/", function(req, res) {
    res.sendFile(path.join(__dirname+"/"+req.params[0]+".css"));
});

app.get("/(*)\.js/", function(req, res) {
    res.sendFile(path.join(__dirname+"/"+req.params[0]+".js"));
});

const port = 3000;
app.listen(port);

console.log("Running at port " + port + "...");
