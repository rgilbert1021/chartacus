chartacus
=========

Painless, real-time charting

Getting Started
---------------
1. Clone the repo: 
```
$ git clone https://github.com/jmandzik/chartacus.git
```

2. Install redis 
```
$ wget http://redis.googlecode.com/files/redis-2.6.6.tar.gz
$ tar xzf redis-2.6.6.tar.gz
$ cd redis-2.6.6
$ make
$ cd src 
$ sudo mkdir -p /opt/redis
$ sudo cp redis-cli /opt/redis/ && sudo cp redis-server /opt/redis/
```

3. Start redis
```
$ /opt/redis/redis-server
```

4. Install web server dependencies
```
$ cd [PATH_TO_PROJECT]/ui
$ npm install
```

5. Start the UI server
```
$ node server.js
```

Notes
-----------
* Text decorated with ~~strikethrough~~ indicates a feature Not Yet Implemented (achieved by adding class "nyi" to element)