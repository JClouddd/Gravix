const { DocumentServiceClient } = require('@google-cloud/discoveryengine');
const client = new DocumentServiceClient();
console.log(Object.keys(client));
