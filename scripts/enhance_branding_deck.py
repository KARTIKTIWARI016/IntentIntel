"""
Append a hands-on "Branding Toolkit" section to Branding_Digital_World (1).pptx.
Adds 8 framework + exercise slides before the final "Thank You" slide,
matching the deck's dark-navy / orange design system.
"""
import copy
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn

SRC = r"Branding_Digital_World (1).pptx"
OUT = r"Branding_Digital_World_ENHANCED.pptx"

# ---- palette (sampled from the deck) ----
BG     = RGBColor(0x1A, 0x1A, 0x2E)   # dark navy background
PANEL  = RGBColor(0x16, 0x21, 0x3E)   # card navy
PANEL2 = RGBColor(0x0F, 0x0F, 0x23)   # deeper card
ORANGE = RGBColor(0xFF, 0x6B, 0x35)   # signature accent
WHITE  = RGBColor(0xFF, 0xFF, 0xFF)
GRAY   = RGBColor(0xA0, 0xA0, 0xA0)
DIM    = RGBColor(0x55, 0x55, 0x55)
HEAD = "Arial"
BODY = "Calibri"

prs = Presentation(SRC)
SW, SH = prs.slide_width, prs.slide_height  # 9144000 x 5143500

# pick the layout with fewest placeholders (most "blank")
layout = min(prs.slide_layouts, key=lambda l: len(l.placeholders))

# remember the final "Thank You" slide element so we can keep it last
sldIdLst = prs.slides._sldIdLst
thankyou_el = list(sldIdLst)[-1]


def new_slide(bg=BG):
    s = prs.slides.add_slide(layout)
    for ph in list(s.placeholders):
        ph._element.getparent().remove(ph._element)
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = bg
    return s


def _set_para(p, text, size, color, bold=False, font=BODY, align=PP_ALIGN.LEFT,
              sa=2, italic=False):
    p.alignment = align
    p.space_after = Pt(sa)
    p.space_before = Pt(0)
    r = p.add_run()
    r.text = text
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.italic = italic
    r.font.name = font
    r.font.color.rgb = color
    return p


def text(slide, l, t, w, h, lines, anchor=MSO_ANCHOR.TOP):
    """lines: list of dicts -> paragraphs."""
    tb = slide.shapes.add_textbox(Inches(l), Inches(t), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    for m in (tf.margin_left, ):
        pass
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    for i, ln in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        _set_para(p, ln["t"], ln["s"], ln.get("c", WHITE), ln.get("b", False),
                  ln.get("f", BODY), ln.get("a", PP_ALIGN.LEFT),
                  ln.get("sa", 2), ln.get("i", False))
    return tb


def card(slide, l, t, w, h, fill=PANEL, line=None, radius=0.08, shape=MSO_SHAPE.ROUNDED_RECTANGLE):
    sp = slide.shapes.add_shape(shape, Inches(l), Inches(t), Inches(w), Inches(h))
    sp.fill.solid()
    sp.fill.fore_color.rgb = fill
    if line is None:
        sp.line.fill.background()
    else:
        sp.line.color.rgb = line
        sp.line.width = Pt(1)
    sp.shadow.inherit = False
    # adjust corner radius
    try:
        sp.adjustments[0] = radius
    except Exception:
        pass
    sp.text_frame.word_wrap = True
    sp.text_frame.margin_left = sp.text_frame.margin_right = Inches(0.12)
    sp.text_frame.margin_top = sp.text_frame.margin_bottom = Inches(0.08)
    return sp


def kicker(slide, label):
    text(slide, 0.55, 0.30, 9, 0.4,
         [{"t": label, "s": 12, "c": ORANGE, "b": True, "f": HEAD}])


def title(slide, ttl, y=0.62, size=27, color=WHITE):
    text(slide, 0.55, y, 9, 0.7,
         [{"t": ttl, "s": size, "c": color, "b": True, "f": HEAD}])


def subtitle(slide, sub, y=1.18, color=GRAY, size=12.5):
    text(slide, 0.55, y, 9, 0.5,
         [{"t": sub, "s": size, "c": color, "f": BODY, "i": True}])


# =====================================================================
# SLIDE A — PART FIVE divider (orange)
# =====================================================================
s = new_slide(ORANGE)
text(s, 0.55, 1.05, 9, 0.4,
     [{"t": "PART FIVE", "s": 13, "c": BG, "b": True, "f": HEAD}])
text(s, 0.55, 1.45, 9, 1.6,
     [{"t": "FROM WATCHING", "s": 46, "c": WHITE, "b": True, "f": HEAD, "sa": 0},
      {"t": "TO BUILDING", "s": 46, "c": WHITE, "b": True, "f": HEAD}])
text(s, 0.55, 3.05, 9, 0.5,
     [{"t": "THE BRANDING TOOLKIT", "s": 18, "c": BG, "b": True, "f": HEAD}])
text(s, 0.55, 3.55, 9, 0.5,
     [{"t": "Stop studying brands. Here are the words, the models, and the exercises to build one.",
       "s": 13, "c": BG, "f": BODY}])
chips = ["VOCABULARY", "3 FRAMEWORKS", "HANDS-ON"]
cw, gap = 2.55, 0.25
x0 = (10 - (cw * 3 + gap * 2)) / 2
for i, ch in enumerate(chips):
    c = card(s, x0 + i * (cw + gap), 4.35, cw, 0.7, fill=BG, radius=0.18)
    tf = c.text_frame; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    _set_para(tf.paragraphs[0], f"0{i+1}   {ch}", 13, WHITE, True, HEAD, PP_ALIGN.CENTER)

# =====================================================================
# SLIDE B — SPEAK THE LANGUAGE (vocabulary)
# =====================================================================
s = new_slide()
kicker(s, "PART FIVE · THE TOOLKIT")
title(s, "FIRST, SPEAK THE LANGUAGE", size=26)
subtitle(s, "Five words people swap by mistake. They are not the same thing.")
terms = [
    ("BRAND", "The position / gut-feeling that lives in the customer's mind. The asset."),
    ("BRANDING", "The deliberate ACTIONS you take to shape that feeling. The work."),
    ("BRAND IDENTITY", "What you SEND OUT — name, logo, voice, colour. You control this."),
    ("BRAND IMAGE", "What they ACTUALLY perceive. You only influence this."),
    ("BRAND EQUITY", "The commercial VALUE of the position — price premium, loyalty, recall."),
    ("POSITIONING", "The strategic CHOICE of which empty space in the mind to own."),
]
gw, gh, gx, gy, gxp, gyp = 2.93, 1.18, 0.55, 1.62, 0.10, 0.12
for i, (h, d) in enumerate(terms):
    r, cidx = divmod(i, 3)
    x = gx + cidx * (gw + gxp)
    y = gy + r * (gh + gyp)
    c = card(s, x, y, gw, gh, fill=PANEL)
    tf = c.text_frame
    _set_para(tf.paragraphs[0], h, 13, ORANGE, True, HEAD, sa=3)
    _set_para(tf.add_paragraph(), d, 9.5, GRAY, False, BODY)
text(s, 0.55, 4.30, 9, 0.6,
     [{"t": "Identity is what you SAY.  Image is what they HEAR.  Branding is closing the gap.",
       "s": 13, "c": WHITE, "b": True, "f": HEAD, "a": PP_ALIGN.CENTER}],
     anchor=MSO_ANCHOR.MIDDLE)

# =====================================================================
# SLIDE C — Kapferer's Brand Identity Prism (model)
# =====================================================================
s = new_slide()
kicker(s, "FRAMEWORK 1")
title(s, "KAPFERER'S BRAND IDENTITY PRISM", size=24)
subtitle(s, "Six facets that define a complete identity. Gaps here are gaps a rival will fill.")
# axis labels
text(s, 0.55, 1.70, 9, 0.3,
     [{"t": "▲  PICTURE OF SENDER  (what the brand projects)", "s": 10, "c": ORANGE, "b": True, "f": HEAD}])
text(s, 0.55, 4.70, 9, 0.3,
     [{"t": "▼  PICTURE OF RECIPIENT  (who the customer becomes)", "s": 10, "c": ORANGE, "b": True, "f": HEAD}])
facets = [
    # (title, desc, col, row)
    ("PHYSIQUE", "Tangible look — logo, packaging, product feel.", 0, 0),
    ("PERSONALITY", "If it were a person: its character & tone of voice.", 1, 0),
    ("RELATIONSHIP", "The bond / exchange between brand and customer.", 0, 1),
    ("CULTURE", "The values & origin story the brand stands for.", 1, 1),
    ("REFLECTION", "The customer it APPEARS made for (the buyer's image).", 0, 2),
    ("SELF-IMAGE", "How buyers see THEMSELVES when they use it.", 1, 2),
]
pw, ph_, px, py, pxp, pyp = 4.25, 0.83, 0.55, 2.05, 0.30, 0.06
for h, d, col, row in facets:
    x = px + col * (pw + pxp)
    y = py + row * (ph_ + pyp)
    c = card(s, x, y, pw, ph_, fill=(PANEL if (col + row) % 2 == 0 else PANEL2))
    tf = c.text_frame
    _set_para(tf.paragraphs[0], h, 12, ORANGE, True, HEAD, sa=1)
    _set_para(tf.add_paragraph(), d, 9.5, GRAY, False, BODY)
# left/right vertical hints
text(s, 0.05, 2.9, 0.5, 1.5, [{"t": "E X T E R N A L", "s": 8, "c": DIM, "b": True, "f": HEAD}])
text(s, 9.5, 2.9, 0.5, 1.5, [{"t": "I N T E R N A L", "s": 8, "c": DIM, "b": True, "f": HEAD}])

# =====================================================================
# SLIDE D — Kapferer applied (boAt) + your turn
# =====================================================================
s = new_slide()
kicker(s, "FRAMEWORK 1 · APPLIED")
title(s, "THE PRISM, FILLED IN:  boAt", size=24)
subtitle(s, "The deck already showed boAt owns “boAthead.” Here is the whole identity, facet by facet.")
rows = [
    ("Physique", "Loud, colourful audio gear — Rockerz, Airdopes, Stone."),
    ("Personality", "Cheeky, confident, street-smart. Never corporate."),
    ("Relationship", "A squad you belong to — the “boAthead” tribe."),
    ("Culture", "Young, aspirational, made-for-India hustle."),
    ("Reflection", "“A trendy Gen-Z Indian who refuses to overpay.”"),
    ("Self-image", "“I'm stylish and in-the-know without selling out.”"),
]
ry = 1.70
for h, d in rows:
    card(s, 0.55, ry, 2.15, 0.46, fill=ORANGE, radius=0.12)
    tb = s.shapes[-1]; tb.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE
    _set_para(tb.text_frame.paragraphs[0], h, 12, BG, True, HEAD, PP_ALIGN.CENTER)
    text(s, 2.85, ry + 0.04, 4.6, 0.42, [{"t": d, "s": 11, "c": WHITE, "f": BODY}],
         anchor=MSO_ANCHOR.MIDDLE)
    ry += 0.52
# your-turn panel
c = card(s, 7.65, 1.70, 1.95, 3.12, fill=PANEL2, line=ORANGE)
tf = c.text_frame; tf.vertical_anchor = MSO_ANCHOR.TOP
_set_para(tf.paragraphs[0], "YOUR TURN", 12, ORANGE, True, HEAD, sa=4)
_set_para(tf.add_paragraph(),
          "Take a brand you love. Fill all six boxes from memory.",
          11, WHITE, False, BODY, sa=6)
_set_para(tf.add_paragraph(),
          "Any box you can't fill is a box the customer can't fill either — and a door open to a competitor.",
          10.5, GRAY, False, BODY)

# =====================================================================
# SLIDE E — Keller's CBBE Pyramid
# =====================================================================
s = new_slide()
kicker(s, "FRAMEWORK 2")
title(s, "KELLER'S BRAND EQUITY PYRAMID", size=24)
subtitle(s, "You can't reach loyalty until you've earned the level below it. Build bottom-up.")
levels = [
    # (label, question, width, color)
    ("SALIENCE", "“Who are you?”  — awareness & recall", 5.4, PANEL2),
    ("PERFORMANCE  +  IMAGERY", "“What are you?”  — meaning", 4.4, PANEL),
    ("JUDGEMENTS  +  FEELINGS", "“What about you?”  — response", 3.4, RGBColor(0xC7, 0x52, 0x2A)),
    ("RESONANCE", "“You & me?”  — loyalty", 2.4, ORANGE),
]
py = 4.60
for i, (lab, q, w, col) in enumerate(levels):
    x = 0.55 + (5.4 - w) / 2  # left-align the stack on left half
    c = card(s, x, py, w, 0.62, fill=col, radius=0.05, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    tf = c.text_frame; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tc = BG if i == 3 else WHITE
    _set_para(tf.paragraphs[0], lab, 12, tc, True, HEAD, PP_ALIGN.CENTER, sa=0)
    _set_para(tf.add_paragraph(), q, 9, (BG if i == 3 else GRAY), False, BODY, PP_ALIGN.CENTER)
    py -= 0.72
# right-side tie-in
c = card(s, 6.45, 1.75, 3.15, 3.05, fill=PANEL, line=None)
tf = c.text_frame
_set_para(tf.paragraphs[0], "HOW IT MAPS TO THIS DECK", 11, ORANGE, True, HEAD, sa=6)
_set_para(tf.add_paragraph(), "“A position in the mind” is SALIENCE won early — like Zepto and “10 minutes.”",
          10.5, WHITE, False, BODY, sa=8)
_set_para(tf.add_paragraph(), "“Fevicol ka jod” becoming an idiom is RESONANCE — the rarest, most valuable level.",
          10.5, WHITE, False, BODY, sa=8)
_set_para(tf.add_paragraph(), "Most brands die stuck at the bottom two rungs.",
          10.5, GRAY, False, BODY, italic=True)

# =====================================================================
# SLIDE F — 12 Brand Archetypes
# =====================================================================
s = new_slide()
kicker(s, "FRAMEWORK 3")
title(s, "THE 12 BRAND ARCHETYPES", size=25)
subtitle(s, "Brands borrow timeless human characters. Own ONE — trying to be two means being none.")
arch = [
    ("Innocent", "purity · simplicity", "Dove"),
    ("Sage", "wisdom · truth", "Google"),
    ("Explorer", "freedom · adventure", "R. Enfield"),
    ("Outlaw", "rebellion · disruption", "boAt"),
    ("Magician", "transformation", "Apple"),
    ("Hero", "courage · mastery", "Nike"),
    ("Lover", "intimacy · passion", "Cadbury"),
    ("Jester", "fun · play", "Zomato"),
    ("Everyman", "belonging · relatable", "Fevicol"),
    ("Caregiver", "nurture · protect", "Mamaearth"),
    ("Ruler", "control · leadership", "Mercedes"),
    ("Creator", "imagination · build", "Lego"),
]
gw, gh, gx, gy, gxp, gyp = 2.22, 0.82, 0.55, 1.66, 0.10, 0.10
for i, (h, ess, ex) in enumerate(arch):
    r, cidx = divmod(i, 4)
    x = gx + cidx * (gw + gxp)
    y = gy + r * (gh + gyp)
    c = card(s, x, y, gw, gh, fill=(PANEL if i % 2 == 0 else PANEL2))
    tf = c.text_frame
    _set_para(tf.paragraphs[0], h, 12, ORANGE, True, HEAD, sa=1)
    _set_para(tf.add_paragraph(), ess, 8.5, GRAY, False, BODY, sa=1)
    _set_para(tf.add_paragraph(), "e.g. " + ex, 8.5, WHITE, True, BODY)
text(s, 0.55, 4.72, 9, 0.4,
     [{"t": "Your turn: type 3 brands you love. Can't pick one archetype? Neither can their customers.",
       "s": 11.5, "c": WHITE, "b": True, "f": HEAD, "a": PP_ALIGN.CENTER}],
     anchor=MSO_ANCHOR.MIDDLE)

# =====================================================================
# SLIDE G — The One-Line Positioning Statement
# =====================================================================
s = new_slide()
kicker(s, "THE SYNTHESIS")
title(s, "THE ONE-LINE POSITIONING STATEMENT", size=23)
subtitle(s, "Every framework collapses into one sentence. Can't fill the blanks? You don't have a position yet.")
# template card
c = card(s, 0.55, 1.70, 9.0, 1.35, fill=PANEL2, line=ORANGE)
tf = c.text_frame; tf.vertical_anchor = MSO_ANCHOR.MIDDLE; tf.word_wrap = True
p = tf.paragraphs[0]; p.alignment = PP_ALIGN.LEFT
def run(p, t, c, b=False):
    r = p.add_run(); r.text = t; r.font.size = Pt(15); r.font.bold = b
    r.font.name = BODY; r.font.color.rgb = c
run(p, "For ", WHITE); run(p, "[ TARGET ]", ORANGE, True)
run(p, " who ", WHITE); run(p, "[ NEED / MOMENT ]", ORANGE, True)
run(p, ",  ", WHITE); run(p, "[ BRAND ]", ORANGE, True)
run(p, " is the ", WHITE); run(p, "[ CATEGORY ]", ORANGE, True)
run(p, " that ", WHITE); run(p, "[ POINT OF DIFFERENCE ]", ORANGE, True)
run(p, ",  because ", WHITE); run(p, "[ REASON TO BELIEVE ]", ORANGE, True)
run(p, ".", WHITE)
# worked example
text(s, 0.55, 3.22, 9, 0.35,
     [{"t": "WORKED EXAMPLE — ZEPTO", "s": 11, "c": ORANGE, "b": True, "f": HEAD}])
c = card(s, 0.55, 3.58, 9.0, 0.85, fill=PANEL)
tf = c.text_frame; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
_set_para(tf.paragraphs[0],
          "“For urban Indians who need essentials right now, Zepto is the grocery app that delivers in 10 minutes, "
          "because dark-store warehouses sit in your neighbourhood.”",
          12.5, WHITE, False, BODY)
text(s, 0.55, 4.58, 9, 0.4,
     [{"t": "Tip: the 5 blanks are just the frameworks in disguise — Target = Reflection, Difference = the word you own.",
       "s": 10.5, "c": GRAY, "f": BODY, "i": True}])

# =====================================================================
# SLIDE H — Hands-on workshop
# =====================================================================
s = new_slide()
kicker(s, "PART FIVE · YOUR TURN")
title(s, "THE 20-MINUTE WORKSHOP", size=26)
subtitle(s, "Close the slides. Open a notebook. Pick a brand you own, run, or genuinely love.")
ex = [
    ("01", "OWN A WORD", "In ONE word, what does your brand own in the mind? If it takes a sentence, you've already lost."),
    ("02", "MAP THE PRISM", "Fill Kapferer's six facets from memory. Empty boxes = gaps a competitor will walk into."),
    ("03", "TYPE THE ARCHETYPE", "Pick ONE of the 12. Now check: does every recent post sound like that character?"),
    ("04", "WRITE THE STATEMENT", "Complete the For / who / is-the / that / because line. Read it aloud. Does it sound true?"),
]
gw, gh, gx, gy, gxp, gyp = 4.42, 1.28, 0.55, 1.66, 0.16, 0.14
for i, (n, h, d) in enumerate(ex):
    r, cidx = divmod(i, 2)
    x = gx + cidx * (gw + gxp)
    y = gy + r * (gh + gyp)
    c = card(s, x, y, gw, gh, fill=PANEL)
    tf = c.text_frame
    p0 = tf.paragraphs[0]; p0.alignment = PP_ALIGN.LEFT
    rr = p0.add_run(); rr.text = n + "  "; rr.font.size = Pt(15); rr.font.bold = True
    rr.font.name = HEAD; rr.font.color.rgb = ORANGE
    rr = p0.add_run(); rr.text = h; rr.font.size = Pt(14); rr.font.bold = True
    rr.font.name = HEAD; rr.font.color.rgb = WHITE
    _set_para(tf.add_paragraph(), d, 10.5, GRAY, False, BODY)
text(s, 0.55, 4.55, 9, 0.5,
     [{"t": "Do this, and “go own a word in someone's mind” becomes a plan — not just a poster.",
       "s": 12, "c": WHITE, "b": True, "f": HEAD, "a": PP_ALIGN.CENTER}],
     anchor=MSO_ANCHOR.MIDDLE)

# ---- keep the original "Thank You" slide last ----
sldIdLst.remove(thankyou_el)
sldIdLst.append(thankyou_el)

prs.save(OUT)
print("Saved", OUT, "| total slides:", len(prs.slides._sldIdLst))
