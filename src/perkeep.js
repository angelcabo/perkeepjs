import base64 from 'base-64';
import FormData from "form-data";
import SHA224 from "crypto-js/sha224";
import fetchPonyfill from 'fetch-ponyfill';
const { fetch } = fetchPonyfill();

import { chunkData, dateToRfc3339String } from './utils'

class Perkeep {
  constructor(config, discoveryConfig) {
    this.host = config.host;
    this.user = config.user;
    this.password = config.password;

    if (!this.password) {
      this.password = config.vivify;
      this.vivifyMode = !!config.vivify;
    }

    this._discoveryConfig = discoveryConfig;
  }

  async discover() {
    let response = await fetch(this.host, {
      headers: {
        'Authorization': `Basic ${base64.encode(`${this.user}:${this.password}`)}`,
        'Accept': 'text/x-camli-configuration'
      }
    });
    if (response.ok) return response.json();
    throw await response.text();
  }

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

  async createPermanode(attributes={}) {
    if (this.vivifyMode) return new Error('Cannot create permanodes with vivify');

    let permanodeSchema = {
      "camliVersion": 1,
      "camliType": "permanode",
      "random": "" + Math.random()
    };
    let signature = await this.sign(permanodeSchema);
    let { blobRef } = await this.upload(signature).then(received => received[0]);

    let setAttributes = [];
    for(let key in attributes){
      if (attributes.hasOwnProperty(key)) {
        setAttributes.push(this.updatePermanode(blobRef, "set-attribute", key, attributes[key]))
      }
    }
    await Promise.all(setAttributes);
    return Object.assign(attributes, { permanodeRef: blobRef });
  }

  async updatePermanode(blobRef, claimType, attribute, value) {
    if (this.vivifyMode) return new Error('Cannot sign and upload permanode claims with vivify');

    let claimSchema = {
      "camliVersion": 1,
      "camliType": "claim",
      "permaNode": blobRef,
      "claimType": claimType,
      "claimDate": dateToRfc3339String(new Date()),
      "attribute": attribute,
      "value": value
    };

    return this.sign(claimSchema)
      .then(s => this.upload(s))
      .then(received => received[0]['blobRef']);
  }

  async sign(schema) {
    if (this.vivifyMode) return new Error('Cannot sign objects with vivify');

    schema.camliSigner = this.PUBLIC_KEY_BLOB_REF;
    let camVersion = schema.camliVersion;
    if (camVersion) {
      delete schema.camliVersion;
    }

    let clearText = JSON.stringify(schema, null, "    ");
    if (camVersion) {
      clearText = "{\"camliVersion\":" + camVersion + ",\n" + clearText.substr("{\n".length);
    }

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${base64.encode(`${this.user}:${this.password}`)}`
      },
      body: "json=" + encodeURIComponent(clearText)
    };
    let response = await fetch(this.SIGN_HANDLER, options);
    if (response.ok) return response.text();
    throw await response.text();
  }

  async upload(data) {
    let chunks, isSchema = this.isSchema(data);
    if (isSchema) {
      chunks = typeof data !== "string" ? [JSON.stringify(data)] : [data];
    } else {
      chunks = await chunkData(data);
    }

    if (this.vivifyMode && isSchema)
      return this.doUploadBatch(chunks, true);

    // if (chunks.length > 16) return this.doUploadBatch(chunks)

    // if (SPDY or HTTP/2 not available) {
    //   return this.doUploadBatch(chunks);
    // } else {
    //   return Promise.all(chunks.map(chunk => this.doUpload(chunk)));
    // }

    let uploadRequests = chunks.map(chunk => this.doUpload(chunk));
    return Promise.all(uploadRequests);
  }

  async searchFile(blobRef) {
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${base64.encode(`${this.user}:${this.password}`)}`
      }
    };

    let response = await fetch(this.SEARCH_ROOT + 'camli/search/files' + '?wholedigest=' + blobRef, options);
    if (response.ok) return response.json();
    throw await response.text();
  }

  async get(blobRef) {
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${base64.encode(`${this.user}:${this.password}`)}`
      }
    };

    let response = await fetch(this.host + this._discoveryConfig.blobRoot + 'camli/' + blobRef, options);
    if (response.ok) return response.text();
    throw await response.text();
  }

  async stat(blobRef) {
    const options = {
      method: 'HEAD',
      headers: {
        'Authorization': `Basic ${base64.encode(`${this.user}:${this.password}`)}`
      }
    };

    let response = await fetch(this.UPLOAD_HANDLER + '/' + blobRef, options);
    return response.ok;
  }

  isSchema (object) {
    return typeof object !== "string" ? object.hasOwnProperty('camliVersion') : object.match('camliVersion');
  }

  async doUpload(buffer) {
    let blobRef = `sha224-${SHA224(buffer.toString())}`;

    const options = {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${base64.encode(`${this.user}:${this.password}`)}`
      },
      body: buffer
    };

    let response = await fetch(this.UPLOAD_HANDLER + '/' + blobRef, options);
    if (response.ok) return {"blobRef": blobRef, "size": buffer.byteLength};
    throw await response.text();
  }

  async doUploadBatch(buffers, doVivify=false) {
    //todo: should we split buffers into groups of 16 to keep batch requests less than 1MB? (each buffer will be up to 1000000 bytes)
    let formData = new FormData();
    buffers.forEach((buffer) => {
      let ref = `sha224-${SHA224(buffer.toString())}`;
      formData.append(ref, buffer);
    });

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${base64.encode(`${this.user}:${this.password}`)}`,
        'X-Camlistore-Vivify': doVivify ? '1' : null
      },
      body: formData
    };

    let response = await fetch(this.UPLOAD_HANDLER, options);
    if (response.ok) return response.json().then(r => r.received);
    throw await response.text();
  }
}

export default Perkeep;