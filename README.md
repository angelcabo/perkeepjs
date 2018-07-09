## Getting started

This is a universal javascript client for the [Perkeep storage system](http://perkeep.org/) which is intended to run on the client and/or the server.

```bash
npm install perkeep
```

The library supports saving data using either a username/password or a username/vivify-password which does not allow signing schemas. An example of both use cases is shown below. The `upload` method should accept just about any type of data (in the browser or in Node). e.g. Blobs, Buffers, TypedArrays, JSON, or Strings.

### Upload with signing capabilities:

```javascript
const Perkeep = require('perkeep');

let perkeep = Perkeep({
  host: 'http://perkeep.test',
  user: 'user',
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
```

### Upload with a vivify password (no signing capabilities):

```javascript
let perkeep = Perkeep({
  host: 'http://perkeep.test',
  user: 'user',
  vivify: 'rainbows'
});

let data = new Blob(["This is my blob content"], {type : "text/plain"});

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
```

An instance of the `Perkeep` class has the following public interface:

```javascript
class Perkeep {
    async discover() {}
  
    get discoveryConfig() {}
  
    set discoveryConfig(discoveryConfig) {}
  
    async createPermanode(attributes={}) {}
  
    async updatePermanode(blobRef, claimType, attribute, value) {}
  
    async sign(schema) {}
  
    async upload(data) {}
}
``` 

## Building and Running Tests

`npm run build` builds the library to `dist`, generating three files:

* `dist/perkeep.cjs.js`
    A CommonJS bundle, suitable for use in Node.js, that `require`s the external dependency. This corresponds to the `"main"` field in package.json
* `dist/perkeep.esm.js`
    an ES module bundle, suitable for use in other people's libraries and applications, that `import`s the external dependency. This corresponds to the `"module"` field in package.json
* `dist/perkeep.iife.js`
    a UMD build, suitable for use in any environment (including the browser, as a `<script>` tag), that includes the external dependency. This corresponds to the `"browser"` field in package.json

`npm run dev` builds the library, then keeps rebuilding it whenever the source files change using [rollup-watch](https://github.com/rollup/rollup-watch).

`npm test` builds the library, then tests it.

## TODO

* Add data uri parsing to `upload` support: https://www.npmjs.com/package/data-uri-to-buffer

## License

[MIT](LICENSE).
