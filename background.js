var config = {
  host: 'http://perkeep.test',
  user: 'angel',
  pass: 'pass',
  vivify: 'rainbows'
};

function submitMHTML() {
  console.log("entered submitMHTML()");
  return new Promise((resolve, reject) => {
    chrome.tabs.query({}, function (array_of_Tabs) {
        if (array_of_Tabs.length > 0) {
          var tab = array_of_Tabs[1];
          console.log("submitMHTML() found the active tab has an ID of " + tab.id);
          chrome.pageCapture.saveAsMHTML({tabId: tab.id},
            function (mhtml) {
              resolve(mhtml);
              // var xhr = new XMLHttpRequest(), formData = new FormData();
              // formData.append("mhtml", mhtml);
              // formData.append("surveyID", localStorage["ID"]);
              // xhr.open("POST", "http://localhost:3000/task/mhtml", true);
              // xhr.setRequestHeader('Authorization', 'Token token=<redacted>');
              // xhr.send(formData);
              // console.log("submitMHTML() sent mhtml to server");
            }
          )
        }
      }
    );
  });
}

var perkeep = Perkeep(config);

perkeep.discover()
  .then(function (response) {
    perkeep.discoveryConfig = response;
    return response;
  })
  .then(function () {
    return submitMHTML()
      .then((blob) => {
        return perkeep.uploadBlob(blob);
      })
      .then((parts) => {
        let schema = {
          "camliVersion": 1,
          "camliType": "file",
          "unixMTime": new Date(Date.now()).toISOString(),
          "fileName": "Webpage.mht",
          "parts": parts
        };
        return perkeep.signObject(schema);
      })
      .then((signature) => {
        return perkeep.uploadString(signature);
      })
      .then((fileref) => {
        return perkeep.createPermanode({
          title: 'Chrome Extension Test Page',
          url: 'https://webpage.com',
          camliContent: fileref.blobRef
        });
      });
  })
  .then(function (permanode) {
    return permanode.permanodeRef;
  });
// .then(console.log);
