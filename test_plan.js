const { DocumentServiceClient } = require('@google-cloud/discoveryengine');
async function test() {
  const client = new DocumentServiceClient();
  console.log('Client ready');
}
test();
