import os, subprocess, sys
from scenes import SCENES, frame, FPS, W, H
for idx in map(int, sys.argv[1:]):
    name, dur, _, _ = SCENES[idx]
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'parts', f'{name}.mp4')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    tmp = out.replace('.mp4', '.tmp.mp4')
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'bgra', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', str(FPS), tmp], stdin=subprocess.PIPE)
    for f in range(int(dur * FPS)):
        s = frame(idx, f / FPS)
        p.stdin.write(bytes(s.get_data()))
    p.stdin.close()
    if p.wait() == 0:
        os.replace(tmp, out)
        print('done', name, flush=True)
    else:
        print('FAILED', name, flush=True)
