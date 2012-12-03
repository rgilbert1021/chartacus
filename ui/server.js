/**
 * Module dependencies.
 */

var express = require('express'),
  routes = require('./routes'),
  user = require('./routes/user'),
  http = require('http'),
  net = require('net'),
  path = require('path'),
  redis = require('redis'),
  socket = require('./routes/socket.js'),
  uuid = require('node-uuid'),
  mongoose = require('mongoose'),
  hash = require('./pass').hash;


var app = express();
var memStore = redis.createClient();
var permStore = mongoose.createConnection('localhost', 'users');
var schema = mongoose.Schema({
  email: 'string',
  key: 'string',
  salt: 'string',
  hash: 'string'
});
var User = permStore.model('User', schema);


app.use(express.cookieParser('shhhh, very secret'));
app.use(express.session());
app.use(function(req, res, next) {
  var err = req.session.error,
    msg = req.session.success;
  delete req.session.error;
  delete req.session.success;
  res.locals.message = '';
  if(err) res.locals.message = err;
  if(msg) res.locals.message = msg;
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


//////////////////////////////////
// AUTH
//////////////////////////////////
var users = {
  foo: {
    name: 'Foo'
  }
};


// Authenticate using our plain-object database of doom!

function authenticate(name, pass, fn) {

  User.findOne({
    email: name
  }, function(err, user) {
    if(err) {
      req.session.error = 'Authentication failed, please check your ' + ' username and password.' + ' (use "foo" and "foobar")';
      res.redirect('login');
    }
    if(user) {
      hash(pass, user.salt, function(err, hash) {
        if(err) return fn(err);
        if(hash == user.hash) return fn(null, user);
        fn(new Error('invalid password'));
      })
      // fn(null, user);
    } else {
      fn("Invalid credentials", null);
    }

  })


  // if(!module.parent) console.log('authenticating %s:%s', name, pass);
  // var user = users[name];
  // // query the db for the given username
  // if(!user) return fn(new Error('cannot find user'));
  // // apply the same algorithm to the POSTed password, applying
  // // the hash against the pass / salt, if there is a match we
  // // found the user
  // hash(pass, user.salt, function(err, hash) {
  //   if(err) return fn(err);
  //   if(hash == user.hash) return fn(null, user);
  //   fn(new Error('invalid password'));
  // })
}

function restrict(req, res, next) {
  if(req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/login');
  }
}

//////////////////////////////////
// ROUTES
//////////////////////////////////
/**
 * Front Page
 */
app.get('/', function(req, res) {
  app.locals.uuid = uuid.v4();
  res.render('index');
});
app.get('/chart/', function(req, res) {
  if(!req.session.user) {
    // No session, redirect to login
    res.redirect('login');
  } else {
    res.redirect('dashboard/');
  }
});
app.get('/chart/:key', function(req, res) {
  memStore.get(req.params.key, function(error, response) {
    if(!response) {
      // Key doesnt exist
      res.render('404');
    } else {
      app.locals.key = {
        uuid: req.params.key,
        public: response == 'public' ? true : false
      }
      if(app.locals.key.public) {
        // Key exists and is public
        res.render('publicChart');
      } else {
        // Key is private
        if(!req.session.user) {
          // No session, redirect to login
          res.render('login');
        } else {
          res.redirect('dashboard/#/' + app.locals.key.uuid);
        }
      }
    }
  });
});

app.get('/dashboard/', function(req, res) {
  if(!req.session.user) {
    res.render('login');
  } else {
    app.locals.user = req.session.user;
    res.render('application');
  }
});

/**
 * AngularJS Partial routing
 */

app.get('/partials/:name', routes.partials);


/**
 * Login
 */

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

/**
 * Logout
 */
app.get('/logout', function(req, res) {
  // destroy the user's session to log them out
  // will be re-created next request
  req.session.destroy(function() {
    res.redirect('/');
  });
});


/**
 * Sign Up
 */

app.get('/signup', function(req, res) {
  res.render('signup');
});
app.post('/signup', function(req, res) {
  var key = uuid.v4();

  hash(req.body.password, function(err, salt, hash) {
    if(err) throw err;
    // store the salt & hash in the "db"
    var user = new User({
      email: req.body.username,
      hash: hash,
      salt: salt,
      key: key
    });

    user.save(function(err) {
      if(err) {
        // bail...
      }

      memStore.set(key, "private");
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
            app.locals.user = user;


            res.redirect('/dashboard/');
          });
        } else {
          req.session.error = 'Authentication failed, please check your ' + ' username and password.' + ' (use "foo" and "foobar")';
          res.redirect('login');
        }
      });
    });
  });
});

//////////////////////////////////
// Start the server
//////////////////////////////////
var server = http.createServer(app).listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});


//////////////////////////////////
// SOCKETS
//////////////////////////////////
var activeSockets = {};

// Establish listener for incoming TCP events
tcpListener = net.createServer(function(stream) {
  stream.setEncoding('ascii');
  stream.on('data', function(data) {
    var now = +new Date();
    var tokens = data.split('|');
    if(!activeSockets[tokens[0]]) {
      activeSockets[tokens[0]] = {};
      activeSockets[tokens[0]].data = [];
    }
    activeSockets[tokens[0]].data && activeSockets[tokens[0]].data.push({
      timestamp: now,
      value: tokens[1]
    });
    activeSockets[tokens[0]].socket && activeSockets[tokens[0]].socket.emit('data', {
      timestamp: now,
      value: tokens[1],
      count: activeSockets[tokens[0]].data.length
    });
  });
});
tcpListener.listen(1407);

// Establish communication with the browser
var io = require('socket.io').listen(server);
io.sockets.on('connection', function(socket) {
  socket.on('pair', function(key) {
    if(!activeSockets[key]) {
      activeSockets[key] = {};
      activeSockets[key].data = [];
    }
    activeSockets[key].socket = socket;
    socket.emit('data', {
      count: activeSockets[key].data.length
    })
  });
});
io.set('log level', 1);



//////////////////////////////////
// Watchdogs
//////////////////////////////////