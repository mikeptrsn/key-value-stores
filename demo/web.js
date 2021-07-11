const express = require('express');
const app = express();
const axios = require('axios');

const RedisClustr = require('redis-clustr');
const redisClient = new RedisClustr({
    servers: [
        {
            host: '127.0.0.1',
            port: 7000,
        },
        {
            host: '127.0.0.1',
            port: 7001,
        },
        {
            host: '127.0.0.1',
            port: 7002,
        },
    ],
});

const default_expiration = 120;

app.use(express.static('public'));

redisClient.on('connect', () => {
    console.error('connected to redis-server');
});

app.get('/photos/:albumId', (req, res) => {
    //console.time('response duration');

    const albumId = req.params.albumId;
    const s = Date.now();

    redisClient.get(`albumId?${albumId}`, async (error, photos) => {
        if (error) console.log(error);
        if (photos) {
            console.log('\nCACHED. Found data on redis-server');
            //console.timeEnd('response duration');
            const d = Date.now() - s;
            return res.json({ time: d, photo: JSON.parse(photos) });
        }

        const { data } = await axios.get(`https://jsonplaceholder.typicode.com/photos/${albumId}`);

        // save response to redis
        redisClient.setex(`albumId?${albumId}`, default_expiration, JSON.stringify(data));

        console.log('\nNOT CACHED. Requesting data from API');
        //console.timeEnd('response duration');

        setTimeout(() => {
            console.log('\n"photos" expired: REMOVED FROM redis-server');
        }, default_expiration * 1000);

        const d2 = Date.now() - s;
        return res.json({ time: d2, photo: data });
    });
});

app.listen(3000, () => {
    console.log('REDIS DEMO with caching');
    console.log('reachable via http://localhost:3000');
});
