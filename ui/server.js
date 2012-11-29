/**
 * Module dependencies.
 */

var express = require('express'),
  routes = require('./routes'),
  user = require('./routes/user'),
  http = require('http'),
  path = require('path'),
  redis = require('redis'),
  socket = require('./routes/socket.js'),
  uuid = require('node-uuid'),
  hash = require('./pass').hash;

var app = express();
var db = redis.createClient();

app.use(express.cookieParser('shhhh, very secret'));
app.use(express.session());
app.use(function(req, res, next) {
  var err = req.session.error,
    msg = req.session.success;
  delete req.session.error;
  delete req.session.success;
  res.locals.message = '';
  if(err) res.locals.message = '<p class="msg error">' + err + '</p>';
  if(msg) res.locals.message = '<p class="msg success">' + msg + '</p>';
  next();
});


app.configure(function() {
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function() {
  app.use(express.errorHandler());
});

app.set('title', 'Chartacus');


// dummy database
var users = {
  foo: {
    name: 'Foo'
  }
};

// when you create a user, generate a salt
// and hash the password ('foobar' is the pass here)
hash('bar', function(err, salt, hash) {
  if(err) throw err;
  // store the salt & hash in the "db"
  users.foo.salt = salt;
  users.foo.hash = hash;
});


// Authenticate using our plain-object database of doom!

function authenticate(name, pass, fn) {
  if(!module.parent) console.log('authenticating %s:%s', name, pass);
  var user = users[name];
  // query the db for the given username
  if(!user) return fn(new Error('cannot find user'));
  // apply the same algorithm to the POSTed password, applying
  // the hash against the pass / salt, if there is a match we
  // found the user
  hash(pass, user.salt, function(err, hash) {
    if(err) return fn(err);
    if(hash == user.hash) return fn(null, user);
    fn(new Error('invalid password'));
  })
}

function restrict(req, res, next) {
  if(req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/login');
  }
}


app.get('/', function(req, res) {
  res.render('index');
});
app.get('/chart/', function(req, res) {
  if(!req.session.user) {
    // No session, redirect to login
    res.redirect('login');
  } else {
    res.redirect('application');
  }
});
app.get('/chart/:key', function(req, res) {
  // look up key to see if exists, and public or private
  var key;
  switch(req.params.key) {
  case "1":
    key = {
      uuid: req.params.key,
      public: true
    }
    break;
  case "2":
    key = {
      uuid: req.params.key,
      public: false
    }
    break;
  default:
    key = false;
  }
  console.log(key);
  if(!key) {
    // Key doesnt exist
    res.render('404');
  } else {
    app.locals.key = key;
    if(key.public) {
      // Key exists and is public
      res.render('publicChart');
    } else {
      // Key is private
      if(!req.session.user) {
        // No session, redirect to login
        res.render('login');
      } else {
        res.redirect('dashboard/#/'+key.uuid);
      }
    }
  }
});

app.get('/dashboard/', function(req, res) {
  if(!req.session.user) {
    res.render('login');
  } else {
    app.locals.user = req.session.user; 
    res.render('application');
  }
});

app.get('/partials/:name', routes.partials);

app.get('/application', restrict, function(req, res) {
  res.send('Wahoo! welcome to the application area ' + req.session.user.name + ', click to <a href="/logout">logout</a>');
});

app.get('/logout', function(req, res) {
  // destroy the user's session to log them out
  // will be re-created next request
  req.session.destroy(function() {
    res.redirect('/');
  });
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.post('/login', function(req, res) {
  authenticate(req.body.username, req.body.password, function(err, user) {
    if(user) {
      // Regenerate session when signing in
      // to prevent fixation 
      req.session.regenerate(function() {
        // Store the user's primary key 
        // in the session store to be retrieved,
        // or in this case the entire user object
        req.session.user = user;
        req.session.success = 'Authenticated as ' + user.name + ' click to <a href="/logout">logout</a>. ' + ' You may now access <a href="/application">/application</a>.';
        console.log(app.locals);
        console.log(req.url);
        res.redirect('/dashboard/');
      });
    } else {
      req.session.error = 'Authentication failed, please check your ' + ' username and password.' + ' (use "foo" and "foobar")';
      res.redirect('login');
    }
  });
});

app.get('/', routes.index);
app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});