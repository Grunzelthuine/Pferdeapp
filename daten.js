// Startdaten für "Antrainieren".
// Übungsnamen und Ansagetexte sind kurze, eigene Formulierungen nach dem Plan
// "Trainingsplan Antrainieren" (OsteoDressage). Ausführliche Beschreibungen
// kannst du in der App unter Einstellungen > Übungen selbst ergänzen.

const SEED_EXERCISES = {
  warm_basis: {
    name: 'Führen Basisübung (Aufwärmen)', phase: 'warm', min: 10, hw: 5,
    text: 'Aufwärmen: Führe dein Pferd im Schritt in der Basisübung, Volten und Geraden im Wechsel. In den Volten gebogen, auf den Geraden gerade. Nach der Hälfte Handwechsel.'
  },
  walk: {
    name: 'Spaziergang (Aufwärmen)', phase: 'warm', min: 30, hw: 0,
    text: 'Spaziergang in zügigem Schritt, etwa 5 Kilometer pro Stunde. 30 bis 60 Minuten, mindestens aber 10 Minuten warmführen.'
  },
  longe_schritt: {
    name: 'Longieren Basisübung im Schritt', phase: 'warm', min: 10, hw: 5,
    text: 'Longiere in der Basisübung im Schritt, Volten und Geraden im Wechsel. Handwechsel nach der Hälfte.'
  },
  schritt_oval: {
    name: 'Longieren Schrittstangen, kleines Oval', phase: 'warm', min: 10, hw: 5,
    text: 'Longiere im Schritt das kleine Oval über flach gelegte Schrittstangen.'
  },
  faecher_10: {
    name: 'Stangenfächer (Aufwärmen)', phase: 'warm', min: 10, hw: 5,
    text: 'Führe dein Pferd ruhig auf der Volte über den Stangenfächer, gebogen und gleichmäßig, auf beiden Händen.'
  },
  longe_trab: {
    name: 'Longieren Trab, Dauermethode', phase: 'work', min: 16, hw: 4,
    text: 'Longiere in der Basisübung im Trab, möglichst ohne Unterbrechung im gleichmäßigen Takt. Kurze Unterbrechungen nur für den Handwechsel.'
  },
  cavaletto: {
    name: 'Cavaletto übersteigen', phase: 'work', min: 10, hw: 0,
    text: 'Eine Stange etwa 15 Zentimeter erhöht. Führe dein Pferd gerade und mittig darüber, je 5 mal pro Hand. Klappt das, halte an, wenn nur die Vorderbeine über der Stange stehen, und lass es kurz stehen. Später einzelne Beine, dann die Hinterbeine.'
  },
  schrittstangen: {
    name: 'Führen über Schrittstangen', phase: 'work', min: 10, hw: 5,
    text: 'Führe dein Pferd über 4 Schrittstangen auf gerader Linie im kleinen Oval. 5 Minuten je Hand.'
  },
  schenkel_viertel: {
    name: 'Schenkelweichen Viertellinie zur Bande', phase: 'work', min: 8, hw: 4,
    text: 'Schenkelweichen an der Hand von der Viertellinie zur Bande, 15 mal je Hand. Das Pferd leicht gegen die Bewegungsrichtung gestellt. Wird es eilig, Haltpausen einbauen.'
  },
  schenkel_zirkel: {
    name: 'Schenkelweichen auf dem Zirkel', phase: 'work', min: 6, hw: 3,
    text: 'Schenkelweichen an der Hand als Übertreten auf dem Zirkel, zwei Zirkelrunden pro Hand, mit Haltpausen.'
  },
  faecher_2x45: {
    name: 'Stangenfächer 2× 45 Sek. je Hand', phase: 'work', min: 5, hw: 0,
    text: 'Führe auf der Volte über den Stangenfächer. Ziel: 45 Sekunden ununterbrochen in der Biegung, dann Pause auf der Geraden und Handwechsel. Je Hand zweimal.'
  },
  faecher_3x45: {
    name: 'Stangenfächer 3× 45 Sek. je Hand', phase: 'work', min: 7, hw: 0,
    text: 'Führe auf der Volte über den Stangenfächer. Ziel: 45 Sekunden ununterbrochen in der Biegung, dann Pause auf der Geraden und Handwechsel. Je Hand dreimal.'
  },
  trabstangen: {
    name: 'Trabstangen, kleines Oval', phase: 'work', min: 10, hw: 0,
    text: 'Longiere im Trab das kleine Oval über flach gelegte Trabstangen. Immer 10 mal über die Stangen, dann Handwechsel.'
  },
  trab_sattel: {
    name: 'Trab unterm Sattel', phase: 'work', min: 10, hw: 5,
    text: 'Trab unterm Sattel auf ganzer Bahn und Zirkel, auf beiden Händen. Leichter Sitz oder Leichttraben, mit wechselndem Rahmen.'
  },
  oval_trab_galopp: {
    name: 'Großes Oval Trab und Galopp', phase: 'work', min: 6, hw: 3,
    text: 'Auf dem großen Oval im Trab und Galopp, auf beiden Händen etwa drei Runden.'
  },
  oval_galopp: {
    name: 'Großes Oval Galopp', phase: 'work', min: 4, hw: 2,
    text: 'Galopp auf dem großen Oval, auf beiden Händen.'
  },
  cooldown: {
    name: 'Cool-Down Führen', phase: 'cool', min: 10, hw: 5,
    text: 'Cool-Down: ruhig in der Basisübung führen.'
  },
  koppel: {
    name: 'Koppelpause oder Spaziergang', phase: 'rest', min: 0, hw: 0,
    text: 'Ruhetag: Koppel oder entspannter Spaziergang.'
  }
};

// Hilfsfunktionen, um die Wochen kompakt zu schreiben.
// Eintrag: 'id' oder ['id', minuten, handwechselAlleMin]
function _note(g, k, kr) {
  const s = n => '★'.repeat(n);
  let t = `Grundlagenausdauer ${s(g)} · Koordination ${s(k)}`;
  if (kr) t += ` · Kraftausdauer ${s(kr)}`;
  return t;
}
function _day(note, ...entries) {
  return {
    note: note || '',
    items: entries.map(e => {
      const [ex, min, hw] = Array.isArray(e) ? e : [e];
      const def = SEED_EXERCISES[ex];
      return { ex, min: min ?? def.min, hw: hw ?? def.hw };
    })
  };
}
const _rest = () => _day('', 'koppel');

// Wiederkehrende Tagestypen
const W1_A = () => _day(_note(3, 2), 'warm_basis', 'cavaletto', ['longe_trab', 16, 4], 'cooldown');
const W1_B = () => _day(_note(1, 3), 'walk', ['cavaletto', 15]);
const W2_A = () => _day(_note(1, 2), 'walk', ['cavaletto', 8], 'schrittstangen');
const W2_B = () => _day(_note(3, 2), 'warm_basis', 'schenkel_viertel', ['longe_trab', 20, 5], 'cooldown');
const W3_A = (hw) => _day(_note(3, 2), 'warm_basis', 'schenkel_zirkel', ['longe_trab', 20, hw], 'cooldown');
const W3_B = () => _day(_note(1, 3), 'walk', 'faecher_2x45', 'schenkel_zirkel');
const W4_A = (g, k) => _day(_note(g, k), 'warm_basis', 'schenkel_zirkel', ['longe_trab', 16, 4], 'cooldown');
const W5_A = () => _day(_note(3, 2), 'warm_basis', 'schritt_oval', ['longe_trab', 10, 5], 'trabstangen', 'cooldown');
const W5_B = () => _day(_note(1, 3), 'walk', 'faecher_2x45', 'schenkel_viertel');
const W7_SATTEL = () => _day(_note(3, 2, 1), 'warm_basis', 'faecher_10', ['longe_trab', 10, 5], 'trab_sattel', 'cooldown');
const W7_B = () => _day(_note(1, 3), 'walk', 'faecher_2x45', 'schenkel_zirkel');
const W7_GALOPP = () => _day(_note(3, 2, 1), 'warm_basis', 'faecher_10', ['longe_trab', 16, 4], 'oval_galopp', 'cooldown');

const SEED_WEEKS = [
  { id: 'w1', name: 'Woche 1', days: [
    _day(_note(3, 1), 'warm_basis', 'longe_schritt', ['longe_trab', 16, 4], 'cooldown'),
    W1_B(), W1_A(), _rest(), W1_A(), W1_B(), W1_A()
  ]},
  { id: 'w2', name: 'Woche 2', days: [
    W2_A(), W2_B(), W2_A(), W2_B(), _rest(), W2_B(), W2_A()
  ]},
  { id: 'w3', name: 'Woche 3', days: [
    W3_A(4), W3_B(), W3_A(5), W3_B(), W3_A(5), _rest(), W3_A(5)
  ]},
  { id: 'w4', name: 'Woche 4', days: [
    _rest(), W4_A(3, 2), W3_B(), W4_A(3, 2), W3_B(), W4_A(1, 3), W3_B()
  ]},
  { id: 'w5', name: 'Woche 5', days: [
    W5_A(), W5_B(), W5_A(), _rest(), W5_A(), W5_B(), W5_A()
  ]},
  { id: 'w6', name: 'Woche 6', days: [
    W5_B(),
    _day(_note(3, 2, 1), 'warm_basis', 'faecher_10', ['longe_trab', 10, 5], ['trab_sattel', 7, 0], 'cooldown'),
    _rest(),
    W5_A(),
    W5_B(),
    _day(_note(3, 2, 1), 'warm_basis', 'schritt_oval', ['longe_trab', 10, 5], ['trab_sattel', 7, 0], 'cooldown'),
    _day(_note(1, 3), 'walk', 'faecher_3x45', 'schenkel_viertel', 'cooldown')
  ]},
  { id: 'w7', name: 'Woche 7', days: [
    W7_SATTEL(),
    _rest(),
    _day(_note(3, 2, 1), 'warm_basis', 'faecher_10', ['longe_trab', 10, 5], 'oval_trab_galopp', 'cooldown'),
    W7_B(), W7_SATTEL(), W7_B(), W7_GALOPP()
  ]},
  { id: 'w8', name: 'Woche 8', days: [
    _rest(), W7_SATTEL(), _rest(), W7_GALOPP(), W7_B(), W7_SATTEL(), W7_B()
  ]}
];
