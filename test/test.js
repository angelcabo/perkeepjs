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
