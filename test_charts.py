from ytmusicapi import YTMusic
import json
yt = YTMusic()
charts = yt.get_charts(country='ID')
print(list(charts.keys()))
if 'songs' in charts:
    print("songs items count:", len(charts['songs']['items']))
    print(charts['songs']['items'][0])
if 'videos' in charts:
    print("videos items count:", len(charts['videos']['items']))
    print(charts['videos']['items'][0])
