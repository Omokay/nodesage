const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('../config');
let _data = require('./data');
const handlers = require('./handlers');
const helpers = require('./helpers');
const path = require('path');



let server = {};

// Twilio Send Sms
// @TODO Remove this invocation
helpers.sendTwilioSms('4158375309', 'Help me check if eh dey work', (err) => {
    console.log('The error is (' + err + ')')
});

//  Instatiating HTTP server
server.httpServer = http.createServer((req, res) => {
    server.unifiedServer(req, res);
});

// Instatiating HTTPS server
server.httpsServerOptions = {
    'key': fs.readFileSync(path.join('__dirname' + '/../https/key.pem')),
    'cert': fs.readFileSync(path.join('__dirname' + '/../https/cert.pem')),
};

server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => {
    server.unifiedServer(req, res);
})

server.unifiedServer = (req, res) => {

    const parsedUrl = url.parse(req.url, true);

    // Get the url path with the slashes
    const path = parsedUrl.pathname;

    // Get the queries on the url
    const queryStringObject = parsedUrl.query;

    // Get the request method
    const method = req.method.toLowerCase();

    // Get the url path without the slash
    const trimmedUrl = path.replace(/^\/+|\/+$/g, '');

    //  Get the req headers
    const header = req.headers;

    // Get the req payload
    const decoder = new StringDecoder('utf-8');  // Initialise the string decoder
    let buffer = ''; // initialise variable to hold streams of data coming into the server

    // If req emits an event 'data',  a callback is called with data passed as argument
    // Append data to buffer.
    req.on('data', (data) => {
        buffer += decoder.write(data);
    });


    // if req emits the event 'end' streams of data are no longer coming  in
    // Return buffer  with last stream of data

    req.on('end', () => {
        buffer += decoder.end();


        // Use trimmed pathname to determine how route is handled.
        const chosenHandler = typeof server.router[trimmedUrl] !== 'undefined' ?
            server.router[trimmedUrl] :
            handler.notFound;


        // Construct data object to pass to the chosen handler.
        let data = {
            'trimmedUrl': trimmedUrl,
            'queryString': queryStringObject,
            'method': method,
            'headers': header,
            'payload': helpers.parseJsonToObject(buffer),
        }


        // invoke the handler function
        chosenHandler(data, (statusCode, payload) => {
            statusCode = typeof statusCode === 'number' ? statusCode : 200;
            payload = typeof payload === 'object' ? payload : {};

            const payloadString = JSON.stringify(payload);

            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);

            console.log(statusCode, payloadString);

        });

        console.log('Request was made to this URL: '
            + trimmedUrl + ' with method: '
            + method + ' with query string: '
            + JSON.stringify(queryStringObject) + ' and headers: '
            + JSON.stringify(header));
    });
}

// Setup routers
server.router = {
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens, 
    'checks': handlers.checks,
}

// Init Script

server.init = () => {
    //  Listening on HTTP server
    server.httpServer.listen(config.httpPort, () => {
        console.log('Server is listening on port ' + config.httpPort);
    });


    //  Listening on the HTTPS server
    server.httpsServer.listen(config.httpsPort, () => {
        console.log('Server is listening on port ' + config.httpsPort);
    });

}

module.exports = server;