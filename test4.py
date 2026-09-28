from ytmusicapi import YTMusic
import json
yt = YTMusic()
results = yt.search('NESS FX [𝑿𝑮]')
for r in results[:15]:
    try:
        t = r.get('title', '')
        a = r.get('artists', [{'name': ''}])[0].get('name', '')
        print(f"[{r.get('resultType', '')}] {t} - {a}")
    except:
        pass
