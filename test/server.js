const express = require('express');
const cors = require('cors');
const app = express();

var discovery = require("./discovery-config.json");
var signing = require("./signing.json");

app.use(cors());

app.get('/', function (req, res) {
  res.json(discovery);
});

app.put('/bs-and-maybe-also-index/camli/upload/', function (req, res) {
  res.send(204);
});

app.post('/sighelper/camli/sig/sign', function (req, res) {
  res.json(signing);
});

app.listen(8080, function () {
  console.log('Test harness listening on port 8080!')
});