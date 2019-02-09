const express = require('express');
const bodyParser = require('body-parser');
const search = require('./lib/fuzzball_ultra_lite.js');
const fs = require('fs');
const app = express();

app.use(bodyParser.json({limit: '3mb', extended: true}));
app.use(bodyParser.urlencoded({limit: '3mb', extended: true}));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(express.static('public'));

app.post('/search', (req, res, next) => {

  let results = {};
  let timestamp = Date.now();

  const options = Object.assign({}, {scorer: search.token_set_ratio, limit: 1, cutoff: 0, force_ascii: true, full_process: true, useCollator: false, unsorted: false, returnObjects: true}, req.body.options);

  console.time("search");

  for (let i = 0, len = req.body.list404.length; i < len; i++) {
    results[req.body.list404[i]] = search.extract(req.body.list404[i], req.body.list200, options);
  }

  console.timeEnd("search");

  res.json(results);

  fs.writeFile('./datasets/'+timestamp+'-url404.txt', String(req.body.list404).replace(/,/g, '\n'), (err) => {
    if (err) throw err;
    console.log('Dataset url404 saved');
  });

  fs.writeFile('./datasets/'+timestamp+'-url200.txt', String(req.body.list404).replace(/,/g, '\n'), (err) => {
    if (err) throw err;
    console.log('Dataset url200 saved');
  });

});

app.listen(5000, () => console.log('Redirector listening on port 5000'))

module.exports = app;