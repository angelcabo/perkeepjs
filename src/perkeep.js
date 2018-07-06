import base64 from 'base-64';
import CryptoJS from "crypto-js";
import fetchPonyfill from 'fetch-ponyfill';
const { fetch } = fetchPonyfill();

class Perkeep {
  constructor(config, discoveryConfig) {
    this.host = config.host;
    this.user = config.user;
    this.pass = config.pass;

    this._discoveryConfig = discoveryConfig;
  }

  async discover() {
    let response = await fetch(this.host, {
      headers: {
        'Authorization': `Basic ${base64.encode(`${this.user}:${this.pass}`)}`,
        'Accept': 'text/x-camli-configuration'
      }
    });
    if (response.ok) return response.json();
    throw await response.text();
  }

  async signObject(clearObj) {
    clearObj.camliSigner = this.PUBLIC_KEY_BLOB_REF;

    let camVersion = clearObj.camliVersion;
    if (camVersion) {
      delete clearObj.camliVersion;
    }

    let clearText = JSON.stringify(clearObj, null, "    ");
    if (camVersion) {
      clearText = "{\"camliVersion\":" + camVersion + ",\n" + clearText.substr("{\n".length);
    }

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${base64.encode(`${this.user}:${this.pass}`)}`
      },
      body: "json=" + encodeURIComponent(clearText)
    };
    let response = await fetch(this.SIGN_HANDLER, options);
    if (response.ok) return response.text();
    throw await response.text();
  }

  async upload(ref, b, bytesize) {
    const options = {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${base64.encode(`${this.user}:${this.pass}`)}`
      },
      body: b
    };

    let response = await fetch(this.UPLOAD_HANDLER + '/' + ref, options);
    if (response.ok) return {"blobRef": ref, "size": bytesize};
    throw await response.text();
  }

  async uploadBlob(b) {
    let chunks = Perkeep.chunks(b, 1000000);

    let uploadChunks = chunks.map((chunk) => {
      return Perkeep.toWordArray(chunk).then((wordArray) => {
        let blobref = 'sha224-' + CryptoJS.SHA224(wordArray).toString();
        return this.upload(blobref, chunk, chunk.byteLength || chunk.size);
      });
    });
    return Promise.all(uploadChunks);
  }

  async uploadString(s) {
    let wordArray = CryptoJS.enc.Utf8.parse(s);
    let blobref = 'sha224-' + CryptoJS.SHA224(wordArray).toString();

    return this.upload(blobref, s, wordArray.sigBytes);
  }

  static chunks(b, chunkSize) {
    let bufferSize = b.byteLength || b.size;
    console.log(bufferSize);
    let chunkCount = Math.ceil(bufferSize / chunkSize, chunkSize);
    let chunks = [];

    for (let i = 0; i < chunkCount; i++) {
      if (chunkSize * (i + 1) <= bufferSize) {
        chunks = chunks.concat(b.slice(chunkSize * i, chunkSize * (i + 1)));
      } else {
        chunks = chunks.concat(b.slice(chunkSize * i, bufferSize));
      }
    }

    return chunks;
  }

  encrypt(b) {
    Perkeep.chunks(b, 1000000).forEach((chunk, index) => {
      Perkeep.toWordArray(chunk, function (err, wordArray) {
        console.log(index, CryptoJS.SHA224(wordArray).toString());
      });
    });
  }

// convert blob to ArrayBuffer
// use Buffer.buffer to create WordArray
  static toWordArray(b) {
    return new Promise((resolve, reject) => {
      if (typeof Blob !== 'undefined' && b instanceof Blob) {
        const reader = new FileReader();

        function onLoadEnd (e) {
          reader.removeEventListener('loadend', onLoadEnd, false);
          if (e.error) reject(e.error);
          else resolve(CryptoJS.lib.WordArray.create(reader.result))
        }

        reader.addEventListener('loadend', onLoadEnd, false);
        reader.readAsArrayBuffer(b)
      } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(b)) {
        resolve(b.toString('utf8'));
      } else {
        reject(new Error('need a Blob or a Buffer'));
      }
    });
  }

  static dateToRfc3339String(dateVal) {
    // Return a string containing |num| zero-padded to |length| digits.
    let pad = function (num, length) {
      let numStr = "" + num;
      while (numStr.length < length) {
        numStr = "0" + numStr;
      }
      return numStr;
    };

    // thanks: http://stackoverflow.com/questions/7975005/format-a-string-using-placeholders-and-an-object-of-substitutions
    let subs = {
      "%UTC_YEAR%": dateVal.getUTCFullYear(),
      "%UTC_MONTH%": pad(dateVal.getUTCMonth() + 1, 2),
      "%UTC_DATE%": pad(dateVal.getUTCDate(), 2),
      "%UTC_HOURS%": pad(dateVal.getUTCHours(), 2),
      "%UTC_MINS%": pad(dateVal.getUTCMinutes(), 2),
      "%UTC_SECONDS%": pad(dateVal.getUTCSeconds(), 2),
    };

    let formatted = "%UTC_YEAR%-%UTC_MONTH%-%UTC_DATE%T%UTC_HOURS%:%UTC_MINS%:%UTC_SECONDS%Z";

    formatted = formatted.replace(/%\w+%/g, function (all) {
      return subs[all] || all;
    });

    return formatted;
  }

  async updatePermanodeAttr(blobref, claimType, attribute, value) {
    let json = {
      "camliVersion": 1,
      "camliType": "claim",
      "permaNode": blobref,
      "claimType": claimType,
      "claimDate": Perkeep.dateToRfc3339String(new Date()), // this could be a util module
      "attribute": attribute,
      "value": value
    };

    let signature = await this.signObject(json);
    return this.uploadString(signature)
      .then(response => response['blobRef']);
  }

  async createPermanode(attrs={}) {
    let json = {
      "camliVersion": 1,
      "camliType": "permanode",
      "random": "" + Math.random()
    };
    let signature = await this.signObject(json);
    let { blobRef } = await this.uploadString(signature);
    let updateAttrRequests = [];
    // todo: handle tags
    for(let key in attrs){
      if (attrs.hasOwnProperty(key)) {
        updateAttrRequests.push(this.updatePermanodeAttr(blobRef, "set-attribute", key, attrs[key]))
      }
    }
    await Promise.all(updateAttrRequests);
    return Object.assign(attrs, { permanodeRef: blobRef });
  };

  get discoveryConfig() {
    return this._discoveryConfig;
  }

  set discoveryConfig(discoveryConfig) {
    this._discoveryConfig = discoveryConfig;
    this.signHandler_ = this._discoveryConfig.signing.signHandler;
    this.uploadHandler_ = this._discoveryConfig.blobRoot + 'camli/upload';
    this.statHandler_ = this._discoveryConfig.blobRoot + 'camli/stat';
    this.uploadHelper_ = this._discoveryConfig.uploadHelper;
    this.searchRoot_ = this._discoveryConfig.searchRoot;
    // this.searchRoot_ = this._discoveryConfig.searchRoot + 'camli/search/files';
    // this.queryRoot = this._discoveryConfig.searchRoot + 'camli/search/query';

    this.PUBLIC_KEY_BLOB_REF = this._discoveryConfig.signing.publicKeyBlobRef;
    this.UPLOAD_HANDLER = this.host + this.uploadHandler_;
    this.STAT_HANDLER = this.host + this.statHandler_;
    this.UPLOAD_HELPER = this.host + this.uploadHelper_;
    this.SIGN_HANDLER = this.host + this.signHandler_;
    this.SEARCH_ROOT = this.host + this.searchRoot_;
  }
}

export default Perkeep;