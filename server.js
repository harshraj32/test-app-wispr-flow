const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const app = express();
const port = 3000;

// Try to load robotjs for keyboard simulation
let robot = null;
try {
    robot = require('robotjs');
    console.log('RobotJS loaded successfully - keyboard simulation available');
} catch (error) {
    console.warn('RobotJS not available - keyboard simulation disabled');
    console.warn('To enable keyboard simulation, install robotjs: npm install robotjs');
}

// Serve static files
app.use(express.static(path.join(__dirname)));

// Store active audio process
let activeAudioProcess = null;
let fnKeyPressed = false;

// Endpoint to get list of audio files
app.get('/api/audio-files', (req, res) => {
    const audioDir = '/Users/harsh/test-app-wispr-flow/audio_data_long_context/audio/';
    
    // Check if directory exists
    if (!fs.existsSync(audioDir)) {
        console.warn(`Audio directory not found: ${audioDir}`);
        return res.json({ 
            files: [],
            message: "Audio directory not found. Please create the directory and add audio files."
        });
    }
    
    fs.readdir(audioDir, (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            return res.status(500).json({ error: 'Failed to read audio directory' });
        }
        
        // Filter only mp3 files
        const audioFiles = files.filter(file => file.endsWith('.mp3'));
        
        res.json({ files: audioFiles });
    });
});

// Function to press and hold the fn key
function pressFnKey() {
    if (!robot) {
        console.warn('Keyboard simulation not available - cannot press fn key');
        return false;
    }
    
    try {
        // Note: fn key is special and might not be directly accessible via robotjs
        // We'll try a few approaches
        
        // Approach 1: Try direct fn key (may not work on all systems)
        try {
            robot.keyToggle('fn', 'down');
            console.log('Pressed fn key (direct method)');
            return true;
        } catch (e) {
            console.warn('Direct fn key press failed, trying alternative method');
        }
        
        // Approach 2: For Mac, try function key combination
        if (process.platform === 'darwin') {
            robot.keyToggle('command', 'down');
            console.log('Pressed command as fn key alternative on Mac');
            return true;
        }
        
        // Approach 3: For Windows, try a different combination
        if (process.platform === 'win32') {
            robot.keyToggle('alt', 'down');
            console.log('Pressed alt as fn key alternative on Windows');
            return true;
        }
        
        console.warn('Could not simulate fn key for this platform');
        return false;
    } catch (error) {
        console.error('Error pressing fn key:', error);
        return false;
    }
}

// Function to release the fn key
function releaseFnKey() {
    if (!robot || !fnKeyPressed) return;
    
    try {
        // Release the key based on the approach used
        try {
            robot.keyToggle('fn', 'up');
        } catch (e) {
            // If direct method failed, release the alternatives
            if (process.platform === 'darwin') {
                robot.keyToggle('command', 'up');
            } else if (process.platform === 'win32') {
                robot.keyToggle('alt', 'up');
            }
        }
        
        console.log('Released fn key or alternative');
        fnKeyPressed = false;
    } catch (error) {
        console.error('Error releasing fn key:', error);
    }
}

// Endpoint to play audio directly to microphone
app.get('/play-to-mic/:filename', (req, res) => {
    const audioDir = '/Users/harsh/test-app-wispr-flow/audio_data_long_context/audio/';
    const filename = req.params.filename;
    const filePath = path.join(audioDir, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Audio file not found' });
    }
    
    // Stop any currently playing audio
    if (activeAudioProcess) {
        activeAudioProcess.kill();
        activeAudioProcess = null;
    }
    
    try {
        // Press and hold fn key before playing
        fnKeyPressed = pressFnKey();
        
        // Detect OS
        const platform = process.platform;
        
        if (platform === 'darwin') {
            // macOS - using afplay with BlackHole or Soundflower
            activeAudioProcess = spawn('afplay', [filePath]);
            
            // Note: You need to have BlackHole or Soundflower installed and configured
            // System audio output should be set to BlackHole/Soundflower
            // Applications should use BlackHole/Soundflower as input
            
        } else if (platform === 'win32') {
            // Windows - using PowerShell to play audio
            // Note: You need to have VB-Cable installed and configured
            activeAudioProcess = spawn('powershell', [
                '-c', 
                `(New-Object Media.SoundPlayer "${filePath}").PlaySync()`
            ]);
            
        } else if (platform === 'linux') {
            // Linux - using paplay with PulseAudio
            activeAudioProcess = spawn('paplay', [filePath]);
            
            // Note: You need to configure PulseAudio to route output to input
        }
        
        activeAudioProcess.on('close', (code) => {
            console.log(`Audio process exited with code ${code}`);
            
            // Release fn key when audio finishes
            releaseFnKey();
            
            activeAudioProcess = null;
            res.end();
        });
        
        activeAudioProcess.on('error', (err) => {
            console.error('Failed to start audio process:', err);
            
            // Release fn key if there's an error
            releaseFnKey();
            
            res.status(500).json({ error: 'Failed to play audio' });
        });
        
        // Send immediate response
        res.json({ 
            status: 'playing', 
            file: filename,
            fnKeyPressed: fnKeyPressed 
        });
        
    } catch (error) {
        console.error('Error playing audio:', error);
        
        // Release fn key if there's an error
        releaseFnKey();
        
        res.status(500).json({ error: 'Failed to play audio' });
    }
});

// Endpoint to stop audio playback
app.get('/stop-audio', (req, res) => {
    if (activeAudioProcess) {
        activeAudioProcess.kill();
        activeAudioProcess = null;
        
        // Release fn key when stopping audio
        releaseFnKey();
        
        res.json({ status: 'stopped' });
    } else {
        res.json({ status: 'no active playback' });
    }
});

// Serve audio files (for browser playback if needed)
app.get('/audio/:filename', (req, res) => {
    const audioDir = '/Users/harsh/test-app-wispr-flow/audio_data_long_context/audio/';
    const filename = req.params.filename;
    const filePath = path.join(audioDir, filename);
    
    // Check if file exists
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Audio file not found');
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Cleanup function to ensure fn key is released when server exits
function cleanup() {
    if (activeAudioProcess) {
        activeAudioProcess.kill();
    }
    releaseFnKey();
    console.log('Cleanup complete');
}

// Register cleanup handlers
process.on('exit', cleanup);
process.on('SIGINT', () => {
    console.log('Server shutting down...');
    cleanup();
    process.exit(0);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Note: For audio-to-mic routing to work, you need to configure your system's audio routing.`);
    if (!robot) {
        console.log(`To enable fn key simulation, install robotjs: npm install robotjs`);
    }
}); 