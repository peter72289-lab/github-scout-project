import numpy as np, wave
SR = 44100
DUR = 282.0
n = int(SR * DUR)
t = np.arange(n) / SR
out = np.zeros(n)
def hz(m): return 440 * 2 ** ((m - 69) / 12)
# C - G - Am - F, four seconds each
chords = [[48, 55, 60, 64], [43, 50, 55, 59], [45, 52, 57, 60], [41, 48, 53, 57]]
bar = 4.0
for k in range(int(DUR / bar) + 1):
    ch = chords[k % 4]
    s0 = int(k * bar * SR); s1 = min(n, int((k + 1) * bar * SR + 1.0 * SR))
    if s0 >= n: break
    tt = np.arange(s1 - s0) / SR
    env = np.minimum(1, tt / 0.8) * np.exp(-np.maximum(0, tt - bar) * 3)
    for m in ch:
        f = hz(m)
        out[s0:s1] += env * (0.5 * np.sin(2 * np.pi * f * tt) + 0.12 * np.sin(2 * np.pi * 2 * f * tt + 0.3)) * 0.12
    # soft arpeggio, eighth notes at 120 bpm
    arp = [ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[2] + 12]
    for j in range(8):
        a0 = s0 + int(j * 0.5 * SR)
        a1 = min(n, a0 + int(1.2 * SR))
        if a0 >= n: break
        ta = np.arange(a1 - a0) / SR
        f = hz(arp[j % 4])
        out[a0:a1] += np.exp(-ta * 4.5) * np.minimum(1, ta / 0.01) * (np.sin(2 * np.pi * f * ta) + 0.2 * np.sin(2 * np.pi * 3 * f * ta)) * 0.05
# gentle low-pass
ker = np.ones(6) / 6
out = np.convolve(out, ker, mode='same')
fade = np.ones(n)
fade[: int(2 * SR)] = np.linspace(0, 1, int(2 * SR))
fade[-int(5 * SR):] = np.linspace(1, 0, int(5 * SR))
out *= fade
out = out / np.max(np.abs(out)) * 0.22
pcm = (out * 32767).astype(np.int16)
st = np.repeat(pcm[:, None], 2, axis=1)
with wave.open('music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
print('ok', DUR)
