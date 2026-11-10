"""Whiteboard-style drawing helpers on pycairo, 1920x1080."""
import math
import random
import zlib

import cairo

W, H = 1920, 1080
FPS = 30

INK = (0.11, 0.14, 0.2)
MUTED = (0.42, 0.47, 0.45)
MINT = (0.086, 0.70, 0.525)
CORAL = (1.0, 0.435, 0.38)
LIME = (0.843, 1.0, 0.42)
SUN = (1.0, 0.79, 0.23)
BLUE = (0.21, 0.39, 1.0)
PAPER = (0.988, 0.984, 0.965)
WHITE = (1, 1, 1)
LINE = (0.85, 0.89, 0.87)

HAND = 'Kalam'
SANS = 'Inter'


# ---------- timing ----------
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def prog(t, start, dur):
    if dur <= 0:
        return 1.0 if t >= start else 0.0
    return clamp((t - start) / dur)


def ease(p):
    return p * p * (3 - 2 * p)


def ease_out(p):
    return 1 - (1 - p) ** 3


def back(p):
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * (p - 1) ** 3 + c1 * (p - 1) ** 2


def lerp(a, b, p):
    return a + (b - a) * p


# ---------- canvas ----------
def new_surface():
    s = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    c = cairo.Context(s)
    return s, c


def background(c):
    c.set_source_rgb(*PAPER)
    c.paint()
    # faint dot grid, like a whiteboard sheet
    c.set_source_rgba(*INK, 0.05)
    for x in range(40, W, 48):
        for y in range(40, H, 48):
            c.rectangle(x, y, 2, 2)
    c.fill()


def rgba(c, col, a=1.0):
    if len(col) == 4:
        c.set_source_rgba(*col)
    else:
        c.set_source_rgba(col[0], col[1], col[2], a)


# ---------- rough strokes ----------
_cache = {}


def rough_points(key, pts, wobble=2.2, step=14):
    """Densify a polyline and jitter it deterministically so it looks hand drawn
    and never flickers between frames."""
    k = (key, tuple(pts), wobble)
    if k in _cache:
        return _cache[k]
    rnd = random.Random(zlib.crc32(key.encode()))
    out = []
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        d = math.hypot(x1 - x0, y1 - y0)
        n = max(2, int(d / step))
        nx, ny = (-(y1 - y0) / (d or 1), (x1 - x0) / (d or 1))
        phase = rnd.random() * 6.28
        amp = wobble * (0.6 + rnd.random() * 0.8)
        for i in range(n):
            f = i / n
            off = math.sin(phase + f * 3.1) * amp + (rnd.random() - 0.5) * wobble * 0.5
            out.append((x0 + (x1 - x0) * f + nx * off, y0 + (y1 - y0) * f + ny * off))
    out.append(pts[-1])
    _cache[k] = out
    return out


def _partial(pts, p):
    if p >= 1:
        return pts
    if p <= 0:
        return pts[:1]
    lens = [math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(pts, pts[1:])]
    total = sum(lens) * p
    out = [pts[0]]
    for (a, b), L in zip(zip(pts, pts[1:]), lens):
        if total >= L:
            out.append(b)
            total -= L
        else:
            f = total / (L or 1)
            out.append((a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f))
            break
    return out


def stroke_path(c, pts, col=INK, width=4, alpha=1.0, p=1.0):
    pts = _partial(pts, p)
    if len(pts) < 2:
        return
    c.set_line_cap(cairo.LINE_CAP_ROUND)
    c.set_line_join(cairo.LINE_JOIN_ROUND)
    c.move_to(*pts[0])
    for x, y in pts[1:]:
        c.line_to(x, y)
    rgba(c, col, alpha)
    c.set_line_width(width)
    c.stroke()


def line(c, key, x0, y0, x1, y1, p=1.0, col=INK, width=4, alpha=1.0, wobble=2.0):
    stroke_path(c, rough_points(key, [(x0, y0), (x1, y1)], wobble), col, width, alpha, p)


def rect(c, key, x, y, w, h, p=1.0, col=INK, width=4, fill=None, fill_alpha=1.0, alpha=1.0, r=14):
    if fill is not None and p > 0:
        rounded(c, x, y, w, h, r)
        rgba(c, fill, fill_alpha * min(1, p * 1.5) * alpha)
        c.fill()
    r = min(r, w / 2, h / 2)
    pts = []
    for (cx, cy, a0) in ((x + w - r, y + r, -math.pi / 2), (x + w - r, y + h - r, 0), (x + r, y + h - r, math.pi / 2), (x + r, y + r, math.pi)):
        for k in range(7):
            a = a0 + k / 6 * math.pi / 2
            pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    pts.append((pts[0][0] + 4, pts[0][1] - 1))
    stroke_path(c, rough_points(key, pts, 1.6, 18), col, width, alpha, p)


def rounded(c, x, y, w, h, r):
    r = min(r, w / 2, h / 2)
    c.new_sub_path()
    c.arc(x + w - r, y + r, r, -math.pi / 2, 0)
    c.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
    c.arc(x + r, y + h - r, r, math.pi / 2, math.pi)
    c.arc(x + r, y + r, r, math.pi, 1.5 * math.pi)
    c.close_path()


def circle(c, key, cx, cy, r, p=1.0, col=INK, width=4, fill=None, fill_alpha=1.0, alpha=1.0):
    if fill is not None and p > 0:
        c.arc(cx, cy, r, 0, 2 * math.pi)
        rgba(c, fill, fill_alpha * min(1, p * 1.5) * alpha)
        c.fill()
    n = 40
    pts = [(cx + math.cos(-1.6 + i / n * 6.6) * r, cy + math.sin(-1.6 + i / n * 6.6) * r) for i in range(n + 1)]
    stroke_path(c, rough_points(key, pts, 1.2, 8), col, width, alpha, p)


def arrow(c, key, x0, y0, x1, y1, p=1.0, col=INK, width=4, head=18, curve=0.0, alpha=1.0):
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2
    dx, dy = x1 - x0, y1 - y0
    cx, cy = mx - dy * curve, my + dx * curve
    pts = []
    for i in range(25):
        f = i / 24
        pts.append(((1 - f) ** 2 * x0 + 2 * (1 - f) * f * cx + f * f * x1, (1 - f) ** 2 * y0 + 2 * (1 - f) * f * cy + f * f * y1))
    stroke_path(c, rough_points(key, pts, 1.0, 12), col, width, alpha, min(1, p / 0.8))
    if p > 0.8:
        hp = (p - 0.8) / 0.2
        ex, ey = pts[-1]
        px, py = pts[-3]
        ang = math.atan2(ey - py, ex - px)
        for s in (-1, 1):
            a = ang + math.pi + s * 0.5
            line(c, key + str(s), ex, ey, ex + math.cos(a) * head, ey + math.sin(a) * head, hp, col, width, alpha, 0.5)


def check(c, key, x, y, s=1.0, p=1.0, col=MINT, width=7):
    stroke_path(c, rough_points(key, [(x, y), (x + 14 * s, y + 16 * s), (x + 42 * s, y - 20 * s)], 1.0, 8), col, width, 1, p)


def cross(c, key, x, y, s=1.0, p=1.0, col=CORAL, width=7):
    line(c, key + 'a', x, y, x + 34 * s, y + 34 * s, prog(p, 0, 0.5), col, width)
    line(c, key + 'b', x + 34 * s, y, x, y + 34 * s, prog(p, 0.5, 0.5), col, width)


def scribble_out(c, key, x, y, w, h, p=1.0, col=CORAL, width=5):
    rnd = random.Random(zlib.crc32(key.encode()))
    pts = []
    n = 7
    for i in range(n + 1):
        pts.append((x + (w if i % 2 else 0) + rnd.uniform(-6, 6), y + h * i / n + rnd.uniform(-3, 3)))
    stroke_path(c, pts, col, width, 0.85, p)


def highlight(c, x, y, w, h, p=1.0, col=LIME, alpha=0.8):
    if p <= 0:
        return
    c.save()
    c.rectangle(x - 6, y - 4, (w + 12) * p, h + 8)
    rgba(c, col, alpha)
    c.fill()
    c.restore()


# ---------- text ----------
def text_size(c, s, size, font=HAND, bold=False):
    c.select_font_face(font, cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD if bold else cairo.FONT_WEIGHT_NORMAL)
    c.set_font_size(size)
    e = c.text_extents(s)
    return e.x_advance, e


def write(c, s, x, y, size=48, p=1.0, col=INK, font=HAND, bold=False, align='left', alpha=1.0):
    """Handwritten write-on: reveal left to right."""
    if p <= 0:
        return 0
    w, e = text_size(c, s, size, font, bold)
    if align == 'center':
        x -= w / 2
    elif align == 'right':
        x -= w
    c.save()
    if p < 1:
        c.rectangle(x - 4, y - size * 1.2, (w + 8) * p, size * 1.8)
        c.clip()
    c.move_to(x, y)
    rgba(c, col, alpha)
    c.show_text(s)
    c.restore()
    return w


def wrap_lines(c, s, size, maxw, font=SANS, bold=False):
    words = s.split()
    lines, cur = [], ''
    for wd in words:
        trial = (cur + ' ' + wd).strip()
        if text_size(c, trial, size, font, bold)[0] > maxw and cur:
            lines.append(cur)
            cur = wd
        else:
            cur = trial
    if cur:
        lines.append(cur)
    return lines


# ---------- icons ----------
def coin(c, key, cx, cy, r=18, p=1.0, alpha=1.0):
    if p <= 0:
        return
    s = back(p)
    c.save()
    c.translate(cx, cy)
    c.scale(s, s)
    circle(c, key, 0, 0, r, 1, (0.72, 0.55, 0.0), 3, SUN, 1, alpha)
    write(c, '$', 0, r * 0.45, r * 1.25, 1, (0.5, 0.36, 0.0), SANS, True, 'center', alpha)
    c.restore()


def person(c, key, cx, cy, col=MINT, p=1.0, scale=1.0):
    s = scale
    circle(c, key + 'h', cx, cy - 46 * s, 26 * s, prog(p, 0, 0.5), INK, 4, col, 0.35)
    pts = [(cx - 46 * s, cy + 50 * s), (cx - 40 * s, cy + 6 * s), (cx - 20 * s, cy - 12 * s), (cx + 20 * s, cy - 12 * s), (cx + 40 * s, cy + 6 * s), (cx + 46 * s, cy + 50 * s)]
    if p > 0.3:
        c.move_to(*pts[0])
        for q in pts[1:]:
            c.line_to(*q)
        c.close_path()
        rgba(c, col, 0.35 * prog(p, 0.3, 0.4))
        c.fill()
    stroke_path(c, rough_points(key + 'b', pts, 1.2, 10), INK, 4, 1, prog(p, 0.3, 0.7))


def pop(c, p, cx, cy):
    """Scale about a point with overshoot; call before drawing, restore after."""
    s = back(clamp(p)) if p < 1 else 1
    c.save()
    c.translate(cx, cy)
    c.scale(max(s, 0.001), max(s, 0.001))
    c.translate(-cx, -cy)


def sticky(c, key, x, y, w, h, title, sub=None, col=SUN, p=1.0, rot=0.0, title_size=34, sub_size=26):
    if p <= 0:
        return
    c.save()
    c.translate(x + w / 2, y + h / 2)
    c.rotate(rot)
    s = back(p) if p < 1 else 1
    c.scale(s, s)
    c.translate(-w / 2, -h / 2)
    c.rectangle(6, 8, w, h)
    rgba(c, INK, 0.08)
    c.fill()
    c.rectangle(0, 0, w, h)
    rgba(c, col, 1)
    c.fill()
    write(c, title, w / 2, h / 2 - (8 if sub else -title_size * 0.3), title_size, 1, INK, HAND, True, 'center')
    if sub:
        write(c, sub, w / 2, h / 2 + sub_size + 6, sub_size, 1, INK, HAND, False, 'center', 0.8)
    c.restore()


# ---------- captions and transitions ----------
def caption(c, t, caps):
    for s, e, txt in caps:
        if s <= t < e:
            a = min(prog(t, s, 0.25), 1 - prog(t, e - 0.25, 0.25))
            lines = wrap_lines(c, txt, 38, 1500, SANS, True)
            lh = 50
            bh = lh * len(lines) + 34
            by = H - 40 - bh
            bw = max(text_size(c, ln, 38, SANS, True)[0] for ln in lines) + 70
            rounded(c, (W - bw) / 2, by, bw, bh, 22)
            rgba(c, INK, 0.9 * a)
            c.fill()
            for i, ln in enumerate(lines):
                write(c, ln, W / 2, by + 17 + lh * (i + 1) - 14, 38, 1, WHITE, SANS, True, 'center', a)


def wipe(c, t, dur, length=0.6):
    """Eraser sweep at the end of a scene, so each scene starts on a clean board."""
    p = prog(t, dur - length, length)
    if p <= 0:
        return
    x = ease(p) * (W + 200) - 200
    c.rectangle(0, 0, max(0, x), H)
    c.set_source_rgb(*PAPER)
    c.fill()
    rounded(c, x - 10, H * 0.25, 70, H * 0.5, 20)
    rgba(c, INK, 0.85)
    c.fill()
    rounded(c, x - 4, H * 0.25 + 10, 58, H * 0.5 - 20, 14)
    rgba(c, MINT, 1)
    c.fill()


def brand(c, x, y, p=1.0, size=34):
    if p <= 0:
        return
    rounded(c, x, y - size, size * 1.3, size * 1.3, 10)
    rgba(c, INK, p)
    c.fill()
    write(c, 'GS', x + size * 0.65, y - size * 0.15, size * 0.5, 1, LIME, SANS, True, 'center', p)
    write(c, 'GitHub Scout', x + size * 1.6, y - size * 0.1, size * 0.8, 1, INK, SANS, True, 'left', p)
