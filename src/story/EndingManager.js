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

  /** Итог главы 2: что сделал с резонатором, кто помог, кому отдан голос */
  compute2() {
    const g = this.g;
    const f = g.gs.data.flags;
    const outcome = f.c2_outcome || 'tape';
    const O = {
      shutdown: {
        title: 'Тишина',
        text: 'Ты опустил рубильник.\n\nГул стих. Кристаллы погасли один за другим, как окна в доме напротив. «Н. Ветров» покинул группу. Больше никто не стучал — ни в эту ночь, ни потом.\n\nНо дом забыл не только их.' + (f.zina_missing ? ' Зинаида Павловна так и не вернулась. Теперь — уже совсем.' : ' Утром Зинаида Павловна не узнала тебя на пороге. «Вы к кому, молодой человек?»'),
        tease: 'В 9:00 военные начнут выводить жителей. В списке штаба значится «Ермаков К. А., кв. 47, десятый этаж».',
      },
      record: {
        title: 'Голос дома',
        text: 'Ты сказал в микрофон: «Не открывайте никому. Это Кирилл».\n\nТеперь это повторяют стены. В каждой квартире, из каждой вентиляции, твоим голосом. Соседи не откроют никому.\n\nДаже тебе.',
        tease: 'Ночью в чат придёт сообщение от тебя: «я дома. я всегда был дома».',
      },
      tape: {
        title: 'Доказательство',
        text: 'Ты унёс плёнку. «Запись 14», двадцатое марта восемьдесят девятого.\n\nРезонатор остался гудеть внизу. Ему некуда спешить: у него девятнадцать голосов, и он учится новым.\n\nУтром ты попробуешь показать плёнку военным. Если до утра никто не постучит.',
        tease: 'На катушке, на самом её конце, есть ещё одна запись. Она сделана сегодня. Голосом Саныча.',
      },
    }[outcome];
    const word = (id) => g.rel.summary(id).word;
    return {
      chapterLabel: 'Глава 2 · Котельная',
      title: O.title, text: O.text, tease: O.tease, outcome,
      stats: [
        ['Ключ от котельной', f.zina_missing ? 'взят у пустой квартиры' : 'от Зинаиды Павловны'],
        ['Геннадий Борисович', f.c2_gena_help ? 'стерёг лифт' : f.c2_gena_hostile ? 'отключил лифт' : 'не вмешался'],
        ['Рация Сони', g.inventory.has('walkie') ? 'была с тобой' : 'не досталась'],
        ['Саныч', f.c2_sanych_gone ? 'исчез у стены' : 'не найден'],
        ['Твой голос', f.c2_gave_voice || outcome === 'record' ? 'отдан дому' : 'сохранён — ты молчал'],
        ['Плёнка 1984 года', f.c2_tape_heard ? 'прослушана' : 'не прослушана'],
        ['Денис', word('denis')],
        ['Найдено странностей', `${g.gs.data.story.clues.length} из ${Object.keys(CLUES).length}`],
      ],
    };
  }

  show() {
    const g = this.g;
    const chapter = g.gs.data.chapter || 1;
    if (chapter === 2) return this.show2();
    if (g.gs.data.story.ending) return;
    const data = this.compute();
    g.gs.data.story.ending = data.outcome;
    g.gs.data.story.ch1Outcome = data.outcome;
    g.saves.save('auto', 'Конец главы 1');
    g.saves.save('ch1end', 'Конец главы 1');
    g.hud.fade(true, 'Рассвет так и не наступил.\nНо ночь закончилась.').then(() => {
      g.setMode('ending');
      g.menus.showEnding(data, {
        onMenu: () => g.toMainMenu(),
        onNext: () => g.startChapter2(),
        onKeepPlaying: () => { g.menus.hide(); g.setMode('play'); g.hud.fade(false); },
      });
    });
  }

  show2() {
    const g = this.g;
    if (g.gs.data.story.ending2) return;
    const data = this.compute2();
    g.gs.data.story.ending2 = data.outcome;
    g.saves.save('auto', 'Конец главы 2');
    g.hud.fade(true, 'Лифт остановился на шестом.\nДвери открылись в тишину.').then(() => {
      g.setMode('ending');
      g.menus.showEnding(data, {
        onMenu: () => g.toMainMenu(),
        onKeepPlaying: () => { g.menus.hide(); g.setMode('play'); g.hud.fade(false); },
      });
    });
  }
}
