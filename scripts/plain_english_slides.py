"""
Create two standalone, text-heavy 'plain English' slides (verbatim text)
matching the Branding deck's dark-navy / orange style, in a separate file
the user can paste into the main presentation.
"""
import re
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

OUT = r"Branding_PlainEnglish_3Slides.pptx"

# palette (same as main deck)
BG     = RGBColor(0x1A, 0x1A, 0x2E)
PANEL2 = RGBColor(0x0F, 0x0F, 0x23)
ORANGE = RGBColor(0xFF, 0x6B, 0x35)
WHITE  = RGBColor(0xFF, 0xFF, 0xFF)
GRAY   = RGBColor(0xA0, 0xA0, 0xA0)
HEAD = "Arial"
BODY = "Calibri"

prs = Presentation()
prs.slide_width = 9144000      # 10.0 in  (match main deck)
prs.slide_height = 5143500     # 5.625 in
blank = prs.slide_layouts[6]

TOK = re.compile(r'\*\*(.+?)\*\*|\*(.+?)\*|([^*]+)', re.S)


def add_runs(p, txt, size, plain=WHITE, bold_c=ORANGE, ital_c=GRAY,
             head_for_bold=True):
    """Mini-markdown: **bold**->orange bold, *ital*->gray italic, plain->white."""
    for m in TOK.finditer(txt):
        b, i, n = m.group(1), m.group(2), m.group(3)
        r = p.add_run()
        if b is not None:
            r.text = b; r.font.bold = True; r.font.color.rgb = bold_c
            r.font.name = HEAD if head_for_bold else BODY
        elif i is not None:
            r.text = i; r.font.italic = True; r.font.color.rgb = ital_c
            r.font.name = BODY
        else:
            r.text = n; r.font.color.rgb = plain; r.font.name = BODY
        r.font.size = Pt(size)


def new_slide():
    s = prs.slides.add_slide(blank)
    for ph in list(s.placeholders):
        ph._element.getparent().remove(ph._element)
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = BG
    return s


def line(s, l, t, w, h, text, size, color, bold=False, font=BODY,
         align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP):
    tb = s.shapes.add_textbox(Inches(l), Inches(t), Inches(w), Inches(h))
    tf = tb.text_frame; tf.word_wrap = True; tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    p = tf.paragraphs[0]; p.alignment = align
    r = p.add_run(); r.text = text
    r.font.size = Pt(size); r.font.bold = bold; r.font.name = font
    r.font.color.rgb = color
    return tb


def bullets(s, l, t, w, h, items, size, gap=5):
    tb = s.shapes.add_textbox(Inches(l), Inches(t), Inches(w), Inches(h))
    tf = tb.text_frame; tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    for idx, item in enumerate(items):
        p = tf.paragraphs[0] if idx == 0 else tf.add_paragraph()
        p.space_after = Pt(gap); p.space_before = Pt(0); p.alignment = PP_ALIGN.LEFT
        add_runs(p, item, size)
    return tb


def case_card(s, l, t, w, h, heading, paragraph, hsize=11, psize=9.5):
    sp = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE,
                            Inches(l), Inches(t), Inches(w), Inches(h))
    sp.fill.solid(); sp.fill.fore_color.rgb = PANEL2
    sp.line.color.rgb = ORANGE; sp.line.width = Pt(1.25)
    sp.shadow.inherit = False
    try: sp.adjustments[0] = 0.04
    except Exception: pass
    tf = sp.text_frame; tf.word_wrap = True
    tf.margin_left = tf.margin_right = Inches(0.18)
    tf.margin_top = tf.margin_bottom = Inches(0.12)
    p0 = tf.paragraphs[0]; p0.space_after = Pt(5)
    add_runs(p0, heading, hsize)
    p1 = tf.add_paragraph(); p1.space_before = Pt(0)
    add_runs(p1, paragraph, psize)
    return sp


# =====================================================================
# SLIDE 1 — Brand vocabulary in plain English (Maggi)
# =====================================================================
s = new_slide()
line(s, 0.55, 0.28, 9, 0.35, "IN PLAIN ENGLISH", 12, ORANGE, bold=True, font=HEAD)
line(s, 0.55, 0.60, 9, 0.55, "THE SIX WORDS, ONE LINE EACH", 22, WHITE, bold=True, font=HEAD)
vocab = [
    "**Brand** — The picture that pops into someone's head when they hear your name. *(Hear “Volvo” → you think “safe.”)*",
    "**Branding** — The actual work you do to put that picture there. *(Volvo's ads, crash-test videos, safety features.)*",
    "**Brand Identity** — What you put out into the world on purpose. *(The logo, the colours, the tagline, how you talk.)*",
    "**Brand Image** — What people *actually* end up thinking — which may not match what you intended. *(You say “premium,” they say “overpriced.”)*",
    "**Brand Equity** — How much that picture is worth in money. *(People happily pay ₹100 for the same coffee they'd pay ₹20 for elsewhere — that gap is the equity.)*",
    "**Positioning** — The empty spot in people's heads you decide to grab and own. *(Choosing “the safe car” before anyone else takes it.)*",
]
bullets(s, 0.55, 1.22, 9.0, 2.45, vocab, 10, gap=4)
case_card(
    s, 0.55, 3.72, 9.0, 1.78,
    "One case study tying it all together — Maggi:",
    "Maggi decided to own one empty spot in everyone's mind — *“2-minute snack when you're hungry and lazy”* "
    "(that's **positioning**). To put that idea there, it ran years of ads, jingles, and the famous “Maggi mom” "
    "stories (**branding**), all wrapped in a yellow-and-red packet with the 2-minute promise written on it "
    "(**brand identity**). Over time, what landed in people's heads wasn't “instant noodles” but “comfort, "
    "childhood, hostel nights” (**brand image** — richer than what the packet literally said). That feeling "
    "became so strong that people pay more for Maggi than for an identical local noodle pack, and when it was banned "
    "in 2015 customers *demanded* it back (**brand equity** — the proof the picture had real value). And the "
    "picture itself — “Maggi = quick, warm, mine” — is the **brand**. So: positioning picked the spot, "
    "branding did the work, identity was the message sent, image was the message received, equity was the money it "
    "created, and the brand is the whole feeling left behind.",
    hsize=11, psize=9.5)

# =====================================================================
# SLIDE 2 — Kapferer prism in plain English (Royal Enfield)
# =====================================================================
s = new_slide()
line(s, 0.55, 0.28, 9, 0.35, "IN PLAIN ENGLISH", 12, ORANGE, bold=True, font=HEAD)
line(s, 0.55, 0.60, 9, 0.55, "THE PRISM, ONE LINE EACH", 22, WHITE, bold=True, font=HEAD)
facets = [
    "**Physique** — What you can actually see and touch. *(Coca-Cola's red can, the contour bottle, the white swoosh.)*",
    "**Personality** — If the brand were a person, what they'd be like to talk to. *(Old Spice = funny and over-the-top; a bank = calm and serious.)*",
    "**Relationship** — The kind of bond it has with you. *(Your bank is a “trusted advisor”; Nike is a “coach pushing you.”)*",
    "**Culture** — The values and backstory it stands for. *(Patagonia = save-the-planet; Royal Enfield = old-school, made-in-India heritage.)*",
    "**Reflection** — The *type of person* it looks like it's made for. *(A Rolex ad makes you picture a successful 50-year-old man.)*",
    "**Self-Image** — How *you* feel about yourself when you use it. *(Wearing Nike → “I'm an athlete, even if I jog twice a month.”)*",
    "*(The two arrows just mean: the top three are what the brand sends out, the bottom three are what the customer takes in — and the left side is the visible/social stuff, the right side is the inner/spirit stuff.)*",
]
bullets(s, 0.55, 1.22, 9.0, 2.55, facets, 9.5, gap=3)
case_card(
    s, 0.55, 3.80, 9.0, 1.70,
    "One case study tying it all together — Royal Enfield:",
    "Look at a Royal Enfield and you instantly see the heavy retro body, the round headlamp, and hear that signature "
    "*thump* of the engine (**physique**). If the bike were a person, it'd be rugged, unhurried, and a little "
    "rebellious — never flashy (**personality**). The bond it builds isn't “I bought a vehicle,” it's “I "
    "joined a brotherhood” — riders nod at each other on the highway (**relationship**). That's because the brand "
    "stands for old-school freedom, heritage, and the romance of the long Indian road trip, not speed or specs "
    "(**culture**). When you picture a typical Enfield owner, you imagine an adventurous person who values journeys "
    "over destinations (**reflection**) — and when *you* ride one, you feel like that explorer yourself, someone "
    "with grit and soul (**self-image**). All six fit together so tightly that a rival can't just copy the bike; "
    "they'd have to copy the whole feeling — which is exactly why the prism matters: **leave any one facet empty, "
    "and a competitor walks in and fills it for you.**",
    hsize=11, psize=9)

# =====================================================================
# SLIDE 3 — Keller's Brand Equity Pyramid in plain English (Apple)
# =====================================================================
s = new_slide()
line(s, 0.55, 0.28, 9, 0.35, "IN PLAIN ENGLISH", 12, ORANGE, bold=True, font=HEAD)
line(s, 0.55, 0.60, 9, 0.55, "THE PYRAMID, ONE LINE EACH", 22, WHITE, bold=True, font=HEAD)
rungs = [
    "**Salience** — Do people even know you exist, and do you come to mind first? *(Want a cola? “Coke” pops up instantly.)*",
    "**Performance** — Does the product actually do its job well? *(Does the phone's battery last and the camera deliver?)*",
    "**Imagery** — The vibe and personality — and who's seen using it. *(Apple feels sleek, premium, creative.)*",
    "**Judgements** — What people *rationally* think of you. *(Is it good quality? Credible? Worth the price?)*",
    "**Feelings** — The emotions you stir up. *(Coke ads = happiness; Nike = fired-up.)*",
    "**Resonance** — The deep loyalty at the very top: repeat buyers, fans, community. *(People who queue overnight and never switch.)*",
]
bullets(s, 0.55, 1.22, 9.0, 2.45, rungs, 10, gap=4)
case_card(
    s, 0.55, 3.72, 9.0, 1.78,
    "One case study tying it all together — Apple:",
    "Think about how Apple climbs the pyramid. First, everyone knows Apple and thinks of it the moment “smartphone” "
    "comes up (**salience**). The products genuinely work well — smooth, reliable, long-lasting (**performance**) — "
    "and they carry a sleek, premium, creative vibe that says something about the person holding one (**imagery**). "
    "From that, people form the judgement that Apple is high-quality and worth the steep price (**judgements**), and "
    "the brand consistently makes them feel smart, modern, and a little special (**feelings**). All of that stacks "
    "into the rare top rung: customers who queue overnight for launches, never switch, and defend the brand like it's "
    "their team (**resonance**). Notice the order — Apple couldn't have built that loyalty if the phone didn't work, "
    "and the working phone wouldn't matter if no one knew the name. Each rung only holds because the one below it is "
    "solid — which is exactly why you build a brand from the bottom up, not the top down.",
    hsize=11, psize=9.5)

prs.save(OUT)
print("Saved", OUT, "| slides:", len(prs.slides._sldIdLst))
