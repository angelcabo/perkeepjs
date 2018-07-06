import fetchPonyfill from 'fetch-ponyfill';
import base64 from 'base-64';
import FormData from 'form-data';
import SHA224 from 'crypto-js/sha224';
import stream from 'stream';

const {
  fetch, Request, Response, Headers,
} = fetchPonyfill();

export default class Perkeep {
  constructor(config, discoveryConfig) {
    this.host = config.host;
    this.user = config.user;
    this.pass = config.pass;

    this._discoveryConfig = discoveryConfig;
  }

  async discover() {
    try {
      const headers = new Headers();
      headers.append('Authorization', `Basic ${base64.encode(`${this.user}:${this.pass}`)}`);
      headers.append('Accept', 'text/x-camli-configuration');
      let response = await fetch(this.host, { headers });
      console.log(`retrieved camlistore server discovery data from ${this.host}: ${response.status}`);
      this.discoveryConfig = await response.json();
      return this.discoveryConfig;
    } catch (e) {
      console.log(e);
    }
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
    if (!response.ok) {
      throw Error(`${response.statusText} - ${response.text()}`);
    }
    return response.text();
  }

  async uploadBlob(s) {
    let buffer = Buffer.from(s);
    let chunks = Perkeep.chunks(buffer, 1000000);

    let uploadChunks = chunks.map((chunk) => this.uploadString(chunk));
    return Promise.all(uploadChunks);
  }

  async uploadString(s) {
    let blobref = Buffer.isBuffer(s) ? 'sha224-' + SHA224(s.toString('utf8')).toString() : 'sha224-' + SHA224(s).toString();

    let buffer = Buffer.from(s);
    let bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);

    const options = {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${base64.encode(`${this.user}:${this.pass}`)}`
      },
      body: bufferStream
    };

    let response = await fetch(this.UPLOAD_HANDLER + '/' + blobref, options);
    if (!response.ok) {
      throw Error(`${response.statusText} - ${response.text()}`);
    } else {
      return {
        "blobRef": blobref,
        "size": buffer.byteLength
      };
    }
  }

  // s should be what? either a binary object (ArrayBuffer?) or a JSON object
  async uploadBatched(s, vivify=false) {
    let buffer;
    let chunks;
    let form = new FormData();

    if (s !== null && (Buffer.isBuffer(s) || typeof s === 'string')) {
      buffer = Buffer.from(s);
      chunks = Perkeep.chunks(buffer, 1000000);
    } else if (s !== null && typeof s === 'object') {
      buffer = Buffer.from(JSON.stringify(s));
      chunks = [buffer];
    } else {
      throw Error('Need a Buffer, object, or string');
    }

    chunks.forEach((chunk) => {
      let chunkref = 'sha224-' + SHA224(chunk.toString('utf8')).toString();
      form.append(chunkref, chunk);
    });

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${base64.encode(`${this.user}:${this.pass}`)}`,
        'X-Camlistore-Vivify': vivify === true ? '1' : null
      },
      body: form
    };

    let response = await fetch(this.UPLOAD_HANDLER, options);
    if (!response.ok) {
      throw Error(`${response.statusText} - ${response.text()}`);
    } else {
      return response.json().then(r => r.received);
    }
  }

  async searchFile(blobref) {
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${base64.encode(`${this.user}:${this.pass}`)}`
      }
    };

    let response = await fetch(this.SEARCH_ROOT + 'camli/search/files' + '?wholedigest=' + blobref, options);
    return response.text();
  }

  async get(blobref) {
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${base64.encode(`${this.user}:${this.pass}`)}`
      }
    };

    let response = await fetch(this.host + this._discoveryConfig.blobRoot + 'camli/' + blobref, options);
    return response.text();
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

  static chunks(buffer, chunkSize) {
    let bufferSize = buffer.byteLength;
    let chunkCount = Math.ceil(bufferSize / chunkSize, chunkSize);
    let chunks = [];

    for (let i = 0; i < chunkCount; i++) {
      if (chunkSize * (i + 1) <= bufferSize) {
        chunks = chunks.concat(buffer.slice(chunkSize * i, chunkSize * (i + 1)));
      } else {
        chunks = chunks.concat(buffer.slice(chunkSize * i, bufferSize));
      }
    }

    return chunks;
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

  async createPermanode(attrs) {
    let json = {
      "camliVersion": 1,
      "camliType": "permanode",
      "random": "" + Math.random()
    };
    let signature = await this.signObject(json);
    let { blobRef } = await this.uploadString(signature);
    let updateAttrRequests = [];
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