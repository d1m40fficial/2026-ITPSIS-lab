from __future__ import annotations

import csv
import io
import json
import shutil
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "src" / "data" / "subject-areas.json"
LABS_FILE = ROOT / "src" / "data" / "labs.json"
INPUT_ROOT = ROOT / "inputs" / "subject-areas"
SOURCE_ROOT = INPUT_ROOT / "sources"
SEMESTER_ROOTS = {
    7: INPUT_ROOT / "semester-7",
    8: INPUT_ROOT / "semester-8",
}
PACK_ROOT = ROOT / "public" / "inputs" / "subject-areas" / "packs"
TEACHER_PACK_ROOT = ROOT / "public" / "teacher-packs"


PROFILE_VALUES = [
    (
        "Публичные сервисы первой линии",
        ["P1 — круглосуточно; остальные — 08:00–20:00", "P1 — 10 минут; P2 — 30 минут", "P1 — 60 минут; P2 — 4 часа", "P1 — сразу; P2 — через 45 минут", "оперативные записи — 180 дней"],
    ),
    (
        "Внутренние рабочие сервисы",
        ["по будням 08:00–20:00", "P1 — 15 минут; P2 — 1 час", "P1 — 2 часа; P2 — 8 часов", "P1 — сразу; P2 — через 2 часа", "карточки и журналы — 90 дней"],
    ),
    (
        "Учётные и интеграционные сервисы",
        ["круглосуточный автоматический контроль", "P1 — 10 минут; P2 — 30 минут", "P1 — 90 минут; P2 — 6 часов", "при повторе 3 раза или задержке 30 минут", "трассировки и карточки — 180 дней"],
    ),
    (
        "Автоматизированные рабочие места",
        ["по расписанию учебных площадок", "P1 — 20 минут; P2 — 2 часа", "P1 — 4 часа; P2 — следующий рабочий день", "после двух безуспешных проверок L1", "карточки — 90 дней; состояние — 30 дней"],
    ),
    (
        "Сетевые и защитные сервисы",
        ["круглосуточно", "P1 — 5 минут; P2 — 20 минут", "P1 — 45 минут; P2 — 3 часа", "при потере резервирования или повторном отказе", "конфигурации и события — 365 дней"],
    ),
    (
        "Критичные сервисы данных и доступа",
        ["круглосуточно с дежурной сменой", "P1 — 5 минут; P2 — 15 минут", "P1 — 30 минут; P2 — 2 часа", "P1 сразу владельцу и техническому руководителю", "решения и технические журналы — 365 дней"],
    ),
]

CHARACTERISTICS = [
    ("C1", "Режим поддержки", "Обращения по системе «{system}» принимаются и контролируются в установленном окне поддержки."),
    ("C2", "Цель реакции", "Назначенный специалист подтверждает начало работы с обращением по системе «{system}» в установленный срок."),
    ("C3", "Цель восстановления", "Критичная функция системы «{system}» должна быть возвращена в срок, заданный приоритетом."),
    ("C4", "Порог эскалации", "Обращение по системе «{system}» передаётся следующей линии при наступлении указанного условия."),
    ("C5", "Хранение доказательств", "Карточки, решения и журналы системы «{system}» хранятся в течение установленного периода."),
]

AREAS = [
    ("Электронное расписание", "публикация и просмотр актуального расписания", ["расписание", "учётные записи", "журналы"]),
    ("Личный кабинет студента", "вход и доступ к учебным данным", ["профили", "задания", "оценки"]),
    ("Портал приёмной комиссии", "подача и отслеживание заявления", ["заявления", "документы", "статусы"]),
    ("Электронная библиотека", "поиск и открытие учебных изданий", ["каталог", "лицензии", "история доступа"]),
    ("Портал учебных материалов", "чтение и загрузка файлов курса", ["файлы", "метаданные", "версии"]),
    ("Сервис учебной печати", "приём и печать заданий", ["очередь", "принтеры", "журнал печати"]),
    ("Бронирование аудиторий", "создание и проверка брони", ["аудитории", "брони", "календарь"]),
    ("Служба Service Desk", "регистрация и обработка обращений", ["обращения", "SLA", "комментарии"]),
    ("Учёт компьютерного оборудования", "поиск актива и истории его состояния", ["активы", "перемещения", "инвентаризация"]),
    ("Система заявок на доступ", "согласование и выдача прав", ["заявки", "роли", "согласования"]),
    ("Синхронизация реестра студентов", "передача актуальных учётных записей", ["реестр", "пакеты", "контроль целостности"]),
    ("Сервис экспорта отчётов", "формирование и выдача отчёта", ["задания экспорта", "файлы", "статусы"]),
    ("Шлюз учебных уведомлений", "своевременная доставка уведомлений", ["сообщения", "каналы", "повторы"]),
    ("Очередь преобразования документов", "преобразование и сохранение учебного файла", ["очередь", "исходные файлы", "результаты"]),
    ("Компьютерный класс", "вход пользователя и запуск учебной среды", ["рабочие станции", "образы", "профили"]),
    ("Рабочее место преподавателя", "доступ к учебным материалам и ведомостям", ["документы", "профиль", "журналы"]),
    ("Медиааудитория", "запуск презентации и вывод медиа", ["контроллер", "медиафайлы", "проектор"]),
    ("Экзаменационный терминал", "запуск и сдача учебного задания", ["сеансы", "ответы", "журнал контроля"]),
    ("Мобильное учебное рабочее место", "защищённый доступ к учебным сервисам", ["устройство", "профиль", "токены"]),
    ("Шлюз сети кампуса", "маршрутизация разрешённого трафика", ["маршруты", "интерфейсы", "потоки"]),
    ("Сетевой экран учебной сети", "фильтрация и журналирование сетевых потоков", ["правила", "зоны", "журнал потоков"]),
    ("Контроллер Wi-Fi", "подключение авторизованных учебных устройств", ["точки доступа", "клиенты", "сеансы"]),
    ("Сервис удалённого доступа", "защищённое подключение к учебной сети", ["туннели", "сертификаты", "журнал сеансов"]),
    ("Узел мониторинга", "сбор метрик и формирование сигналов", ["метрики", "правила", "уведомления"]),
    ("Файловое хранилище", "чтение и запись учебных файлов", ["файлы", "права", "журнал операций"]),
    ("Сервер резервного копирования", "создание и восстановление копий", ["задания", "копии", "каталог носителей"]),
    ("Служба идентификации", "проверка учётной записи и выдача сеанса", ["учётные записи", "роли", "сеансы"]),
    ("Электронный архив документов", "поиск и выдача неизменённого документа", ["документы", "метаданные", "подписи"]),
    ("Хранилище результатов аттестации", "запись и выдача подтверждённых результатов", ["результаты", "протоколы", "журнал изменений"]),
]

def csv_text(header: list[str], rows: list[list[object]]) -> str:
    stream = io.StringIO(newline="")
    writer = csv.writer(stream, delimiter=";", lineterminator="\n")
    writer.writerow(header)
    writer.writerows(rows)
    return stream.getvalue()


def profiles(area_records: list[dict[str, object]]) -> list[dict[str, object]]:
    result = []
    for profile_id, (title, values) in enumerate(PROFILE_VALUES, 1):
        characteristics = [
            {"code": code, "name": name, "value": value, "example": example}
            for (code, name, example), value in zip(CHARACTERISTICS, values, strict=True)
        ]
        numbers = [int(area["id"]) for area in area_records if area["profileId"] == profile_id]
        result.append({
            "id": profile_id,
            "title": title,
            "variantRange": f"{numbers[0]:02d}–{numbers[-1]:02d}",
            "characteristics": characteristics,
        })
    return result


def areas() -> list[dict[str, object]]:
    result = []
    for area_id, (title, critical_function, assets) in enumerate(AREAS, 1):
        code = f"SA{area_id:02d}"
        result.append({
            "id": area_id,
            "code": code,
            "title": title,
            "systemCode": f"ITPSIS-{code}",
            "description": f"Учебная предметная область «{title}»; все имена и события синтетические.",
            "criticalFunction": critical_function,
            "assets": assets,
            "profileId": (area_id - 1) // 5 + 1,
            "pack": f"inputs/subject-areas/packs/{code}.zip",
        })
    return result


def personalize(value: object, area: dict[str, object]) -> object:
    if isinstance(value, str):
        return (
            value.replace("{system}", str(area["systemCode"]))
            .replace("{area}", str(area["title"]))
            .replace("{function}", str(area["criticalFunction"]))
        )
    if isinstance(value, list):
        return [personalize(item, area) for item in value]
    if isinstance(value, dict):
        return {key: personalize(item, area) for key, item in value.items()}
    return value


def markdown_source(lab: dict[str, object], area: dict[str, object], profile: dict[str, object]) -> str:
    source = personalize(lab["sourceData"], area)
    situation = personalize(lab["situation"], area)
    previous_results = personalize(lab["previousResults"], area)
    input_materials = personalize(lab["inputMaterials"], area)
    sequence_output = personalize(lab["sequenceOutput"], area)
    lines = [
        f"# {area['code']} · {lab['semester']} семестр · ЛР {int(lab['semesterLabNumber']):02d} · {lab['title']}", "",
        f"**Предметная область:** {area['title']}",
        f"**Система:** `{area['systemCode']}`",
        f"**Критичная функция:** {area['criticalFunction']}",
        f"**Профиль:** {profile['title']} (варианты {profile['variantRange']})", "",
        "## Рабочая ситуация", "", str(situation), "",
        "## Место в последовательности", "",
        f"**Результаты предыдущих работ:** {previous_results}", "",
        f"**Материалы на входе:** {input_materials}", "",
        f"**Использование результата:** {sequence_output}", "",
        "## Пять характеристик профиля", "",
        "| Код | Характеристика | Значение |", "| --- | --- | --- |",
    ]
    for item in profile["characteristics"]:
        lines.append(f"| {item['code']} | {item['name']} | {item['value']} |")
    lines.extend(["", "## Исходные данные", "", str(source["intro"]), ""])
    for section in source["sections"]:
        lines.extend([f"### {section['title']}", ""])
        for item in section.get("content", []):
            lines.extend([str(item), ""])
        table = section.get("table")
        if table:
            columns = [str(item) for item in table["columns"]]
            lines.extend(["| " + " | ".join(columns) + " |", "| " + " | ".join(["---"] * len(columns)) + " |"])
            for row in table["rows"]:
                lines.append("| " + " | ".join(str(item).replace("|", "\\|").replace("\n", "<br>") for item in row) + " |")
            lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def assignment_text(lab: dict[str, object]) -> str:
    lines = [
        f"# Лабораторная работа №{lab['semesterLabNumber']} — {lab['title']}", "",
        "## Цель работы", "", str(lab["goal"]), "",
        "## Инструменты", "",
    ]
    lines.extend(f"- {item}" for item in lab["tools"])
    lines.extend(["", "## Порядок выполнения", ""])
    for index, step in enumerate(lab["taskSteps"], 1):
        lines.extend([
            f"### Шаг {index}. {step['action']}", "",
            f"**С чем работать:** {step['sources']}", "",
            f"**Результат:** {step['result']}", "",
            f"**Проверка:** {step['check']}", "",
        ])
    lines.extend(["## Результаты работы", ""])
    lines.extend(f"- {item}" for item in lab["deliverables"])
    lines.extend(["", "## Оценивание", "", str(lab["assessment"]), ""])
    return "\n".join(lines)


def main() -> None:
    area_records = areas()
    profile_records = profiles(area_records)
    labs = json.loads(LABS_FILE.read_text(encoding="utf-8"))["labs"]
    if len(area_records) != 29 or len({area["title"] for area in area_records}) != 29:
        raise RuntimeError("Ожидаются 29 уникальных предметных областей")
    if len(profile_records) != 6 or any(len(profile["characteristics"]) != 5 for profile in profile_records):
        raise RuntimeError("Ожидаются 6 групп с пятью характеристиками")
    empty_profiles = [profile["id"] for profile in profile_records if not any(area["profileId"] == profile["id"] for area in area_records)]
    if empty_profiles:
        raise RuntimeError(f"Группы без вариантов: {empty_profiles}")

    for target in (SOURCE_ROOT, *SEMESTER_ROOTS.values(), PACK_ROOT, TEACHER_PACK_ROOT):
        resolved = target.resolve()
        if not resolved.is_relative_to(ROOT.resolve()):
            raise RuntimeError(f"Небезопасный путь: {resolved}")
        if target.exists():
            shutil.rmtree(target)
        target.mkdir(parents=True)

    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps({"profiles": profile_records, "subjectAreas": area_records}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    INPUT_ROOT.mkdir(parents=True, exist_ok=True)
    (INPUT_ROOT / "subject-areas.csv").write_text(csv_text(
        ["variant", "code", "subject_area", "system_code", "profile", "critical_function", "pack"],
        [[area["id"], area["code"], area["title"], area["systemCode"], area["profileId"], area["criticalFunction"], area["pack"]] for area in area_records],
    ), encoding="utf-8")

    profile_by_id = {profile["id"]: profile for profile in profile_records}
    semester_labs = {
        semester: [lab for lab in labs if lab["semester"] == semester]
        for semester in SEMESTER_ROOTS
    }
    semester_sources: dict[int, dict[int, list[tuple[dict[str, object], str]]]] = {
        semester: {
            int(lab["semesterLabNumber"]): [] for lab in semester_labs[semester]
        }
        for semester in SEMESTER_ROOTS
    }
    for area in area_records:
        profile = profile_by_id[area["profileId"]]
        area_root = SOURCE_ROOT / str(area["code"])
        lab_root = area_root / "labs"
        lab_root.mkdir(parents=True)
        readme = (
            f"# {area['code']} · {area['title']}\n\n"
            f"Вариант: **{int(area['id']):02d}**. Система: `{area['systemCode']}`.\n\n"
            "Пакет содержит только данные выбранной предметной области. Используйте этот же вариант во всех 12 лабораторных работах.\n\n"
            "## Состав\n\n"
            "- `system-passport.csv` — паспорт и активы;\n"
            "- `quality-characteristics.csv` — пять общих характеристик группы;\n"
            "- `labs/S7_LR01.md`–`labs/S7_LR07.md` — работы 7 семестра;\n"
            "- `labs/S8_LR01.md`–`labs/S8_LR05.md` — работы 8 семестра.\n"        )
        (area_root / "README.md").write_text(readme, encoding="utf-8")
        (area_root / "system-passport.csv").write_text(csv_text(
            ["field", "value"],
            [["variant", area["id"]], ["code", area["code"]], ["subject_area", area["title"]], ["system_code", area["systemCode"]], ["critical_function", area["criticalFunction"]], ["assets", ", ".join(area["assets"])]],
        ), encoding="utf-8")
        (area_root / "quality-characteristics.csv").write_text(csv_text(
            ["code", "characteristic", "value", "group", "variants"],
            [[item["code"], item["name"], item["value"], profile["title"], profile["variantRange"]] for item in profile["characteristics"]],
        ), encoding="utf-8")
        for original_lab in labs:
            lab = dict(original_lab)
            variant_data = json.loads((ROOT / "src/data/variant-data.json").read_text(encoding="utf-8"))
            lab.update(variant_data[str(area["code"])][str(lab["slug"])])
            source_name = f"S{lab['semester']}_LR{int(lab['semesterLabNumber']):02d}.md"
            rendered_source = markdown_source(lab, area, profile)
            (lab_root / source_name).write_text(rendered_source, encoding="utf-8")
            semester = int(lab["semester"])
            if semester in semester_sources:
                semester_sources[semester][int(lab["semesterLabNumber"])].append((area, rendered_source))

        with zipfile.ZipFile(PACK_ROOT / f"{area['code']}.zip", "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for file in sorted(area_root.rglob("*")):
                if file.is_file():
                    archive_name = f"{area['code']}/{file.relative_to(area_root).as_posix()}"
                    info = zipfile.ZipInfo(archive_name, date_time=(2026, 1, 1, 0, 0, 0))
                    info.compress_type = zipfile.ZIP_DEFLATED
                    info.external_attr = 0o100644 << 16
                    archive.writestr(info, file.read_bytes())

    semester_file_count = 0
    for semester, semester_root in SEMESTER_ROOTS.items():
        readme_lines = [
            f"# {semester} семестр", "",
            f"В каждой папке лабораторной работы собраны все {len(area_records)} вариантов.", "",
            "## Состав", "",
        ]
        for lab in semester_labs[semester]:
            number = int(lab["semesterLabNumber"])
            lab_dir = semester_root / f"LR{number:02d}"
            lab_dir.mkdir(parents=True)
            for area, rendered_source in semester_sources[semester][number]:
                variant_name = f"variant-{int(area['id']):02d}-{area['code']}.md"
                (lab_dir / variant_name).write_text(rendered_source, encoding="utf-8")
                semester_file_count += 1
            readme_lines.append(f"- `LR{number:02d}` — {lab['title']} ({len(area_records)} вариантов)")
        (semester_root / "README.md").write_text("\n".join(readme_lines) + "\n", encoding="utf-8")

    def add_to_archive(archive: zipfile.ZipFile, archive_name: str, data: bytes) -> None:
        info = zipfile.ZipInfo(archive_name, date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, data)

    def write_teacher_pack(target: Path, selected_semesters: list[int]) -> None:
        with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for semester in selected_semesters:
                semester_root = SEMESTER_ROOTS[semester]
                prefix = f"semester-{semester}"
                for file in sorted(semester_root.rglob("*")):
                    if file.is_file():
                        add_to_archive(archive, f"{prefix}/{file.relative_to(semester_root).as_posix()}", file.read_bytes())
                for lab in semester_labs[semester]:
                    report_file = ROOT / "public" / "reports" / str(lab["reportFile"])
                    lab_number = int(lab["semesterLabNumber"])
                    add_to_archive(archive, f"{prefix}/LR{lab_number:02d}/Задание.md", assignment_text(lab).encode("utf-8"))
                    add_to_archive(archive, f"{prefix}/LR{lab_number:02d}/Шаблон_отчёта.docx", report_file.read_bytes())

    write_teacher_pack(TEACHER_PACK_ROOT / "semester-7-all.zip", [7])
    write_teacher_pack(TEACHER_PACK_ROOT / "semester-8-all.zip", [8])
    write_teacher_pack(TEACHER_PACK_ROOT / "all-semesters.zip", [7, 8])

    print(
        f"OK: {len(area_records)} областей, {len(profile_records)} групп, "
        f"{len(area_records) * len(labs)} файлов исходных данных и "
        f"{semester_file_count} файлов в папках семестров."
    )


if __name__ == "__main__":
    main()
