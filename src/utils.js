import { Buffer } from 'buffer/'
import isTypedArray from 'is-typedarray'
import arrayToBuffer from 'typedarray-to-buffer'
import blobToBuffer from 'blob-to-buffer'

const CHUNK_SIZE = 1000000;

const resolveBlobToBuffer = async (data) => {
  return new Promise((resolve, reject) => {
    blobToBuffer(data, (err, buffer) => {
      if (err) reject(err);
      resolve(buffer)
    });
  })
};

const parseBuffer = async (data) => {
  let buffer;

  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    buffer = await resolveBlobToBuffer(data);

  } else if (Buffer.isBuffer(data)) {
    buffer = Buffer.from(data);

  } else if (isTypedArray.strict(data)) {
    buffer = arrayToBuffer(data);

  } else {
    let s = typeof data !== "string" ? JSON.stringify(data) : data;
    buffer = Buffer.from(s);
  }

  return buffer;
};

export const chunkData = async (data) => {
  let buffer = await parseBuffer(data);
  let bufferSize = buffer.byteLength;
  let chunkCount = Math.ceil(bufferSize / CHUNK_SIZE, CHUNK_SIZE);
  let chunks = [];

  for (let i = 0; i < chunkCount; i++) {
    if (CHUNK_SIZE * (i + 1) <= bufferSize) {
      chunks = chunks.concat(buffer.slice(CHUNK_SIZE * i, CHUNK_SIZE * (i + 1)));
    } else {
      chunks = chunks.concat(buffer.slice(CHUNK_SIZE * i, bufferSize));
    }
  }

  return chunks;
};

export const dateToRfc3339String = (dateVal) => {
  // Return a string containing |num| zero-padded to |length| digits.
  let pad = function (num, length) {
    let numStr = "" + num;
    while (numStr.length < length) {
      numStr = "0" + numStr;
    }
    return numStr;
  };

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
};