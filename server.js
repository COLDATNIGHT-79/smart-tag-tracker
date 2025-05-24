const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static('public'));
app.use(express.json());

// Store smart tags in memory (use database in production)
let smartTags = [
    {
        id: '1',
        name: 'Keys',
        lat: 28.6139, // New Delhi
        lng: 77.2090,
        battery: 85,
        lastSeen: new Date()
    },
    {
        id: '2',
        name: 'Wallet',
        lat: 19.0760, // Mumbai
        lng: 72.8777,
        battery: 62,
        lastSeen: new Date()
    }
];

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Client connected');
    
    // Send current tags to new client
    socket.emit('tags-update', smartTags);
    
    // Handle tag actions
    socket.on('buzz-tag', (tagId) => {
        console.log(`Buzzing tag ${tagId}`);
        // Simulate tag buzzing
        io.emit('tag-action', { id: tagId, action: 'buzz' });
    });
    
    socket.on('light-tag', (tagId) => {
        console.log(`Lighting tag ${tagId}`);
        // Simulate tag lighting
        io.emit('tag-action', { id: tagId, action: 'light' });
    });
    
    socket.on('rename-tag', (data) => {
        const tag = smartTags.find(t => t.id === data.id);
        if (tag) {
            tag.name = data.name;
            io.emit('tags-update', smartTags);
        }
    });
    
    socket.on('add-tag', (tagData) => {
        const newTag = {
            id: Date.now().toString(),
            name: tagData.name || 'New Tag',
            lat: tagData.lat || (28.6139 + (Math.random() - 0.5) * 0.1), // Around Delhi
            lng: tagData.lng || (77.2090 + (Math.random() - 0.5) * 0.1),
            battery: Math.floor(Math.random() * 100),
            lastSeen: new Date()
        };
        smartTags.push(newTag);
        io.emit('tags-update', smartTags);
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// API endpoints
app.get('/api/tags', (req, res) => {
    res.json(smartTags);
});

app.post('/api/tags', (req, res) => {
    const newTag = {
        id: Date.now().toString(),
        name: req.body.name || 'New Tag',
        lat: req.body.lat || (28.6139 + (Math.random() - 0.5) * 0.1), // Around Delhi
        lng: req.body.lng || (77.2090 + (Math.random() - 0.5) * 0.1),
        battery: Math.floor(Math.random() * 100),
        lastSeen: new Date()
    };
    smartTags.push(newTag);
    io.emit('tags-update', smartTags);
    res.json(newTag);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});