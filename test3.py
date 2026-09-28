import json
from ytmusicapi import YTMusic
yt = YTMusic()

print("=== NESS FX ===")
r1 = yt.search('NESS FX', filter='songs')
for r in r1[:5]:
    print(r['title'], "-", r['artists'][0]['name'])

print("\n=== NESS FX [𝑿𝑮] ===")
r2 = yt.search('NESS FX [𝑿𝑮]', filter='songs')
for r in r2[:5]:
    print(r['title'], "-", r['artists'][0]['name'])
