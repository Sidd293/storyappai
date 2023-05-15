// const express = require('express');
// const path = require('path');
// const compilepy = require('./utils/pythonC');

var express = require('express')
var exec = require('child_process').exec;
var fs = require('fs')
var app = express();
const path = require('path');

// const path = require('path');
const WebSocket = require('ws');
const mysql = require('mysql');
const url = require('url')

// Create a WebSocket server
const clients = new Map();
const querystring = require('querystring');
const wss = new WebSocket.Server({ port: 8080 });




const bodyParser = require("body-parser");
var cors = require('cors')
app.use(bodyParser.urlencoded({extended:true}))

app.use(bodyParser.json())




// const app = express();

// Serve the static files from the React app
app.use(express.static(path.join(__dirname, 'client/build')));





const connection = mysql.createConnection({
    host: 'sql12.freesqldatabase.com',
    user: 'sql12618349',
    password: 'iQ9lydgIEY',
    database: 'sql12618349',
    port: 3306 
  });

  const pool = mysql.createPool({
    host: 'sql12.freesqldatabase.com',
    user: 'sql12618349',
    password: 'iQ9lydgIEY',
    database: 'sql12618349',
    port: 3306 
  });




// Connect to MySQL
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
  } else {
    console.log('Connected to MySQL.');
  }
});

  //   connection.query(`DROP TABLE messages;`)
  //   connection.query(`DROP TABLE users;`)
  //   connection.query(`
  //     CREATE TABLE messages (
  //       id INT AUTO_INCREMENT PRIMARY KEY,
  //       senderId VARCHAR(255) NOT NULL,
  //       recipientId VARCHAR(255) NOT NULL,
  //       recipientName VARCHAR(255) NOT NULL,
  //       recipientImgUrl VARCHAR(255) NOT NULL,
  //       senderName VARCHAR(255) NOT NULL,
  //       senderImgUrl VARCHAR(255) NOT NULL,
  //       content TEXT NOT NULL,
  //       status ENUM('sent', 'delivered', 'read') NOT NULL DEFAULT 'sent',
  //       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  //     )
  //   `, (error, results, fields) => {
  //     if (error) {
  //       console.error('Error creating table:', error);
  //     } else {
  //       console.log('Table created:', results);
  //     }
  //   });
  //   connection.query(`
  //   CREATE TABLE users (
  //       id INT AUTO_INCREMENT PRIMARY KEY,
  //       uid VARCHAR(255) NOT NULL,
  //       name VARCHAR(255) NOT NULL,
  //       pic VARCHAR(255) NOT NULL,
  //       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  //     );
  // `, (error, results, fields) => {
  //   if (error) {
  //     console.error('Error creating table:', error);
  //   } else {
  //     console.log('Table created:', results);
  //   }
  // });



  
    app.post('/users', (req, res) => {
        const uid = req.body.uid;
        const name = req.body.name;
        const pic = req.body.pic;
      
        const query1 = `SELECT * FROM users WHERE uid = ?`;
        pool.query(query1, [uid], (error, results) => {
          if (error) {
            console.error(error);
            res.status(500).send('Error checking for existing user');
          } else if (results.length > 0) {
            const query2 = `SELECT uid, name, pic FROM users`;
            pool.query(query2, (error, results) => {
              if (error) {
                console.error(error);
                res.status(500).send('Error retrieving user list');
              } else {
                res.send(results);
              }
            });
          } else {
            const query3 = `INSERT INTO users (uid, name, pic) VALUES (?, ?, ?)`;
            pool.query(query3, [uid, name, pic], (error, results) => {
              if (error) {
                console.error(error);
                res.status(500).send('Error adding new user');
              } else {
                const query4 = `SELECT uid, name, pic FROM users`;
                pool.query(query4, (error, results) => {
                  if (error) {
                    console.error(error);
                    res.status(500).send('Error retrieving user list');
                  } else {
                    res.send(results);
                  }
                });
              }
            });
          }
        });
      });

wss.on('connection', (ws,req) => {
  console.log('Client connected.');
  const unique = req.url.split('/')[1];

  console.log("unique",unique)
  const query = url.parse(req.url).query;
  
  const userId = querystring.parse(query).userId;
  ws.userId = userId;
  console.log("userId",userId)
  connection.query('SELECT * FROM messages WHERE recipientId = ? OR senderId = ?', [userId,userId], (error, results, fields) => {
    if (error) {
      console.error('Error retrieving messages:', error);
    } else {
        // console.log();
      ws.send(JSON.stringify(results));
    }
  });

  ws.on('message', (message) => {

    const newMessage = JSON.parse(message);
console.log(newMessage)
    connection.query('INSERT INTO messages SET ?', newMessage, (error, results, fields) => {
      if (error) {
        console.error('Error inserting message:', error);
      } else {
        console.log('Inserted new message with ID', results);

        newMessage.id = results.insertId;

        connection.query('SELECT * FROM messages WHERE recipientId = ? OR senderId = ?', [userId,userId], (error, results, fields) => {
          if (error) {
            console.error('Error retrieving messages:', error);
          } else {
              // console.log();
            ws.send(JSON.stringify(results));
          }
        });
      }
    });
console.log(Array.from(wss.clients).length,"number of clients")
    wss.clients.forEach((client) => {
        const query = url.parse(client._socket.remoteAddress).query;
        const recipientId = querystring.parse(query).userId;
    console.log("recipientId",client.userId);
        if (client.userId == newMessage.recipientId) {
          client.send(JSON.stringify(newMessage));
        }
      });


  });

  ws.on('close', () => {
    console.log('Client disconnected.');
  });
});

// Handle MySQL errors
connection.on('error', (err) => {
  console.error('MySQL error:', err);
});




// Handles any requests that don't match the ones above
app.get('*', (req,res) =>{
	res.sendFile(path.join(__dirname+'/client/build/index.html'));
});

const port = 5000;
app.listen(port);

console.log('App is listening on port ' + port);
