// Обработчики взаимодействий с объектами мира. resolver(hitId) -> { label, action, hold?, important?, sub? }.
// Логика зависит от состояния сюжета, поэтому живёт в слое story, а не в world.
import { t } from '../utils/time.js';
import { DOORS } from '../data/locations.js';

const DOOR_DEFS = Object.fromEntries(DOORS.map((d) => [d.id, d]));

export function createInteractions(g) {
  const gs = g.gs;
  const bus = g.bus;
  const think = (text, duration = 4.5) => bus.emit('subtitle', { who: '', text, duration });
  const toast = (text) => bus.emit('hud:toast', { text });
  const once = (flag) => { if (gs.flag(flag)) return false; gs.setFlag(flag); return true; };
  const ctx = () => g.storyCtx;

  /** На какой стороне двери игрок: +1 — со стороны открывания (коридор), -1 — изнутри */
  const doorSide = (def) => {
    const p = g.player.pos;
    const d = def.axis === 'x' ? p.z - def.z : p.x - def.x;
    return Math.sign(d * def.openDir) || 1;
  };

  const setDoor = (id, open, { sound = true } = {}) => {
    const st = gs.door(id);
    st.open = open;
    if (open) st.chained = false;
    const door = g.world.getDoor(id);
    door.apply();
    if (sound) bus.emit('sound:play', { name: open ? 'door_open' : 'door_close', pos: door.sidePoint(1, 0.1), creak: open });
    bus.emit('door:changed', { id, open, by: 'player' });
  };

  const NEIGHBOR_DOORS = { d45: 'zinaida', d48: 'marina', d49: 'denis', d51: 'gennady' };

  function knock(doorId) {
    const door = g.world.getDoor(doorId);
    bus.emit('sound:play', { name: 'knock', pos: door.sidePoint(-1, 0.05), count: 3, volume: 0.9 });
    gs.inc(`knock_${doorId}`);
    setTimeout(() => respondToKnock(doorId), 1600);
  }

  function respondToKnock(doorId) {
    const voiceAt = g.world.getDoor(doorId).sidePoint(-1, 0.5);
    if (doorId === 'd46') { think('Тишина. Кузнецовы из 46-й уехали на дачу ещё в пятницу.'); return; }
    if (doorId === 'd50') {
      bus.emit('sound:play', { name: 'babble', bus: 'voice', pos: voiceAt, pitch: 110, duration: 2.2, muffled: true });
      bus.emit('subtitle', { who: 'Голос из 50-й', text: 'Мы не открываем! У нас телевизор! Идите домой, молодой человек!', duration: 4 });
      return;
    }
    if (doorId === 'd52') {
      if (gs.flag('after_vetrov')) {
        setTimeout(() => {
          bus.emit('sound:play', { name: 'knock', pos: voiceAt, count: 3, volume: 0.5 });
          bus.emit('caption:sound', { text: '[изнутри стучат в ответ. Три раза]' });
          g.ambience.setTension(Math.max(g.ambience.tension, 0.5));
          ctx().vetrovPing(true);
        }, 1800);
      } else think('Тишина. Только из-под двери тянет холодом и мокрой штукатуркой.');
      return;
    }
    const npcId = NEIGHBOR_DOORS[doorId];
    const npc = g.npcs.occupant(doorId);
    if (!npc || npc.id !== npcId) { think('Никто не открывает.'); return; }
    const resp = g.dialogue.doorResponse(npcId);
    if (resp === null) { think('За дверью тихо.'); return; }
    if (resp !== 'open') {
      const pitch = g.npcs.get(npcId).def.voice.pitch;
      bus.emit('sound:play', { name: 'babble', bus: 'voice', pos: voiceAt, pitch, duration: 2, muffled: true });
      bus.emit('subtitle', { who: g.npcs.get(npcId).def.short, text: resp.say, duration: 4.5 });
      return;
    }
    bus.emit('subtitle', { who: g.npcs.get(npcId).def.short, text: npcId === 'zinaida' ? 'Иду, иду…' : 'Кто там?', duration: 2 });
    g.npcs.answerDoor(npcId, () => g.story.talkTo(npcId, { atDoor: true }), { chain: npcId === 'marina' });
  }

  function doorHandler(id) {
    const def = DOOR_DEFS[id];
    return {
      label: () => {
        const st = gs.door(id);
        const side = doorSide(def);
        if (def.interior || id === 'dStair') return st.open ? 'Закрыть дверь' : 'Открыть дверь';
        if (id === 'd47') {
          if (side < 0) {
            if (gs.flag('knock_active')) return 'Подойти к двери';
            return st.open ? 'Закрыть и запереть' : 'Открыть дверь';
          }
          return st.open ? 'Закрыть дверь' : 'Открыть ключом';
        }
        if (id === 'd45' && side < 0) return st.open ? 'Закрыть дверь' : 'Открыть дверь';
        if (st.open) return null;   // разговор идёт через NPC
        if (id === 'd52' && !gs.flag('seen_52')) return 'Осмотреть дверь 52';
        return 'Постучать';
      },
      sub: () => (id === 'd52' && gs.flag('seen_52') ? 'пломба сорвана' : null),
      important: () => id === 'd52' && !gs.flag('seen_52') && g.quests.isActive('seal52'),
      action: () => {
        const st = gs.door(id);
        const side = doorSide(def);
        if (def.interior || id === 'dStair') { setDoor(id, !st.open); return; }
        if (id === 'd47') {
          if (side < 0 && gs.flag('knock_active')) { g.story.knockDialogue(); return; }
          if (st.open) {
            setDoor(id, false);
            if (side < 0) {
              st.locked = true; st.chained = true;
              setTimeout(() => { bus.emit('sound:play', { name: 'lock', pos: g.world.getDoor(id).sidePoint(-1, 0.1) }); bus.emit('sound:play', { name: 'chain', pos: g.world.getDoor(id).sidePoint(-1, 0.1) }); g.world.getDoor(id).apply(); }, 450);
            }
            return;
          }
          // Открыть: снять цепочку, повернуть замок, открыть
          const p = g.world.getDoor(id).sidePoint(-1, 0.1);
          if (st.chained) bus.emit('sound:play', { name: 'chain', pos: p });
          setTimeout(() => bus.emit('sound:play', { name: 'lock', pos: p }), 250);
          st.locked = false;
          setTimeout(() => setDoor(id, true), 550);
          if (g.quests.isActive('inhaler')) g.quests.objective('inhaler', 'unchain');
          return;
        }
        if (id === 'd45' && side < 0) { setDoor(id, !st.open); return; }
        if (id === 'd52' && !gs.flag('seen_52')) {
          gs.setFlag('seen_52');
          const broken = !st.sealed;
          think(broken
            ? 'Бумажная пломба «ОПЕЧАТАНО, 14.03.2021» разорвана. Края свежие, не пожелтевшие. Из-под двери тянет холодом.'
            : 'Дверь опечатана: две бумажные полосы крест-накрест, печать УК. Из-под двери тянет холодом.', 6);
          if (broken) ctx().clue('seal_broken');
          if (g.quests.isActive('seal52')) g.quests.objective('seal52', 'look');
          return;
        }
        knock(id);
      },
    };
  }

  function peepholeHandler(id) {
    return {
      label: () => (gs.door(id).open ? null : 'Посмотреть в глазок'),
      action: () => g.story.peephole(id),
    };
  }

  function npcHandler(npcId) {
    return {
      label: () => {
        const npc = g.npcs.get(npcId);
        if (!npc || npc.gone || !npc.root.visible || npc.talking) return null;
        if (npc.isInside() && !npc.def.insideVisible && !npc.forceDoorway) return null;
        if (npc.forceDoorway) return null;
        return `Поговорить: ${npc.def.short}`;
      },
      action: () => g.story.talkTo(npcId),
    };
  }

  // ------------------------------------------------------------ предметы
  const H = {
    shoe_cabinet: {
      label: () => (gs.flag('got_flashlight') ? 'Тумбочка' : 'Открыть тумбочку'),
      important: () => !gs.flag('got_flashlight'),
      action: () => {
        if (once('got_flashlight')) {
          bus.emit('sound:play', { name: 'switch', pos: g.player.eye });
          g.inventory.add('flashlight');
          g.inventory.add('keys47', 1, { silent: true });
          g.quests.objective('look_around', 'flashlight');
          think('Фонарик лежал под перчатками. Кнопка тугая, но светит. Нажми «Фонарь», чтобы включить.');
        } else think('Обувной крем, ложка для обуви, старые квитанции. Ничего полезного.');
      },
    },
    receipt: {
      label: () => 'Квитанция ЖКУ',
      action: () => {
        ctx().clue('receipt');
        g.reader.show({ title: 'ЕПД · октябрь', text: 'УК «Тополь-Сервис»\nул. Тополиная, д. 14, кв. 47\nЕрмаков К. А.\n\nСодержание жилья ........ 1 248,40\nВывоз ТКО ................ 312,10\nЭлектроэнергия ОДН ....... 98,55\n\nСведения о доме:\nгод ввода — 1981\nзастройщик — СМУ-4 при НИИ «Кристалл» (п/я 17)\nматериал стен — панели ЖБ, серия 1-464-К (спецсостав)\n\n«Спецсостав». Раньше не замечал.' });
      },
    },
    bed47: {
      label: () => (g.story.isSafeAtHome() ? 'Прилечь (подождать 15 минут)' : 'Кровать'),
      action: () => {
        if (!g.story.isSafeAtHome()) { think('Не время лежать — дверь не заперта.'); return; }
        g.story.waitTime(15);
      },
    },
    laptop: {
      label: () => 'Ноутбук',
      action: () => g.reader.show({ screen: true, title: 'ЦНС-60_перевод.docx', text: `Нет подключения к интернету.\n\n— — —\n\n4.2. Перед пуском насоса убедитесь, что запорная арматура на всасывающей линии открыта…\n4.3. Запрещается эксплуатация агрегата при посторонних шумах и стуках в проточной части.\n\n[переведено 31 из 48 страниц]\n\nДедлайн — 9:00. Ирине, кажется, всё равно, что дом оцеплен.` }),
    },
    charger: {
      label: () => {
        const p = gs.data.phone;
        if (!gs.data.world.power.apartment) return 'Зарядка (нет света)';
        return p.charging ? `Телефон заряжается · ${Math.round(p.battery)}%` : 'Поставить телефон на зарядку';
      },
      action: () => {
        const p = gs.data.phone;
        if (!gs.data.world.power.apartment) { think('Света нет — розетка мёртвая.'); return; }
        p.charging = !p.charging;
        bus.emit('sound:play', { name: 'tap', bus: 'ui' });
        toast(p.charging ? 'Телефон заряжается (пока вы в комнате)' : 'Телефон снят с зарядки');
      },
    },
    photo_mom: {
      label: () => 'Фотография',
      action: () => think('Мы с мамой в Анапе, 2019-й. Она тогда сгорела в первый же день и всю неделю ходила в моей футболке.', 5),
    },
    window_room: windowHandler('room'),
    window_kitchen: windowHandler('kitchen'),
    window_zina: windowHandler('zina'),
    window_corridor: windowHandler('corridor'),
    window_stair: windowHandler('stair'),
    mirror_bath: {
      label: () => 'Зеркало',
      action: () => {
        if (gs.flag('echo_has_voice')) { think('Отражение моргнуло на долю секунды позже тебя. Или показалось.', 5); g.ambience.setTension(0.7); bus.emit('sound:play', { name: 'sting', bus: 'music', base: 49, duration: 4 }); }
        else think('Помятое лицо. Пора бы побриться. И поспать.');
      },
    },
    fridge: {
      label: () => 'Холодильник',
      action: () => {
        bus.emit('sound:play', { name: 'door_open', pos: { x: 4.1, y: 1, z: -4.15 }, creak: false, volume: 0.5 });
        if (once('got_water')) { g.inventory.add('water'); think('Полпачки пельменей, кефир, два яйца. И бутылка воды — забираю.'); }
        else think(gs.data.world.power.apartment ? 'Пельмени и кефир. Холодильник гудит, как ни в чём не бывало.' : 'Внутри темно и тихо. Холод уходит.');
      },
    },
    radio: {
      label: () => (gs.flag('radio_on') ? 'Выключить радио' : 'Включить радио'),
      action: () => g.story.toggleRadio(),
    },
    kettle: {
      label: () => 'Поставить чайник',
      action: () => {
        if (!gs.data.world.power.apartment) { think('Чайник электрический. Света нет.'); return; }
        bus.emit('sound:play', { name: 'kettle', pos: { x: 4.05, y: 1, z: -5.15 } });
        if (once('tea')) think('Чай — это хотя бы что-то нормальное в этот вечер.');
      },
    },
    kitchen_drawer: {
      label: () => 'Ящик с мелочами',
      action: () => {
        if (once('got_batteries')) { g.inventory.add('batteries'); think('Изолента, спички, свечной огарок — и две батарейки АА в упаковке.'); }
        else think('Изолента, спички, огарок свечи.');
      },
    },
    sw_room47: switchHandler('sw_room47'),
    sw_desk47: switchHandler('sw_desk47'),
    sw_hall47: switchHandler('sw_hall47'),
    sw_kitchen47: switchHandler('sw_kitchen47'),
    sw_bath47: switchHandler('sw_bath47'),
    panel: {
      label: () => (gs.data.world.breakerTripped ? 'Поднять рычаг автомата' : 'Электрощиток ЩЭ-6'),
      important: () => gs.data.world.breakerTripped,
      hold: () => (gs.data.world.breakerTripped && g.story.canSeeInDark() ? 1.4 : 0),
      action: () => {
        if (gs.data.world.breakerTripped) {
          if (!g.story.canSeeInDark()) { think('В щитке ничего не видно. Нужен свет — фонарик.'); return; }
          g.story.fixBreaker('player');
          return;
        }
        think(gs.flag('breaker_fixed') ? 'Автомат ЩЭ-6 включён. Пломба на дверце щитка давно сорвана — задолго до сегодняшнего вечера.' : 'Щиток. Пломба на дверце сорвана. За дверцей ровно гудит.', 5);
      },
    },
    notice_board: {
      label: () => 'Доска объявлений',
      action: () => {
        ctx().clue('notice_52');
        g.reader.show({ title: 'Доска объявлений', text: 'ВНИМАНИЕ! Режим ограничения передвижения. Не покидайте квартиры. — Штаб ГОЧС\n\n— — —\n\nУК «Тополь-Сервис»\nКв. 52 опечатана по решению суда. Вскрытие запрещено. 14.03.2021\n\n— — —\n\nСдам гараж, ГСК «Мотор», недорого.\n(отрывные полоски с телефоном оторваны все, кроме одной)' });
      },
    },
    lift_button: {
      label: () => 'Вызвать лифт',
      action: () => {
        bus.emit('sound:play', { name: 'switch', pos: { x: 6.1, y: 1.2, z: -3.3 } });
        if (gs.flag('lift_ghost_done') && once('lift_pressed_after')) {
          think('Кнопка на секунду загорелась. Где-то в шахте лязгнули тросы — и всё стихло.');
          bus.emit('sound:play', { name: 'pipes', pos: { x: 6.1, y: 0, z: -3.6 } });
        } else think('Кнопка не горит. Лифт обесточен по распоряжению штаба.');
      },
    },
    cctv: {
      label: () => 'Камера наблюдения',
      action: () => think(gs.flag('after_vetrov') ? 'Красный индикатор горит. Час назад он был тёмным. Камера смотрит на дверь 52.' : 'Камера «для безопасности», которую УК повесила в прошлом году. Индикатор не горит — наверное, муляж.', 5),
    },
    door50_listen: {
      label: () => (gs.door('d50').open ? null : null),
      action: () => {},
    },
    grate_up: {
      label: () => 'Решётка на седьмой этаж',
      action: () => think('Решётка на замке. Замок свежий, ещё в заводской смазке. Её поставили сегодня — снаружи, не изнутри.', 5),
    },
    barrier_down: {
      label: () => 'Металлический щит',
      action: () => {
        think('«ПРОХОД ЗАКРЫТ. Режим ЧС». Щит приварен к перилам. Снизу, из темноты пролёта, тянет сыростью.', 5);
        if (gs.flag('after_vetrov')) setTimeout(() => { bus.emit('sound:play', { name: 'steps_far', pos: { x: 14, y: -2.5, z: 1.4 }, count: 5, interval: 0.7 }); bus.emit('caption:sound', { text: '[внизу кто-то медленно поднимается по лестнице — и останавливается]' }); }, 1500);
      },
    },
    trash_chute: {
      label: () => 'Мусоропровод',
      action: () => {
        if (gs.flag('after_vetrov')) {
          bus.emit('sound:play', { name: 'knock', pos: { x: 11.6, y: 0.2, z: -2.4 }, count: 3, volume: 0.35, interval: 0.5 });
          bus.emit('caption:sound', { text: '[из глубины трубы — три глухих удара]' });
        } else think('Заварен в 2019-м. Из щели пахнет старым мусором и почему-то — мокрой штукатуркой.');
      },
    },
    gena_water: {
      label: () => (gs.door('d51').open ? 'Бутылки с водой' : null),
      action: () => { ctx().clue('gena_water'); think('Шесть-семь упаковок воды, сложенных как в армейском складе. На месяц хватит. Одному.'); },
    },
    zina_box: {
      label: () => (g.rooms.current === 'room45' ? 'Коробка из-под обуви' : null),
      action: () => think(g.inventory.has('pass_p17') ? 'Петины бумаги: квитанции, грамоты «Ударник пятилетки». Пропуск я уже забрал.' : 'Коробка с надписью «ПЕТЯ». Чужие вещи — без спроса не трогаю.'),
    },
    zina_photo: {
      label: () => 'Фотография на стене',
      action: () => {
        ctx().clue('photo_p17');
        think('«П/я 17 · 1984. Отдел акустики». Двенадцать человек в белых халатах у бетонной стены. Лица у всех почему-то немного смазаны.', 6);
      },
    },
    zina_clock: {
      label: () => 'Часы',
      action: () => think('Старые часы «Янтарь». Тикают громко и ровно. Сорок лет, сказала она.'),
    },
    note_floor: {
      label: () => 'Листок под дверью',
      important: () => true,
      action: () => g.story.pickNote(),
    },
  };

  function windowHandler(which) {
    const text = {
      room: 'Внизу — забор из сетки, палатки штаба, фургоны с антеннами. Мигалки без сирен. Люди в химзащите стоят неподвижно и смотрят на наш дом. Не на подъезд — на окна.',
      kitchen: 'Двор залит светом прожекторов. Детская площадка, качели. Возле песочницы стоит человек в форме и что-то говорит в рацию, глядя на шестой этаж.',
      zina: 'Из окна Зинаиды Павловны видно то же оцепление. На подоконнике — герань и свечка в блюдце.',
      corridor: 'Торцевое окно. Соседний дом напротив: в половине окон темно. В одном горит свет, и за шторой кто-то стоит. Как будто смотрит сюда.',
      stair: 'Ветер свистит в щели рамы. Внизу у подъезда — двое военных, курят. Один поднял голову и долго смотрит на лестничное окно.',
    }[which];
    return {
      label: () => 'Посмотреть в окно',
      important: () => which === 'room' && !g.quests.objectiveDone('look_around', 'window'),
      action: () => {
        think(text, 6);
        if (which === 'room' || which === 'kitchen') g.quests.objective('look_around', 'window');
      },
    };
  }

  function switchHandler(id) {
    return {
      label: () => {
        if (!gs.data.world.power.apartment) return 'Выключатель (нет света)';
        const fx = g.lighting.fixtures.find((f) => f.def.switch === id);
        return fx && g.lighting.switchState(fx) ? 'Выключить свет' : 'Включить свет';
      },
      action: () => {
        g.lighting.toggleSwitch(id);
        if (!gs.data.world.power.apartment) think('Щёлк. Ничего. Света нет во всей квартире.');
      },
    };
  }

  // Неинтерактивная зона «прислушаться» у 50-й не нужна — стук обрабатывается дверью
  delete H.door50_listen;

  return function resolve(hitId) {
    if (!hitId) return null;
    if (hitId.startsWith('door:')) return doorHandler(hitId.slice(5));
    if (hitId.startsWith('peephole:')) return peepholeHandler(hitId.slice(9));
    if (hitId.startsWith('npc:')) return npcHandler(hitId.slice(4));
    return H[hitId] || null;
  };
}

export { t };
