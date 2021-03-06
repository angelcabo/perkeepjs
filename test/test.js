const assert = require('assert');
const pk = require('..');

// import PerkeepClient from 'perkeep';
//
//   const config = {
//     host: 'http://perkeep.test',
//     user: 'user',
//     pass: 'pass'
//   }
// const client = new PerkeepClient(config);

// function test() {
//   const config = {
//     host: 'http://perkeep.test',
//     user: 'user',
//     pass: 'pass',
//   };
//   const client = new pk.Client(config);
//
//   try {
//     const attrs = {
//       title: 'Title',
//       url: 'https://title.com',
//       visited: '2017-11-24T00:38:41.595Z',
//       tags: 'my,tags',
//     };
//
//     // const { permanodeId } = await client.createPermanode(attrs)
//     client.createPermanode(attrs).then((ref) => {
//       assert.strictEqual('foo', ref);
//
//       // eslint-disable-next-line no-console
//       console.log(`\u001B[32m✓\u001B[39m ${ref}`);
//     });
//   } catch (e) {
//     // eslint-disable-next-line no-console
//     console.log(e);
//   }
// }
//
// test();

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
      .then((parts) => {
        let schema = {
          "camliVersion": 1,
          "camliType": "file",
          "unixMTime": new Date(Date.now()).toISOString(),
          "fileName": "Test",
          "parts": parts
        };
        // return schema; // if we can't sign
        return perkeep.signObject(schema);
      })
      .then((signature) => {
        return perkeep.uploadString(signature); // if we can sign
      })
      // .then((schema) => {
      //   return perkeep.uploadBatched(schema, true); // if we can't sign but want the blob to be vivified (attached to a permanode)
      // })
      .then(({ blobRef }) => {
        return perkeep.createPermanode({
          title: 'Title',
          url: 'https://title.com',
          visited: '2017-11-24T00:38:41.595Z',
          tags: 'my,tags',
          camliContent: blobRef
        });
      })
      .then(({ permanodeRef }) => {
        console.log(permanodeRef);
      })
      .catch(console.log);

    // Upload all "parts" of a blob in one request. The following works best if our server or client doesn't support SPDY or HTTP/2.
    // perkeep.uploadBatched(x)
    //   .then((parts) => {
    //     return {
    //       "camliVersion": 1,
    //       "camliType": "file",
    //       "unixMTime": new Date(Date.now()).toISOString(),
    //       "fileName": "Uploaded through batch",
    //       "parts": parts
    //     };
    //   })
    //   .then((schema) => {
    //     return perkeep.uploadBatched(schema, true);
    //   }).then(console.log).catch(console.log);
  } catch (e) {
    console.log(e);
  }
});

