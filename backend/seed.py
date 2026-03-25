"""Create data/ directory with initial test data if it doesn't exist."""
from pathlib import Path
from config import (
    DATA_DIR, SESSIONS_DIR, TESTS_DIR, AVATARS_DIR,
    TOPICS_FILE
)
from storage import write_json, file_exists


TOPICS = [
    {"id": "cybersecurity", "name": "Кибербезопасность", "color_key": "purple", "icon_key": "shield"},
    {"id": "hr_crisis",     "name": "Кадровый кризис",   "color_key": "teal",   "icon_key": "people"},
    {"id": "financial",     "name": "Финансовый кризис", "color_key": "amber",  "icon_key": "chart"},
    {"id": "operational",   "name": "Операционный сбой", "color_key": "blue",   "icon_key": "server"},
    {"id": "strategic",     "name": "Стратегический просчёт", "color_key": "red", "icon_key": "target"},
    {"id": "project",       "name": "Проектный кризис",  "color_key": "green",  "icon_key": "task"},
    {"id": "regulatory",    "name": "Регуляторный кризис","color_key": "coral", "icon_key": "law"}
]

SEED_TEST = {
    "id": "test_suspicious_traffic",
    "topic_id": "cybersecurity",
    "title": "Подозрительный трафик на сервере",
    "description": (
        "На сервер компании поступает аномально большой объём входящего трафика. "
        "Системы мониторинга фиксируют резкий рост запросов с нескольких IP-адресов. "
        "Основной сайт начинает замедляться. Вы — ответственный за ИТ-инфраструктуру."
    ),
    "analysis_good": (
        "Вы правильно приоритизировали диагностику перед действием. "
        "Быстрое выявление источника угрозы позволяет принять точечные меры."
    ),
    "analysis_improve": (
        "Стоит уделить внимание скорости эскалации инцидента и заблаговременной подготовке "
        "playbook-а реагирования на DDoS."
    ),
    "questions": [
        {
            "id": "q1",
            "order": 1,
            "text": "Первые данные мониторинга указывают на аномальный трафик. Каков ваш первый шаг?",
            "type": "single",
            "explanation": (
                "Первым шагом всегда должна быть диагностика. Без анализа трафика "
                "невозможно понять — это атака, ошибка конфигурации или легитимный всплеск."
            ),
            "answers": [
                {
                    "id": "a1",
                    "text": "Запустить анализ сетевого трафика (tcpdump / Wireshark)",
                    "time_hours": 2,
                    "cost_rub": 400,
                    "hint": "Позволяет точно определить природу трафика без прерывания работы.",
                    "is_correct": True
                },
                {
                    "id": "a2",
                    "text": "Немедленно отключить сервер от сети",
                    "time_hours": 0.1,
                    "cost_rub": 50000,
                    "hint": "Быстро, но приведёт к простою всех сервисов.",
                    "is_correct": False
                },
                {
                    "id": "a3",
                    "text": "Уведомить команду ИБ и ждать их решения",
                    "time_hours": 1,
                    "cost_rub": 0,
                    "hint": "Правильно вовлечь ИБ, но без данных они не смогут действовать эффективно.",
                    "is_correct": False
                },
                {
                    "id": "a4",
                    "text": "Перезагрузить сервер",
                    "time_hours": 0.5,
                    "cost_rub": 10000,
                    "hint": "Временно уберёт симптом, но не устранит причину.",
                    "is_correct": False
                }
            ]
        },
        {
            "id": "q2",
            "order": 2,
            "text": "Анализ показал: идёт DDoS-атака с 500+ IP-адресов. Что делаете дальше?",
            "type": "multiple",
            "explanation": (
                "При DDoS необходимо одновременно: подключить защиту на уровне провайдера/CDN, "
                "заблокировать вредоносные IP на файрволе и уведомить провайдера."
            ),
            "answers": [
                {
                    "id": "a5",
                    "text": "Включить защиту от DDoS у провайдера / CDN",
                    "time_hours": 1,
                    "cost_rub": 15000,
                    "hint": "Наиболее эффективный способ фильтрации на уровне сети.",
                    "is_correct": True
                },
                {
                    "id": "a6",
                    "text": "Заблокировать атакующие IP на уровне файрвола",
                    "time_hours": 0.5,
                    "cost_rub": 0,
                    "hint": "Помогает при небольшом числе источников, но при 500+ IP частичная мера.",
                    "is_correct": True
                },
                {
                    "id": "a7",
                    "text": "Уведомить провайдера о происходящем",
                    "time_hours": 0.3,
                    "cost_rub": 0,
                    "hint": "Провайдер может принять меры на уровне магистрального канала.",
                    "is_correct": True
                },
                {
                    "id": "a8",
                    "text": "Опубликовать информацию об атаке в социальных сетях",
                    "time_hours": 0.2,
                    "cost_rub": 0,
                    "hint": "Преждевременная огласка может усугубить репутационный ущерб.",
                    "is_correct": False
                }
            ]
        },
        {
            "id": "q3",
            "order": 3,
            "text": "Атака отражена. Сервис восстановлен. Что необходимо сделать в течение 24 часов?",
            "type": "single",
            "explanation": (
                "Post-incident review (разбор инцидента) обязателен: фиксирует хронологию, "
                "выявляет слабые места и формирует меры предотвращения на будущее."
            ),
            "answers": [
                {
                    "id": "a9",
                    "text": "Провести разбор инцидента и зафиксировать хронологию и меры",
                    "time_hours": 3,
                    "cost_rub": 0,
                    "hint": "Стандартная практика ITIL/DevOps — post-mortem без обвинений.",
                    "is_correct": True
                },
                {
                    "id": "a10",
                    "text": "Ничего — главное, что всё работает",
                    "time_hours": 0,
                    "cost_rub": 0,
                    "hint": "Без анализа следующая атака застанет врасплох снова.",
                    "is_correct": False
                },
                {
                    "id": "a11",
                    "text": "Сразу купить дорогую систему защиты от DDoS",
                    "time_hours": 40,
                    "cost_rub": 500000,
                    "hint": "Покупка без анализа потребностей может оказаться избыточной.",
                    "is_correct": False
                },
                {
                    "id": "a12",
                    "text": "Уволить администратора, дежурившего во время атаки",
                    "time_hours": 8,
                    "cost_rub": 200000,
                    "hint": "Blame culture разрушает команду и не устраняет системных проблем.",
                    "is_correct": False
                }
            ]
        }
    ]
}

SEED_TEST_HR = {
    "id": "test_key_dev_quit",
    "topic_id": "hr_crisis",
    "title": "Уход ключевого разработчика",
    "description": (
        "Ведущий разработчик — единственный, кто знает архитектуру ядра продукта — "
        "подал заявление об уходе. До его последнего рабочего дня 2 недели. "
        "Релиз новой версии продукта запланирован через месяц."
    ),
    "analysis_good": (
        "Вы правильно сосредоточились на передаче знаний и документировании. "
        "Это снижает bus factor и защищает проект."
    ),
    "analysis_improve": (
        "В будущем важно не допускать ситуации единственного носителя критических знаний — "
        "внедрить практику code review и парного программирования."
    ),
    "questions": [
        {
            "id": "q1",
            "order": 1,
            "text": "Разработчик подал заявление. Каков ваш первый приоритет?",
            "type": "single",
            "explanation": (
                "Немедленная организация передачи знаний — самое критичное действие. "
                "Документация и сессии с командой минимизируют потерю экспертизы."
            ),
            "answers": [
                {
                    "id": "a1",
                    "text": "Организовать сессии передачи знаний и документирование архитектуры",
                    "time_hours": 40,
                    "cost_rub": 0,
                    "hint": "Позволяет сохранить критические знания до ухода специалиста.",
                    "is_correct": True
                },
                {
                    "id": "a2",
                    "text": "Немедленно нанять замену через рекрутинговое агентство",
                    "time_hours": 200,
                    "cost_rub": 300000,
                    "hint": "Найм займёт больше 2 недель, новый человек не успеет принять знания.",
                    "is_correct": False
                },
                {
                    "id": "a3",
                    "text": "Предложить повышение зарплаты для удержания",
                    "time_hours": 2,
                    "cost_rub": 100000,
                    "hint": "Может сработать, но не решает проблему bus factor в будущем.",
                    "is_correct": False
                },
                {
                    "id": "a4",
                    "text": "Перенести релиз и ничего не предпринимать до ухода сотрудника",
                    "time_hours": 0,
                    "cost_rub": 500000,
                    "hint": "Пассивная позиция приведёт к потере всей экспертизы.",
                    "is_correct": False
                }
            ]
        },
        {
            "id": "q2",
            "order": 2,
            "text": "Что сделать с запланированным релизом через месяц?",
            "type": "single",
            "explanation": (
                "Честная оценка рисков и принятие решения о переносе релиза — "
                "это ответственный подход. Выпустить сырой продукт хуже, чем перенести дату."
            ),
            "answers": [
                {
                    "id": "a5",
                    "text": "Оценить реальную готовность команды и перенести релиз при необходимости",
                    "time_hours": 8,
                    "cost_rub": 50000,
                    "hint": "Честная оценка рисков — основа ответственного управления проектом.",
                    "is_correct": True
                },
                {
                    "id": "a6",
                    "text": "Выпустить релиз в срок любой ценой",
                    "time_hours": 160,
                    "cost_rub": 200000,
                    "hint": "Сырой релиз нанесёт репутационный ущерб и увеличит технический долг.",
                    "is_correct": False
                },
                {
                    "id": "a7",
                    "text": "Отменить релиз полностью",
                    "time_hours": 4,
                    "cost_rub": 800000,
                    "hint": "Полная отмена чрезмерна — можно выпустить урезанную версию.",
                    "is_correct": False
                },
                {
                    "id": "a8",
                    "text": "Передать задачи оставшимся разработчикам без дополнительной поддержки",
                    "time_hours": 0,
                    "cost_rub": 0,
                    "hint": "Без передачи знаний команда не справится с незнакомым кодом.",
                    "is_correct": False
                }
            ]
        }
    ]
}


def seed():
    """Initialize data directory structure and seed files if not present."""
    # Create directory structure
    for directory in [DATA_DIR, SESSIONS_DIR, AVATARS_DIR]:
        directory.mkdir(parents=True, exist_ok=True)

    for topic in TOPICS:
        (TESTS_DIR / topic['id']).mkdir(parents=True, exist_ok=True)

    # Write topics.json if missing
    if not file_exists(TOPICS_FILE):
        write_json(TOPICS_FILE, TOPICS)
        print(f"[seed] Created {TOPICS_FILE}")

    # Write seed tests if missing
    cyber_test_path = TESTS_DIR / 'cybersecurity' / 'test_suspicious_traffic.json'
    if not file_exists(cyber_test_path):
        write_json(cyber_test_path, SEED_TEST)
        print(f"[seed] Created {cyber_test_path}")

    hr_test_path = TESTS_DIR / 'hr_crisis' / 'test_key_dev_quit.json'
    if not file_exists(hr_test_path):
        write_json(hr_test_path, SEED_TEST_HR)
        print(f"[seed] Created {hr_test_path}")

    print("[seed] Data directory ready.")
