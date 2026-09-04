from __future__ import annotations

import hashlib
import json
import shutil
import sys
import zipfile
from copy import deepcopy
from pathlib import Path

from lxml import etree


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "src" / "data" / "labs.json"
OUTPUT_DIR = ROOT / "public" / "reports"
REFERENCE = Path(r"C:\Users\gvadoskr\Yandex.Disk\2025-2026\ПиДИС\4 курс\ДКИП\ЛР1\ЛР1 (Шаблон).docx")
REFERENCE_SHA256 = "d003e312886862f97a347e4ffcde1cdeb5c8a0a311fd99e01cace1f6c467bcec"

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
XML_NS = "http://www.w3.org/XML/1998/namespace"
NS = {"w": W_NS}


def qn(tag: str) -> str:
    prefix, local = tag.split(":", 1)
    if prefix != "w":
        raise ValueError(tag)
    return f"{{{W_NS}}}{local}"


def add(parent, tag: str, **attrs):
    node = etree.SubElement(parent, qn(tag))
    for key, value in attrs.items():
        attr_name = qn(f"w:{key}") if not key.startswith("{") else key
        node.set(attr_name, str(value))
    return node


def run(parent, text: str, *, bold=False, italic=False, size=22, color="000000", hint=False):
    r = add(parent, "w:r")
    rpr = add(r, "w:rPr")
    fonts = add(rpr, "w:rFonts")
    for key in ("ascii", "hAnsi", "eastAsia", "cs"):
        fonts.set(qn(f"w:{key}"), "Times New Roman")
    if bold:
        add(rpr, "w:b")
        add(rpr, "w:bCs")
    if italic:
        add(rpr, "w:i")
        add(rpr, "w:iCs")
    add(rpr, "w:sz", val=size)
    add(rpr, "w:szCs", val=size)
    add(rpr, "w:color", val="77777F" if hint else color)
    t = add(r, "w:t")
    if text[:1].isspace() or text[-1:].isspace():
        t.set(f"{{{XML_NS}}}space", "preserve")
    t.text = text
    return r


def paragraph(
    text: str = "",
    *,
    style: str | None = None,
    bold=False,
    italic=False,
    size=22,
    color="000000",
    hint=False,
    align: str | None = None,
    before=0,
    after=120,
    line=276,
    keep_next=False,
    keep_lines=False,
    page_break_before=False,
):
    p = etree.Element(qn("w:p"))
    ppr = add(p, "w:pPr")
    if style:
        add(ppr, "w:pStyle", val=style)
    if align:
        add(ppr, "w:jc", val=align)
    add(ppr, "w:spacing", before=before, after=after, line=line, lineRule="auto")
    if keep_next:
        add(ppr, "w:keepNext")
    if keep_lines:
        add(ppr, "w:keepLines")
    if page_break_before:
        add(ppr, "w:pageBreakBefore")
    if text:
        run(p, text, bold=bold, italic=italic, size=size, color=color, hint=hint)
    return p


def heading(text: str, level=1, page_break_before=False):
    return paragraph(
        text,
        style=str(level),
        bold=True,
        size=28 if level == 1 else 24,
        color="ED131C" if level == 1 else "1C1C1C",
        before=180 if level == 1 else 120,
        after=90,
        keep_next=True,
        keep_lines=True,
        page_break_before=page_break_before,
    )


def page_break():
    p = paragraph(after=0)
    r = add(p, "w:r")
    add(r, "w:br", type="page")
    return p


def set_cell_margins(tbl_pr, top=90, start=120, bottom=90, end=120):
    mar = add(tbl_pr, "w:tblCellMar")
    for side, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        add(mar, f"w:{side}", w=value, type="dxa")


def make_table(headers, rows, widths, *, font_size=18, header_fill="1C1C1C", first_col_bold=False):
    if len(headers) != len(widths):
        raise ValueError("Header/width mismatch")
    total = sum(widths)
    tbl = etree.Element(qn("w:tbl"))
    tbl_pr = add(tbl, "w:tblPr")
    add(tbl_pr, "w:tblW", w=total, type="dxa")
    add(tbl_pr, "w:tblInd", w=120, type="dxa")
    add(tbl_pr, "w:tblLayout", type="fixed")
    set_cell_margins(tbl_pr)
    borders = add(tbl_pr, "w:tblBorders")
    for side in ("top", "start", "bottom", "end", "insideH", "insideV"):
        add(borders, f"w:{side}", val="single", sz=6, space=0, color="C7C8CD")
    grid = add(tbl, "w:tblGrid")
    for width in widths:
        add(grid, "w:gridCol", w=width)

    def add_row(values, *, header=False, shade=None):
        tr = add(tbl, "w:tr")
        tr_pr = add(tr, "w:trPr")
        add(tr_pr, "w:cantSplit")
        if header:
            add(tr_pr, "w:tblHeader")
        for index, (value, width) in enumerate(zip(values, widths, strict=True)):
            tc = add(tr, "w:tc")
            tc_pr = add(tc, "w:tcPr")
            add(tc_pr, "w:tcW", w=width, type="dxa")
            add(tc_pr, "w:vAlign", val="center")
            if header or shade:
                add(tc_pr, "w:shd", val="clear", fill=header_fill if header else shade)
            text = str(value)
            p = paragraph(
                text,
                bold=header or (first_col_bold and index == 0),
                size=font_size,
                color="FFFFFF" if header else "1C1C1C",
                hint=(not header and text.startswith("[")),
                align="center" if header or (index == 0 and len(text) < 18) else "left",
                after=0,
                line=240,
                keep_lines=True,
            )
            tc.append(p)

    add_row(headers, header=True)
    for row_index, values in enumerate(rows):
        if len(values) != len(headers):
            raise ValueError(f"Row width mismatch: {values}")
        add_row(values, shade="F7F7F9" if row_index % 2 else None)
    return tbl


def caption(text: str):
    return paragraph(text, italic=True, size=18, color="55555C", after=70, keep_next=True)


def hint_box(text: str, lines=2):
    p = paragraph(text, size=20, hint=True, before=50, after=100, line=250, keep_lines=True)
    ppr = p.find(qn("w:pPr"))
    add(ppr, "w:shd", val="clear", fill="F1F1F4")
    borders = add(ppr, "w:pBdr")
    for side in ("top", "left", "bottom", "right"):
        add(borders, f"w:{side}", val="single", sz=5, space=5, color="D2D3D8")
    if lines > 1:
        for _ in range(lines - 1):
            r = add(p, "w:r")
            add(r, "w:br")
    return p


RESULT_TABLES = {
    1: (["Этап процесса", "Ответственный", "Вход", "Действие", "Запись", "Контроль"], [1450, 1450, 1300, 1800, 1550, 1450], 10),
    2: (["Приоритет", "Условия", "Реакция", "Восстановление", "Эскалация", "Контроль"], [1100, 2100, 1300, 1500, 1650, 1850], 6),
    3: (["ID", "Тип", "Приоритет", "Исполнитель", "Связь", "Обоснование"], [650, 1250, 1250, 1450, 1400, 3000], 12),
    4: (["Шаг", "Предусловие", "Действие", "Ожидается", "Фактически", "Доказательство"], [650, 1650, 1850, 1700, 1550, 1600], 8),
    5: (["Статья", "Аудитория", "Симптом", "Решение", "Проверка", "Эскалация"], [1050, 1250, 1600, 2100, 1450, 1550], 6),
    6: (["Этап", "Подготовка", "Действие", "Контроль", "Откат", "Решение"], [950, 1750, 1850, 1550, 1750, 1400], 8),
    7: (["Данные", "RPO", "Расписание", "Хранилище", "Проверка", "Ответственный"], [1400, 900, 1650, 1650, 1900, 1500], 7),
    8: (["Время", "Сигнал", "Решение", "Действие", "Ответственный", "Результат"], [900, 1650, 1650, 1800, 1450, 1550], 10),
    9: (["ID", "Источник", "Уровень", "Смысл", "Связь", "Правило контроля"], [650, 1350, 1100, 2150, 1550, 2200], 14),
    10: (["Гипотеза", "Слой", "Проверка", "Ожидается", "Фактически", "Вывод"], [1150, 1200, 1900, 1600, 1600, 1550], 12),
    11: (["Время", "Источник", "Событие", "Статус факта", "Связь", "Вывод"], [900, 1250, 2350, 1400, 1450, 1550], 14),
    12: (["Актив", "Состояние", "Критичность", "Риск", "Обслуживание", "Контроль"], [950, 1400, 1250, 1550, 2350, 1500], 10),
}


def replace_paragraph_text(p, text: str, *, size=None):
    texts = p.xpath(".//w:t", namespaces=NS)
    if not texts:
        run(p, text, bold=True, size=size or 28)
        return
    texts[0].text = text
    texts[0].set(f"{{{XML_NS}}}space", "preserve")
    for node in texts[1:]:
        node.text = ""
    if size:
        for rpr in p.xpath(".//w:rPr", namespaces=NS):
            sz = rpr.find(qn("w:sz"))
            if sz is None:
                sz = add(rpr, "w:sz")
            sz.set(qn("w:val"), str(size))
            sz_cs = rpr.find(qn("w:szCs"))
            if sz_cs is None:
                sz_cs = add(rpr, "w:szCs")
            sz_cs.set(qn("w:val"), str(size))


def replace_cell_text(tc, text: str, *, size=22, bold=False, align="center"):
    tc_pr = tc.find(qn("w:tcPr"))
    for child in list(tc):
        if child is not tc_pr:
            tc.remove(child)
    tc.append(paragraph(text, bold=bold, size=size, align=align, after=0, line=240, keep_lines=True))


def cover_updates(root, lab):
    body = root.find("w:body", NS)
    for p in body.findall(qn("w:p")):
        text = "".join(p.xpath(".//w:t/text()", namespaces=NS))
        if "Отчет по лабораторной работе №" in text:
            replace_paragraph_text(p, f"Отчёт по лабораторной работе № {lab['semesterLabNumber']}")
        elif "ОРГАНИЩАЦИЯ" in text:
            replace_paragraph_text(p, "АВТОНОМНАЯ НЕКОММЕРЧЕСКАЯ ОРГАНИЗАЦИЯ")
        elif text.strip().startswith("Москва,"):
            replace_paragraph_text(p, "Москва, 2026")
    tables = body.findall(qn("w:tbl"))
    title_rows = tables[1].findall(qn("w:tr"))
    title_cell = title_rows[0].findall(qn("w:tc"))[2]
    title_size = 18 if len(lab["title"]) > 92 else 20
    replace_cell_text(title_cell, lab["title"], size=title_size, align="center")
    discipline_cell = title_rows[3].findall(qn("w:tc"))[2]
    replace_cell_text(
        discipline_cell,
        'МДК.06.02 «Инженерно-техническая поддержка сопровождения информационных систем»',
        size=18,
        align="center",
    )
    for index, drawing in enumerate(root.xpath("//*[local-name()='docPr' or local-name()='cNvPr']"), start=1):
        drawing.set("descr", "Логотип Университета Синергия" if index == 1 else "Фирменный знак учебного практикума")
        drawing.set("title", "Фирменный знак")
    return body


def blank_rows(count, columns):
    return [[str(index + 1)] + ["[Заполните]" for _ in range(columns - 1)] for index in range(count)]


def append_report_body(body, lab):
    sect_pr = body.find(qn("w:sectPr"))

    def insert(node):
        body.insert(body.index(sect_pr), node)

    insert(heading("Шаблон отчёта", level=1))
    insert(hint_box("Серый текст — подсказка для заполнения. Перед сдачей удалите подсказки и оставьте только свои результаты и доказательства.", lines=1))
    metadata_rows = [
        ["Лабораторная работа", f"№ {lab['semesterLabNumber']}. {lab['title']}"],
        ["Блок и семестр", f"Блок {lab['block']}. {lab['blockTitle']} — {lab['semester']} семестр"],
        ["Тема", f"{lab['topicCode']}. {lab['topicTitle']}"],
        ["Максимальный балл", str(lab["points"])],
        ["Вход из последовательности", lab["sequenceInput"]],
        ["Передача в следующую работу", lab["sequenceOutput"]],
        ["Предметная область", "[Укажите сквозной вариант SA01–SA30 и название]"],
        ["Имя итогового файла", lab["recommendedFileName"]],
    ]
    insert(make_table(["Поле", "Значение"], metadata_rows, [2100, 6900], font_size=19, first_col_bold=True))

    insert(heading("1. Цель работы", level=1))
    insert(paragraph(lab["goal"], size=21, after=80))
    insert(hint_box("[При необходимости уточните формулировку цели своими словами, не добавляя теоретический обзор.]", lines=1))

    insert(heading("2. Исходные данные и среда выполнения", level=1))
    env_rows = [
        ["Использованный набор", "[Укажите название системы, варианта, журнала или карточек из задания]"],
        ["Инструменты", "[Укажите редактор, локальную среду или учебную симуляцию и версии, если они существенны]"],
        ["Ограничения", "[Укажите безопасные границы работы и принятые допущения]"],
    ]
    insert(make_table(["Параметр", "Заполнение студента"], env_rows, [2200, 6800], font_size=19, first_col_bold=True))

    insert(heading("3. Выполнение задания", level=1))
    execution_rows = [[str(index + 1), stage.split(".", 1)[0], "[Действие и полученный промежуточный результат]", "[Таблица, ID, рисунок]"] for index, stage in enumerate(lab["stages"])]
    insert(make_table(["Этап", "Логика этапа", "Что выполнено", "Доказательство"], execution_rows, [650, 2750, 3500, 2100], font_size=17))

    insert(heading("4. Основной практический результат", level=1))
    insert(paragraph(f"Требуемый результат: {lab['practicalResult']}.", bold=True, size=21, after=90))
    headers, widths, row_count = RESULT_TABLES[lab["number"]]
    rows = blank_rows(row_count, len(headers))
    if "Статус" in headers:
        status_index = headers.index("Статус")
        for row in rows:
            row[status_index] = "[Статус]"
    insert(caption(f"Таблица 1 — Рабочий результат лабораторной работы № {lab['semesterLabNumber']}"))
    insert(make_table(headers, rows, widths, font_size=16))

    insert(heading("5. Расчёты, схема или обоснование решения", level=1))
    rationale_rows = [
        ["Основание", "[Сошлитесь на конкретные ID, значения, правила или требования из исходных данных]"],
        ["Ход решения", "[Покажите формулу, подстановку, схему, сравнение вариантов или логику выбора]"],
        ["Независимый контроль", "[Опишите повторный расчёт, граничный тест, сопоставление с требованием или другую проверку]"],
        ["Профессиональный выбор", f"[Ответьте на вопрос: {lab['professionalChoice']}]"],
    ]
    insert(make_table(["Элемент", "Заполнение студента"], rationale_rows, [2100, 6900], font_size=18, first_col_bold=True))

    insert(heading("6. Результаты проверки", level=1))
    check_rows = [[str(index + 1), "[Что проверялось]", "[Ожидаемый признак]", "[Фактический результат]", "[Доказательство / статус]"] for index in range(5)]
    insert(make_table(["№", "Проверка", "Ожидается", "Фактически", "Доказательство"], check_rows, [550, 2000, 2050, 2050, 2350], font_size=17))

    insert(heading("7. Доказательства", level=1))
    insert(hint_box("[Вставьте рисунок или скриншот 1. Должны быть читаемы ключевые значения, ID события, состояние или настройка. Не включайте лишние окна и персональные данные.]", lines=2))
    insert(caption("Рисунок 1 — [Краткое название доказательства]"))
    insert(hint_box("[Вставьте рисунок, схему или скриншот 2, если он нужен для подтверждения результата. Если доказательство полностью табличное, удалите этот блок.]", lines=1))
    insert(caption("Рисунок 2 — [Краткое название доказательства]"))

    insert(heading("8. Обнаруженные ошибки или ограничения", level=1))
    limitation_rows = [[str(index + 1), "[Ошибка / ограничение]", "[Как обнаружено]", "[Влияние]", "[Корректирующее действие / статус]"] for index in range(3)]
    insert(make_table(["№", "Факт", "Обнаружение", "Влияние", "Действие"], limitation_rows, [550, 2300, 2000, 1700, 2450], font_size=17))

    insert(heading("9. Самопроверка", level=1))
    self_rows = [["☐", item, "[Примечание при необходимости]"] for item in lab["selfCheck"]]
    insert(make_table(["Отметка", "Контрольный вопрос", "Комментарий"], self_rows, [1000, 5000, 3000], font_size=18))

    insert(heading("10. Краткий вывод", level=1))
    insert(hint_box("[Сформулируйте профессиональный вывод: что установлено, соответствует ли результат требованию, какое решение принято и на каких доказательствах оно основано. Не пересказывайте теорию.]", lines=3))
    insert(paragraph("Перед сдачей", bold=True, size=22, color="ED131C", before=120, after=60, keep_next=True))
    insert(paragraph(
        f"Удалите серые подсказки, проверьте подписи и читаемость доказательств. Сохраните один файл: {lab['recommendedFileName']}. Затем перейдите в LMS, прикрепите его к заданию лабораторной работы № {lab['semesterLabNumber']} за {lab['semester']} семестр и убедитесь, что отправка завершена.",
        size=20,
        after=80,
    ))


def write_docx(reference: Path, output: Path, document_xml: bytes):
    with zipfile.ZipFile(reference, "r") as source, zipfile.ZipFile(output, "w") as target:
        for info in source.infolist():
            data = document_xml if info.filename == "word/document.xml" else source.read(info.filename)
            copied = deepcopy(info)
            target.writestr(copied, data)


def verify_preservation(reference: Path, output: Path):
    with zipfile.ZipFile(reference) as source, zipfile.ZipFile(output) as result:
        source_names = set(source.namelist())
        result_names = set(result.namelist())
        if source_names != result_names:
            raise RuntimeError(f"Package members changed for {output.name}")
        for name in source_names - {"word/document.xml"}:
            if source.read(name) != result.read(name):
                raise RuntimeError(f"Preserve-only part changed: {name} in {output.name}")


def main():
    if not REFERENCE.exists():
        raise FileNotFoundError(REFERENCE)
    actual_sha = hashlib.sha256(REFERENCE.read_bytes()).hexdigest()
    if actual_sha != REFERENCE_SHA256:
        raise RuntimeError(f"Reference SHA mismatch: {actual_sha}")
    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    labs = payload["labs"]
    if len(labs) != 12:
        raise RuntimeError(f"Expected 12 labs, got {len(labs)}")
    if sum(lab["points"] for lab in labs if lab["semester"] == 7) != 50:
        raise RuntimeError("Semester 7 must total 50 points")
    if sum(lab["points"] for lab in labs if lab["semester"] == 8) != 50:
        raise RuntimeError("Semester 8 must total 50 points")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for stale in OUTPUT_DIR.glob("*.docx"):
        stale.unlink()
    with zipfile.ZipFile(REFERENCE) as package:
        original_xml = package.read("word/document.xml")
    parser = etree.XMLParser(remove_blank_text=False)
    for lab in labs:
        root = etree.fromstring(original_xml, parser)
        body = cover_updates(root, lab)
        append_report_body(body, lab)
        document_xml = etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone="yes")
        output = OUTPUT_DIR / lab["reportFile"]
        write_docx(REFERENCE, output, document_xml)
        verify_preservation(REFERENCE, output)
        print(f"CREATED {output.name} {output.stat().st_size} bytes")
    print("OK: 12 report templates created; all preserve-only package parts are byte-identical.")


if __name__ == "__main__":
    main()
