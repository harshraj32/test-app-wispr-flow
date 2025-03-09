# Audio Player with Direct-to-Mic Routing

A web application to play audio files with editable text notes and direct-to-microphone routing.

## Setup

1. Clone this repository
2. Run `npm install` to install dependencies
3. Create the audio directory structure:
   ```
   mkdir -p audio_data_long_context/audio
   ```
4. Add your MP3 files to the `audio_data_long_context/audio` directory
5. Run `npm start` to start the server
6. Open http://localhost:3000 in your browser

## Features

- Play audio files sequentially with a 5-second buffer
- Add notes for each audio file
- Direct-to-microphone routing (requires system audio configuration)
- Keyboard simulation for fn key press during playback

## Audio-to-Mic Routing Setup

Follow the instructions in the application to set up audio routing for your operating system. 