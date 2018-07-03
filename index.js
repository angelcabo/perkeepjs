const Perkeep = require('./dist/perkeep.cjs');

const config = {
  host: 'http://perkeep.test',
  user: 'angel',
  pass: 'pass',
};

const perkeep = new Perkeep(config);

perkeep.discover().then(() => {
  try {
    const attrs = {
      title: 'Title',
      url: 'https://title.com',
      visited: '2017-11-24T00:38:41.595Z',
      tags: 'my,tags',
    };

    // perkeep.createPermanode(attrs).then((permanodeId) => {
    //   console.log(permanodeId);
    // });

    // A large blob will fail unless chunked because the server won't accept more than a 16 MB blob
    // i.e. less than 16,000,000 bytes
    // We should split the buffer into 64kb (64,000 bytes) chunks and upload separately
    let x = "1234567890";
    let iterations = 14;
    for (let i = 0; i < iterations; i++) {
      x += x+x;
    }
    perkeep.uploadBlob(x)
      .then((response) => {
        console.log(response);
      }).then(console.log).catch(console.log);
  } catch (e) {
    console.log(e);
  }
});
