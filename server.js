const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const expressSession = require('express-session');
const mongoose = require('mongoose');
const fs = require('fs');


const app = express();

// Verbindung zu MongoDB (z.B. mit mongoose)
mongoose.connect('mongodb://localhost:27017/meineDatenbank', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const UserSchema = new mongoose.Schema({
    username: String,
    password: String // Achtung: In einer echten Anwendung sollten Passwörter verschlüsselt gespeichert werden!
});
const User = mongoose.model('User', UserSchema);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(expressSession({
    secret: 'geheimnis',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(function(username, password, done) {
    User.findOne({ username: username }, function(err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false); }
        if (user.password !== password) { return done(null, false); }
        return done(null, user);
    });
}));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

// Hier fügen Sie Ihre Routen hinzu...

app.get('/', function(req, res) {
    fs.readFile('./index.html', 'utf8', function(err, data) {
        if (err) {
            return res.status(500).send('Server Error');
        }

        if (req.isAuthenticated()) {
            // Benutzer ist eingeloggt
            data = data.replace('<a href="/login" class="login-button">Login</a>', '<a href="/logout" class="login-button">Logout</a>');
        } else {
            // Benutzer ist nicht eingeloggt
            // (Behalten Sie den Login-Button so wie er ist oder fügen Sie zusätzlichen Code hier hinzu, wenn benötigt)
        }

        res.send(data);
    });
});

app.listen(3000, function() {
    console.log('Server läuft auf Port 3000!');
});

// Anmeldeseite
app.get('/login', function(req, res) {
    res.sendFile(__dirname + '/login.html');
});

// Anmeldeverarbeitung
app.post('/login',
    passport.authenticate('local', { failureRedirect: '/login' }),
    function(req, res) {
        res.redirect('/');
    });

// Registrierungsseite
app.get('/register', function(req, res) {
    res.sendFile(__dirname + '/register.html');
});

// Registrierungsverarbeitung
app.post('/register', function(req, res) {
    const newUser = new User({
        username: req.body.username,
        password: req.body.password // Erinnern Sie sich daran, das Passwort in einer echten App zu verschlüsseln!
    });
    newUser.save(function(err) {
        if (err) throw err;
        res.redirect('/login');
    });
});

// Hauptseite
app.get('/', function(req, res) {
    if (req.isAuthenticated()) {
        res.send('Hallo ' + req.user.username + '! <a href="/logout">Ausloggen</a>');
    } else {
        res.send('<a href="/login">Anmelden</a><br><a href="/register">Registrieren</a>');
    }
});

// Ausloggen
app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});
