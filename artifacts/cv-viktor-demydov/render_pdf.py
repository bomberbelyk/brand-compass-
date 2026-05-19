from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import textwrap

OUT = Path(__file__).resolve().parent
W, H = 2480, 3508
S = W / 210

COLORS = {
    "paper": "#fbfaf7",
    "ink": "#171717",
    "muted": "#66645f",
    "hairline": "#d9d2c5",
    "olive": "#556044",
    "wine": "#7b2f35",
    "steel": "#2d4650",
    "panel": "#f3efe7",
    "white": "#fffdf9",
}

FONT_DIR = Path("/System/Library/Fonts/Supplemental")
ARIAL = FONT_DIR / "Arial.ttf"
ARIAL_BOLD = FONT_DIR / "Arial Bold.ttf"
GEORGIA = FONT_DIR / "Georgia.ttf"
GEORGIA_BOLD = FONT_DIR / "Georgia Bold.ttf"


def pt(size):
    return int(size * W / 595)


def mm(value):
    return int(value * S)


def font(path, size):
    return ImageFont.truetype(str(path), pt(size))


F = {
    "h1": font(GEORGIA, 34),
    "h2": font(ARIAL_BOLD, 8.6),
    "role": font(ARIAL_BOLD, 12),
    "body": font(ARIAL, 9.2),
    "body_small": font(ARIAL, 8.35),
    "lead": font(ARIAL, 11.1),
    "quote": font(GEORGIA, 13),
    "bold": font(ARIAL_BOLD, 9.4),
    "small_bold": font(ARIAL_BOLD, 8.2),
    "tiny": font(ARIAL, 7.4),
    "tiny_bold": font(ARIAL_BOLD, 7.8),
}


def text_width(draw, text, fnt):
    if not text:
        return 0
    return draw.textbbox((0, 0), text, font=fnt)[2]


def wrap(draw, text, fnt, width):
    lines = []
    for para in text.split("\n"):
        words = para.split()
        current = ""
        for word in words:
            test = f"{current} {word}".strip()
            if text_width(draw, test, fnt) <= width:
                current = test
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
    return lines


def draw_text(draw, xy, text, fnt, fill, width, line_gap=1.35):
    x, y = xy
    line_h = int(fnt.size * line_gap)
    for line in wrap(draw, text, fnt, width):
        draw.text((x, y), line, font=fnt, fill=fill)
        y += line_h
    return y


def section_title(draw, x, y, title, width):
    title_up = title.upper()
    draw.text((x, y), title_up, font=F["h2"], fill=COLORS["wine"])
    tw = text_width(draw, title_up, F["h2"])
    line_y = y + F["h2"].size // 2
    draw.line((x + tw + mm(3), line_y, x + width, line_y), fill=COLORS["hairline"], width=2)
    return y + mm(7)


def page_base():
    img = Image.new("RGB", (W, H), COLORS["paper"])
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, mm(5.5), H), fill=COLORS["steel"])
    draw.rectangle((0, int(H * 0.35), mm(5.5), int(H * 0.68)), fill=COLORS["olive"])
    draw.rectangle((0, int(H * 0.68), mm(5.5), H), fill=COLORS["wine"])
    return img, draw


def footer(draw, page, label):
    x, y = mm(16), H - mm(10)
    draw.line((x, y, W - mm(16), y), fill=COLORS["hairline"], width=2)
    draw.text((x, y + mm(2.5)), label, font=F["tiny"], fill="#817b70")
    draw.text((W - mm(28), y + mm(2.5)), f"{page} / 2", font=F["tiny_bold"], fill=COLORS["wine"])


def masthead(draw, title_lines, role, contacts, compact=False):
    x, y = mm(16), mm(15)
    draw.multiline_text((x, y), "\n".join(title_lines), font=F["h1"], fill=COLORS["ink"], spacing=-2)
    role_y = y + mm(39 if not compact else 37)
    draw_text(draw, (x, role_y), role, F["role"], COLORS["steel"], mm(125), 1.25)
    cx, cy = W - mm(16), y + mm(2)
    for line in contacts:
        tw = text_width(draw, line, F["body_small"])
        draw.text((cx - tw, cy), line, font=F["body_small"], fill=COLORS["muted"])
        cy += mm(5)
    rule_y = mm(75 if not compact else 70)
    draw.line((x, rule_y, W - mm(16), rule_y), fill=COLORS["hairline"], width=2)
    return mm(84 if not compact else 78)


def pill(draw, x, y, text):
    pad_x, pad_y = mm(2.6), mm(1.2)
    tw = text_width(draw, text, F["tiny_bold"])
    h = F["tiny_bold"].size + pad_y * 2
    draw.rounded_rectangle((x, y, x + tw + pad_x * 2, y + h), radius=h // 2, outline="#c9c1b2", fill="#fffdf9", width=2)
    draw.text((x + pad_x, y + pad_y), text, font=F["tiny_bold"], fill="#2e2c28")
    return x + tw + pad_x * 2 + mm(2.1), h


def bullet_list(draw, x, y, items, width, fnt=F["body_small"], gap=2.2):
    for item in items:
        draw.ellipse((x, y + mm(1.7), x + mm(1.7), y + mm(3.4)), fill=COLORS["olive"])
        y = draw_text(draw, (x + mm(4.2), y), item, fnt, "#2b2a27", width - mm(4.2), 1.3) + mm(gap)
    return y


def page_one():
    img, draw = page_base()
    y = masthead(
        draw,
        ["Віктор", "Демидов"],
        "Кандидат на посаду помічника директора Науково-дослідного інституту «Єнамін»",
        ["+38 067 505 47 09", "victor.demidov@gmail.com", "Україна"],
    )
    x, width = mm(16), W - mm(32)

    y = section_title(draw, x, y, "Профіль", width)
    y = draw_text(draw, (x, y), "Фахівець із великим досвідом у координації складних процесів, роботі з експертними командами, організації комунікацій, підготовці матеріалів, запуску проєктів і супроводі навчальних програм.", F["lead"], "#20201e", width, 1.38)

    box_y = y + mm(5)
    draw.rectangle((x, box_y, W - mm(16), box_y + mm(31)), fill=COLORS["panel"])
    draw.rectangle((x, box_y, x + mm(1.6), box_y + mm(31)), fill=COLORS["olive"])
    draw_text(draw, (x + mm(6), box_y + mm(5)), "Моя сильна сторона — швидко розуміти складні середовища, знаходити в них структуру і перетворювати розрізнені процеси на зрозумілу систему.", F["quote"], "#20201e", width - mm(12), 1.32)
    y = box_y + mm(39)

    col_w = (width - mm(7)) // 2
    y_title = section_title(draw, x, y, "Чому ця роль", col_w)
    draw_text(draw, (x, y_title), "Позиція помічника директора цікава мені як можливість застосувати досвід у науковому та освітньому середовищі: підтримувати операційний контур, документи, зустрічі, листування, внутрішні зв’язки, зовнішню комунікацію, презентаційні матеріали та навчальні ініціативи.", F["body"], "#262522", col_w, 1.35)
    x2 = x + col_w + mm(7)
    y2_title = section_title(draw, x2, y, "Ключова цінність", col_w)
    draw_text(draw, (x2, y2_title), "Я не є хіміком і не претендую на роль наукового експерта. Моя цінність — в організації складних процесів, роботі з експертами, структурі інформації, комунікації, підготовці матеріалів, запуску систем і швидкому навчанні.", F["body"], "#262522", col_w, 1.35)
    y += mm(58)

    y = section_title(draw, x, y, "Професійні опори", width)
    px, py = x, y
    for label in [
        "Операційна координація", "Комунікації з експертами", "Документи та звітність",
        "Навчальні програми", "Презентаційні матеріали", "Проєктний супровід",
        "Бюджети та дедлайни", "AI-інструменти", "Структурування інформації", "Продакшен-мислення",
    ]:
        nx, ph = pill(draw, px, py, label)
        if nx > W - mm(16):
            px, py = x, py + ph + mm(2)
            nx, ph = pill(draw, px, py, label)
        px = nx
    y = py + mm(15)

    y = section_title(draw, x, y, "Перші 90 днів", width)
    y = draw_text(draw, (x, y), "У перший місяць я зосередився б на розумінні робочого ритму директора, типових задач, потоків документів, ключових контактів, регулярних зустрічей та слабких місць у комунікації.", F["body"], "#262522", width, 1.35) + mm(4)
    step_w = (width - mm(6)) // 3
    steps = [
        ("Місяць 1", "Карта задач, контактів, документів, зустрічей і регулярних процесів директора."),
        ("Місяць 2", "Шаблони листів, протоколів, резюме зустрічей, презентаційних та інформаційних матеріалів."),
        ("Місяць 3", "Система нагадувань, контролю домовленостей, зберігання документів і AI-підтримки рутини."),
    ]
    for i, (head, body) in enumerate(steps):
        sx = x + i * (step_w + mm(3))
        draw.rectangle((sx, y, sx + step_w, y + mm(28)), fill=COLORS["white"], outline=COLORS["hairline"], width=2)
        draw.text((sx + mm(3.6), y + mm(3.5)), head, font=F["small_bold"], fill=COLORS["wine"])
        draw_text(draw, (sx + mm(3.6), y + mm(10)), body, F["tiny_bold"], "#393733", step_w - mm(7.2), 1.35)

    footer(draw, 1, "CV · Віктор Демидов")
    return img


def timeline_item(draw, x, y, date, title, body, width):
    draw.text((x, y), date, font=F["tiny_bold"], fill=COLORS["steel"])
    tx = x + mm(27)
    title_y = draw_text(draw, (tx, y), title, F["bold"], COLORS["ink"], width - mm(27), 1.15)
    y2 = draw_text(draw, (tx, title_y + mm(1)), body, F["body_small"], "#403e39", width - mm(27), 1.23)
    draw.line((tx, y2 + mm(2), x + width, y2 + mm(2)), fill="#e4ded3", width=1)
    return y2 + mm(4)


def page_two():
    img, draw = page_base()
    y = masthead(
        draw,
        ["Досвід", "і система"],
        "Медіа, продакшен, навчальні програми, тактична медицина, AI-рішення для організаційних процесів",
        ["Віктор Демидов", "+38 067 505 47 09", "victor.demidov@gmail.com"],
        compact=True,
    )
    x, width = mm(16), W - mm(32)
    y = section_title(draw, x, y, "Професійний шлях", width)
    for item in [
        ("з 2022", "Координатор навчальних програм з тактичної медицини · Всеукраїнська рада реанімації", "Координація програм на перетині організації, навчання, методології, звітності та комунікації з інструкторами, партнерами й учасниками курсів."),
        ("з 2013", "Співпраця з Всеукраїнською радою реанімації", "Підтримка освітніх і комунікаційних процесів, робота з експертною спільнотою, матеріалами та організаційною логікою навчальних ініціатив."),
        ("2019", "Керівник документального відеопродакшену · Fedoriv", "Організація документального відеовиробництва, координація команд, змісту, дедлайнів і якості результату."),
        ("2008–2019", "Співвласник і директор власного продакшену рекламного візуалу", "Клієнтські проєкти, виробничі процеси, команди, документи, бюджети, дедлайни, партнери та комерційна відповідальність."),
        ("2000–2008", "Журналіст, фотограф, оператор, керівник фотослужби · УНІАН та комерційні команди", "Робота з інформацією, візуальною комунікацією, редакційними процесами, агентськими та продакшен-командами."),
    ]:
        y = timeline_item(draw, x, y, *item, width)

    y += mm(3)
    col_w = (width - mm(7)) // 2
    for i, (head, items) in enumerate([
        ("Що можу взяти на себе", ["Календар зустрічей і контроль домовленостей.", "Листування українською та англійською.", "Короткі протоколи й резюме зустрічей.", "Структура зберігання документів.", "База контактів і партнерів."]),
        ("Сучасний інструментарій", ["LLM та AI-підтримка рутинних процесів.", "Автоматизація і структурування інформації.", "Генерація зображень і дизайн-матеріалів.", "Шаблони презентаційних матеріалів.", "AI-рішення для навчання і корпоративних процесів."]),
    ]):
        bx = x + i * (col_w + mm(7))
        draw.rectangle((bx, y, bx + col_w, y + mm(48)), fill=COLORS["white"], outline=COLORS["hairline"], width=2)
        draw.text((bx + mm(4), y + mm(4)), head, font=F["bold"], fill=COLORS["steel"])
        bullet_list(draw, bx + mm(4), y + mm(12), items, col_w - mm(8), F["tiny_bold"], 1.35)
    y += mm(56)

    x2 = x + col_w + mm(7)
    y1 = section_title(draw, x, y, "Освіта", col_w)
    draw.text((x, y1), "2000", font=F["tiny_bold"], fill=COLORS["steel"])
    y1a = draw_text(draw, (x + mm(23), y1), "Інститут журналістики КНУ імені Тараса Шевченка", F["small_bold"], COLORS["ink"], col_w - mm(23), 1.18)
    y1a = draw_text(draw, (x + mm(23), y1a + mm(1)), "Вища освіта у сфері журналістики, інформації та комунікації.", F["body_small"], "#403e39", col_w - mm(23), 1.25)
    draw.line((x + mm(23), y1a + mm(2), x + col_w, y1a + mm(2)), fill="#e4ded3", width=1)
    y1b = y1a + mm(6)
    draw.text((x, y1b), "2016", font=F["tiny_bold"], fill=COLORS["steel"])
    y1b = draw_text(draw, (x + mm(23), y1b), "Майстерня документального кіно Сергія Буковського", F["small_bold"], COLORS["ink"], col_w - mm(23), 1.18)
    draw_text(draw, (x + mm(23), y1b + mm(1)), "Інститут підвищення кваліфікації при Держтелерадіо України.", F["body_small"], "#403e39", col_w - mm(23), 1.25)

    y2 = section_title(draw, x2, y, "Формула для позиції", col_w)
    y2 = draw_text(draw, (x2, y2), "Для НДІ «Єнамін» я можу бути помічником директора, який поєднує адміністративну уважність, комунікаційний досвід, продакшен-мислення, навички координатора навчальних програм і сучасні AI-інструменти.", F["body_small"], "#262522", col_w, 1.3)
    draw_text(draw, (x2, y2 + mm(3)), "Мета — щоб директор витрачав менше часу на організаційну рутину і мав більше ясності в щоденних процесах.", F["body_small"], "#262522", col_w, 1.3)

    footer(draw, 2, "Кандидат на посаду помічника директора НДІ «Єнамін»")
    return img


def main():
    pages = [page_one(), page_two()]
    pngs = []
    for index, page in enumerate(pages, 1):
        path = OUT / f"page-{index}.png"
        page.save(path, "PNG")
        pngs.append(path)
    pdf_path = OUT / "viktor-demydov-cv.pdf"
    pages[0].save(pdf_path, "PDF", resolution=300.0, save_all=True, append_images=pages[1:])
    print(pdf_path)
    for path in pngs:
        print(path)


if __name__ == "__main__":
    main()
