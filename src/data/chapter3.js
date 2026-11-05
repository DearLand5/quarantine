// Глава 3 «Десятый этаж». Утро эвакуации. Лиза с седьмого поднялась по срезанной решётке на этаж,
// которого нет, и не вернулась. Её голос отвечает из-за трёх одинаковых дверей с номером 47.
// Живая Лиза пересказывает своими словами; эхо повторяет записанное домом слово в слово — или сам вопрос.
import { t3 } from '../utils/time.js';
import { SEQUENCES, AMBIENT, CHATS } from './messages.js';
import { DIALOGUES } from './dialogues.js';
import { QUESTS } from './quests.js';
import { CLUES } from './items.js';

CHATS.lisa = { type: 'dm', with: 'lisa', visible: false };

Object.assign(QUESTS, {
  c3_main: { title: 'Десятый этаж', objectives: [
    { id: 'read', text: 'Прочитать, что случилось ночью' },
    { id: 'climb', text: 'Подняться по лестнице выше седьмого' },
    { id: 'find', text: 'Найти Лизу — она за одной из дверей «47»' },
    { id: 'back', text: 'Спуститься обратно' },
  ] },
});

Object.assign(CLUES, {
  echo_verbatim: { title: 'Слово в слово', text: 'Эхо отвечает фразами, записанными домом, — точно как в чате. Живые пересказывают своими словами.' },
  list10: { title: 'Список эвакуации', text: 'В списке десятого этажа — три раза «кв. 47 — Ермаков К. А.».' },
  replica: { title: 'Моя прихожая', text: 'На десятом этаже за дверью 47 — моя прихожая. Мои куртки, мои ботинки. Зеркало отражает пустую вешалку.' },
  radio10: { title: 'Рация группы два', text: 'Брошенная рация военных: «Группа два, вы на каком этаже? Группа два, назовите себя».' },
});

// ------------------------------------------------------------------ ночная хроника
export function nightLog(c) {
  const out = c.ch2Outcome();
  const d3 = (s) => { const [h, m] = s.split(':').map(Number); return 2880 + h * 60 + m; };
  const log = [
    { chat: 'house', at: '00:40', from: 'olga', text: 'Кирилл вернулся? Денис, что на камере?' },
    { chat: 'house', at: '00:42', from: 'denis', text: 'вернулся. живой. молчит' },
    { chat: 'house', at: '02:10', from: 'lisa', text: 'у нас на 7м на лестнице решётка открыта. её срезали. наверх' },
    { chat: 'house', at: '02:12', from: 'lisa', text: 'там свет. на 8м и 9м темно, а выше свет. какой выше если у нас 9 этажей' },
    { chat: 'house', at: '02:13', from: 'artur', text: 'Лиза, не ходите туда. Пожалуйста.' },
    { chat: 'house', at: '02:31', from: 'lisa', text: 'я поднялась. тут коридор как у вас на шестом. все двери 47' },
    { chat: 'house', at: '02:31', from: 'lisa', text: 'и в списке на доске три раза Кирилл' },
    { chat: 'house', at: '02:33', from: 'lisa', text: 'мне кажется я тут уже была' },
    { chat: 'house', at: '02:34', from: 'olga', text: 'Лиза, спускайтесь немедленно!' },
    { chat: 'house', at: '03:20', from: 'denis', text: 'Лиза не отвечает час. её телефон в сети. «печатает» и стирает' },
    { chat: 'house', at: '05:30', from: 'gennady', text: 'Решётку на седьмом срезали снаружи, не изнутри. Военные ночью поднимались. Группа из трёх. Назад не спускалась.' },
    { chat: 'house', at: '05:41', from: 'marina', text: 'Соня говорит, ночью по рации девочка плакала и звала «Кирилла»' },
  ];
  if (out === 'shutdown') log.push(
    { chat: 'house', at: '01:15', from: 'marina', text: 'Зинаида Павловна спросила меня через дверь, кто я такая. Она меня не помнит.' },
    { chat: 'house', at: '01:20', from: 'denis', text: 'и ни одного стука за ночь. ни одного. дом как будто вымер' },
  );
  if (out === 'record') log.push(
    { chat: 'house', at: '01:05', from: 'olga', text: 'Кирилл, в вентиляции всю ночь ваш голос: «Не открывайте никому». Это вы?' },
    { chat: 'house', at: '01:07', from: 'artur', text: 'У нас тоже. Граф слушает и не лает.' },
  );
  if (out === 'tape') log.push(
    { chat: 'lyosha', at: '04:50', from: 'lyosha', text: 'связь появилась. кирилл, я у штаба. у них в фургоне такие же катушки. десятки. на каждой номер квартиры' },
    { chat: 'lyosha', at: '04:51', from: 'lyosha', text: 'на одной — 47' },
  );
  log.push({ chat: 'denis', at: '05:44', from: 'denis', text: 'ты как. если пойдёшь за Лизой — я на связи. наверху связь почему-то есть' });
  return log.map((m) => ({ ...m, at: d3(m.at), read: m.at < '05:00' }));
}

// ------------------------------------------------------------------ сообщения главы 3
Object.assign(SEQUENCES, {
  c3_intro: [
    { chat: 'mchs', from: 'mchs', delay: 2, typing: 0, text: 'ОПОВЕЩЕНИЕ: Вывод жителей д. 14 начнётся в 09:00. Ожидайте у дверей. Открывайте только на команду «СВОИ».' },
    { chat: 'house', from: 'denis', delay: 8, typing: 3, text: 'Лиза снова в сети' },
    { chat: 'house', from: 'lisa', delay: 3, typing: 6, text: 'кирилл. я за дверью. не знаю за какой. они все одинаковые' },
    { chat: 'house', from: 'lisa', delay: 2, typing: 2, text: 'постучи' },
    { do: (c) => c.quest.start('c3_main') },
  ],
  c3_arrive: [
    { chat: 'denis', from: 'denis', typing: 4, text: 'ты наверху? у меня на камере ты стоишь у своей двери. на шестом. смотришь в глазок' },
    { chat: 'denis', from: 'denis', delay: 3, typing: 7, text: 'слушай. эхо повторяет слово в слово то, что записал дом. я пересматривал чат. живые так не говорят. спроси Лизу о чём-то из чата — и слушай, КАК она ответит' },
    { chat: 'lisa', from: 'lisa', delay: 6, typing: 3, text: 'я слышу шаги. это ты?' },
    { do: (c) => c.setVisible('lisa') },
  ],
  c3_saved: [
    { chat: 'house', from: 'denis', delay: 3, text: 'ЛИЗА??? вы вдвоём?' },
    { chat: 'house', from: 'olga', delay: 3, text: 'Спускайтесь. Медленно. Не отвечайте никому по дороге.' },
  ],
  c3_lost: [
    { chat: 'lisa', from: 'lisa', delay: 2, typing: 2, text: 'ты открыл не ту' },
    { chat: 'lisa', from: 'lisa', delay: 2, typing: 2, text: 'теперь их четыре' },
  ],
});

AMBIENT.push(
  { id: 'c3_bags', chapter: 3, steps: [
    { from: 'artur', text: 'Собрал сумку. Поводок положил. Вдруг Граф найдётся' },
    { from: 'marina', text: 'Соня взяла рацию и плюшевого зайца. Больше ничего не разрешила' },
  ] },
  { id: 'c3_gena', chapter: 3, steps: [
    { from: 'gennady', text: 'Списки эвакуации сверены. Шестой этаж выводится вторым.' },
    { from: 'denis', text: 'а первым?' },
    { from: 'gennady', text: 'Первым — десятый.' },
  ] },
);

// ------------------------------------------------------------------ двери с голосом Лизы
// Какая из трёх дверей настоящая — выбирается в начале главы (флаг c3_real = 1..3)
const QUESTIONS = [
  { id: 'food', text: 'Лиза, что ты ела позавчера вечером?' },
  { id: 'dog', text: 'Как зовут собаку Артура?' },
  { id: 'ficus', text: 'Что тебе завещал Денис?' },
];

const ANSWERS = {
  real: {
    food: 'Доширак, господи… с сыром. И яйцо, последнее. Я потом полночи жалела, что не оставила. Кирилл, мне холодно.',
    dog: 'Граф. Хаски, дурной, сбежал вчера в подвал. Артур с ума сходит. Ты зачем меня экзаменуешь?..',
    ficus: 'Фикус. Свой дурацкий фикус, «если не вернусь». Он же вернулся? Денис вернулся?',
  },
  verbatim: {
    food: 'минутка нормальности: доширак с сыром и последним яйцом',
    dog: 'добавьте Графа в чат, он хотя бы адекватный будет',
    ficus: 'фикус принят',
  },
  mirror: {
    food: 'Лиза, что ты ела позавчера вечером? Лиза, что ты ела позавчера вечером?',
    dog: 'Как зовут собаку Артура? …Открой. Как зовут собаку?',
    ficus: 'Что тебе завещал Денис? Что тебе. Завещал. Открой.',
  },
};

function lisaDoor(n) {
  const kind = (c) => {
    const real = c.flag('c3_real') || 2;
    if (real === n) return 'real';
    return (n + real) % 2 ? 'verbatim' : 'mirror';
  };
  const nodes = {
    d0: {
      speaker: 'voice', name: 'Голос Лизы',
      text: (c) => (c.flag(`c3_open_${n}`) ? '…' : 'Кирилл? Это ты? Это Лиза. Открой, пожалуйста.'),
      choices: [
        ...QUESTIONS.map((q) => ({ text: q.text, next: `a_${q.id}` })),
        { text: 'Открыть дверь', tag: 'нельзя ошибиться', do: (c) => c.ch3.openLisaDoor(n), next: null },
        { text: 'Отойти', next: null },
      ],
    },
  };
  for (const q of QUESTIONS) {
    nodes[`a_${q.id}`] = {
      speaker: 'voice', name: 'Голос Лизы',
      text: (c) => ANSWERS[kind(c)][q.id],
      mood: (c) => (kind(c) === 'verbatim' ? 'интонация странно ровная' : kind(c) === 'mirror' ? 'тем же голосом, что и ты' : 'всхлипывает'),
      do: (c) => { if (kind(c) === 'verbatim') c.clue('echo_verbatim'); },
      next: 'd0',
    };
  }
  return { entries: [{ node: 'd0' }], nodes };
}

DIALOGUES.lisa_door_1 = lisaDoor(1);
DIALOGUES.lisa_door_2 = lisaDoor(2);
DIALOGUES.lisa_door_3 = lisaDoor(3);

DIALOGUES.lisa_found = {
  entries: [{ node: 'l1' }],
  nodes: {
    l1: { speaker: 'lisa', name: 'Лиза', text: 'Кирилл?.. Это правда ты? Ты… говоришь не как они. Они всё повторяют, понимаешь? Всё, что мы писали.', next: 'l2' },
    l2: { speaker: 'lisa', name: 'Лиза', text: 'Я пошла за военными. Они постучали «Свои», и я открыла. А потом их стало трое, потом шестеро, и все говорили моим голосом.', mood: 'дрожит', next: 'l3' },
    l3: { speaker: 'lisa', name: 'Лиза', text: 'Уведи меня отсюда. Только не отвечай никому на лестнице. Что бы ни спросили.', end: true },
  },
};

DIALOGUES.lisa_follow = {
  entries: [{ node: 'f1' }],
  nodes: {
    f1: { speaker: 'lisa', name: 'Лиза', text: 'Я тут. Иди. Я за тобой, не оборачивайся каждые две секунды, мне от этого страшнее.', end: true },
  },
};

DIALOGUES.c3_soldier = {
  entries: [{ node: 's1' }],
  nodes: {
    s1: {
      speaker: 'soldier', name: 'Военный в противогазе',
      text: 'Свои. Назовите себя.',
      mood: 'стоит на верхней ступени, не дышит',
      choices: [
        { text: '«Кирилл Ермаков, сорок седьмая»', do: (c) => c.ch3.answerSoldier('name'), next: null },
        { text: '(Промолчать и пройти мимо)', do: (c) => c.ch3.answerSoldier('silent'), next: null },
        { text: '«Свои»', do: (c) => c.ch3.answerSoldier('password'), next: null },
        { text: 'Включить плёнку «Запись 14»', cond: (c) => c.hasItem('tape_1984'), do: (c) => c.ch3.answerSoldier('tape'), next: null },
      ],
    },
  },
};

export const RADIO10_LINES = [
  'Группа два, доложите обстановку.',
  'Группа два, вы на каком этаже?',
  '…на десятом? Повторите. Десятого этажа нет.',
  'Группа два. Назовите себя.',
];

// ------------------------------------------------------------------ события главы 3
export const CH3_EVENTS = [
  { id: 'c3_intro', chapter: 3, cond: () => true, do: (c) => { c.ch3.pickRealDoor(); c.runSeq('c3_intro'); } },
  { id: 'c3_arrive', chapter: 3, cond: (c) => c.playerRoom() === 'landing10' || c.playerRoom() === 'corridor10', do: (c) => { c.runSeq('c3_arrive'); c.quest.objective('c3_main', 'climb'); } },
  { id: 'c3_end', chapter: 3, cond: (c) => c.flag('c3_down') && c.since('c3_down_ev') > 10 && !c.busy(), do: (c) => c.story.finishChapter() },
  { id: 'c3_down_ev', chapter: 3, cond: (c) => c.flag('c3_down'), do: (c) => { if (c.flag('c3_lisa_saved')) c.runSeq('c3_saved'); } },
];

export const C3_START = t3('05:50');
