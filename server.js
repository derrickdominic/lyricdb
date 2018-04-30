var express    = require("express");
var app        = express();
var path       = require("path");
var fs         = require("fs");
var request    = require('request');
var cheerio    = require('cheerio');
var bodyParser = require('body-parser');

app.set('views', __dirname);
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.use(bodyParser.urlencoded({ extended: false }));
// app.use(express.static(__dirname));

// global state variables
var last_song_file = "";
var shuffled_songs = null;
var last_song_index = 0;

var unescape = function(str) {
    return str.replace(/&amp;/g, "&")
        .replace(/&quot;/g, "\"")
        .replace(/&#39;/g, "'");
}

var to_html = function(text) {
    html = "";
    lines = text.split('\n');
    for (id_line in lines) {
        if (lines[id_line].match(/(Verse|Refrain|Chorus)/)) {
            html = html +
                "<span class=\"bold\">" + lines[id_line] + "</span><br />";
        } else {
            html = html +
                "<span>" + lines[id_line] + "</span><br />";
        }
    }
    return html;
};

var get_song_or_prayer = function(type, req, res) {
    var title = unescape(req.query.title);
    var text = fs.readFileSync(
        type + "s/" + title + ".txt", "utf-8");
    text = to_html(text);
    text = encodeURIComponent(text);
    res.render("song.html", {
        title: title,
        text: text,
        type: type
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

// http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
var shuffle = function(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

app.get('/', function(req, res) {
    console.log("GET /");
    var list_songs = fs.readdirSync("songs");
    var list_prayers = fs.readdirSync("prayers");
    //res.sendFile(path.join(__dirname+"/index.html"));
    res.render("index.html", {
        list_songs: list_songs,
        list_prayers: list_prayers
    });
});

app.get("/song", function(req, res) {
    console.log("GET /song");
    get_song_or_prayer("song", req, res);
});

app.get("/random", function(req, res) {
    console.log("GET /random");
    if (shuffled_songs == null || (last_song_index + 1) >= shuffled_songs.length) {
        var list_songs = fs.readdirSync("songs");
        shuffled_songs = shuffle(list_songs);
        last_song_index = 0;
    } else {
        last_song_index++;
    }

    song_file = shuffled_songs[last_song_index];
    while (song_file == last_song_file) {
        last_song_index++;
        console.log("Next: " + last_song_index);
        song_file = shuffled_songs[last_song_index];
    }
    last_song_file = song_file;
    song = song_file.split(".txt")[0];

    res.redirect("/song?title=" + encodeURIComponent(song));

    /*
    var text = fs.readFileSync(
        "songs/" + song + ".txt", "utf-8");
    text = to_html(text);
    text = encodeURIComponent(text);
    res.render("song.html", {
        title: song,
        text: text,
        type: "song"
    });
    */
});

app.get("/prayer", function(req, res) {
    console.log("GET /prayer");
    get_song_or_prayer("prayer", req, res);
});

app.get("/new", function(req, res) {
    console.log("GET /new");
    res.render("new.html", {
    });
});

app.get("/edit", function(req, res) {
    console.log("GET /edit");
    var text = fs.readFileSync(
        req.query.type + "s/" + req.query.title + ".txt", "utf-8");
    //text = to_html(text);
    text = encodeURIComponent(text);
    res.render("edit.html", {
        title: req.query.title,
        type: req.query.type,
        text: text
    });
});

app.post("/edit", function(req, res) {
    console.log("POST /edit");
    console.log(req.body);

    if (req.body.title.trim().length == 0) {
        console.error("No title provided. Not saving file.");
        res.redirect("/");
        return;
    }
    filename = req.body.type + "s/" + req.body.title + ".txt"
    var text = req.body.text;
    text = text.replace(/\r/g, "");
    text = decodeURIComponent(text);
    fs.writeFileSync(filename, text);
    res.redirect("/" + req.body.type + "?title=" + encodeURIComponent(req.body.title));
});

app.post("/delete", function(req, res) {
    console.log("POST /delete");
    console.log(req.body);
    if (req.body.title.trim().length == 0) {
        console.error("No title provided. Not deleting file.");
        res.redirect("/");
        return;
    }
    filename = req.body.type + "s/" + req.body.title + ".txt"
    fs.unlinkSync(filename);
    res.redirect("/");
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
        if (error) {
            console.error("request returned an error");
            res.render("daily.html", {});
            return;
        }
        var $ = cheerio.load(html);
        day = $("h1").text()
//        reading_html = $("#cs_control_3684").html()
        reading_html = $("#CS_Element_maincontent").html()
        if (reading_html == null) {
            console.error("reading_html was null");
            res.sendFile(path.join(__dirname+"/daily.html"));
            return;
        }
        // handle links to other readings
        reading_html = reading_html
            .replace(/href=\"\/bible\/readings\//g, "href=/\daily?date=")
            .replace(/\.cfm"/g, "")
            .replace(/<h4>/g, "<br /><h3 style=\"font-weight:bold;\">")
            .replace(/<\/h4>/g, "</h3><br />");
        reading_html = encodeURIComponent(reading_html);
        res.render("daily.html", {
            day: day,
            reading: reading_html
        });
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
