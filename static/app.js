
function getHDThumbnail(url) {
    if (!url) return 'https://via.placeholder.com/500';
    
    // Upgrade Google CDN image URLs to a safe HD size (544x544 is standard YT Music HD)
    // Prevents 404 errors caused by requesting overly large 1000x1000 sizes.
    if (url.match(/([=\-])([ws])\d+-h\d+/)) {
        return url.replace(/([=\-])([ws])\d+-h\d+/, '$1$2544-h544');
    } else if (url.match(/([=\-])([ws])\d+/)) {
        return url.replace(/([=\-])([ws])\d+/, '$1$2544');
    }
    return url;
}

let ytPlayerReady = false;
let ytPlayer = null;
let ytProgressInterval = null;

window.onYouTubeIframeAPIReady = function() {
    ytPlayer = new YT.Player('yt-player', {
        height: '100',
        width: '100',
        videoId: '',
        playerVars: {
            'playsinline': 1,
            'controls': 0,
            'disablekb': 1,
            'fs': 0,
            'rel': 0,
            'showinfo': 0,
            'iv_load_policy': 3
        },
        events: {
            'onReady': () => { ytPlayerReady = true; audioPlayer.volume = 1; },
            'onStateChange': onPlayerStateChange,
            'onError': (e) => { audioPlayer.dispatchEvent('error', e); }
        }
    });
};

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        audioPlayer.dispatchEvent('play');
        if(ytProgressInterval) clearInterval(ytProgressInterval);
        ytProgressInterval = setInterval(() => {
            audioPlayer.dispatchEvent('timeupdate');
            if (audioPlayer.currentTime >= audioPlayer.duration && audioPlayer.duration > 0) {
                audioPlayer.dispatchEvent('ended');
            }
        }, 1000);
    } else if (event.data == YT.PlayerState.PAUSED) {
        audioPlayer.dispatchEvent('pause');
    } else if (event.data == YT.PlayerState.ENDED) {
        audioPlayer.dispatchEvent('ended');
    }
}

class YTProxyAudio {
    constructor() {
        this.listeners = {};
        this._src = '';
        this._volume = 1.0;
    }
    addEventListener(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }
    dispatchEvent(event, data) {
        if (this.listeners[event]) this.listeners[event].forEach(cb => cb(data));
    }
    play() {
        if (ytPlayerReady && ytPlayer && this._src) ytPlayer.playVideo();
    }
    pause() {
        if (ytPlayerReady && ytPlayer) ytPlayer.pauseVideo();
    }
    get src() { return this._src; }
    set src(val) {
        this._src = val;
        const videoId = new URLSearchParams(val.split('?')[1]).get('id');
        if (ytPlayerReady && ytPlayer && videoId) {
            ytPlayer.loadVideoById(videoId);
        } else if (videoId) {
            const checkReady = setInterval(() => {
                if (ytPlayerReady && ytPlayer) {
                    ytPlayer.loadVideoById(videoId);
                    clearInterval(checkReady);
                }
            }, 100);
        }
    }
    get volume() { return this._volume; }
    set volume(val) {
        this._volume = val;
        if (ytPlayerReady && ytPlayer) ytPlayer.setVolume(val * 100);
    }
    get currentTime() {
        return (ytPlayerReady && ytPlayer && ytPlayer.getCurrentTime) ? (ytPlayer.getCurrentTime() || 0) : 0;
    }
    set currentTime(val) {
        if (ytPlayerReady && ytPlayer && ytPlayer.seekTo) ytPlayer.seekTo(val, true);
    }
    get duration() {
        return (ytPlayerReady && ytPlayer && ytPlayer.getDuration) ? (ytPlayer.getDuration() || 0) : 0;
    }
}

let audioPlayer = new YTProxyAudio();

let currentPlaylist = [];
let currentSongIndex = -1;
let isPlaying = false;

// Set volume awal
audioPlayer.volume = 1.0;

// ============================================
// CUSTOM TOAST NOTIFICATION
// ============================================
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    
    let icon = '<i class="fas fa-check-circle"></i>';
    if (type === 'error') {
        icon = '<i class="fas fa-exclamation-circle"></i>';
    } else if (type === 'warning') {
        icon = '<i class="fas fa-info-circle"></i>';
    }
    
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
// ============================================
// MOBILE MENU TOGGLE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const mobileBackdrop = document.getElementById('mobile-backdrop');

    if (mobileMenuBtn && sidebar && mobileBackdrop) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.add('mobile-open');
            mobileBackdrop.style.display = 'block';
        });

        mobileBackdrop.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            mobileBackdrop.style.display = 'none';
        });
        
        // Auto-close sidebar when a link is clicked on mobile
        const sidebarLinks = sidebar.querySelectorAll('li, .library-header');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('mobile-open');
                    mobileBackdrop.style.display = 'none';
                }
            });
        });
    }
});

    
    // Animate in
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Auto dismiss after 2.5s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}

// Override window.alert agar semua alert bawaan menjadi Toast
window.alert = function(msg) {
    if (msg.toLowerCase().includes('gagal') || msg.toLowerCase().includes('error')) {
        showToast(msg, 'error');
    } else if (msg.toLowerCase().includes('sudah ada') || msg.toLowerCase().includes('maaf')) {
        showToast(msg, 'warning');
    } else {
        showToast(msg, 'success');
    }
};

// ============================================
// HISTORI NAVIGASI (Fitur < >)
// ============================================
let appHistory = [];
let historyIndex = -1;

function pushHistoryState(state) {
    if (historyIndex >= 0) {
        const curr = appHistory[historyIndex];
        if (curr.view === state.view && curr.query === state.query && curr.pName === state.pName) {
            return;
        }
    }
    
    if (historyIndex < appHistory.length - 1) {
        appHistory = appHistory.slice(0, historyIndex + 1);
    }
    
    appHistory.push(state);
    historyIndex++;
    updateNavButtons();
}

function updateNavButtons() {
    const backBtn = document.getElementById('btn-back');
    const fwdBtn = document.getElementById('btn-forward');
    
    if (backBtn) {
        const canGoBack = historyIndex > 0;
        backBtn.style.opacity = canGoBack ? "1" : "0.5";
        backBtn.style.cursor = canGoBack ? "pointer" : "not-allowed";
        backBtn.disabled = !canGoBack;
    }
    
    if (fwdBtn) {
        const canGoForward = historyIndex < appHistory.length - 1;
        fwdBtn.style.opacity = canGoForward ? "1" : "0.5";
        fwdBtn.style.cursor = canGoForward ? "pointer" : "not-allowed";
        fwdBtn.disabled = !canGoForward;
    }
}

window.goBack = function() {
    if (historyIndex > 0) {
        historyIndex--;
        applyHistoryState(appHistory[historyIndex]);
        updateNavButtons();
    }
};

window.goForward = function() {
    if (historyIndex < appHistory.length - 1) {
        historyIndex++;
        applyHistoryState(appHistory[historyIndex]);
        updateNavButtons();
    }
};

function applyHistoryState(state) {
    switch (state.view) {
        case 'charts':
            fetchCharts(false);
            break;
        case 'search':
            document.getElementById('search-input').value = state.query || "";
            fetchSearch(state.query, state.customTitle, true, false);
            break;
        case 'library':
            showLibraryView(false);
            break;
        case 'playlist':
            showPlaylistView(state.pName, false);
            break;
        case 'artist':
            showArtistView(state.artistName, state.artistImg, false);
            break;
        case 'hero':
            showHeroSongView(state.song, state.index, false);
            break;
    }
}

// Logika Tombol Kontrol
document.getElementById('play-pause-btn').addEventListener('click', () => {
    // Jika belum ada lagu yang dipilih, putar lagu pertama dari daftar saat ini
    if(currentSongIndex === -1 || !audioPlayer.src) {
        if (currentPlaylist && currentPlaylist.length > 0) {
            playSong(0);
        }
        return;
    }
    
    if(isPlaying) {
        audioPlayer.pause();
    } else {
        audioPlayer.play();
    }
});

audioPlayer.addEventListener('play', () => {
    isPlaying = true;
    document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-pause"></i>'; 
});

audioPlayer.addEventListener('pause', () => {
    isPlaying = false;
    document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-play"></i>';
});

audioPlayer.addEventListener('ended', () => {
    playNext(); // Otomatis putar lagu selanjutnya
});

audioPlayer.addEventListener('timeupdate', () => {
    const currentTime = audioPlayer.currentTime;
    const duration = audioPlayer.duration;
    
    if (duration) {
        document.getElementById('current-time').innerText = formatTime(currentTime);
        document.getElementById('total-time').innerText = formatTime(duration);
        
        const progressPercent = (currentTime / duration) * 100;
        document.getElementById('progress-bar').value = progressPercent;
    }
});

audioPlayer.addEventListener('error', (e) => {
    console.error("Audio Player Error", e);
    alert("Maaf: Gagal memuat stream audio dari YouTube. Silakan coba lagu lain.");
    document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-play"></i>';
    document.getElementById('play-pause-btn').disabled = true;
});

document.getElementById('next-btn').addEventListener('click', playNext);
document.getElementById('prev-btn').addEventListener('click', playPrev);

document.getElementById('mute-btn').addEventListener('click', () => {
    if(audioPlayer.volume > 0) {
        audioPlayer.volume = 0;
        document.getElementById('mute-icon').className = 'fas fa-volume-mute';
    } else {
        audioPlayer.volume = 1;
        document.getElementById('mute-icon').className = 'fas fa-volume-up';
    }
});

document.getElementById('progress-bar').addEventListener('input', (e) => {
    if(audioPlayer.duration) {
        const seekTo = (e.target.value / 100) * audioPlayer.duration;
        audioPlayer.currentTime = seekTo;
    }
});

async function playNext() {
    if (currentSongIndex < currentPlaylist.length - 1) {
        playSong(currentSongIndex + 1);
    } else {
        // Algorithmic Autoplay
        const currentSong = currentPlaylist[currentSongIndex];
        if (currentSong && currentSong.videoId) {
            try {
                showToast('Mencari lagu otomatis (Auto-play)...', 'warning');
                const res = await fetch('/api/radio?id=' + currentSong.videoId);
                const data = await res.json();
                
                if (data && data.length > 0) {
                    // Format data ke format playlist
                    const mappedData = data.map(song => {
                        return {
                            videoId: song.videoId,
                            title: song.title,
                            artistName: song.artists && song.artists.length > 0 ? song.artists[0].name : 'Unknown Artist',
                            thumbUrl: getHDThumbnail(song.thumbnails && song.thumbnails.length > 0 ? song.thumbnails[song.thumbnails.length - 1].url : '')
                        };
                    });
                    currentPlaylist = currentPlaylist.concat(mappedData);
                    playSong(currentSongIndex + 1);
                    showToast('Memutar algoritma radio', 'success');
                } else {
                    showToast('Lagu habis & Tidak ada rekomendasi', 'error');
                }
            } catch(e) {
                console.error('Error fetching radio:', e);
                showToast('Gagal memuat auto-play', 'error');
            }
        }
    }
}

function playPrev() {
    if (currentSongIndex > 0) {
        playSong(currentSongIndex - 1);
    }
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    seconds = Math.floor(seconds);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
}


// ============================================
// PLAYLIST LOGIC
// ============================================
let userPlaylists = JSON.parse(localStorage.getItem('userPlaylists')) || {};
// Migrasi: Upgrade resolusi gambar playlist lama
let playlistsMigrated = false;
for (let pName in userPlaylists) {
    userPlaylists[pName].forEach(song => {
        if (song.thumbUrl) {
            let newUrl = getHDThumbnail(song.thumbUrl);
            if (newUrl !== song.thumbUrl) {
                song.thumbUrl = newUrl;
                playlistsMigrated = true;
            }
        }
    });
}
if (playlistsMigrated) savePlaylists();
let songToAddIndex = -1;

function savePlaylists() {
    localStorage.setItem('userPlaylists', JSON.stringify(userPlaylists));
}

function renderSidebarPlaylists() {
    const list = document.getElementById('playlist-list');
    if (!list) return;
    list.innerHTML = '';
    for (let pName in userPlaylists) {
        const li = document.createElement('li');
        li.style.cursor = 'pointer';
        li.style.color = 'var(--text-subdued)';
        li.style.fontSize = '0.9rem';
        li.innerHTML = pName;
        li.onmouseover = () => li.style.color = 'var(--text-base)';
        li.onmouseout = () => li.style.color = 'var(--text-subdued)';
        li.onclick = () => showPlaylistView(pName);
        list.appendChild(li);
    }
}



function showPlaylistView(pName, pushHistory = true) {
    if (pushHistory) pushHistoryState({ view: 'playlist', pName: pName });
    hideSpecialViews();
    document.getElementById('playlist-view').style.display = 'block';
    document.getElementById('playlist-title').innerText = pName;
    const songs = userPlaylists[pName];
    document.getElementById('playlist-count').innerText = songs.length + ' lagu';
    
    if (songs.length > 0 && songs[0].thumbUrl) {
        document.getElementById('playlist-img').src = songs[0].thumbUrl;
    } else {
        document.getElementById('playlist-img').src = 'https://via.placeholder.com/230/282828/b3b3b3?text=Playlist';
    }
    
    document.getElementById('playlist-play-btn').onclick = () => {
        if (songs.length > 0) {
            currentPlaylist = [...songs];
            playSong(0);
        }
    };
    
    document.getElementById('playlist-delete-btn').onclick = () => {
        if(confirm('Yakin ingin menghapus playlist ini?')) {
            delete userPlaylists[pName];
            savePlaylists();
            renderSidebarPlaylists();
            fetchCharts();
        }
    };
    
    currentPlaylist = [...songs];
    renderListToDom(songs, 'Daftar Lagu');
}

// ============================================
// LOGIKA FETCH DATA & FITUR KHUSUS
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    fetchCharts();

    const searchInput = document.getElementById('search-input');
    
    searchInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') {
            const query = e.target.value.trim();
            if(query) {
                fetchSearch(query);
            } else {
                fetchCharts();
            }
        }
    });
});

function focusSearch() {
    document.getElementById('search-input').focus();
    document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-links li')[1].classList.add('active');
}

// Reset views
function hideSpecialViews() {
    document.getElementById('artist-view').style.display = 'none';
    document.getElementById('hero-view').style.display = 'none';
    document.getElementById('playlist-view').style.display = 'none';
    const libView = document.getElementById('library-view');
    if (libView) libView.style.display = 'none';
    const homeView = document.getElementById('home-view');
    if (homeView) homeView.style.display = 'none';
    const mainViewContent = document.getElementById('main-view-content');
    if (mainViewContent) mainViewContent.style.display = 'block';
    
    document.getElementById('list-title').style.display = 'block';
    document.getElementById('song-list').style.display = 'grid';
}

window.showLibraryView = function(pushHistory = true) {
    if (pushHistory) pushHistoryState({ view: 'library' });
    hideSpecialViews();
    document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
    
    document.getElementById('list-title').style.display = 'none';
    document.getElementById('song-list').style.display = 'none';
    
    const libView = document.getElementById('library-view');
    libView.style.display = 'block';
    
    const libGrid = document.getElementById('library-grid');
    libGrid.innerHTML = '';
    
    const pNames = Object.keys(userPlaylists);
    
    if(pNames.length === 0) {
        libGrid.innerHTML = '<p style="color: var(--text-subdued);">Belum ada playlist. Yuk, buat playlist barumu!</p>';
        return;
    }
    
    pNames.forEach((pName, index) => {
        const songs = userPlaylists[pName];
        let imgUrl = 'https://via.placeholder.com/230/282828/b3b3b3?text=Playlist';
        if (songs.length > 0 && songs[0].thumbUrl) {
            imgUrl = songs[0].thumbUrl;
        }
        
        const card = document.createElement('div');
        card.className = 'grid-item';
        card.style.animationDelay = `${Math.min(index * 0.05, 0.5)}s`;
        card.innerHTML = `
            <div style="position: relative;">
                <img src="${imgUrl}" alt="art" style="border-radius: 8px;">
                <div class="play-hover"><i class="fas fa-play"></i></div>
            </div>
            <div class="grid-item-content">
                <h4 style="margin: 10px 0 5px 0; font-size: 1rem;">${pName}</h4>
                <p style="color: var(--text-subdued); font-size: 0.85rem;">${songs.length} lagu</p>
            </div>
        `;
        
        card.onclick = () => {
            document.getElementById('list-title').style.display = 'block';
            document.getElementById('song-list').style.display = 'grid';
            showPlaylistView(pName);
        };
        
        libGrid.appendChild(card);
    });
};

window.createNewPlaylist = function() {
    const modal = document.getElementById('create-playlist-modal');
    const input = document.getElementById('new-playlist-input');
    input.value = '';
    modal.style.display = 'flex';
    input.focus();
    
    // Support enter key
    input.onkeydown = function(e) {
        if(e.key === 'Enter') confirmCreatePlaylist();
    };
};

window.confirmCreatePlaylist = function() {
    const input = document.getElementById('new-playlist-input');
    const pName = input.value.trim();
    if (!pName) return;
    
    if (!userPlaylists[pName]) {
        userPlaylists[pName] = [];
        
        if (window.pendingSongToAdd) {
            userPlaylists[pName].push(window.pendingSongToAdd);
            alert(`Playlist "${pName}" berhasil dibuat dan "${window.pendingSongToAdd.title}" telah ditambahkan!`);
            window.pendingSongToAdd = null;
        } else {
            alert(`Playlist "${pName}" berhasil dibuat!`);
        }
        
        savePlaylists();
        renderSidebarPlaylists();
        showLibraryView();
        document.getElementById('create-playlist-modal').style.display = 'none';
    } else {
        alert('Playlist dengan nama tersebut sudah ada.');
    }
};

function showArtistView(artistName, artistImg, pushHistory = true) {
    if (pushHistory) pushHistoryState({ view: 'artist', artistName: artistName, artistImg: artistImg });
    hideSpecialViews();
    const artistView = document.getElementById('artist-view');
    document.getElementById('artist-name-title').innerText = artistName;
    document.getElementById('artist-img').src = artistImg || 'https://via.placeholder.com/200';
    artistView.style.display = 'block';
    
    // Cari lagu khusus artis ini
    fetchSearch(artistName, `Lagu dari ${artistName}`, false);
}

function showHeroSongView(song, index, pushHistory = true) {
    if (pushHistory) pushHistoryState({ view: 'hero', song: song, index: index });
    hideSpecialViews();
    const heroView = document.getElementById('hero-view');
    document.getElementById('hero-title').innerText = song.title;
    document.getElementById('hero-artist').innerText = song.artistName;
    document.getElementById('hero-artist').onclick = (e) => {
        e.stopPropagation();
        showArtistView(song.artistName, song.thumbUrl);
    };
    document.getElementById('hero-img').src = song.thumbUrl;
    
    const heroPlayBtn = document.getElementById('hero-play-btn');
    heroPlayBtn.onclick = () => playSong(index);
    
    heroView.style.display = 'block';
    // Scroll to top
    document.getElementById('main-content-scroll').scrollTop = 0;
}

function renderList(songs, title) {
    currentPlaylist = songs.map(song => {
        const videoId = song.videoId;
        const title = song.title;
        
        let artistName = "Unknown Artist";
        if(song.artists && song.artists.length > 0) {
            artistName = song.artists.map(a => a.name).join(', ');
        }
        
        let thumbUrl = "https://via.placeholder.com/200";
        if (song.thumbnails && song.thumbnails.length > 0) {
            thumbUrl = getHDThumbnail(song.thumbnails[song.thumbnails.length - 1].url);
        }

        return { videoId, title, artistName, thumbUrl };
    }).filter(s => s.videoId);

    renderListToDom(currentPlaylist, title);
}

function renderListToDom(mappedSongs, title) {
    document.getElementById('list-title').innerText = title;
    const list = document.getElementById('song-list');
    list.innerHTML = '';

    if(mappedSongs.length === 0) {
        list.innerHTML = '<p style="color:var(--text-subdued)">Lagu tidak ditemukan. Coba kata kunci lain.</p>';
        return;
    }

    mappedSongs.forEach((song, index) => {
        const div = document.createElement('div');
        div.className = 'grid-item';
        div.style.animationDelay = `${Math.min(index * 0.04, 0.6)}s`;
        div.innerHTML = `
            <div style="position: relative;">
                <img src="${song.thumbUrl}" alt="art">
                <div class="play-hover"><i class="fas fa-play"></i></div>
                <div class="add-playlist-btn" title="Tambah ke Playlist" onclick="event.stopPropagation(); showAddToPlaylistModal(${index})" style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.6); color:white; width:30px; height:30px; border-radius:50%; display:none; justify-content:center; align-items:center; z-index:5;"><i class="fas fa-plus"></i></div>
            </div>
            <div class="grid-item-content">
                <h4>${song.title}</h4>
                <p class="artist-name-click" title="Lihat Profil Pencipta">${song.artistName}</p>
            </div>
        `;
        div.onmouseenter = () => { const btn = div.querySelector('.add-playlist-btn'); if(btn) btn.style.display = 'flex'; };
        div.onmouseleave = () => { const btn = div.querySelector('.add-playlist-btn'); if(btn) btn.style.display = 'none'; };

        // Click card to open special song view
        div.onclick = (e) => {
            if (e.target.classList.contains('artist-name-click')) {
                showArtistView(song.artistName, song.thumbUrl);
            } else {
                showHeroSongView(song, index);
                playSong(index);
            }
        };

        list.appendChild(div);
    });
}
function playSong(index) {
    currentSongIndex = index;
    let song = currentPlaylist[index];

    // Jika data lagu masih mentah dari YTMusic (raw), format ke struktur standar
    if (song && !song.thumbUrl) {
        let artistName = "Unknown Artist";
        if (song.artists && song.artists.length > 0) {
            artistName = song.artists.map(a => a.name).join(', ');
        }
        let thumbUrl = "https://via.placeholder.com/200";
        if (song.thumbnails && song.thumbnails.length > 0) {
            thumbUrl = getHDThumbnail(song.thumbnails[song.thumbnails.length - 1].url);
        }
        // Update di playlist dengan format yang benar
        currentPlaylist[index] = {
            videoId: song.videoId,
            title: song.title,
            artistName: artistName,
            thumbUrl: thumbUrl
        };
        song = currentPlaylist[index];
    }
    
    document.getElementById('track-name').innerText = song.title;
    document.getElementById('artist-name').innerText = song.artistName;
    document.getElementById('artist-name').onclick = () => showArtistView(song.artistName, song.thumbUrl);
    document.getElementById('track-art').src = song.thumbUrl;
    document.getElementById('track-art').style.display = 'block';
    
    document.getElementById('like-btn').style.display = 'block';
    const addBtn = document.getElementById('player-add-playlist-btn');
    addBtn.style.display = 'block';
    addBtn.onclick = () => {
        showAddToPlaylistModal(index);
    };
    
    // Update Dynamic Background
    const bg = document.getElementById('dynamic-bg');
    if (bg) {
        bg.style.backgroundImage = `url('${song.thumbUrl}')`;
        bg.style.opacity = '1';
    }
    
    document.getElementById('progress-bar').disabled = false;
    document.getElementById('progress-bar').value = 0;
    document.getElementById('current-time').innerText = "0:00";
    
    const playBtn = document.getElementById('play-pause-btn');
    playBtn.disabled = false;
    playBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; 
    
    audioPlayer.src = `/api/stream?id=${song.videoId}`;
    audioPlayer.play();
    
    // Prefetch next songs based on algorithm if this is the last song
    if (index === currentPlaylist.length - 1 && song.videoId) {
        fetch('/api/radio?id=' + song.videoId)
            .then(res => res.json())
            .then(data => {
                if (data && data.length > 0) {
                    const mappedData = data.map(s => {
                        return {
                            videoId: s.videoId,
                            title: s.title,
                            artistName: s.artists && s.artists.length > 0 ? s.artists[0].name : 'Unknown Artist',
                            thumbUrl: getHDThumbnail(s.thumbnails && s.thumbnails.length > 0 ? s.thumbnails[s.thumbnails.length - 1].url : '')
                        };
                    });
                    currentPlaylist = currentPlaylist.concat(mappedData);
                }
            })
            .catch(e => console.error('Prefetch radio error:', e));
    }
    
    // Background playback support & OS lock-screen controls
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.title,
            artist: song.artistName || 'Unknown Artist',
            album: 'YT Music',
            artwork: [
                { src: song.thumbUrl, sizes: '512x512', type: 'image/jpeg' }
            ]
        });

        navigator.mediaSession.setActionHandler('play', function() { audioPlayer.play(); });
        navigator.mediaSession.setActionHandler('pause', function() { audioPlayer.pause(); });
        navigator.mediaSession.setActionHandler('previoustrack', function() { playPrev(); });
        navigator.mediaSession.setActionHandler('nexttrack', function() { playNext(); });
    }
}

window.scrollHorizontal = function(id, direction) {
    const el = document.getElementById(id);
    if(el) el.scrollBy({ left: direction * 400, behavior: 'smooth' });
};

let homeSectionsData = {
    'home-community': [],
    'home-covers': [],
    'home-videos': [],
    'home-trending': []
};

window.playAllSection = function(sectionId) {
    const songs = homeSectionsData[sectionId];
    if (songs && songs.length > 0) {
        currentPlaylist = [...songs];
        playSong(0);
    } else {
        alert("Tidak ada lagu untuk diputar.");
    }
};

function renderLargeCards(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    data.forEach((song, i) => {
        const thumb = getHDThumbnail(song.thumbnails && song.thumbnails.length > 0 ? song.thumbnails[song.thumbnails.length - 1].url : '');
        const artist = song.artists && song.artists.length > 0 ? song.artists[0].name : 'Unknown Artist';
        const card = document.createElement('div');
        card.className = 'large-card';
        card.onclick = () => {
            currentPlaylist = data;
            playSong(i);
        };
        card.innerHTML = `
            <div class="large-card-img-wrapper">
                <img src="${thumb}" alt="${song.title}">
                <div class="play-overlay"><i class="fas fa-play"></i></div>
            </div>
            <div>
                <h4 class="large-card-title">${song.title}</h4>
                <p class="large-card-subtitle">${artist}</p>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderListGrid(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    data.forEach((song, i) => {
        const thumb = song.thumbnails && song.thumbnails.length > 0 ? song.thumbnails[0].url : '';
        const artist = song.artists && song.artists.length > 0 ? song.artists[0].name : 'Unknown Artist';
        const item = document.createElement('div');
        item.className = 'list-grid-item';
        
        item.innerHTML = `
            <div class="list-grid-img-wrapper" onclick="currentPlaylist = homeSectionsData['${containerId}']; playSong(${i});">
                <img src="${thumb}" alt="${song.title}">
                <div class="list-play-overlay"><i class="fas fa-play"></i></div>
            </div>
            <div class="list-grid-info" onclick="currentPlaylist = homeSectionsData['${containerId}']; playSong(${i});">
                <div class="list-grid-title">${song.title}</div>
                <div class="list-grid-subtitle">${artist}</div>
            </div>
            <div class="list-grid-menu" onclick="event.stopPropagation(); window.pendingSongToAdd = homeSectionsData['${containerId}'][${i}]; showAddToPlaylistModal(${i});">
                <i class="fas fa-ellipsis-v"></i>
            </div>
        `;
        container.appendChild(item);
    });
}

async function fetchCharts(pushHistory = true) {
    if (pushHistory) pushHistoryState({ view: 'charts' });
    hideSpecialViews();
    document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-links li')[0].classList.add('active');
    document.getElementById('search-input').value = '';

    const homeView = document.getElementById('home-view');
    const mainViewContent = document.getElementById('main-view-content');
    if (homeView && mainViewContent) {
        mainViewContent.style.display = 'none';
        homeView.style.display = 'block';

        if (document.getElementById('home-community').innerHTML === '') {
            document.getElementById('home-loading').style.display = 'block';
            document.getElementById('home-sections').style.display = 'none';
            try {
                const results = await Promise.allSettled([
                    fetch('/api/charts').then(r => r.json()),
                    fetch('/api/search?q=dj+tiktok+viral+terbaru').then(r => r.json()),
                    fetch('/api/search?q=covers+and+remixes+indonesia').then(r => r.json()),
                    fetch('/api/search?q=music+video+indonesia+terbaru').then(r => r.json())
                ]);
                
                const charts = results[0].status === 'fulfilled' ? results[0].value : [];
                const community = results[1].status === 'fulfilled' ? results[1].value : [];
                const covers = results[2].status === 'fulfilled' ? results[2].value : [];
                const videos = results[3].status === 'fulfilled' ? results[3].value : [];

                homeSectionsData['home-trending'] = charts || [];
                homeSectionsData['home-community'] = community || [];
                homeSectionsData['home-covers'] = covers || [];
                homeSectionsData['home-videos'] = videos || [];

                renderLargeCards('home-community', homeSectionsData['home-community']);
                renderListGrid('home-covers', homeSectionsData['home-covers']);
                renderLargeCards('home-videos', homeSectionsData['home-videos']);
                renderListGrid('home-trending', homeSectionsData['home-trending']);

                document.getElementById('home-loading').style.display = 'none';
                document.getElementById('home-sections').style.display = 'flex';
            } catch(e) {
                console.error("Error loading home", e);
                document.getElementById('home-loading').innerHTML = '<p>Gagal memuat beranda.</p>';
            }
        }
    } else {
        const loading = document.getElementById('loading');
        loading.style.display = 'block';
        document.getElementById('song-list').innerHTML = '';
        try {
            const res = await fetch('/api/charts');
            const data = await res.json();
            loading.style.display = 'none';
            renderList(data, 'Trending Saat Ini');
        } catch(e) {
            loading.style.display = 'none';
            console.error("Error fetching charts", e);
        }
    }
}

async function fetchSearch(query, customTitle, shouldHideSpecial = true, pushHistory = true) {
    if (pushHistory) pushHistoryState({ view: 'search', query: query, customTitle: customTitle });
    if(shouldHideSpecial) hideSpecialViews();
    
    const loading = document.getElementById('loading');
    loading.style.display = 'block';
    document.getElementById('song-list').innerHTML = '';
    
    try {
        const res = await fetch('/api/search?q=' + encodeURIComponent(query));
        const data = await res.json();
        loading.style.display = 'none';
        renderList(data, customTitle || ('Hasil Pencarian: "' + query + '"'));
    } catch(e) {
        loading.style.display = 'none';
        console.error("Error searching", e);
    }
}

window.pendingSongToAdd = null;

window.showAddToPlaylistModal = function(index) {
    const song = currentPlaylist[index];
    if (!song) return;
    
    window.pendingSongToAdd = song;
    const modal = document.getElementById('playlist-modal');
    const list = document.getElementById('modal-playlist-list');
    const emptyMsg = document.getElementById('modal-playlist-empty');
    
    // Set preview info
    document.getElementById('modal-song-thumb').src = song.thumbUrl;
    document.getElementById('modal-song-title').innerText = song.title;
    document.getElementById('modal-song-artist').innerText = song.artistName;
    
    list.innerHTML = '';
    const pNames = Object.keys(userPlaylists);
    
    if (pNames.length === 0) {
        emptyMsg.style.display = 'block';
    } else {
        emptyMsg.style.display = 'none';
        pNames.forEach(pName => {
            const li = document.createElement('li');
            li.style.padding = '10px 14px';
            li.style.background = '#1e1e1e';
            li.style.borderRadius = '6px';
            li.style.cursor = 'pointer';
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';
            li.style.transition = 'background 0.2s';
            
            const isAdded = userPlaylists[pName].find(s => s.videoId === song.videoId);
            li.innerHTML = `
                <span style="font-weight: 500; font-size: 0.95rem;">${pName}</span>
                <span style="font-size: 0.8rem; color: ${isAdded ? '#1db954' : '#b3b3b3'};">
                    ${isAdded ? '<i class="fas fa-check"></i> Sudah ada' : '<i class="fas fa-plus"></i> Tambah'}
                </span>
            `;
            
            li.onmouseenter = () => li.style.background = '#333';
            li.onmouseleave = () => li.style.background = '#1e1e1e';
            
            li.onclick = () => {
                if(isAdded) {
                    alert(`Lagu sudah ada di playlist "${pName}"`);
                } else {
                    userPlaylists[pName].push(song);
                    savePlaylists();
                    renderSidebarPlaylists();
                    alert(`Berhasil menambahkan "${song.title}" ke playlist "${pName}"`);
                    modal.style.display = 'none';
                }
            };
            list.appendChild(li);
        });
    }
    
    modal.style.display = 'flex';
};

window.openCreatePlaylistFromModal = function() {
    document.getElementById('playlist-modal').style.display = 'none';
    window.createNewPlaylist();
};
