const express =  require('express');
const app = express();
const axios = require('axios');

const redis = require("redis");
const redisClient = redis.createClient();
const default_expiration = 30;

redisClient.on("connect", () => {
  console.error('connected to redis-server');
});

app.get('/', (req, res ) => {
    res.json({msg: 'Hello from redis demo application'});
})

app.get('/photos', (req, res) => {

    console.time('response duration');

    redisClient.get('photos', async (error, photos) => {
        if(error) console.log(error);
        if(photos) {
            console.log('\nCACHED. Found data on redis-server');
            console.timeEnd('response duration');
            return res.json(JSON.parse(photos));
        }

        const {data} = await axios.get('https://jsonplaceholder.typicode.com/photos');

        // save response to redis
        redisClient.setex("photos", default_expiration, JSON.stringify(data));

        console.log('\nNOT CACHED. Requesting data from API');
        console.timeEnd('response duration');

        setTimeout(() => {
            console.log('\n"photos" expired: REMOVED FROM redis-server');
        }, default_expiration * 1000)

        res.json(data);
    });
})

app.listen(3000, () => {
    console.log('REDIS DEMO with caching');
    console.log('reachable via http://localhost:3000');
})