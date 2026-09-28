import json
from ytmusicapi import YTMusic
yt = YTMusic()
r2 = yt.search('NESS FX [𝑿𝑮]', filter='songs')
with open('test.txt', 'w', encoding='utf-8') as f:
    for x in r2[:10]:
        f.write(x.get('title', '') + ' | ' + x.get('artists', [{'name': ''}])[0].get('name', '') + '\n')
