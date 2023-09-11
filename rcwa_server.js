// Import necessary modules
const express = require('express');
const app = express(); // Initialize an Express application
const http = require('http').createServer(app); // Create an HTTP server
const WebSocket = require('ws'); // WebSocket library
const path = require('path');

const wss = new WebSocket.Server({ server: http }); // Create a WebSocket server
const clients = new Map(); // Store connected clients

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Object to store various types of data for each URL
const updatedData = {};

// When a new client connects to the WebSocket server
wss.on('connection', (ws) => {
  console.log('New client connected');
  clients.set(ws, true); // Add the client to the Map
  ws.send(JSON.stringify({ ...updatedData, type: "htmlUpdate" }))

  // When the server receives a message from a client
  ws.on('message', (data) => {
    let formattedData = data.toString();
    try {
      formattedData = JSON.parse(formattedData); // Parse the JSON data

      // Get the URL from the message data
      const url = formattedData.url;

      // If there is no updatedData for this URL yet, create one
      if (!updatedData[url]) {
        updatedData[url] = {
          html: '',
          textareaValues: [''],
          selectValues: [''],
          radioValues: [''],
          checkboxValues: [''],
          inputTextValues: [''],
          pwTextValues: [''],
          canvasImgs: [],
          redirect: false,
          redirectUrl: "",
          redirectByUser: null
        };
      }

      // Now, always refer to the updatedData for this URL
      let urlData = updatedData[url];

      // Depending on the type of the message, perform different updates and broadcasts
      if(formattedData.type == "htmlUpdate") {
        urlData.html = formattedData.html; // Updating html in server
        urlData.textareaValues = formattedData.textareaValues; // Updating textarea values in server
        urlData.selectValues = formattedData.selectValues; // Updating select values in server
        urlData.radioValues = formattedData.radioValues; // Updating radio values in server
        urlData.checkboxValues = formattedData.checkboxValues; // updating checkbox values in server
        urlData.inputTextValues = formattedData.inputTextValues; // Updating input values in server
        urlData.pwTextValues = formattedData.pwTextValues; // Updating pw text values in server
        broadCast(ws, JSON.stringify(formattedData));
      } else if(formattedData.type == "clickUpdate") {
        broadCast(ws, JSON.stringify(formattedData));
      } else if(formattedData.type == "scrollUpdate") {
        urlData.scrollY = formattedData.updatedScrollY; // updating current scroll in server
        broadCast(ws, JSON.stringify(formattedData));
      } else if(formattedData.type == "navbarClick") {
        urlData.redirect = true
        urlData.redirectUrl = formattedData.redirectUrl
        broadCast(ws, JSON.stringify(formattedData))
      } else {
        broadCast(ws, JSON.stringify(formattedData), (message) => {
          if((formattedData.type == "mouseup" && !formattedData.drawing) || (formattedData.type == "mousedown" && formattedData.drawing) || (formattedData.type == "mousemove" && formattedData.drawing)) {
            let obj = {type: formattedData.type, x: formattedData.x, y: formattedData.y, name: "draw", erasing: formattedData.erasing }; // Storing user drawings
            urlData.canvasImgs.push(obj); // Adding user drawings
          }
        });
      }

      updatedData[url] = urlData

    } catch(e) {
      console.log(e);
    }
  });

  // When a client disconnects, remove them from the Map
  ws.on('close', () => {
    clients.delete(ws);

    // If there are no more clients connected
    if (clients.size === 0) {
      for (let url in updatedData) {
        let urlData = updatedData[url];
        if (urlData.redirect) {
          urlData.redirect = false;
        }

        updatedData[url] = urlData;
      }
    }
  });
});

// Broadcast a message to all connected clients, except the one who sent the message
function broadCast(ws, message, onEachCallback = null) {
  clients.forEach((connected, client) => {
    if (connected && client !== ws) {
      if(typeof onEachCallback == "function") {
        onEachCallback(message);
      }
      client.send(message);
    }
  });
}

// Start the HTTP server
const port = process.env.PORT || 3000;
http.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
