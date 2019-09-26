const WebSocket = require('ws')
var AssistantV1 = require('watson-developer-cloud/assistant/v1');
var cfenv = require ('cfenv');


var vcapLocal;
try {
  vcapLocal = require('./vcap-local.json');
  console.log("Loaded local VCAP", vcapLocal);
} catch (e) { }
const appEnvOpts = vcapLocal ? { vcap: vcapLocal} : {}
const appEnv = cfenv.getAppEnv(appEnvOpts);
console.log(appEnv.getServiceCreds("TieraAssistant"));
const tieraAssistant = appEnv.getServiceCreds("TieraAssistant");

// Set up Assistant service wrapper.
var workspace_id = '749c5849-9b95-4ad0-9e43-d1688d5ade20';
var service = new AssistantV1({
    iam_apikey: tieraAssistant.iam_apikey,
    url: tieraAssistant.url,
    version: tieraAssistant.version
});

const wss = new WebSocket.Server({ port: process.env.PORT || 4000 })

wss.on('connection', ws => {
    //send a message to watson and get the response and send the response to the client connected on this event.
    service.message({
        workspace_id: workspace_id
    }, function (err, response) {
        if (err) {
            console.error("ERROR OCCURED --- "+err); // something went wrong
            ws.send("Bot Not available");
        } else if (response.output.text.length != 0) {
            ws.contextId=response.context;
            console.log("Response is ********" + response.output.text);
            response.output.text.forEach(element => {
                ws.send(element);
            });
        }
    });

    ws.on('message', message => {
    console.log(`Received message => ${message}`)
    service.message({
        workspace_id: workspace_id,
        input: { text: message },
        context: sanitizedContext(ws.contextId)
    }, function (err, response) {
        console.log("watson response ", JSON.stringify(response))
        if (err) {
            console.error(err); // something went wrong
            return;
        }
        // Display the output from dialog, if any.
        if (response.output.text.length != 0) {
            ws.contextId=response.context;
            console.log(response.output.text);
            response.output.text.forEach(element => {
                ws.send(element);
            });
            
        }
    });
  })
});

function sanitizedContext(context) {
    // function to remove all context variables from context, there might not be a context object so we'll try it first!
    try {
      const newContext = context
      delete newContext.buttons
      delete newContext.link
      delete newContext.camera
      delete newContext.command
      return newContext
    }
    catch (e) {
      return {}
    }
  }