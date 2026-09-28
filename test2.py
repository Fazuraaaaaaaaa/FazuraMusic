import json
from ytmusicapi import YTMusic
yt = YTMusic()
results = yt.search('NESS FX [𝑿𝑮]', filter='songs')
for r in results[:5]:
    print(r['title'], "-", r['artists'][0]['name'])
