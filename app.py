from flask import Flask, jsonify, request, render_template, redirect
from flask_cors import CORS
from ytmusicapi import YTMusic
import time
import yt_dlp

app = Flask(__name__)
CORS(app)

# Inisialisasi ytmusicapi
yt = YTMusic()

# Cache dinamis untuk optimasi kecepatan (semua query disimpan)
cache = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/search')
def search_music():
    query = request.args.get('q', '')
    if not query:
        return jsonify([])
        
    # Optimasi Caching Search
    if query in cache and (time.time() - cache[query]["timestamp"] < 3600):
        return jsonify(cache[query]["data"])
        
    try:
        if "ness fx" in query.lower():
            # Lakukan pencarian ganda
            raw_res1 = yt.search("NESS FX", filter="songs")
            res1 = []
            for r in raw_res1:
                if r.get('artists') and len(r['artists']) > 0:
                    a_name = r['artists'][0].get('name', '')
                    if "NESS FX" in a_name.upper():
                        res1.append(r)
                        
            try:
                # Gunakan filter="videos" untuk mendapatkan karya asli dari channel NESS FX [𝑿𝑮]
                raw_res2 = yt.search("NESS FX [𝑿𝑮]", filter="videos")
                res2 = []
                for r in raw_res2:
                    if r.get('artists') and len(r['artists']) > 0:
                        a_name = r['artists'][0].get('name', '')
                        if "NESS FX" in a_name.upper() and "[𝑿𝑮]" in a_name:
                            res2.append(r)
            except:
                res2 = []
                
            combined = []
            seen = set()
            max_len = max(len(res1), len(res2))
            
            # Gabungkan secara selang-seling agar adil dan hapus duplikat
            for i in range(max_len):
                if i < len(res2):
                    v_id = res2[i].get('videoId')
                    if v_id and v_id not in seen:
                        seen.add(v_id)
                        combined.append(res2[i])
                if i < len(res1):
                    v_id = res1[i].get('videoId')
                    if v_id and v_id not in seen:
                        seen.add(v_id)
                        combined.append(res1[i])
            results = combined
        else:
            results = yt.search(query, filter="songs")
            
        cache[query] = {"data": results, "timestamp": time.time()}
        return jsonify(results)
    except Exception as e:
        print("Error search:", e)
        return jsonify([])

@app.route('/api/charts')
def get_charts():
    global cache
    cache_key = "charts_v5_trending_real"
    if cache_key in cache and (time.time() - cache[cache_key]["timestamp"] < 3600):
        return jsonify(cache[cache_key]["data"])

    try:
        # Fetch Actual "Top 100 Songs Indonesia" playlist
        # Playlist ID for Top 100 Songs Indonesia
        playlist = yt.get_playlist('PL4fGSI1pDJn5ObxTlEPlkkornHXUiKX1z')
        tracks = playlist.get('tracks', [])
        
        # Convert playlist tracks format to search results format
        results = []
        for track in tracks:
            if not track.get('videoId'):
                continue
            
            # Format sama dengan hasil yt.search
            item = {
                'videoId': track['videoId'],
                'title': track['title'],
                'artists': track.get('artists', []),
                'thumbnails': track.get('thumbnails', [])
            }
            results.append(item)
            
        try:
            # Gunakan filter="videos" agar mendapatkan unggahan asli dari channel NESS FX [𝑿𝑮]
            raw_ness = yt.search("NESS FX [𝑿𝑮]", filter="videos")
            
            filtered_ness = []
            for r in raw_ness:
                if r.get('artists') and len(r['artists']) > 0:
                    a_name = r['artists'][0].get('name', '')
                    if "NESS FX" in a_name.upper() and "[𝑿𝑮]" in a_name:
                        filtered_ness.append(r)
                        
            # Mix the first 8 NESS FX songs to the top
            results = filtered_ness[:8] + results
        except Exception as e:
            print("Error fetching NESS FX:", e)

        cache[cache_key] = {"data": results, "timestamp": time.time()}
        return jsonify(results)
    except Exception as e:
        print("Error charts:", e)
        return jsonify([])

@app.route('/api/radio')
def get_radio():
    video_id = request.args.get('id')
    if not video_id:
        return jsonify([])
    try:
        radio = yt.get_watch_playlist(videoId=video_id)
        tracks = radio.get('tracks', [])
        # Format sama dengan search
        results = []
        for track in tracks:
            if not track.get('videoId') or track.get('videoId') == video_id:
                continue
            item = {
                'videoId': track['videoId'],
                'title': track['title'],
                'artists': track.get('artists', []),
                'thumbnails': track.get('thumbnails', [])
            }
            results.append(item)
        return jsonify(results)
    except Exception as e:
        print("Error radio:", e)
        return jsonify([])

@app.route('/api/stream')
def stream_audio():
    video_id = request.args.get('id')
    if not video_id:
        return "ID tidak valid", 400

    try:
        ydl_opts = {
            'format': 'bestaudio/best',
            'quiet': True,
            'no_warnings': True,
            'extractor_args': {
                'youtube': {
                    'player_client': ['android', 'ios']
                }
            }
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            return redirect(info['url'])
    except Exception as e:
        print("Error stream url:", e)
        return "Gagal mendapatkan stream audio", 500

import os

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 3000))
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
