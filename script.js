document.addEventListener('DOMContentLoaded', function() {
    const audioContainer = document.getElementById('audioContainer');
    const playAllBtn = document.getElementById('playAllBtn');
    const pauseAllBtn = document.getElementById('pauseAllBtn');
    const stopAllBtn = document.getElementById('stopAllBtn');
    
    // Store all audio elements and their associated text boxes
    const audioElements = [];
    let currentPlayingIndex = -1;
    let isPlayingAll = false;
    let useDirectMicRouting = false; // Flag for direct-to-mic routing
    
    // Create audio context and analyzer
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 2048;
    
    // Function to connect audio element to audio context
    function connectAudioToContext(audioElement) {
        const source = audioContext.createMediaElementSource(audioElement);
        source.connect(analyzer);
        analyzer.connect(audioContext.destination);
    }
    
    // Function to fetch and load audio files
    async function loadAudioFiles() {
        try {
            // Fetch the list of audio files from the server
            const response = await fetch('/api/audio-files');
            const data = await response.json();
            const audioFiles = data.files;
            
            // Clear loading message
            audioContainer.innerHTML = '';
            
            if (audioFiles.length === 0) {
                audioContainer.innerHTML = '<div class="loading">No audio files found.</div>';
                return;
            }
            
            // Sort files by name to ensure correct order
            audioFiles.sort();
            
            audioFiles.forEach((fileName, i) => {
                const filePath = `/audio/${fileName}`;
                
                // Create audio item container
                const audioItem = document.createElement('div');
                audioItem.className = 'audio-item';
                audioItem.id = `audio-item-${i}`;
                
                // Create audio player section
                const audioPlayerDiv = document.createElement('div');
                audioPlayerDiv.className = 'audio-player';
                
                // Create audio info
                const audioInfo = document.createElement('div');
                audioInfo.className = 'audio-info';
                audioInfo.textContent = `File: ${fileName}`;
                
                // Create audio element
                const audio = document.createElement('audio');
                audio.controls = true;
                audio.src = filePath;
                audio.id = `audio-${i}`;
                
                // Create direct-to-mic play button
                const directPlayBtn = document.createElement('button');
                directPlayBtn.className = 'direct-play-btn';
                directPlayBtn.textContent = 'Play to Mic';
                directPlayBtn.dataset.filename = fileName;
                directPlayBtn.dataset.index = i;
                
                // Create text container
                const textContainer = document.createElement('div');
                textContainer.className = 'text-container';
                
                // Create text box
                const textBox = document.createElement('textarea');
                textBox.className = 'text-box';
                textBox.placeholder = `Enter notes for ${fileName}...`;
                textBox.id = `text-${i}`;
                
                // Append elements
                audioPlayerDiv.appendChild(audioInfo);
                audioPlayerDiv.appendChild(audio);
                audioPlayerDiv.appendChild(directPlayBtn);
                textContainer.appendChild(textBox);
                audioItem.appendChild(audioPlayerDiv);
                audioItem.appendChild(textContainer);
                audioContainer.appendChild(audioItem);
                
                // Store reference to audio and text box
                audioElements.push({
                    audio: audio,
                    textBox: textBox,
                    container: audioItem,
                    fileName: fileName,
                    directPlayBtn: directPlayBtn
                });
                
                // Add event listeners to individual audio elements
                audio.addEventListener('play', function() {
                    if (useDirectMicRouting) {
                        // If we're using direct-to-mic routing, pause the HTML5 audio
                        audio.pause();
                        // And play via the server endpoint instead
                        playToMic(fileName, i);
                        return;
                    }
                    
                    // Connect to audio context when played for the first time
                    if (!audio.connected) {
                        connectAudioToContext(audio);
                        audio.connected = true;
                    }
                    
                    if (!isPlayingAll) {
                        pauseAllExcept(i);
                    }
                    highlightPlaying(i);
                });
                
                audio.addEventListener('ended', function() {
                    if (isPlayingAll && i < audioElements.length - 1) {
                        setTimeout(() => {
                            playAudio(i + 1);
                        }, 5000); // 5 second buffer
                    } else {
                        isPlayingAll = false;
                    }
                });
                
                // Add event listener to direct play button
                directPlayBtn.addEventListener('click', function() {
                    playToMic(fileName, i);
                });
            });
        } catch (error) {
            console.error('Error loading audio files:', error);
            audioContainer.innerHTML = '<div class="loading">Error loading audio files. Please check the console for details.</div>';
        }
    }
    
    // Function to play audio directly to microphone via server
    async function playToMic(fileName, index) {
        try {
            // Pause any HTML5 audio that might be playing
            audioElements.forEach(item => {
                item.audio.pause();
            });
            
            // Call server endpoint to play audio to mic
            const response = await fetch(`/play-to-mic/${fileName}`);
            const data = await response.json();
            
            if (data.status === 'playing') {
                // Highlight the currently playing item
                highlightPlaying(index);
                
                // If we're in "play all" mode, set up the next file
                if (isPlayingAll && index < audioElements.length - 1) {
                    // We need to manually handle the timing since we can't detect 'ended' event
                    // Get audio duration (this is approximate)
                    const audioDuration = audioElements[index].audio.duration;
                    
                    if (audioDuration) {
                        // Schedule next audio after current one ends plus buffer
                        setTimeout(() => {
                            playToMic(audioElements[index + 1].fileName, index + 1);
                        }, (audioDuration * 1000) + 5000); // Convert to ms and add 5s buffer
                    }
                }
            }
        } catch (error) {
            console.error('Error playing to mic:', error);
        }
    }
    
    // Function to play a specific audio
    function playAudio(index) {
        if (index >= 0 && index < audioElements.length) {
            currentPlayingIndex = index;
            
            if (useDirectMicRouting) {
                playToMic(audioElements[index].fileName, index);
            } else {
                audioElements[index].audio.play();
            }
            
            highlightPlaying(index);
        }
    }
    
    // Function to pause all audio except the one at the given index
    function pauseAllExcept(exceptIndex) {
        audioElements.forEach((item, index) => {
            if (index !== exceptIndex) {
                item.audio.pause();
            }
        });
        
        if (useDirectMicRouting) {
            // Stop any server-side audio playback
            fetch('/stop-audio');
        }
    }
    
    // Function to highlight the currently playing audio and focus its text box
    function highlightPlaying(index) {
        audioElements.forEach((item, i) => {
            if (i === index) {
                item.container.classList.add('playing');
                item.textBox.focus();
            } else {
                item.container.classList.remove('playing');
            }
        });
    }
    
    // Play all button click handler
    playAllBtn.addEventListener('click', function() {
        isPlayingAll = true;
        
        // If we're already playing, continue from current
        if (currentPlayingIndex >= 0 && !audioElements[currentPlayingIndex].audio.paused && !useDirectMicRouting) {
            return;
        }
        
        // Otherwise start from the beginning or the next unplayed
        let startIndex = 0;
        if (currentPlayingIndex >= 0) {
            startIndex = currentPlayingIndex;
        }
        
        playAudio(startIndex);
    });
    
    // Pause all button click handler
    pauseAllBtn.addEventListener('click', function() {
        isPlayingAll = false;
        audioElements.forEach(item => {
            item.audio.pause();
        });
        
        if (useDirectMicRouting) {
            // Stop any server-side audio playback
            fetch('/stop-audio');
        }
    });
    
    // Stop all button click handler
    stopAllBtn.addEventListener('click', function() {
        isPlayingAll = false;
        audioElements.forEach(item => {
            item.audio.pause();
            item.audio.currentTime = 0;
        });
        currentPlayingIndex = -1;
        
        if (useDirectMicRouting) {
            // Stop any server-side audio playback
            fetch('/stop-audio');
        }
        
        // Remove all highlights
        audioElements.forEach(item => {
            item.container.classList.remove('playing');
        });
    });
    
    // Function to show loopback instructions
    function showLoopbackInstructions() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Audio-to-Microphone Setup Instructions</h2>
                <p>To route audio directly to the microphone, follow these steps:</p>
                
                <h3>For macOS:</h3>
                <ol>
                    <li>Install <a href="https://github.com/mattingalls/Soundflower" target="_blank">Soundflower</a> or <a href="https://existential.audio/blackhole/" target="_blank">BlackHole</a></li>
                    <li>Go to System Preferences > Sound</li>
                    <li>Set Output to Soundflower/BlackHole</li>
                    <li>Set Input to Soundflower/BlackHole</li>
                    <li>Click the "Enable Direct-to-Mic Routing" button below</li>
                </ol>
                
                <h3>For Windows:</h3>
                <ol>
                    <li>Install <a href="https://vb-audio.com/Cable/" target="_blank">VB-Cable</a></li>
                    <li>Right-click the speaker icon in taskbar > Sounds</li>
                    <li>Set Playback device to VB-Cable Input</li>
                    <li>Set Recording device to VB-Cable Output</li>
                    <li>Click the "Enable Direct-to-Mic Routing" button below</li>
                </ol>
                
                <h3>For Linux:</h3>
                <ol>
                    <li>Use PulseAudio or JACK to create audio routing</li>
                    <li>Click the "Enable Direct-to-Mic Routing" button below</li>
                </ol>
                
                <div class="modal-controls">
                    <button id="enableDirectRouting">Enable Direct-to-Mic Routing</button>
                </div>
            </div>
        </div>`;
        
        document.body.appendChild(modal);
        
        // Close button functionality
        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = function() {
            modal.style.display = "none";
        }
        
        // Close when clicking outside
        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        }
        
        // Enable direct routing button
        const enableBtn = modal.querySelector('#enableDirectRouting');
        enableBtn.addEventListener('click', function() {
            useDirectMicRouting = true;
            modal.style.display = "none";
            
            // Update UI to show direct routing is enabled
            const routingStatus = document.createElement('div');
            routingStatus.className = 'routing-status';
            routingStatus.textContent = 'Direct-to-Mic Routing: ENABLED';
            document.querySelector('.controls').appendChild(routingStatus);
            
            // Update button text
            loopbackBtn.textContent = 'Disable Direct-to-Mic Routing';
            loopbackBtn.removeEventListener('click', showLoopbackInstructions);
            loopbackBtn.addEventListener('click', function() {
                useDirectMicRouting = false;
                routingStatus.textContent = 'Direct-to-Mic Routing: DISABLED';
                loopbackBtn.textContent = 'Audio-to-Mic Setup';
                loopbackBtn.removeEventListener('click', arguments.callee);
                loopbackBtn.addEventListener('click', showLoopbackInstructions);
            });
        });
    }
    
    // Add a button to the controls section
    const loopbackBtn = document.createElement('button');
    loopbackBtn.id = 'loopbackBtn';
    loopbackBtn.textContent = 'Audio-to-Mic Setup';
    loopbackBtn.addEventListener('click', showLoopbackInstructions);
    
    // Add this after the controls are created
    document.querySelector('.controls').appendChild(loopbackBtn);
    
    // Load audio files when the page loads
    loadAudioFiles();
}); 