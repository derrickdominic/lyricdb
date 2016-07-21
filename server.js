var express = require("express");
var app     = express();
var path    = require("path");
var fs      = require("fs");
var request = require('request');
var cheerio = require('cheerio');

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

var reading_date = function() {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth()+1; //January is 0!
    var yy = today.getFullYear() - 2000; //1900 is 0!
    if(dd<10){dd='0'+dd}
    if(mm<10){mm='0'+mm}
    today = mm.toString() + dd.toString() + yy;
    return today;
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
    var date = reading_date();
    if (req.query.hasOwnProperty("date")) {
        date = req.query.date;
    }
    var url = "http://www.usccb.org/bible/readings/" + date + ".cfm";
    request({
        followAllRedirects: true,
        url:url
    }, function(error, response, html) {
        if(!error) {
            var $ = cheerio.load(html);
            day = $("h1").text()
            reading_html = $("#cs_control_3684").html()
            // handle links to other readings
            if (reading_html == null) {
                console.log("nullified");
            }
            reading_html = reading_html
                .replace(/href=\"\/bible\/readings\//g, "href=/\daily?date=")
                .replace(/\.cfm"/g, "");
            reading_html = encodeURIComponent(reading_html);
            res.render("daily.html", {
                day: day,
                reading: reading_html
            });
            return;
        }
        res.sendFile(path.join(__dirname+"/daily.html"));
    });
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
