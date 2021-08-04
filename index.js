const server = require('./lib/server');
const workers = require('./lib/workers');

// Declare the app container
let app = {};

// Init function
app.init = () => {
   
    // Start the server
    server.init();
    //  Start the workers
    workers.init();
}

app.init();

module.exports = app;