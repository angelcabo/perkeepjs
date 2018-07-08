const fs = require('fs');
const Perkeep = require('./dist/perkeep.cjs.js');

function uploadWithSigning() {
  let perkeep = Perkeep({
    host: 'http://perkeep.test',
    user: 'angel',
    password: 'pass'
  });

  let data = fs.readFileSync('demo.txt');

  perkeep.discover()
    .then(function (discoveryConfig) {
      perkeep.discoveryConfig = discoveryConfig;
      return perkeep.upload(data);
    })
    .then(function(parts) {
      let fileSchema = {
        "camliVersion": 1,
        "camliType": "file",
        "unixMTime": new Date(Date.now()).toISOString(),
        "fileName": "demo.txt",
        parts
      };
      return perkeep.sign(fileSchema).then(signature => perkeep.upload(signature));
    })
    .then(function(received) {
      return perkeep.createPermanode({
        title: "NodeJS Title",
        camliContent: received[0].blobRef
      });
    })
    .then(function({ permanodeRef }) {
      console.log(`Created ${permanodeRef}`);
    });
}

function uploadWithVivify() {
  let perkeep = Perkeep({
    host: 'http://perkeep.test',
    user: 'angel',
    vivify: 'rainbows'
  });

  let data = fs.readFileSync('demo.txt');

  perkeep.discover()
    .then(function(discoveryConfig) {
      perkeep.discoveryConfig = discoveryConfig;
      return perkeep.upload(data);
    })
    .then(function (parts) {
      let fileSchema = {
        "camliVersion": 1,
        "camliType": "file",
        "unixMTime": new Date(Date.now()).toISOString(),
        "fileName": "demo.txt",
        parts
      };
      return perkeep.upload(fileSchema);
    });
}

// uploadWithSigning();
uploadWithVivify();