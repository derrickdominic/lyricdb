var express    = require('express');
var app        = express();
var path       = require('path');
var fs         = require('fs');
var request    = require('request');
var cheerio    = require('cheerio');
var bodyParser = require('body-parser');

app.set('views', __dirname);
app.set('view engine', 'pug');
app.engine('html', require('ejs').renderFile);
app.use(bodyParser.urlencoded({ extended: false }));
// app.use(express.static(__dirname));

// global state variables
var last_song_file = '';
var shuffled_songs = null;
var last_song_index = 0;

var display_and_encoded_titles = function(display_title) {
    return {
        'display': display_title,
        'encoded': encodeURIComponent(display_title)
    };
};

var create_title_dictionaries = function(files) {
    var titles = []
    for (index in files) {
        var display_title = files[index].split(".txt")[0];
        titles.push(display_and_encoded_titles(display_title));
    }
    return titles;
};

var add_bold_headings_and_line_breaks = function(content) {
    html = '';
    lines = content.split('\n');
    for (index in lines) {
        if (lines[index].match(/(Verse|Refrain|Chorus)/)) {
            html = html + '<span class=\'bold\'>' + lines[index] + '</span><br />';
        } else {
            html = html + '<span>' + lines[index] + '</span><br />';
        }
    }
    return html;
};

var render_song_or_prayer = function(type, req, res) {
    var title = decodeURIComponent(req.query.title);
    var content = fs.readFileSync(type + 's/' + title + '.txt', 'utf-8');
    content = add_bold_headings_and_line_breaks(content);
    res.render('song', {
        title: display_and_encoded_titles(title),
        content: content,
        type: type
    });
};

// http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
var shuffle = function(array) {
    var current_index = array.length, temp, random_index;
    // While there remain elements to shuffle...
    while (0 !== current_index) {
        // Pick a remaining element...
        random_index = Math.floor(Math.random() * current_index);
        current_index -= 1;
        // And swap it with the current element.
        temp = array[current_index];
        array[current_index] = array[random_index];
        array[random_index] = temp;
    }
    return array;
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

app.get('/', function (req, res) {
    console.log('GET /');
    res.render('index', {
        prayers: create_title_dictionaries(fs.readdirSync('prayers')),
        songs: create_title_dictionaries(fs.readdirSync('songs'))
    });
})

app.get('/song', function(req, res) {
    console.log('GET /song');
    render_song_or_prayer('song', req, res);
});

app.get('/prayer', function(req, res) {
    console.log('GET /prayer');
    render_song_or_prayer('prayer', req, res);
});

app.get('/random', function(req, res) {
    console.log('GET /random');
    if (shuffled_songs == null || (last_song_index + 1) >= shuffled_songs.length) {
        var list_songs = fs.readdirSync('songs');
        shuffled_songs = shuffle(list_songs);
        last_song_index = 0;
    } else {
        last_song_index++;
    }

    song_file = shuffled_songs[last_song_index];
    while (song_file == last_song_file) {
        last_song_index++;
        console.log('Next: ' + last_song_index);
        song_file = shuffled_songs[last_song_index];
    }
    last_song_file = song_file;
    song = song_file.split('.txt')[0];

    res.redirect('/song?title=' + encodeURIComponent(song));
});

app.get('/daily', function(req, res) {
    var date = reading_date();
    if (req.query.hasOwnProperty('date')) {
        date = req.query.date;
    }
    var url = 'http://www.usccb.org/bible/readings/' + date + '.cfm';
    request({
        followAllRedirects: true,
        url:url
    }, function(error, response, html) {
        if (error) {
            console.error('request returned an error');
            res.render('daily');
            return;
        }
        var $ = cheerio.load(html);
        day = $('h1').text()
        reading_html = $('#CS_Element_maincontent').html()
        if (reading_html == null) {
            console.error('reading_html was null');
            res.render('daily');
            return;
        }
        // handle links to other readings
        reading_html = reading_html
            .replace(/href=\'\/bible\/readings\//g, 'href=/\daily?date=')
            .replace(/\.cfm'/g, '')
            .replace(/<h4>/g, '<br /><h3 style=\'font-weight:bold;\'>')
            .replace(/<\/h4>/g, '</h3><br />');
        // reading_html = encodeURIComponent(reading_html);
        res.render('daily', {
            day: day,
            content: reading_html
        });
    });
});

app.get('/new', function(req, res) {
    console.log('GET /new');
    res.render('new');
});

app.get('/edit', function(req, res) {
    console.log('GET /edit');
    var text = fs.readFileSync(
        req.query.type + 's/' + req.query.title + '.txt', 'utf-8');
    //text = to_html(text);
    text = encodeURIComponent(text);
    res.render('edit.html', {
        title: decodeURIComponent(req.query.title),
        type: req.query.type,
        text: text
    });
});

app.post('/edit', function(req, res) {
    console.log('POST /edit');
    console.log(req.body);
    if (req.body.title.trim().length == 0) {
        console.error('No title provided. Not saving file.');
        res.redirect('/');
        return;
    }
    filename = req.body.type + 's/' + req.body.title + '.txt'
    var text = req.body.text;
    text = text.replace(/\r/g, '');
    text = decodeURIComponent(text);
    fs.writeFileSync(filename, text);
    res.redirect('/' + req.body.type + '?title=' + encodeURIComponent(req.body.title));
});

app.post('/delete', function(req, res) {
    console.log('POST /delete');
    console.log(req.body);
    if (req.body.title.trim().length == 0) {
        console.error('No title provided. Not deleting file.');
        res.redirect('/');
        return;
    }
    filename = req.body.type + 's/' + req.body.title + '.txt'
    fs.unlinkSync(filename);
    res.redirect('/');
});

app.get('/(*)\.css/', function(req, res) {
    res.sendFile(path.join(__dirname + '/' + req.params[0] + '.css'));
});

app.get('/(*)\.js/', function(req, res) {
    res.sendFile(path.join(__dirname + '/' + req.params[0] + '.js'));
});

const port = 3000;
app.listen(port);

console.log('Running at port ' + port + '...');
