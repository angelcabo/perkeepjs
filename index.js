const Perkeep = require('./dist/perkeep.cjs');

const config = {
  host: 'http://perkeep.test',
  user: 'devcam',
  pass: 'pass3179',
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

    perkeep.createPermanode(attrs).then((permanodeId) => {
      console.log(permanodeId);
    });
  } catch (e) {
    console.log(e);
  }
});
