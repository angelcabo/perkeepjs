const express = require('express');
const app = express();

app.get('/', function (req, res) {
  res.send('Hello World')
});

app.listen(8080, function () {
  console.log('Test harness listening on port 8080!')
});