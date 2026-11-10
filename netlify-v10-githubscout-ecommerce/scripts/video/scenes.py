"""The ten scenes of the GitHub Scout bloat walkthrough. Each scene is
(duration, captions, draw(c, t)). Everything shown is an example store."""
from vidlib import *

MINT_SOFT = (0.91, 0.97, 0.95)
CORAL_SOFT = (1.0, 0.945, 0.937)
SUN_SOFT = (1.0, 0.973, 0.882)
BLUE_SOFT = (0.93, 0.945, 1.0)
LIME_SOFT = (0.95, 1.0, 0.82)

APPS = [
    ('Email marketing', 'founder', 'work', None),
    ('Product reviews', 'founder', 'work', None),
    ('Live chat', 'founder', 'work', None),
    ('Wishlist', 'founder', 'idle', 'hidden from the theme'),
    ('Photo reviews', 'founder', 'idle', 'doubles the reviews app'),
    ('Countdown timer', 'marketing', 'idle', 'the sale ended'),
    ('Holiday popup', 'marketing', 'idle', 'nobody sees it'),
    ('Back-in-stock alerts', 'marketing', 'work', None),
    ('Loyalty program', 'marketing', 'idle', 'never launched'),
    ('Page builder', 'agency', 'idle', 'pages taken down'),
    ('Upsell builder', 'agency', 'work', None),
    ('Size chart', 'agency', 'work', None),
    ('Heatmaps', 'freelancer', 'idle', 'nobody opens them'),
    ('Second analytics', 'freelancer', 'idle', 'counts the same visits'),
]
OWNER_COL = {'founder': MINT_SOFT, 'marketing': SUN_SOFT, 'agency': BLUE_SOFT, 'freelancer': CORAL_SOFT}


def pill(c, key, x, y, w, h, name, p=1.0, fill=WHITE, col=INK, size=30, coin_p=0.0):
    if p <= 0:
        return
    pop(c, p, x + w / 2, y + h / 2)
    rect(c, key, x, y, w, h, 1, col, 3, fill, 1, 1, h / 2)
    circle(c, key + 'i', x + h / 2 + 4, y + h / 2, h / 2 - 12, 1, col, 3, WHITE, 1)
    write(c, name[0], x + h / 2 + 4, y + h / 2 + 10, 26, 1, col, SANS, True, 'center')
    write(c, name, x + h + 16, y + h / 2 + 11, size, 1, INK, SANS, True)
    c.restore()
    if coin_p > 0:
        coin(c, key + 'c', x + w - 34, y + h / 2, 17, coin_p)


# ---------------------------------------------------------------- 1 title
def s1(c, t):
    write(c, 'Your store is paying for', W / 2, 380, 96, prog(t, 0.3, 2.0), INK, HAND, True, 'center')
    write(c, 'apps nobody uses.', W / 2, 520, 128, prog(t, 2.2, 1.8), CORAL, HAND, True, 'center')
    line(c, 'u1', 520, 560, 1400, 552, prog(t, 4.0, 0.8), INK, 7)
    for i, (x, y) in enumerate([(300, 300), (1640, 260), (240, 620), (1680, 640), (420, 760), (1500, 790)]):
        coin(c, 'tc%d' % i, x, y, 30, prog(t, 4.8 + i * 0.25, 0.5))
    write(c, 'A 4-minute walkthrough', W / 2, 700, 46, prog(t, 7.0, 1.2), MUTED, HAND, False, 'center')
    brand(c, W / 2 - 160, 820, prog(t, 8.0, 0.6), 40)


CAP1 = [
    (0.5, 7, 'Most Shopify stores pay every month for apps nobody uses anymore.'),
    (7, 13.4, "Let's walk through how that happens, and how to find them."),
]


# ---------------------------------------------------------------- 2 storefront
def browser(c, t, x=360, y=90, w=1200, h=760, start=0.3):
    rect(c, 'bw', x, y, w, h, prog(t, start, 1.6), INK, 5, WHITE, 1, 1, 22)
    p = prog(t, start + 1.2, 0.6)
    if p > 0:
        rounded(c, x + 3, y + 3, w - 6, 56, 20)
        rgba(c, INK, p)
        c.fill()
        for i, col in enumerate([CORAL, SUN, MINT]):
            c.arc(x + 34 + i * 26, y + 31, 8, 0, 6.3)
            rgba(c, col, p)
            c.fill()
        rounded(c, x + 130, y + 16, 420, 30, 15)
        rgba(c, (0.2, 0.25, 0.3), p)
        c.fill()
        write(c, 'example-store.com', x + 150, y + 38, 22, prog(t, start + 1.5, 0.8), (0.75, 0.8, 0.82), SANS)


def storefront(c, t, ox=0, oy=0, s=1.0, start=0.0):
    """Store page inside the browser at 360,90 1200x760."""
    T = t - start
    c.save()
    c.translate(ox, oy)
    c.scale(s, s)
    browser(c, T)
    write(c, 'Example Store', 410, 200, 40, prog(T, 2.0, 0.8), INK, HAND, True)
    for i in range(4):
        line(c, 'nav%d' % i, 1080 + i * 110, 190, 1160 + i * 110, 190, prog(T, 2.4 + i * 0.1, 0.3), MUTED, 5)
    rect(c, 'hero', 410, 240, 480, 360, prog(T, 2.8, 0.8), INK, 4, MINT_SOFT, 1, 1, 16)
    # a mug
    if T > 3.4:
        q = prog(T, 3.4, 0.6)
        rect(c, 'mug', 580, 340, 140, 170, q, INK, 5, WHITE, 1, 1, 18)
        circle(c, 'mugh', 735, 420, 38, q, INK, 5)
        line(c, 'steam1', 620, 320, 630, 280, q, MUTED, 4)
        line(c, 'steam2', 670, 320, 660, 275, q, MUTED, 4)
    write(c, 'Everyday Mug', 950, 300, 56, prog(T, 3.6, 0.8), INK, HAND, True)
    line(c, 'price', 950, 340, 1070, 340, prog(T, 4.2, 0.3), MUTED, 8)
    if T > 4.6:
        q = prog(T, 4.6, 0.4)
        rounded(c, 950, 470, 330, 72, 36)
        rgba(c, INK, q)
        c.fill()
        write(c, 'Add to cart', 1115, 517, 32, q, WHITE, SANS, True, 'center')
    write(c, '★★★★★', 950, 405, 40, prog(T, 5.0, 0.6), SUN, SANS, True)
    # you may also like strip (upsell)
    rect(c, 'ups', 410, 630, 1100, 70, prog(T, 5.6, 0.6), INK, 3, SUN_SOFT, 1, 1, 14)
    write(c, 'You may also like', 440, 675, 30, prog(T, 6.0, 0.6), INK, HAND, True)
    for i in range(3):
        rect(c, 'upi%d' % i, 830 + i * 120, 645, 90, 40, prog(T, 6.2 + i * 0.1, 0.3), INK, 2, WHITE, 1, 1, 8)
    # email bar
    rect(c, 'email', 410, 725, 1100, 90, prog(T, 6.4, 0.6), INK, 3, CORAL_SOFT, 1, 1, 14)
    write(c, 'Join our list for new arrivals', 440, 782, 32, prog(T, 6.8, 0.8), INK, HAND, True)
    # chat bubble
    if T > 7.2:
        q = back(prog(T, 7.2, 0.5))
        c.save()
        c.translate(1475, 560)
        c.scale(q, q)
        circle(c, 'chat', 0, 0, 42, 1, INK, 4, MINT, 1)
        write(c, '...', 0, 6, 36, 1, WHITE, SANS, True, 'center')
        c.restore()
    c.restore()


def s2(c, t):
    storefront(c, t)
    labels = [
        ('Reviews app', 1600, 240, (1160, 385), 9.5, MINT_SOFT),
        ('Upsell app', 60, 520, (410, 665), 10.6, SUN_SOFT),
        ('Email signup app', 1590, 790, (1510, 770), 11.7, CORAL_SOFT),
        ('Chat app', 1600, 470, (1515, 545), 12.8, LIME_SOFT),
    ]
    for i, (txt, x, y, (ax, ay), st, col) in enumerate(labels):
        sticky(c, 'l%d' % i, x, y, 270, 90, txt, None, col, prog(t, st, 0.5), -0.03 if i % 2 else 0.03, 32)
        sx = x + 270 if x < 400 else x
        arrow(c, 'la%d' % i, sx, y + 45, ax, ay, prog(t, st + 0.4, 0.7), INK, 4, 16, 0.12)
    p = prog(t, 17, 1.0)
    if p > 0:
        write(c, 'and behind the scenes?', W / 2, 62, 40, p, CORAL, HAND, True, 'center')


CAP2 = [
    (0.5, 8, 'This is what your customers see: products, a cart, and a few helpful widgets.'),
    (8, 16, 'Each of those widgets comes from an app someone installed.'),
    (16, 25.4, 'But the storefront only tells part of the story. The rest lives in your admin.'),
]


# ---------------------------------------------------------------- 3 admin list
def admin_frame(c, t, title='Apps', sub='Example store admin'):
    rect(c, 'adm', 150, 90, 1620, 790, prog(t, 0.3, 1.4), INK, 5, WHITE, 1, 1, 22)
    p = prog(t, 1.2, 0.6)
    if p > 0:
        c.rectangle(153, 93, 230, 784)
        rgba(c, (0.95, 0.96, 0.95), p)
        c.fill()
        for i, lab in enumerate(['Home', 'Orders', 'Products', 'Customers', 'Marketing', 'Apps', 'Settings']):
            if lab == 'Apps':
                rounded(c, 168, 160 + i * 62 - 34, 200, 48, 12)
                rgba(c, LIME, p)
                c.fill()
            write(c, lab, 190, 160 + i * 62, 26, p, INK, SANS, lab == 'Apps')
    write(c, title, 430, 170, 54, prog(t, 1.6, 0.6), INK, SANS, True)
    write(c, sub, 432, 210, 26, prog(t, 2.0, 0.6), MUTED, SANS)


def app_slot(i):
    col, row = divmod(i, 7)
    return 430 + col * 650, 250 + row * 86


def s3(c, t):
    admin_frame(c, t)
    for i, (name, _, _, _) in enumerate(APPS):
        x, y = app_slot(i)
        st = 3.0 + i * 0.5
        pill(c, 'ap%d' % i, x, y, 610, 70, name, prog(t, st, 0.45), WHITE, INK, 30, prog(t, st + 0.35, 0.4))
    p = prog(t, 11.5, 1.0)
    if p > 0:
        write(c, '14 apps installed', 1200, 175, 44, p, CORAL, HAND, True)
        write(c, 'every one billing monthly', 1200, 215, 30, prog(t, 12.3, 1.0), CORAL, HAND)
    for k, i in enumerate([5, 6, 9, 12, 8, 3]):
        x, y = app_slot(i)
        write(c, '?', x + 480, y + 54, 64, prog(t, 19.5 + k * 0.6, 0.4), CORAL, HAND, True)


CAP3 = [
    (0.5, 9, "Now look behind the counter. This is the app list in an example store's admin."),
    (9, 18, 'Fourteen apps, and every one of them bills every month.'),
    (18, 29.4, 'The question nobody asks: which of these are still doing anything?'),
]


# ---------------------------------------------------------------- 4 who installed
PEOPLE = [
    ('founder', 'Founder', 'at launch', 260, 6.5, MINT, 'Launch: done'),
    ('marketing', 'Marketing manager', 'for Black Friday', 730, 13.0, SUN, 'Sale: over'),
    ('agency', 'Agency', 'during the redesign', 1200, 19.0, BLUE, 'Redesign: shipped'),
    ('freelancer', 'Freelancer', 'to fix tracking', 1660, 21.5, CORAL, 'Fix: done'),
]


def s4(c, t):
    write(c, 'Who added them, and why', W / 2, 60, 46, prog(t, 0.4, 1.2), INK, HAND, True, 'center')
    for pi, (key, role, why, cx, st, col, stamp) in enumerate(PEOPLE):
        ps = 1.4 + pi * 0.9
        person(c, 'p' + key, cx, 235, col, prog(t, ps, 0.9), 0.95)
        write(c, role, cx, 330, 34, prog(t, ps + 0.4, 0.6), INK, HAND, True, 'center')
        write(c, why, cx, 364, 28, prog(t, ps + 0.7, 0.6), MUTED, HAND, False, 'center')
        mine = [a for a in APPS if a[1] == key]
        for j, (name, _, _, _) in enumerate(mine):
            y = 400 + j * 84
            rot = (-0.03, 0.025, -0.015, 0.03, -0.02)[j % 5]
            sticky(c, 's%s%d' % (key, j), cx - 165, y, 330, 66, name, None, OWNER_COL[key], prog(t, st + 1.0 + j * 0.45, 0.45), rot, 30)
            coin(c, 'sc%s%d' % (key, j), cx + 190, y + 33, 18, prog(t, 29.5 + pi * 0.4 + j * 0.15, 0.4))
        # project done stamp
        p = prog(t, 25.0 + pi * 0.8, 0.4)
        if p > 0:
            c.save()
            c.translate(cx, 140)
            c.rotate(-0.12)
            s = back(p)
            c.scale(s, s)
            w = text_size(c, stamp, 30, HAND, True)[0] + 36
            rect(c, 'st' + key, -w / 2, -30, w, 52, 1, CORAL, 4, WHITE, 0.9, 1, 8)
            write(c, stamp, 0, 6, 30, 1, CORAL, HAND, True, 'center')
            c.restore()


CAP4 = [
    (0.5, 6.5, 'Nobody installed these by mistake.'),
    (6.5, 13, 'The founder added the basics at launch.'),
    (13, 19, 'The marketing manager added a timer, a popup and a loyalty trial for Black Friday.'),
    (19, 24.5, 'An agency added a page builder during the redesign. A freelancer added heatmaps to fix tracking.'),
    (24.5, 35.4, 'Then each project ended. The apps stayed. So did the monthly bills.'),
]


# ---------------------------------------------------------------- 5 sort
def s5(c, t):
    hp = prog(t, 0.4, 0.8)
    rect(c, 'hw', 110, 120, 760, 80, hp, MINT, 4, MINT_SOFT, 1, 1, 18)
    write(c, 'Still working', 140, 175, 44, prog(t, 0.8, 0.8), INK, HAND, True)
    rect(c, 'hi', 960, 120, 850, 80, hp, CORAL, 4, CORAL_SOFT, 1, 1, 18)
    write(c, 'Idle, still billing', 990, 175, 44, prog(t, 0.8, 0.8), INK, HAND, True)
    wi = ii = 0
    for i, (name, _, state, reason) in enumerate(APPS):
        sx, sy = app_slot(i)
        sx, sy = sx - 280, sy + 20
        if state == 'work':
            tx, ty = 110, 230 + wi * 84
            wi += 1
            delay = 4.0 + wi * 0.5
        else:
            tx, ty = 960, 230 + ii * 84
            ii += 1
            delay = 9.0 + ii * 0.55
        m = ease(prog(t, delay, 0.8))
        x, y = lerp(sx, tx, m), lerp(sy, ty, m)
        w = lerp(560, 430, m) if state == 'idle' else lerp(560, 600, m)
        fill = WHITE if m < 1 else (MINT_SOFT if state == 'work' else WHITE)
        pill(c, 'sp%d' % i, x, y, w, 66, name, prog(t, 1.2 + i * 0.12, 0.3), fill, INK, 28)
        if state == 'work':
            check(c, 'ck%d' % i, x + w - 70, y + 34, 0.9, prog(t, delay + 0.9, 0.4))
        else:
            coin(c, 'ic%d' % i, x + w - 32, y + 33, 17, prog(t, delay + 0.9, 0.4))
            write(c, reason, x + w + 22, y + 44, 30, prog(t, 13.0 + (ii - 1) * 1.1, 0.8), CORAL, HAND, True)
    p = prog(t, 24.5, 0.8)
    if p > 0:
        write(c, '6 working', 680, 175, 34, p, MINT, HAND, True)
        write(c, '8 idle', 1700, 175, 34, p, CORAL, HAND, True)


CAP5 = [
    (0.5, 6, 'Sort them by what they actually do today.'),
    (6, 12, 'Six still earn their keep.'),
    (12, 24, 'Eight are idle. A timer for a sale that ended. A popup nobody sees. Heatmaps nobody opens. A loyalty program that never launched.'),
    (24, 33.4, "Idle apps don't stop billing. That's bloat, and it adds up every single month."),
]


# ---------------------------------------------------------------- 6 three kinds
def card(c, key, x, y, w, h, p, title, lines, col, icon, t_lines):
    if p <= 0:
        return
    pop(c, p, x + w / 2, y + h / 2)
    rect(c, key, x, y, w, h, 1, INK, 4, WHITE, 1, 1, 26)
    rounded(c, x + 3, y + 3, w - 6, 210, 24)
    rgba(c, col, 1)
    c.fill()
    icon(c, x + w / 2, y + 108)
    write(c, title, x + 36, y + 290, 64, 1, INK, HAND, True)
    c.restore()
    for i, ln in enumerate(lines):
        write(c, ln, x + 36, y + 360 + i * 46, 32, t_lines(i), INK, SANS)


def icon_idle(c, cx, cy):
    rect(c, 'ii', cx - 70, cy - 60, 140, 120, 1, INK, 5, WHITE, 1, 1, 28)
    write(c, 'z', cx - 10, cy + 10, 50, 1, INK, HAND, True)
    write(c, 'z', cx + 22, cy - 18, 38, 1, INK, HAND, True)
    write(c, 'z', cx + 46, cy - 40, 28, 1, INK, HAND, True)
    coin(c, 'iic', cx + 90, cy + 40, 22)


def icon_leftover(c, cx, cy):
    rect(c, 'tl', cx - 60, cy - 30, 120, 110, 1, INK, 5, WHITE, 1, 1, 10)
    line(c, 'tlid', cx - 78, cy - 44, cx + 78, cy - 44, 1, INK, 6)
    line(c, 'tlh', cx - 20, cy - 62, cx + 20, cy - 62, 1, INK, 6)
    for i in (-28, 0, 28):
        line(c, 'tls%d' % i, cx + i, cy - 10, cx + i, cy + 60, 1, MUTED, 4)
    write(c, '</>', cx + 50, cy - 70, 46, 1, CORAL, SANS, True)


def icon_double(c, cx, cy):
    rect(c, 'd1', cx - 95, cy - 55, 120, 110, 1, INK, 5, WHITE, 1, 1, 22)
    rect(c, 'd2', cx - 25, cy - 35, 120, 110, 1, INK, 5, WHITE, 1, 1, 22)
    write(c, '★', cx - 52, cy + 10, 50, 1, SUN, SANS, True, 'center')
    write(c, '★', cx + 35, cy + 35, 50, 1, SUN, SANS, True, 'center')


def s6(c, t):
    write(c, 'Three kinds of bloat', W / 2, 120, 72, prog(t, 0.3, 1.4), INK, HAND, True, 'center')
    specs = [
        ('Idle', ['Installed and billing.', 'Not doing anything.'], SUN_SOFT, icon_idle, 4.0),
        ('Leftover', ['Switched off, but its', 'code can still load', 'on your pages.'], CORAL_SOFT, icon_leftover, 11.0),
        ('Doubled', ['Two tools doing', 'one job.'], BLUE_SOFT, icon_double, 19.0),
    ]
    for i, (title, lines, col, icon, st) in enumerate(specs):
        x = 150 + i * 570
        card(c, 'k%d' % i, x, 200, 500, 560, prog(t, st, 0.6), title, lines, col, icon, lambda j, st=st: prog(t, st + 0.8 + j * 0.7, 0.7))


CAP6 = [
    (0.5, 4, 'That bloat comes in three kinds.'),
    (4, 11, 'Idle: installed and billing, but not doing anything anymore.'),
    (11, 19, 'Leftover: switched off, but its code can still load on your pages and slow them down.'),
    (19, 27.4, 'Doubled: two tools doing one job, like two reviews apps.'),
]


# ---------------------------------------------------------------- 7 free check
def s7(c, t):
    brand(c, 120, 110, prog(t, 0.3, 0.6), 40)
    write(c, 'Free store check', 1800, 105, 40, prog(t, 0.6, 0.8), MINT, HAND, True, 'right')
    p = prog(t, 0.8, 0.8)
    if p > 0:
        rounded(c, 460, 160, 1000, 92, 46)
        rgba(c, WHITE, p)
        c.fill()
        rect(c, 'sb', 460, 160, 1000, 92, p, INK, 4, None, 1, 1, 46)
        typed = 'example-store.com'[: int(prog(t, 1.6, 1.6) * 17)]
        write(c, typed + ('|' if 1.6 < t < 3.4 and int(t * 3) % 2 else ''), 520, 220, 38, 1, INK, SANS)
        q = prog(t, 3.2, 0.4)
        if q > 0:
            rounded(c, 1190, 172, 258, 68, 34)
            rgba(c, CORAL, q)
            c.fill()
            write(c, 'Check my store', 1319, 216, 28, q, WHITE, SANS, True, 'center')
    # mini storefront
    c.save()
    c.translate(120, 300)
    c.scale(0.58, 0.58)
    c.translate(-360, -90)
    storefront(c, t + 9, 0, 0, 1.0, 0)
    c.restore()
    sp = prog(t, 4.5, 3.5)
    if 0 < sp < 1:
        y = 300 + sp * 440
        c.rectangle(120, y - 6, 696, 12)
        rgba(c, MINT, 0.55)
        c.fill()
    # result card
    q = prog(t, 8.0, 0.6)
    if q > 0:
        pop(c, q, 1330, 560)
        rect(c, 'rc', 900, 290, 880, 560, 1, INK, 4, WHITE, 1, 1, 24)
        write(c, 'Apps we can see loading', 940, 350, 40, 1, INK, SANS, True)
        c.restore()
    rows = [
        ('Email marketing', 'Clearly running', MINT),
        ('Product reviews', 'Clearly running', MINT),
        ('Photo reviews', 'Doubled', CORAL),
        ('Live chat', 'Clearly running', MINT),
        ('Upsell builder', 'Probably running', SUN),
        ('Countdown timer', 'Clearly running', MINT),
    ]
    for i, (name, tag, col) in enumerate(rows):
        y = 395 + i * 66
        rp = prog(t, 9.0 + i * 0.6, 0.4)
        write(c, name, 950, y + 40, 32, rp, INK, SANS, True)
        if rp > 0:
            w = text_size(c, tag, 24, SANS, True)[0] + 30
            rounded(c, 1730 - w, y + 12, w, 40, 20)
            rgba(c, col, rp * (0.25 if col != CORAL else 1))
            c.fill()
            write(c, tag, 1730 - w / 2, y + 40, 24, rp, WHITE if col == CORAL else INK, SANS, True, 'center')
        line(c, 'rl%d' % i, 950, y + 60, 1740, y + 60, rp, LINE, 2, 1, 0.5)
    # annotation for the timer
    p = prog(t, 17.5, 1.0)
    if p > 0:
        arrow(c, 'tma', 1240, 820, 1180, 772, p, CORAL, 4, 14, -0.2)
        write(c, 'the sale ended months ago?', 1250, 830, 34, p, CORAL, HAND, True)
    p = prog(t, 23.5, 0.8)
    if p > 0:
        write(c, "Can't see: apps that only run inside your admin", 120, 880 - 20, 32, p, MUTED, HAND, True)


CAP7 = [
    (0.5, 8, 'GitHub Scout starts with a free check. Paste your store address.'),
    (8, 17, "It looks at your store the way a shopper's browser does, and lists the apps it can see loading."),
    (17, 23, "It flags tools doing the same job, and shows what's still loading, like a timer from a sale that ended."),
    (23, 29.4, "It can't see apps that only run inside your admin. We say so up front."),
]


# ---------------------------------------------------------------- 8 compare
ADMIN = ['Email marketing', 'Product reviews', 'Photo reviews', 'Live chat', 'Wishlist', 'Loyalty program', 'Page builder']
PAGES = ['Email marketing', 'Product reviews', 'Photo reviews', 'Live chat', None, None, None, 'Old popup code']


def s8(c, t):
    write(c, 'In your admin', 140, 130, 44, prog(t, 0.6, 0.8), INK, HAND, True)
    write(c, '(billing)', 140, 168, 30, prog(t, 1.0, 0.6), MUTED, HAND)
    write(c, 'Loading on your pages', 1780, 130, 44, prog(t, 4.0, 0.8), INK, HAND, True, 'right')
    write(c, '(free check)', 1780, 168, 30, prog(t, 4.4, 0.6), MUTED, HAND, False, 'right')
    for i, name in enumerate(ADMIN):
        pill(c, 'ad%d' % i, 120, 200 + i * 80, 520, 64, name, prog(t, 1.2 + i * 0.3, 0.35), WHITE, INK, 28)
    for i, name in enumerate(PAGES):
        if name:
            y = 200 + (i if i < 4 else 7) * 80
            pill(c, 'pg%d' % i, 1280, y, 520, 64, name, prog(t, 4.6 + min(i, 4) * 0.3, 0.35), WHITE, INK, 28)
    for i in range(4):
        y = 232 + i * 80
        line(c, 'm%d' % i, 650, y, 1270, y, prog(t, 9.0 + i * 0.5, 0.6), MINT, 5)
        check(c, 'mc%d' % i, 940, y - 2, 0.8, prog(t, 9.4 + i * 0.5, 0.3))
    p = prog(t, 15.0, 0.8)
    if p > 0:
        rect(c, 'nb', 112, 512, 536, 230, p, CORAL, 5, None)
        arrow(c, 'na', 660, 620, 820, 620, p, CORAL, 5, 18)
        write(c, 'Billing, but not', 840, 600, 40, prog(t, 15.6, 0.8), CORAL, HAND, True)
        write(c, 'showing up anywhere.', 840, 645, 40, prog(t, 16.2, 0.8), CORAL, HAND, True)
        write(c, 'What is it for?', 840, 700, 36, prog(t, 17.0, 0.6), INK, HAND)
    p = prog(t, 21.0, 0.8)
    if p > 0:
        rect(c, 'lb', 1272, 752, 536, 80, p, SUN, 5, None)
        arrow(c, 'la', 1260, 792, 1120, 820, p, (0.72, 0.55, 0.0), 5, 18, 0.1)
        write(c, 'Gone from your list,', 680, 815, 36, prog(t, 21.6, 0.8), (0.6, 0.45, 0.0), HAND, True)
        write(c, 'still loading: leftover code.', 680, 855, 36, prog(t, 22.2, 0.8), (0.6, 0.45, 0.0), HAND, True)


CAP8 = [
    (0.5, 8, 'The reviewed audit adds the part only you can see: your app list from Shopify admin.'),
    (8, 15, 'A person lines the two lists up.'),
    (15, 21, "Billing, but not showing up anywhere? Ask what it's for."),
    (21, 25.4, "Loading on your pages, but gone from your list? That's leftover code."),
]


# ---------------------------------------------------------------- 9 plan
def s9(c, t):
    p = prog(t, 0.3, 0.7)
    if p > 0:
        pop(c, p, W / 2, 470)
        c.rectangle(560 + 16, 80 + 18, 800, 780)
        rgba(c, INK, 0.08)
        c.fill()
        rect(c, 'pl', 560, 80, 800, 780, 1, INK, 5, WHITE, 1, 1, 26)
        write(c, 'YOUR APP PLAN', 620, 160, 26, 1, MINT, SANS, True)
        write(c, 'What to do first', 620, 225, 54, 1, INK, HAND, True)
        c.restore()
    rows = [
        ('CUT', CORAL, CORAL_SOFT, 'Countdown timer and holiday popup'),
        ('CUT', CORAL, CORAL_SOFT, 'Photo reviews (doubled)'),
        ('KEEP', MINT, MINT_SOFT, 'Email marketing, reviews, chat'),
        ('SWAP', SUN, SUN_SOFT, "Wishlist: use the theme's built-in"),
        ('TEST', BLUE, BLUE_SOFT, 'Upsell builder: off for a month'),
        ('CLEAN', INK, (0.94, 0.95, 0.95), 'Remove the old popup code'),
    ]
    for i, (tag, col, soft, txt) in enumerate(rows):
        y = 270 + i * 92
        rp = prog(t, 1.4 + i * 0.9, 0.4)
        if rp <= 0:
            continue
        rounded(c, 620, y, 680 * ease_out(rp), 76, 16)
        rgba(c, soft, 1)
        c.fill()
        if rp > 0.5:
            tw = text_size(c, tag, 24, SANS, True)[0] + 30
            rounded(c, 640, y + 20, tw, 38, 19)
            rgba(c, col, 1)
            c.fill()
            write(c, tag, 640 + tw / 2, y + 47, 24, 1, WHITE if tag != 'SWAP' else INK, SANS, True, 'center')
            write(c, txt, 640 + tw + 20, y + 49, 30, prog(t, 1.7 + i * 0.9, 0.6), INK, SANS, True)
    p = prog(t, 9.5, 0.5)
    if p > 0:
        c.save()
        c.translate(1440, 180)
        s = back(p)
        c.scale(s, s)
        circle(c, 'ok', 0, 0, 70, 1, INK, 4, LIME, 1)
        check(c, 'okc', -34, 2, 1.6, 1, INK, 10)
        c.restore()
    for i, (txt, y) in enumerate([('Read by a person', 330), ('No app to install', 430), ('We sell no apps', 530)]):
        q = prog(t, 10.5 + i * 0.9, 0.6)
        sticky(c, 'b%d' % i, 1430, y, 300, 76, txt, None, LIME_SOFT, q, 0.03 * (-1) ** i, 30)


CAP9 = [
    (0.5, 9, 'You get one page back: what to cut, what to keep, what to swap, and what to test.'),
    (9, 17.4, "Read by a person. No app to install. And we don't sell any of the apps we recommend."),
]


# ---------------------------------------------------------------- 10 cut safely
def s10(c, t):
    p = prog(t, 0.3, 0.8)
    rect(c, 'cb', 500, 120, 920, 720, p, INK, 5, WHITE, 1, 1, 26)
    rect(c, 'clip', 830, 90, 260, 70, p, INK, 5, LINE, 1, 1, 18)
    write(c, 'Cut safely', 560, 250, 64, prog(t, 1.0, 1.0), INK, HAND, True)
    items = ['Export any data you need', 'Switch it off for one billing cycle', 'Check the theme for code it left behind', 'Then cancel the subscription']
    for i, txt in enumerate(items):
        y = 360 + i * 115
        st = 3.0 + i * 4.5
        rect(c, 'bx%d' % i, 560, y - 40, 56, 56, prog(t, st, 0.4), INK, 4, WHITE, 1, 1, 10)
        write(c, txt, 650, y, 40, prog(t, st + 0.3, 1.2), INK, HAND, True)
        check(c, 'cx%d' % i, 566, y - 16, 1.05, prog(t, st + 1.8, 0.4), MINT, 8)


CAP10 = [
    (0.5, 3, 'Then cut safely.'),
    (3, 12, 'Export what you need. Switch it off for one billing cycle.'),
    (12, 23.4, 'Check your theme for code it left behind. Then cancel.'),
]


# ---------------------------------------------------------------- 11 cta
def s11(c, t):
    write(c, 'Find the bloat.', W / 2, 330, 120, prog(t, 0.3, 1.4), INK, HAND, True, 'center')
    write(c, 'Keep what works.', W / 2, 470, 120, prog(t, 1.8, 1.4), MINT, HAND, True, 'center')
    p = prog(t, 3.6, 0.6)
    if p > 0:
        pop(c, p, W / 2, 610)
        rounded(c, W / 2 - 430, 565, 860, 96, 48)
        rgba(c, WHITE, 1)
        c.fill()
        rect(c, 'cs', W / 2 - 430, 565, 860, 96, 1, INK, 4, None, 1, 1, 48)
        write(c, 'yourstore.com', W / 2 - 370, 627, 38, 1, MUTED, SANS)
        rounded(c, W / 2 + 120, 577, 298, 72, 36)
        rgba(c, CORAL, 1)
        c.fill()
        write(c, 'Check my store', W / 2 + 269, 624, 30, 1, WHITE, SANS, True, 'center')
        c.restore()
    write(c, 'Free. No sign-up. Nothing to install.', W / 2, 730, 38, prog(t, 4.6, 1.0), MUTED, HAND, False, 'center')
    brand(c, W / 2 - 170, 840, prog(t, 6.0, 0.6), 44)


CAP11 = [
    (0.5, 7, 'Find the bloat. Keep what works.'),
    (7, 15.4, 'Run the free check on your store. The link is right below this video.'),
]


SCENES = [
    ('01-title', 14, CAP1, s1),
    ('02-storefront', 26, CAP2, s2),
    ('03-admin', 30, CAP3, s3),
    ('04-who', 36, CAP4, s4),
    ('05-sort', 34, CAP5, s5),
    ('06-kinds', 28, CAP6, s6),
    ('07-check', 30, CAP7, s7),
    ('08-compare', 26, CAP8, s8),
    ('09-plan', 18, CAP9, s9),
    ('10-cut', 24, CAP10, s10),
    ('11-cta', 16, CAP11, s11),
]


def frame(idx, t, captions=True):
    name, dur, caps, fn = SCENES[idx]
    s, c = new_surface()
    background(c)
    fn(c, t)
    if captions:
        caption(c, t, caps)
    if idx < len(SCENES) - 1:
        wipe(c, t, dur)
    return s
