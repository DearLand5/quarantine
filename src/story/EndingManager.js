// Итог главы: исход определяется главным выбором (стук в дверь), а детали — остальными решениями.
import { CLUES } from '../data/items.js';

const OUTCOMES = {
  warned: {
    title: 'Правило трёх стуков',
    text: 'Ты не открыл. И не промолчал.\n\nК утру весь подъезд знал правило: на три стука не открывать никому — даже знакомым голосам. Зинаиде Павловне тоже стучали. Голосом её Пети. Она не открыла.\n\nВ четыре утра кто-то медленно прошёл по коридору от двери к двери. Нигде не открыли.',
    tease: 'Утром Зинаида Павловна напишет тебе в личку: «Кирюша зайди ко мне есть у Пети ключ от котельной. Я думаю пора».',
  },
  ignored_safe: {
    title: 'Тишина за дверью',
    text: 'Ты не открыл и никому не сказал.\n\nСтук перешёл к сорок пятой. Голосом Кирилла. Но Зинаида Павловна запомнила, что ты сказал ей раньше, — и не открыла.\n\nТвоё предупреждение спасло её. Хотя никто, кроме вас двоих, об этом не узнает.',
    tease: 'Утром в чате появится новый участник: «Кирилл (кв. 47)». Ты его не добавлял.',
  },
  ignored: {
    title: 'Молчание',
    text: 'Ты не открыл. И промолчал.\n\nТа, что стучала к тебе, пошла дальше по коридору. Зинаида Павловна открыла: голос был твой.\n\nЕё последнее сообщение — «темно у меня что-то». Часы в сорок пятой с тех пор идут громче. Или так только кажется.',
    tease: 'Утром дверь 45 будет закрыта изнутри на цепочку. В квартире, где больше никто не отвечает.',
  },
  opened: {
    title: 'Открытая дверь',
    text: 'Ты открыл.\n\nЗа дверью никого не было — только мокрые следы к пятьдесят второй. А через минуту в общий чат пришло сообщение от тебя. Которого ты не писал.\n\nОни научились твоему голосу. И Зинаида Павловна услышала его за своей дверью.',
    tease: 'В 3:12 твой телефон завибрирует. Входящий вызов: «Кирилл (кв. 47)».',
  },
};

export class EndingManager {
  constructor(game) { this.g = game; }

  compute() {
    const g = this.g;
    const f = g.gs.data.flags;
    const outcome = g.gs.data.story.outcome || 'ignored';
    const o = OUTCOMES[outcome];
    const zinaMissing = !!f.zina_missing;
    const word = (id) => g.rel.summary(id).word;
    const gena = f.exposed_gena ? 'раскрыта в чате' : f.kept_gena_secret ? 'ты её сохранил' : f.gena_confessed ? 'знаешь только ты' : 'осталась при нём';
    const fig = f.shared_figure ? 'отправлено всем' : g.gallery.hasTag('figure') ? 'осталось у тебя' : 'не снято';
    const clues = g.gs.data.story.clues.length;
    return {
      chapterLabel: 'Глава 1 · Первая ночь',
      title: o.title,
      text: o.text,
      tease: o.tease,
      outcome,
      stats: [
        ['Соня получила лекарство', f.inhaler_delivered ? 'да, от тебя' : f.zina_walk_done ? 'принесла Зинаида Павловна' : 'нет'],
        ['Зинаида Павловна', zinaMissing ? 'не выходит на связь' : `жива · ${word('zinaida')}`],
        ['Марина', word('marina')],
        ['Денис', word('denis')],
        ['Геннадий Борисович', word('gennady')],
        ['Тайна Лапина', gena],
        ['Фото фигуры на лестнице', fig],
        ['Найдено странностей', `${clues} из ${Object.keys(CLUES).length}`],
      ],
    };
  }

  show() {
    const g = this.g;
    if (g.gs.data.story.ending) return;
    const data = this.compute();
    g.gs.data.story.ending = data.outcome;
    g.gs.data.chapter = 1;
    g.saves.save('auto', 'Конец главы 1');
    g.hud.fade(true, 'Рассвет так и не наступил.\nНо ночь закончилась.').then(() => {
      g.setMode('ending');
      g.menus.showEnding(data, {
        onMenu: () => g.toMainMenu(),
        onKeepPlaying: () => { g.menus.hide(); g.setMode('play'); g.hud.fade(false); },
      });
    });
  }
}
