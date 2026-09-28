const getHashParams = () => {
    const hashParams = {};
    let e, r = /([^&;=]+)=?([^&;]*)/g,
        q = window.location.hash.substring(1);
    while ( e = r.exec(q)) {
        hashParams[e[1]] = decodeURIComponent(e[2]);
    }
    return hashParams;
};

const params = getHashParams();
let access_token = params.access_token;
let device_id = null;
let player = null;

const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');

if (access_token) {
    loginSection.style.display = 'none';
    appSection.style.display = 'block';
    
    // Bersihkan URL dari token agar rapi
    window.history.pushState("", document.title, window.location.pathname + window.location.search);

    fetchUserData();
    fetchPlaylists();
}

document.getElementById('logout-btn').addEventListener('click', () => {
    window.location.href = '/';
});

async function fetchUserData() {
    try {
        const res = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': 'Bearer ' + access_token }
        });
        const data = await res.json();
        document.getElementById('display-name').innerText = data.display_name;
        if(data.images && data.images.length > 0) {
            document.getElementById('profile-img').src = data.images[0].url;
        }
    } catch (e) {
        console.error('Error fetching user data', e);
    }
}

async function fetchPlaylists() {
    try {
        const res = await fetch('https://api.spotify.com/v1/me/playlists', {
            headers: { 'Authorization': 'Bearer ' + access_token }
        });
        const data = await res.json();
        const list = document.getElementById('playlists');
        data.items.forEach(playlist => {
            const li = document.createElement('li');
            li.innerText = playlist.name;
            li.onclick = () => playPlaylist(playlist.uri);
            list.appendChild(li);
        });
    } catch (e) {
        console.error('Error fetching playlists', e);
    }
}

async function playPlaylist(uri) {
    if(!device_id) {
        alert('Player belum siap atau akun Anda bukan Premium!');
        return;
    }
    try {
        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${device_id}`, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + access_token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ context_uri: uri })
        });
    } catch (e) {
        console.error('Gagal memutar musik', e);
    }
}

// Inisialisasi Spotify Web Playback SDK
window.onSpotifyWebPlaybackSDKReady = () => {
    if(!access_token) return;

    player = new Spotify.Player({
        name: 'Streaming App Web Player',
        getOAuthToken: cb => { cb(access_token); },
        volume: 0.5
    });

    player.addListener('ready', ({ device_id: id }) => {
        console.log('Ready with Device ID', id);
        device_id = id;
        document.getElementById('player-status').innerText = "✅ Player siap! (Klik playlist untuk memutar)";
    });

    player.addListener('not_ready', ({ device_id: id }) => {
        console.log('Device ID has gone offline', id);
        document.getElementById('player-status').innerText = "❌ Player offline";
    });

    player.addListener('player_state_changed', state => {
        if (!state) return;
        const track = state.track_window.current_track;
        
        document.getElementById('track-name').innerText = track.name;
        document.getElementById('artist-name').innerText = track.artists.map(a => a.name).join(', ');
        
        const art = document.getElementById('track-art');
        if (track.album.images.length > 0) {
            art.src = track.album.images[0].url;
            art.style.display = 'block';
        }
        
        const playBtn = document.getElementById('toggle-play-btn');
        playBtn.innerText = state.paused ? '▶️' : '⏸️';
    });

    player.connect();

    document.getElementById('toggle-play-btn').onclick = () => { player.togglePlay(); };
    document.getElementById('prev-btn').onclick = () => { player.previousTrack(); };
    document.getElementById('next-btn').onclick = () => { player.nextTrack(); };
};
