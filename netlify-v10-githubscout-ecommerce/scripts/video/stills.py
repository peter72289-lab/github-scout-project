import sys
from scenes import SCENES, frame
pts = [(0,10),(1,20),(2,22),(3,33),(4,28),(5,26),(6,26),(7,24),(8,15),(9,22),(10,10)]
for idx,t in pts:
    frame(idx,t).write_to_png(f'still-{idx:02d}.png')
print('ok')
