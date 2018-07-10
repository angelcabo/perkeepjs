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

function uploadWithSigning() {
  let perkeep = Perkeep({
    host: 'http://perkeep.test',
    user: 'angel',
    password: 'pass'
  });

  submitMHTML().then(function (data) {
    perkeep.discover()
      .then(function (discoveryConfig) {
        perkeep.discoveryConfig = discoveryConfig;
        return perkeep.upload(data);
      })
      .then(function (parts) {
        let fileSchema = {
          "camliVersion": 1,
          "camliType": "file",
          "unixMTime": new Date(Date.now()).toISOString(),
          "fileName": "Webpage.mht",
          parts
        };
        return perkeep.sign(fileSchema).then(signature => perkeep.upload(signature));
      })
      .then(function (received) {
        return perkeep.createPermanode({
          title: "NodeJS Title",
          camliContent: received[0].blobRef
        });
      })
      .then(function ({permanodeRef}) {
        console.log(`Created ${permanodeRef}`);
      });
  });
}

function uploadWithVivify() {
  let perkeep = Perkeep({
    host: 'http://perkeep.test',
    user: 'angel',
    vivify: 'rainbows'
  });

  submitMHTML().then(function (data) {
    return perkeep.discover()
      .then(function (discoveryConfig) {
        perkeep.discoveryConfig = discoveryConfig;
        return perkeep.upload(data);
      })
      .then(function (parts) {
        let fileSchema = {
          "camliVersion": 1,
          "camliType": "file",
          "unixMTime": new Date(Date.now()).toISOString(),
          "fileName": "webpage.mht",
          parts
        };
        return perkeep.upload(fileSchema);
      });
  });
}

uploadWithSigning();
// uploadWithVivify();
