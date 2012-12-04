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
  // socket = require('./routes/socket.js'),
  uuid = require('node-uuid'),
  mongoose = require('mongoose'),
  _ = require('underscore'),
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
      req.session.error = 'Authentication failed, please check your email and password.';
      res.redirect('login');
    }
    if(user) {
      // Found the record, now check the hash
      hash(pass, user.salt, function(err, hash) {
        if(err) return fn(err);
        if(hash == user.hash) return fn(null, user);
        fn(new Error('invalid password'));
      })
    } else {
      // Bad password
      fn("Invalid credentials", null);
    }

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
        req.session.user = {
          key: user.key,
          email: user.email
        };
        app.locals.session = req.session;
        res.redirect('/dashboard/');
      });
    } else {
      req.session.error = 'Authentication failed, please check your email and password.';
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

  if(!req.body.password) {
    req.session.error = "Did you forget to supply a password?";
    res.redirect('signup');
  } else {
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
          req.session.error = "The email address '" + req.body.username + "' has already been registered.";
          res.redirect('signup');
        } else {
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
                app.locals.session = req.session;
                res.redirect('/dashboard/');
              });
            } else {
              req.session.error = 'Authentication failed, please check your email and password.';
              res.redirect('login');
            }
          });
        }
      });
    });
  }
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
    console.log("heard new data");
    var now = +new Date();
    var tokens = data.split('|');
    if(!activeSockets[tokens[0]]) {
      activeSockets[tokens[0]] = {};
      activeSockets[tokens[0]].data = [];
      activeSockets[tokens[0]].buffer = [];
      activeSockets[tokens[0]].handle = setInterval(function() {
        var sum = _.reduce(activeSockets[tokens[0]].buffer, function(memo, num) {
          return memo + num;
        }, 0);
        if(activeSockets[tokens[0]].socket) {
          console.log("emitting " + 'data-' + tokens[0]);
        }
        activeSockets[tokens[0]].socket && activeSockets[tokens[0]].socket.emit('data-' + tokens[0], [+new Date(), sum])
        activeSockets[tokens[0]].buffer = [];
      }, 1000);
    }
    activeSockets[tokens[0]].data && activeSockets[tokens[0]].data.push(1);
    activeSockets[tokens[0]].buffer && activeSockets[tokens[0]].buffer.push(1);
    // activeSockets[tokens[0]].socket && activeSockets[tokens[0]].socket.emit('data', {
    //   timestamp: now,
    //   value: tokens[1],
    //   count: activeSockets[tokens[0]].data.length
    // });
  });
});
tcpListener.listen(1407);

// Establish communication with the browser
var io = require('socket.io').listen(server);
io.sockets.on('connection', function(socket) {
  socket.on('pair', function(key) {
    console.log("paired with " + key)
    socket.key = key;
    if(!activeSockets[key]) {
      activeSockets[key] = {};
      activeSockets[key].data = [];
      activeSockets[key].buffer = [];
      activeSockets[key].socket = socket;
      activeSockets[key].handle = setInterval(function() {
        var sum = _.reduce(activeSockets[key].buffer, function(memo, num) {
          return memo + num;
        }, 0);

        var now = +new Date();
        activeSockets[key].socket && activeSockets[key].socket.emit('data-' + key, [now, sum])
        activeSockets[key].buffer = [];
        console.log("emitting to " + key);
        if((now - activeSockets[key].lastHeard) > 60000) {
          clearInterval(activeSockets[socket.key].handle);
        }
      }, 1000);
    }
    // socket.emit('data', {
    //   count: activeSockets[key].data.length
    // })
  });

  socket.on('ack', function() {
    var now = +new Date();
    if(activeSockets[socket.key]) {
      activeSockets[socket.key].lastHeard = now;
    }

  })

  socket.on('disconnect', function() {
    io.sockets.emit('user disconnected');
    activeSockets[socket.key] && clearInterval(activeSockets[socket.key].handle);
  });
});
io.set('log level', 1);



//////////////////////////////////
// Watchdogs
//////////////////////////////////