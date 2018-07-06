const fs = require('fs');
const Perkeep = require('./dist/perkeep.cjs.js');

let file = fs.readFileSync('demo.txt');

var config = {
  host: 'http://perkeep.test',
  user: 'angel',
  pass: 'pass',
  vivify: 'rainbows'
};

var perkeep = Perkeep(config);

perkeep.discover()
  .then(function (response) {
    perkeep.discoveryConfig = response;
    return response;
  })
  .then(function () {
    return perkeep.uploadBlob(file)
      .then((parts) => {
        let schema = {
          "camliVersion": 1,
          "camliType": "file",
          "unixMTime": new Date(Date.now()).toISOString(),
          "fileName": "Demo.txt",
          "parts": parts
        };
        return perkeep.signObject(schema);
      })
      .then((signature) => {
        return perkeep.uploadString(signature);
      })
      .then((fileref) => {
        return perkeep.createPermanode({
          title: 'Node JS Test',
          url: 'https://webpage.com',
          camliContent: fileref.blobRef
        });
      });
  })
  .then(function (permanode) {
    return permanode.permanodeRef;
  });
