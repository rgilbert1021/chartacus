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
$ curl -O http://redis.googlecode.com/files/redis-2.6.6.tar.gz
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

4. Install MongoDB (takes a very long time to build from source... grabbing a binary)
```
$ sudo mkdir -p /opt/mongo/ && sudo cd /opt/mongo
$ curl -O http://fastdl.mongodb.org/osx/mongodb-osx-x86_64-2.2.2.tgz
$ tar xvf mongodb-osx-x86_64-2.2.2.tgz
$ cd mongodb-osx-x86_64-2.2.2/
$ mv * ../
$ sudo mkdir -p /data/db/
```

5. Start mongo (add /opt/mongo/bin to your PATH)
```
$ mongod
```

6. Install web server dependencies
```
$ cd [PATH_TO_PROJECT]/ui
$ npm install
```

7. Start the UI server
```
$ node server.js
```

8. Install TCP server dependencies
```
$ cd [PATH_TO_PROJECT]/api/tcp
$ npm install
```

9. Start TCP API listener
```
$ node listener
```

Notes
-----------
* Text decorated with ~~strikethrough~~ indicates a feature Not Yet Implemented (achieved by adding class "nyi" to element)