// Персонажи. Жильцы с флагом npc существуют физически на этаже; остальные — только в телефоне.
// Расписания: список правил сверху вниз; первое подходящее определяет, где персонаж и что делает.
import { t } from '../utils/time.js';

export const PLAYER = { id: 'player', name: 'Кирилл', chatName: 'Вы', color: '#a7c4b0' };

export const CHARACTERS = {
  zinaida: {
    npc: true,
    name: 'Зинаида Павловна Крылова', short: 'Зинаида Павловна', chatName: 'Зинаида Павловна', initials: 'ЗП', color: '#d9a3a3',
    age: 74, apartment: '45', door: 'd45', homeNode: 'zina_chair', insideVisible: true,
    bio: 'Живёт в 45-й с 1983 года. Бывшая учительница химии, вдова. Знает всех в подъезде, пишет длинными сообщениями без запятых и всех называет уменьшительными именами.',
    secret: 'Её муж Пётр работал не в «котельной», а на закрытом объекте под домом. После его смерти она нашла пропуск и ключ — и никому их не показала.',
    fear: 'Остаться одной, когда «опять начнётся» — она помнит, как в 1986-м уже закрывали подъезд на неделю.',
    voice: { pitch: 230, rate: 0.9 },
    look: { height: 1.55, build: 1.08, skin: 0xd8b49c, hair: 0xc9c5bd, hairStyle: 'bun', top: 0x5a4a5e, bottom: 0x3a3436, extra: ['glasses', 'shawl', 'cane'], stoop: 0.18 },
    speed: 0.45,
    trust: 20,
    schedule: [
      { when: (c) => c.flag('zina_missing'), at: 'gone' },
      { when: (c) => c.flag('zina_walks') && !c.flag('zina_walk_done'), at: 'f48', activity: 'deliver' },
      { when: (c) => c.flag('zina_at_door'), at: 'in45', activity: 'door' },
      { when: () => true, at: 'zina_chair', activity: 'sit' },
    ],
  },
  marina: {
    npc: true,
    name: 'Марина Ковалёва', short: 'Марина', chatName: 'Марина (48)', initials: 'МК', color: '#9ec3e0',
    age: 38, apartment: '48', door: 'd48', homeNode: 'in48',
    bio: 'Бухгалтер, одна растит семилетнюю Соню. Муж в командировке в Сургуте. Тревожная, но собранная: когда страшно — составляет списки.',
    secret: 'Соня уже две ночи говорит, что «дядя из стены» зовёт её по имени. Марина считает это последствием температуры и никому не говорит.',
    fear: 'Что с Соней что-то случится, а она будет за запертой дверью.',
    voice: { pitch: 210, rate: 1.05 },
    look: { height: 1.66, build: 0.95, skin: 0xe0bea4, hair: 0x3a2a20, hairStyle: 'long', top: 0x8a9ab0, bottom: 0x2a2d35, extra: ['robe'] },
    speed: 1.0,
    trust: 5,
    schedule: [
      { when: () => true, at: 'in48', activity: 'home' },
    ],
  },
  denis: {
    npc: true,
    name: 'Денис Шаров', short: 'Денис', chatName: 'Денис 49', initials: 'ДШ', color: '#b7a3e0',
    age: 27, apartment: '49', door: 'd49', homeNode: 'in49',
    bio: 'Тестировщик на удалёнке, снимает 49-ю второй год. Саркастичный, всё проверяет «на баги», на двери у него камера-глазок. Курит на лестнице, хотя уверяет, что бросил.',
    secret: 'Камера в его двери записала, что происходило в коридоре днём. Он пересматривал запись трижды и до сих пор не уверен, что видел.',
    fear: 'Выглядеть дураком. Поэтому шутит, когда страшно.',
    voice: { pitch: 120, rate: 1.15 },
    look: { height: 1.8, build: 0.92, skin: 0xdcb79c, hair: 0x2a221c, hairStyle: 'hood', top: 0x2e3238, bottom: 0x22252a, extra: ['hoodie'] },
    speed: 1.15,
    trust: 0,
    schedule: [
      { when: (c) => c.flag('denis_smoking') && !c.flag('denis_back'), at: 'landing_win', activity: 'smoke' },
      { when: () => true, at: 'in49', activity: 'home' },
    ],
  },
  gennady: {
    npc: true,
    name: 'Геннадий Борисович Лапин', short: 'Геннадий Борисович', chatName: 'Лапин Г.Б. (старший по дому)', initials: 'ГЛ', color: '#c9b37a',
    age: 56, apartment: '51', door: 'd51', homeNode: 'in51',
    bio: 'Отставной прапорщик, «старший по дому» — сам себя назначил, но счета за подъезд действительно оплачивает вовремя. Резкий, подозрительный, любит порядок и списки нарушителей.',
    secret: 'Запас воды у него на месяц, и делиться он не собирается. А ещё он слышит шаги в пустой 52-й с самого обеда.',
    fear: 'Потерять контроль. Если нельзя управлять ситуацией — управляет людьми.',
    voice: { pitch: 95, rate: 0.95 },
    look: { height: 1.76, build: 1.18, skin: 0xd2a88c, hair: 0x8a8580, hairStyle: 'short', top: 0x3c4630, bottom: 0x24262a, extra: ['vest', 'mustache'] },
    speed: 1.0,
    trust: -10,
    schedule: [
      { when: (c) => c.flag('gena_to_panel') && !c.flag('breaker_fixed'), at: 'panel', activity: 'panel' },
      { when: (c) => c.flag('gena_at_52') && !c.flag('gena_52_done'), at: 'f52', activity: 'listen' },
      { when: (c) => c.time >= t('22:05') && c.time < t('22:35') && !c.flag('gena_patrol_done'), at: 'patrol', activity: 'patrol', route: ['c_8', 'c_m8', 'c_2', 'c_10'] },
      { when: () => true, at: 'in51', activity: 'home' },
    ],
  },
  olga: {
    name: 'Ольга Ремез', short: 'Ольга', chatName: 'Ольга Ремез (кв.31)', initials: 'ОР', color: '#a3d9b5',
    age: 44, apartment: '31', bio: 'Медсестра приёмного отделения, живёт на 4 этаже. Спокойная, конкретная, собирает список жильцов и их нужд. Из-за решётки на лестнице до шестого не дойдёт.',
    trust: 10,
  },
  sanych: {
    name: 'Александр Мухин', short: 'Саныч', chatName: 'Саныч (дворник)', initials: 'АМ', color: '#d9c7a3',
    age: 61, apartment: '3', bio: 'Дворник и электрик «на все руки», живёт на первом. Пишет редко, коротко и только по делу. С 19:12 не выходит на связь.',
    trust: 15,
  },
  vetrov: {
    name: 'Н. Ветров', short: 'Ветров', chatName: 'Н. Ветров (кв.52)', initials: 'НВ', color: '#8a8f8c',
    apartment: '52', bio: 'Николай Ветров, инженер на пенсии. По словам соседей, умер в 2021 году; квартира опечатана.',
    trust: 0,
  },
  lisa: {
    name: 'Лиза Гончар', short: 'Лиза', chatName: 'Лиза 🌙 (кв.60)', initials: 'ЛГ', color: '#e0b3d4',
    age: 19, apartment: '60', bio: 'Студентка-дизайнер с седьмого этажа. Шутит мемами, пьёт слишком много кофе, по ночам рисует.',
  },
  artur: {
    name: 'Артур Гаспарян', short: 'Артур', chatName: 'Артур (кв.37)', initials: 'АГ', color: '#a3c9d9',
    age: 41, apartment: '37', bio: 'Владелец шумного хаски по кличке Граф. Главная его проблема на карантине — собаку нельзя вывести.',
  },
  uk: { name: 'УК «Тополь-Сервис»', short: 'УК', chatName: 'УК «Тополь-Сервис»', initials: 'УК', color: '#7f8c8d', bio: 'Официальный аккаунт управляющей компании.' },
  // Личные контакты
  mom: { name: 'Мама', short: 'Мама', chatName: 'Мама', initials: 'М', color: '#e0c39e', bio: 'Галина Ермакова. Живёт в Самаре, смотрит новости с утра до вечера и звонит, если ты не ответил за пять минут.' },
  lyosha: { name: 'Лёша', short: 'Лёша', chatName: 'Лёша', initials: 'Л', color: '#9ee0c3', bio: 'Друг со школы. Живёт в соседнем районе. Узнав про карантин, поехал к оцеплению «посмотреть своими глазами».' },
  irina: { name: 'Ирина (бюро переводов)', short: 'Ирина', chatName: 'Ирина · Бюро «Лингва»', initials: 'И', color: '#c3c3e0', bio: 'Менеджер бюро переводов. Ей нужен перевод инструкции к промышленному насосу к утру. Конец света — не уважительная причина.' },
  unknown: { name: '+7 900 017-17-17', short: 'Неизвестный', chatName: '+7 900 017-17-17', initials: '?', color: '#5c6360', bio: 'Номер не определён оператором.' },
  mchs: { name: 'ОПОВЕЩЕНИЕ', short: 'ОПОВЕЩЕНИЕ', chatName: 'ОПОВЕЩЕНИЕ', initials: '!', color: '#c9774a', bio: 'Система экстренного оповещения населения.' },
};

export function charName(id) { return id === 'player' ? PLAYER.chatName : (CHARACTERS[id]?.chatName || id); }
