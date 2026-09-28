import re

with open(r'c:\website streaming music\static\app.js', 'r', encoding='utf-8') as f:
    js = f.read()

old_code = """        let thumbUrl = "https://via.placeholder.com/200";
        if (song.thumbnails && song.thumbnails.length > 0) {
            thumbUrl = song.thumbnails[song.thumbnails.length - 1].url;
        }"""

new_code = """        let thumbUrl = "https://via.placeholder.com/200";
        if (song.thumbnails && song.thumbnails.length > 0) {
            thumbUrl = song.thumbnails[song.thumbnails.length - 1].url;
            // Upgrade resolusi gambar agar lebih HD
            if (thumbUrl.includes('=w')) {
                thumbUrl = thumbUrl.replace(/=w\\d+-h\\d+/, '=w540-h540');
            }
        }"""

js = js.replace(old_code, new_code)

with open(r'c:\website streaming music\static\app.js', 'w', encoding='utf-8') as f:
    f.write(js)
