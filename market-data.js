/* Meuro Market Run (Version 9): countries, markets, ingredients, dishes, prices and levels.
 *
 * Prices are what you pay at the market for one market unit (1 kg, a bunch,
 * a small plate, a bottle...). Each dish lists what to buy for a pot that
 * feeds 4; other group sizes are scaled and rounded up to what a trader sells.
 *
 * Nigeria (Lagos) price sources, October 2026:
 *   lagos  Lagos State Ministry of Agriculture and Food Systems price tracker, 2nd week of October 2026
 *   market Lagos market survey by NAN, reported by Vanguard, October 2026
 *   nat    Current Affairs Nigeria food price list, national averages, 26 October 2026
 *   h24    24 Hours Market weekly Lagos price guide, October 2026
 *   est    Meuro estimate (marked "~" in the game)
 * Cross-check: the SBM Jollof Index puts a pot of jollof for a family of five at about
 * N29,600 nationally and N31,600 in the South West (June 2026).
 *
 * Other countries: Meuro estimates, converted from Lagos prices with the African
 * Development Bank exchange rates (30 Sep 2026) and a local price-level factor.
 * Players can report real prices; approved reports replace the estimate.
 */
(function () {
  'use strict';

  var SOURCES = {
    lagos: 'Lagos State Ministry of Agriculture price tracker, Oct 2026',
    market: 'Lagos market survey (NAN / Vanguard), Oct 2026',
    nat: 'Nigeria food price averages (Current Affairs Nigeria), 26 Oct 2026',
    h24: '24 Hours Market Lagos price guide, Oct 2026',
    est: 'Meuro estimate',
    crowd: 'Prices reported by Meuro players',
    sbm: 'SBM Jollof Index, June 2026: a pot for 5 costs about ₦29,600 (₦31,600 in the South West)'
  };

  /* rate = naira per 1 unit of local currency (AfDB, 30 Sep 2026); level = local food price level vs Lagos */
  var COUNTRIES = {
    ng: { n: 'Nigeria', city: 'Lagos', market: 'Mile 12 Market', cur: 'NGN', rate: 1, level: 1, step: 50, nice: 500, flag: ['#008751', '#FFFFFF', '#008751'] },
    gh: { n: 'Ghana', city: 'Accra', market: 'Makola Market', cur: 'GHS', rate: 113.5, level: 1.15, step: 0.5, nice: 5, flag: ['#CE1126', '#FCD116', '#006B3F'] },
    bj: { n: 'Benin', city: 'Cotonou', market: 'Dantokpa Market', cur: 'XOF', rate: 2.30, level: 1.10, step: 25, nice: 250, flag: ['#008751', '#FCD116', '#E8112D'] },
    sn: { n: 'Senegal', city: 'Dakar', market: 'Sandaga Market', cur: 'XOF', rate: 2.30, level: 1.10, step: 25, nice: 250, flag: ['#00853F', '#FDEF42', '#E31B23'] },
    ci: { n: "Côte d'Ivoire", city: 'Abidjan', market: 'Treichville Market', cur: 'XOF', rate: 2.30, level: 1.10, step: 25, nice: 250, flag: ['#F77F00', '#FFFFFF', '#009E60'] },
    cm: { n: 'Cameroon', city: 'Douala', market: 'Marché Central', cur: 'XAF', rate: 2.30, level: 1.05, step: 25, nice: 250, flag: ['#007A5E', '#CE1126', '#FCD116'] },
    ke: { n: 'Kenya', city: 'Nairobi', market: 'Gikomba Market', cur: 'KES', rate: 10.24, level: 1.10, step: 5, nice: 50, flag: ['#1E1E1E', '#BB0000', '#006600'] },
    et: { n: 'Ethiopia', city: 'Addis Ababa', market: 'Merkato', cur: 'ETB', rate: 8.22, level: 0.90, step: 5, nice: 50, flag: ['#078930', '#FCDD09', '#DA121A'] },
    ug: { n: 'Uganda', city: 'Kampala', market: 'Owino Market', cur: 'UGX', rate: 0.339, level: 0.85, step: 100, nice: 1000, flag: ['#1E1E1E', '#FCDC04', '#D90000'] },
    tz: { n: 'Tanzania', city: 'Dar es Salaam', market: 'Kariakoo Market', cur: 'TZS', rate: 0.503, level: 0.90, step: 100, nice: 1000, flag: ['#1EB53A', '#FCD116', '#00A3DD'] },
    za: { n: 'South Africa', city: 'Johannesburg', market: 'Joburg Market', cur: 'ZAR', rate: 81.2, level: 1.35, step: 0.5, nice: 5, flag: ['#007A4D', '#FFB612', '#DE3831'] },
    eg: { n: 'Egypt', city: 'Cairo', market: 'Attaba Market', cur: 'EGP', rate: 25.56, level: 0.75, step: 1, nice: 10, flag: ['#CE1126', '#FFFFFF', '#1E1E1E'] },
    ma: { n: 'Morocco', city: 'Casablanca', market: 'Marché Central', cur: 'MAD', rate: 137.3, level: 1.15, step: 0.5, nice: 5, flag: ['#C1272D', '#006233', '#C1272D'] }
  };

  /* u = market unit; ng = naira per unit in Lagos; whole = sold only in whole units */
  var ITEMS = {
    rice:       { n: 'Rice', a: 'sack', c: 0xF4F1EA, c2: 0x3B8C50, u: 'kg', ng: 1100, src: 'lagos' },
    beans:      { n: 'Beans', a: 'basin', c: 0x8A5A3A, u: 'kg', ng: 1800, src: 'est' },
    tomatoes:   { n: 'Tomatoes', a: 'cluster', c: 0xD7261E, u: 'kg', ng: 2000, src: 'lagos', veg: 1 },
    tatashe:    { n: 'Tatashe', a: 'cluster', c: 0xC8281C, s: 0.3, u: 'kg', ng: 2500, src: 'lagos', veg: 1 },
    pepper:     { n: 'Pepper (rodo)', a: 'chili', c: 0xE02A12, u: 'small plate', ng: 500, src: 'market', veg: 1, whole: 1 },
    onions:     { n: 'Onions', a: 'cluster', c: 0x8E3A63, u: 'kg', ng: 900, src: 'lagos', veg: 1 },
    eggs:       { n: 'Eggs', a: 'eggs', c: 0xF1E3C8, u: 'pack of 6', ng: 1080, src: 'lagos', whole: 1 },
    yam:        { n: 'Yam', a: 'tuber', c: 0x6B4A2E, u: 'medium tuber', ng: 2500, src: 'lagos', whole: 1 },
    garri:      { n: 'Garri', a: 'basin', c: 0xF2EEE3, u: 'paint', ng: 1100, src: 'lagos' },
    palmoil:    { n: 'Palm oil', a: 'bottle', c: 0xD9461B, u: 'bottle (75 cl)', ng: 1500, src: 'nat', whole: 1 },
    oil:        { n: 'Vegetable oil', a: 'bottle', c: 0xF2C230, u: 'bottle (75 cl)', ng: 2000, src: 'nat', whole: 1 },
    chicken:    { n: 'Chicken', a: 'chicken', c: 0xC9874A, u: 'kg', ng: 6500, src: 'est' },
    beef:       { n: 'Beef', a: 'meat', c: 0x9E2A22, u: 'kg', ng: 8000, src: 'est' },
    goat:       { n: 'Goat meat', a: 'meat', c: 0x7A2A20, u: 'kg', ng: 10000, src: 'est' },
    fish:       { n: 'Fresh fish', a: 'fish', c: 0xAEB8C0, u: 'kg', ng: 6000, src: 'h24' },
    dryfish:    { n: 'Dried fish', a: 'fish', c: 0x8A5A32, u: 'pack', ng: 1500, src: 'est', whole: 1 },
    sardines:   { n: 'Sardines', a: 'can', c: 0x9AA6B0, u: 'tin', ng: 1200, src: 'est', whole: 1 },
    egusi:      { n: 'Egusi (ground)', a: 'basin', c: 0xF0DFA8, u: 'cup', ng: 1500, src: 'est' },
    crayfish:   { n: 'Crayfish', a: 'basin', c: 0xE07A4A, u: 'cup', ng: 1200, src: 'nat' },
    iru:        { n: 'Iru', a: 'iru', c: 0x3A2618, u: 'wrap', ng: 300, src: 'est', whole: 1 },
    ugu:        { n: 'Ugu leaves', a: 'leaves', c: 0x3F8A35, u: 'bunch', ng: 500, src: 'est', veg: 1, whole: 1 },
    efo:        { n: 'Efo (spinach)', a: 'leaves', c: 0x2E6B2A, u: 'bunch', ng: 500, src: 'est', veg: 1, whole: 1 },
    bitterleaf: { n: 'Bitterleaf', a: 'leaves', c: 0x55703A, u: 'bunch', ng: 500, src: 'est', veg: 1, whole: 1 },
    waterleaf:  { n: 'Waterleaf', a: 'leaves', c: 0x6FBF4A, u: 'bunch', ng: 300, src: 'est', veg: 1, whole: 1 },
    ewedu:      { n: 'Ewedu leaves', a: 'leaves', c: 0x2F6A2A, u: 'bunch', ng: 300, src: 'est', veg: 1, whole: 1 },
    kontomire:  { n: 'Kontomire', a: 'leaves', c: 0x2F5A24, u: 'bunch', ng: 500, src: 'est', veg: 1, whole: 1 },
    kale:       { n: 'Sukuma (kale)', a: 'leaves', c: 0x2A5A3A, u: 'bunch', ng: 400, src: 'est', veg: 1, whole: 1 },
    eru:        { n: 'Eru leaves', a: 'leaves', c: 0x3A5A24, u: 'bunch', ng: 700, src: 'est', veg: 1, whole: 1 },
    molokhia:   { n: 'Molokhia leaves', a: 'leaves', c: 0x2F6A2A, u: 'bunch', ng: 500, src: 'est', veg: 1, whole: 1 },
    lettuce:    { n: 'Lettuce', a: 'cabbage', c: 0x9CD67A, u: 'head', ng: 800, src: 'est', veg: 1, whole: 1 },
    okra:       { n: 'Okra', a: 'pods', c: 0x5E9E3A, u: 'heap of 20', ng: 1000, src: 'est', veg: 1 },
    peas:       { n: 'Green peas', a: 'can', c: 0x6BB04A, u: 'tin', ng: 1200, src: 'est', veg: 1, whole: 1 },
    carrots:    { n: 'Carrots', a: 'cones', c: 0xF07A1A, u: 'kg', ng: 1500, src: 'est', veg: 1 },
    cabbage:    { n: 'Cabbage', a: 'cabbage', c: 0x9CCB6A, u: 'head', ng: 1200, src: 'est', veg: 1, whole: 1 },
    avocado:    { n: 'Avocado', a: 'cluster', c: 0x5E7F2A, s: 0.28, u: 'piece', ng: 700, src: 'est', veg: 1, whole: 1 },
    lime:       { n: 'Limes', a: 'cluster', c: 0x7FB53A, s: 0.17, u: 'pack of 4', ng: 400, src: 'est', veg: 1, whole: 1 },
    potatoes:   { n: 'Potatoes', a: 'cluster', c: 0xC9A15A, s: 0.22, u: 'kg', ng: 1200, src: 'est' },
    plantain:   { n: 'Plantain', a: 'bunch', c: 0xD9C23A, u: 'finger', ng: 400, src: 'nat', whole: 1 },
    matoke:     { n: 'Green bananas', a: 'bunch', c: 0x7FA83A, u: 'kg', ng: 1200, src: 'est' },
    cassava:    { n: 'Cassava', a: 'tuber', c: 0x9C7A55, u: 'kg', ng: 500, src: 'nat' },
    elubo:      { n: 'Yam flour (elubo)', a: 'sack', c: 0x8A6A52, c2: 0xC23B2B, u: 'kg', ng: 2500, src: 'est' },
    maize:      { n: 'Maize', a: 'cobs', c: 0xF2C230, u: 'pack of 4 cobs', ng: 1000, src: 'est', whole: 1 },
    maizeflour: { n: 'Maize flour', a: 'sack', c: 0xFFFFFF, c2: 0xF6C445, u: 'kg', ng: 1400, src: 'est' },
    attieke:    { n: 'Attiéké', a: 'basin', c: 0xF6F1DF, u: 'pack (500 g)', ng: 1000, src: 'est', whole: 1 },
    couscous:   { n: 'Couscous', a: 'basin', c: 0xE8C67A, u: 'kg', ng: 3000, src: 'est' },
    injera:     { n: 'Teff flour', a: 'sack', c: 0xD9C8A8, c2: 0x2F6E8F, u: 'kg', ng: 4000, src: 'est' },
    lentils:    { n: 'Red lentils', a: 'basin', c: 0xD9541F, u: 'kg', ng: 3500, src: 'est' },
    chickpeas:  { n: 'Chickpeas', a: 'basin', c: 0xE2C27A, u: 'kg', ng: 3500, src: 'est' },
    favabeans:  { n: 'Fava beans', a: 'basin', c: 0x9A7A3A, u: 'kg', ng: 3000, src: 'est' },
    groundnuts: { n: 'Groundnuts', a: 'basin', c: 0xD9B07A, u: 'cup', ng: 800, src: 'est' },
    coconut:    { n: 'Coconut', a: 'cluster', c: 0x6E4A2A, s: 0.3, u: 'piece', ng: 800, src: 'est', whole: 1 },
    spaghetti:  { n: 'Spaghetti', a: 'box', c: 0xEED9A0, u: 'pack (500 g)', ng: 1100, src: 'est', whole: 1 },
    bread:      { n: 'Bread', a: 'tuber', c: 0xD9A35A, u: 'loaf', ng: 1500, src: 'est', whole: 1 },
    chapati:    { n: 'Chapati', a: 'flat', c: 0xE0B070, u: 'pack of 4', ng: 1200, src: 'est', whole: 1 },
    pspice:     { n: 'Pepper soup spice', a: 'basin', c: 0x7A4A2A, u: 'sachet', ng: 300, src: 'est', whole: 1 },
    yaji:       { n: 'Suya spice (yaji)', a: 'basin', c: 0xA0522D, u: 'pack', ng: 500, src: 'est', whole: 1 },
    berbere:    { n: 'Berbere', a: 'basin', c: 0xB8321F, u: 'pack', ng: 800, src: 'est', whole: 1 },
    curry:      { n: 'Curry & thyme', a: 'box', c: 0xD8A21E, u: 'pack', ng: 400, src: 'est', whole: 1 },
    softdrink:  { n: 'Soft drink', a: 'can', c: 0x3A1A10, u: 'bottle (50 cl)', ng: 500, src: 'est', junk: 1, whole: 1 },
    cubes:      { n: 'Seasoning cubes', a: 'box', c: 0xF6C445, u: 'pack', ng: 600, src: 'est', junk: 1, whole: 1 },
    sugar:      { n: 'Sugar', a: 'sack', c: 0xFFFFFF, c2: 0xE5533D, u: 'pack', ng: 900, src: 'est', junk: 1, whole: 1 },
    noodles:    { n: 'Instant noodles', a: 'box', c: 0xE8B83A, u: 'pack', ng: 400, src: 'est', junk: 1, whole: 1 }
  };

  /* Dishes: what to buy for a pot that feeds 4. kcal and prot are per plate (estimates). */
  var D = function (n, r, img, kcal, prot, items, tip) { return { n: n, r: r, img: img, kcal: kcal, prot: prot, items: items, tip: tip }; };
  var DISHES = {
    yamegg:      D('Yam & egg sauce', 'ng', null, 560, 20, [['yam', 1], ['eggs', 2], ['tomatoes', 0.5], ['onions', 0.5], ['pepper', 1], ['oil', 1]], 'Boil the yam in salted water instead of frying it, and use half the oil in the egg sauce.'),
    beansdodo:   D('Beans & dodo', 'ng', null, 620, 24, [['beans', 1], ['plantain', 4], ['palmoil', 1], ['pepper', 1], ['onions', 0.5], ['crayfish', 1]], 'Beans are one of the cheapest proteins in the market. Soak them first to cook faster and save gas.'),
    suya:        D('Chicken suya', 'ng', 'suya', 520, 44, [['chicken', 1.5], ['yaji', 1], ['onions', 0.5], ['tomatoes', 0.5], ['cabbage', 1]], 'Grill instead of deep frying, and pile on the cabbage, onion and tomato for fibre.'),
    peppersoup:  D('Goat pepper soup', 'ng', 'peppersoup', 380, 42, [['goat', 1.5], ['pspice', 1], ['pepper', 1], ['onions', 0.5], ['ugu', 1]], 'Light and high in protein. Add a bunch of ugu at the end for iron.'),
    okra:        D('Okra soup', 'ng', 'okra', 420, 38, [['okra', 2], ['fish', 1], ['palmoil', 1], ['pepper', 1], ['ugu', 1], ['crayfish', 1]], 'Okra is rich in fibre. Fish gives protein with less fat than red meat.'),
    efo:         D('Efo riro', 'ng', 'efo-riro', 640, 30, [['efo', 3], ['palmoil', 1], ['tatashe', 0.5], ['pepper', 1], ['iru', 1], ['beef', 1], ['onions', 0.5]], 'Three bunches of efo give a pot full of iron and vitamins. Go easy on the palm oil.'),
    ricestew:    D('Rice & stew', 'ng', 'stew-rice', 650, 32, [['rice', 1.5], ['tomatoes', 1.5], ['tatashe', 0.5], ['pepper', 1], ['onions', 0.5], ['oil', 1], ['beef', 1]], 'Serve with a side of vegetables or fruit to balance the plate.'),
    jollof:      D('Jollof rice', 'ng', 'jollof', 680, 36, [['rice', 1.5], ['tomatoes', 1.5], ['tatashe', 0.5], ['pepper', 1], ['onions', 0.5], ['oil', 1], ['chicken', 1.5], ['curry', 1]], 'Add carrots and green beans to your jollof and use less seasoning cubes; they are very high in salt.'),
    friedrice:   D('Fried rice', 'ng', 'fried-rice', 720, 34, [['rice', 1.5], ['carrots', 0.5], ['peas', 1], ['onions', 0.5], ['oil', 1], ['chicken', 1.5], ['curry', 1]], 'The more vegetables, the better the plate. Use a little oil and stir fry fast.'),
    egusi:       D('Egusi soup & eba', 'ng', 'egusi', 560, 32, [['egusi', 2], ['palmoil', 1], ['ugu', 2], ['crayfish', 1], ['beef', 1], ['pepper', 1], ['garri', 1]], 'Egusi seeds give protein and healthy fats. Keep the eba portion to about a fist.'),
    amala:       D('Amala, ewedu & gbegiri', 'ng', 'amala', 610, 34, [['elubo', 1], ['ewedu', 2], ['beans', 1], ['palmoil', 1], ['beef', 1], ['pepper', 1]], 'Gbegiri (bean soup) adds protein and fibre. Amala is lower in calories than pounded yam.'),
    amalastew:   D('Amala, ewedu & stew', 'ng', 'amala-stew', 640, 33, [['elubo', 1], ['ewedu', 2], ['beef', 1], ['tomatoes', 1], ['pepper', 1], ['oil', 1]], 'Ewedu is light and full of vitamins. Choose lean beef and skim oil off the stew.'),
    redred:      D('Red red', 'gh', 'red-red', 610, 21, [['beans', 1], ['plantain', 4], ['palmoil', 1], ['tomatoes', 0.5], ['onions', 0.5], ['pepper', 1]], 'Beans and plantain make a filling, cheap plate. Bake the plantain for less oil.'),
    kontomire:   D('Kontomire stew & rice', 'gh', 'kontomire', 600, 24, [['kontomire', 3], ['egusi', 1], ['palmoil', 1], ['eggs', 1], ['rice', 1], ['onions', 0.5]], 'Cocoyam leaves are packed with iron and vitamin A. Eggs add cheap protein.'),
    sardinerice: D('Rice, sardines & dodo', 'gh', 'sardine-rice', 780, 30, [['rice', 1], ['sardines', 2], ['plantain', 4], ['avocado', 2], ['onions', 0.5], ['oil', 1]], 'Tinned sardines give omega-3 fats and calcium. Avocado adds good fats too.'),
    waakye:      D('Waakye', 'gh', 'waakye', 720, 32, [['rice', 1], ['beans', 1], ['eggs', 1], ['fish', 1], ['spaghetti', 1], ['oil', 1]], 'Rice and beans together give a complete protein. Add salad on the side.'),
    banku:       D('Banku & tilapia', 'gh', 'banku', 640, 42, [['maizeflour', 1], ['cassava', 1], ['fish', 1.5], ['pepper', 1], ['onions', 0.5], ['tomatoes', 0.5]], 'Grilled tilapia is lean protein. The pepper sauce adds vitamin C.'),
    lightsoup:   D('Fufu & light soup', 'gh', 'light-soup', 690, 36, [['cassava', 2], ['plantain', 4], ['goat', 1], ['tomatoes', 1], ['pepper', 1], ['onions', 0.5]], 'Light soup is low in fat. Keep the fufu ball smaller and enjoy more soup.'),
    waakyespecial: D('Waakye special', 'gh', 'waakye-special', 880, 40, [['rice', 1], ['beans', 1], ['chicken', 1], ['eggs', 1], ['garri', 1], ['spaghetti', 1], ['oil', 1]], 'A big plate: share it, or skip the spaghetti and add more salad.'),
    salade:      D('Street salad & bread', 'bj', 'salade', 540, 18, [['lettuce', 1], ['avocado', 2], ['eggs', 1], ['spaghetti', 1], ['bread', 1], ['tomatoes', 0.5]], 'Fresh vegetables and eggs make a quick balanced lunch. Use wholewheat bread if you can.'),
    amiwo:       D('Amiwo & fried fish', 'bj', 'amiwo', 650, 34, [['maizeflour', 1], ['tomatoes', 1], ['fish', 1], ['onions', 0.5], ['pepper', 1], ['oil', 1]], 'Amiwo is maize cooked in tomato sauce. Grill the fish instead of frying it.'),
    teliboarachide: D('Télibo & peanut sauce', 'bj', 'telibo-arachide', 690, 35, [['elubo', 1], ['groundnuts', 2], ['chicken', 1], ['tomatoes', 0.5], ['ugu', 1]], 'Groundnuts add protein and healthy fats. Greens make the sauce even better.'),
    telibogombo: D('Télibo & sauce gombo', 'bj', 'telibo-gombo', 620, 33, [['elubo', 1], ['okra', 2], ['beef', 1], ['tomatoes', 0.5], ['pepper', 1], ['palmoil', 1]], 'Okra sauce is high in fibre and very filling.'),
    mafe:        D('Mafé', 'sn', null, 720, 38, [['beef', 1], ['groundnuts', 2], ['tomatoes', 1], ['rice', 1.5], ['carrots', 0.5]], 'Peanut stew is rich, so add extra carrots and keep the rice portion moderate.'),
    yassa:       D('Yassa poulet', 'sn', null, 660, 40, [['chicken', 1.5], ['onions', 1.5], ['lime', 2], ['rice', 1.5], ['pepper', 1], ['oil', 1]], 'Lime and onions bring big flavour without much salt.'),
    thieb:       D('Thieboudienne', 'sn', null, 700, 38, [['rice', 1.5], ['fish', 1.5], ['tomatoes', 1], ['carrots', 0.5], ['cabbage', 1], ['oil', 1]], 'Fish, rice and lots of vegetables in one pot: a well balanced plate.'),
    garba:       D('Garba', 'ci', null, 620, 30, [['attieke', 2], ['fish', 1], ['pepper', 1], ['onions', 0.5], ['oil', 1]], 'Ask for grilled fish and add fresh tomatoes and onions on the side.'),
    attiekepoisson: D('Attiéké & grilled fish', 'ci', null, 590, 34, [['attieke', 2], ['fish', 1.5], ['tomatoes', 0.5], ['onions', 0.5], ['pepper', 1]], 'Attiéké is light and the grilled fish gives lean protein.'),
    saucearachide: D('Sauce arachide', 'ci', null, 700, 40, [['groundnuts', 2], ['chicken', 1.5], ['tomatoes', 1], ['rice', 1.5], ['onions', 0.5]], 'A filling peanut sauce. Add leafy greens for vitamins.'),
    eru:         D('Eru & garri', 'cm', null, 640, 28, [['eru', 2], ['waterleaf', 2], ['palmoil', 1], ['dryfish', 1], ['garri', 1], ['crayfish', 1]], 'Eru and waterleaf are full of fibre and minerals.'),
    ndole:       D('Ndolé', 'cm', null, 620, 37, [['bitterleaf', 3], ['groundnuts', 2], ['beef', 1], ['crayfish', 1], ['onions', 0.5], ['oil', 1]], 'Washed bitterleaf and groundnuts: a classic with plenty of greens.'),
    pouletdg:    D('Poulet DG', 'cm', null, 720, 40, [['chicken', 1.5], ['plantain', 4], ['carrots', 0.5], ['peas', 1], ['tomatoes', 0.5], ['oil', 1]], 'Keep the plantain portion moderate and enjoy the vegetables.'),
    githeri:     D('Githeri', 'ke', null, 480, 19, [['maize', 2], ['beans', 1], ['carrots', 0.5], ['onions', 0.5], ['tomatoes', 0.5]], 'Maize and beans together are cheap, filling and high in fibre.'),
    ugali:       D('Ugali & sukuma wiki', 'ke', null, 560, 28, [['maizeflour', 1], ['kale', 2], ['tomatoes', 0.5], ['onions', 0.5], ['beef', 1]], 'Sukuma wiki (kale) is one of the most nutritious greens you can buy.'),
    pilau:       D('Pilau', 'ke', null, 650, 30, [['rice', 1.5], ['beef', 1], ['curry', 1], ['onions', 0.5], ['potatoes', 0.5], ['oil', 1]], 'Serve with kachumbari (tomato and onion salad) for freshness.'),
    nyamachoma:  D('Nyama choma & kachumbari', 'ke', null, 540, 45, [['goat', 1.5], ['tomatoes', 0.5], ['onions', 0.5], ['lime', 1], ['pepper', 1]], 'Grilled meat with a big fresh salad: high protein, low oil.'),
    misir:       D('Misir wot', 'et', null, 450, 22, [['lentils', 0.5], ['berbere', 1], ['onions', 0.5], ['tomatoes', 0.5], ['injera', 1]], 'Lentils are cheap protein and iron. Injera from teff is high in fibre.'),
    shiro:       D('Shiro', 'et', null, 430, 20, [['chickpeas', 0.5], ['berbere', 1], ['onions', 0.5], ['tomatoes', 0.5], ['injera', 1]], 'Chickpea stew: plant protein that keeps you full for hours.'),
    dorowat:     D('Doro wat', 'et', null, 640, 42, [['chicken', 1.5], ['berbere', 1], ['onions', 1], ['eggs', 1], ['injera', 1]], 'Chicken and eggs make it high in protein. Pair with greens like gomen.'),
    rolex:       D('Rolex', 'ug', null, 520, 20, [['eggs', 2], ['chapati', 2], ['tomatoes', 0.5], ['cabbage', 1], ['onions', 0.5], ['oil', 1]], 'Load the rolex with cabbage and tomatoes and use less oil on the pan.'),
    matokenuts:  D('Matoke & groundnut sauce', 'ug', null, 560, 24, [['matoke', 2], ['groundnuts', 2], ['tomatoes', 0.5], ['onions', 0.5], ['beef', 1]], 'Green bananas are a good source of fibre and potassium.'),
    walimaharage: D('Wali na maharage', 'tz', null, 600, 20, [['rice', 1.5], ['beans', 1], ['coconut', 1], ['onions', 0.5], ['tomatoes', 0.5]], 'Rice and beans: a complete protein on a student budget.'),
    ndizinyama:  D('Ndizi nyama', 'tz', null, 580, 28, [['matoke', 2], ['beef', 1], ['tomatoes', 0.5], ['onions', 0.5], ['coconut', 1]], 'Bananas and beef in coconut sauce. Add spinach for extra iron.'),
    chakalaka:   D('Pap & chakalaka', 'za', null, 520, 17, [['maizeflour', 1], ['beans', 1], ['carrots', 0.5], ['tomatoes', 0.5], ['pepper', 1], ['onions', 0.5]], 'Chakalaka is a vegetable and bean relish: lots of fibre for little money.'),
    bunnychow:   D('Bunny chow', 'za', null, 780, 36, [['bread', 2], ['chicken', 1], ['potatoes', 0.5], ['curry', 1], ['tomatoes', 0.5]], 'A big meal. Share the loaf and add a side salad.'),
    bobotie:     D('Bobotie', 'za', null, 650, 38, [['beef', 1], ['eggs', 1], ['bread', 1], ['onions', 0.5], ['curry', 1]], 'Serve with vegetables and a small portion of rice.'),
    ful:         D('Ful medames', 'eg', null, 480, 20, [['favabeans', 0.5], ['lime', 1], ['onions', 0.5], ['tomatoes', 0.5], ['bread', 1]], 'Fava beans are cheap, high in fibre and plant protein.'),
    koshari:     D('Koshari', 'eg', null, 700, 22, [['rice', 1], ['lentils', 0.5], ['spaghetti', 1], ['chickpeas', 0.5], ['tomatoes', 1], ['onions', 0.5]], 'Lentils and chickpeas make this street classic surprisingly filling.'),
    molokhia:    D('Molokhia & chicken', 'eg', null, 560, 34, [['molokhia', 3], ['chicken', 1.5], ['onions', 0.5], ['rice', 1.5]], 'Molokhia leaves are full of vitamins and minerals.'),
    harira:      D('Harira', 'ma', null, 420, 24, [['lentils', 0.5], ['chickpeas', 0.5], ['tomatoes', 1], ['onions', 0.5], ['beef', 0.5]], 'A soup of lentils and chickpeas: lots of protein and fibre, little fat.'),
    couscousveg: D('Couscous with vegetables', 'ma', null, 560, 18, [['couscous', 1], ['carrots', 0.5], ['potatoes', 0.5], ['chickpeas', 0.5], ['cabbage', 1]], 'Seven-vegetable couscous: the more vegetables, the better.'),
    tagine:      D('Chicken tagine', 'ma', null, 600, 38, [['chicken', 1.5], ['onions', 1], ['lime', 1], ['carrots', 0.5], ['potatoes', 0.5]], 'Slow cooking with lemon and spices gives flavour with little oil.')
  };
  Object.keys(DISHES).forEach(function (k) { var d = DISHES[k]; d.keys = d.items.map(function (x) { return x[0]; }); });

  /* Customers who send orders, per country */
  var CUSTOMERS = {
    ng: [['Tobi', 'Yaba'], ['Amaka', 'Surulere'], ['Kunle', 'Ikeja'], ['Zainab', 'Lekki'], ['Chidi', 'Akoka'], ['Mama Bisi', 'Mushin']],
    gh: [['Ama', 'Osu'], ['Kojo', 'Madina'], ['Efua', 'Legon'], ['Yaw', 'Kumasi']],
    bj: [['Rodrigue', 'Akpakpa'], ['Afi', 'Cadjehoun'], ['Sèna', 'Calavi']],
    sn: [['Awa', 'Médina'], ['Moussa', 'Plateau'], ['Fatou', 'Yoff']],
    ci: [['Koffi', 'Cocody'], ['Aya', 'Yopougon'], ['Didier', 'Marcory']],
    cm: [['Ngono', 'Akwa'], ['Eto\'o', 'Bonaberi'], ['Mireille', 'Bonamoussadi']],
    ke: [['Wanjiru', 'Westlands'], ['Otieno', 'Kibera'], ['Achieng', 'Ngara']],
    et: [['Selam', 'Bole'], ['Dawit', 'Piassa'], ['Hana', 'Kazanchis']],
    ug: [['Nakato', 'Ntinda'], ['Okello', 'Makerere'], ['Grace', 'Kololo']],
    tz: [['Neema', 'Kariakoo'], ['Baraka', 'Sinza'], ['Zawadi', 'Mikocheni']],
    za: [['Thandi', 'Soweto'], ['Sipho', 'Braamfontein'], ['Lerato', 'Yeoville']],
    eg: [['Nour', 'Zamalek'], ['Omar', 'Giza'], ['Mariam', 'Heliopolis']],
    ma: [['Yasmine', 'Maarif'], ['Karim', 'Medina'], ['Salma', 'Anfa']]
  };
  var STORIES = {
    2: ['Dinner for two', 'Cooking for you and a friend'],
    4: ['The roommates are hungry', 'Sunday lunch for the family'],
    8: ['Party! Cook for 8 guests', 'A family get-together for 8']
  };

  /* The journey: one market (episode) per country, one level per dish */
  var EPISODES = Object.keys(COUNTRIES).map(function (cc) {
    // Dishes with a real photo come first, so a new player's first plates look like real food.
    var ks = Object.keys(DISHES).filter(function (k) { return DISHES[k].r === cc; });
    if (cc === 'ng') ks = ['ricestew', 'jollof', 'efo', 'okra', 'egusi', 'friedrice', 'peppersoup', 'suya', 'amala', 'amalastew', 'beansdodo', 'yamegg'].filter(function (k) { return ks.indexOf(k) >= 0; }).concat(ks.filter(function (k) { return ['ricestew', 'jollof', 'efo', 'okra', 'egusi', 'friedrice', 'peppersoup', 'suya', 'amala', 'amalastew', 'beansdodo', 'yamegg'].indexOf(k) < 0; }));
    return { cc: cc, levels: ks.filter(function (k) { return DISHES[k].img; }).concat(ks.filter(function (k) { return !DISHES[k].img; })) };
  });
  var LEVELS = [];
  EPISODES.forEach(function (ep, ei) { ep.first = LEVELS.length; ep.levels.forEach(function (dk, li) { LEVELS.push({ i: LEVELS.length, ep: ei, li: li, dish: dk, cc: ep.cc }); }); ep.last = LEVELS.length - 1; });
  var PEOPLE_CYCLE = [4, 2, 4, 8, 4];

  var STATE = { cc: 'ng', crowd: {} };

  function roundTo(v, step) { return Math.max(step, Math.round(v / step) * step); }
  function unitPrice(k, cc) {
    var it = ITEMS[k], c = COUNTRIES[cc] || COUNTRIES.ng; if (!it) return 0;
    var per = STATE.crowd[cc] && STATE.crowd[cc][k];
    if (!(per > 0)) per = cc === 'ng' ? it.ng : it.ng / c.rate * c.level;
    return roundTo(per, c.step);
  }
  function priceSrc(k, cc) {
    if (STATE.crowd[cc] && STATE.crowd[cc][k] > 0) return 'crowd';
    return cc === 'ng' ? ITEMS[k].src : 'est';
  }
  function isEstimate(k, cc) { var s = priceSrc(k, cc); return s === 'est'; }
  /* How much of an item to buy for a group: scaled from the pot for 4, rounded up to what traders sell */
  function unitsFor(units, k, people) {
    var f = (people || 4) / 4, v = units * f;
    if (ITEMS[k].whole) return Math.max(1, Math.ceil(v - 1e-9));
    return Math.max(0.5, Math.ceil(v * 2 - 1e-9) / 2);
  }
  function lineCost(k, units, cc) { var c = COUNTRIES[cc] || COUNTRIES.ng; return roundTo(unitPrice(k, cc) * units, c.step); }
  function shoppingList(dk, people) {
    var d = DISHES[dk];
    return d.items.map(function (x) { var u = unitsFor(x[1], x[0], people); return { k: x[0], units: u, cost: lineCost(x[0], u, d.r), est: isEstimate(x[0], d.r) }; });
  }
  function potCost(dk, people) { return shoppingList(dk, people).reduce(function (a, l) { return a + l.cost; }, 0); }
  function budgetFor(dk, people, tight) {
    var c = COUNTRIES[DISHES[dk].r];
    return Math.ceil(potCost(dk, people) * (tight || 1.2) / c.nice) * c.nice;
  }
  var fmtCache = {};
  function fmtC(n, cc) {
    var c = COUNTRIES[cc] || COUNTRIES.ng, key = c.cur;
    if (!fmtCache[key]) {
      try { fmtCache[key] = new Intl.NumberFormat('en', { style: 'currency', currency: c.cur, currencyDisplay: 'narrowSymbol', minimumFractionDigits: 0, maximumFractionDigits: c.step < 1 ? 2 : 0 }); }
      catch (e) { fmtCache[key] = { format: function (v) { return c.cur + ' ' + Math.round(v).toLocaleString('en'); } }; }
    }
    return fmtCache[key].format(Math.round(n * 100) / 100);
  }
  var FRAC = { 0.25: '¼', 0.5: '½', 0.75: '¾' };
  function numTxt(n) { var w = Math.floor(n), p = Math.round((n - w) * 100) / 100; return (w ? String(w) : '') + (FRAC[p] || (p ? '.' + String(p).split('.')[1] : '')) || '0'; }
  var PLURAL = { 'medium tuber': 'medium tubers', 'small plate': 'small plates', bunch: 'bunches', head: 'heads', tin: 'tins', sachet: 'sachets', loaf: 'loaves', piece: 'pieces', finger: 'fingers', wrap: 'wraps', cup: 'cups', paint: 'paints', pack: 'packs', 'pack of 6': 'packs of 6', 'pack of 4': 'packs of 4', 'pack of 4 cobs': 'packs of 4 cobs', 'heap of 20': 'heaps of 20', 'pack (500 g)': 'packs (500 g)', 'bottle (75 cl)': 'bottles (75 cl)', 'bottle (50 cl)': 'bottles (50 cl)' };
  function qtyTxt(k, units) { var u = ITEMS[k].u; return numTxt(units) + ' ' + (units > 1 && PLURAL[u] ? PLURAL[u] : u); }

  /* Level settings: speed, length, obstacles and budget get tougher as you travel */
  function levelCfg(i) {
    var L = LEVELS[i], people = PEOPLE_CYCLE[i % PEOPLE_CYCLE.length];
    if (i < 5) people = [2, 2, 4, 4, 4][i];
    var tight = Math.max(1.08, 1.3 - i * 0.005);
    var cust = CUSTOMERS[L.cc][i % CUSTOMERS[L.cc].length], story = STORIES[people][Math.floor(i / 5) % 2];
    return {
      i: i, dish: L.dish, cc: L.cc, ep: L.ep, people: people, tight: tight,
      budget: budgetFor(L.dish, people, tight),
      speed: 11 + Math.min(9, i * 0.2), length: 340 + Math.min(460, i * 10),
      obstacles: Math.min(0.8, 0.36 + i * 0.01), decoys: Math.min(0.5, 0.26 + i * 0.006),
      goats: i >= 4, doubles: i >= 3, hearts: 3, customer: cust[0], area: cust[1], story: story,
      seed: 1000 + i * 7919
    };
  }
  /* Stars: you pass only with every item on the list. */
  function starsFor(score, allItems) { if (!allItems) return 0; return score >= 88 ? 3 : score >= 70 ? 2 : 1; }

  /* Daily rotation: same Market of the Day for everyone (UTC day) */
  function dayNumber(t) { return Math.floor((t || Date.now()) / 86400000); }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function dailyMarket(t) {
    var day = dayNumber(t), keys = Object.keys(DISHES), dish = keys[hashStr('meuro-day-' + day) % keys.length];
    return { day: day, dish: dish, seed: 1 + (hashStr('seed-' + day) % 1000000), people: 4, budget: budgetFor(dish, 4, 1.15) };
  }

  /* Missions: three at a time. Finish all three to raise your Rush multiplier. */
  var MISSIONS = [
    { id: 'coins', n: 'Collect {g} coins', g: [60, 150, 300, 600] },
    { id: 'jumps', n: 'Jump {g} times', g: [10, 25, 50, 90] },
    { id: 'levels', n: 'Deliver {g} orders in the journey', g: [2, 4, 6, 10] },
    { id: 'stars3', n: 'Get 3 stars on {g} level{s}', g: [1, 2, 4, 6] },
    { id: 'veg', n: 'Pick up {g} bonus vegetables', g: [3, 6, 12, 20] },
    { id: 'rushm', n: 'Ride {g} m in Market Rush', g: [500, 1200, 2500, 5000] },
    { id: 'orders', n: 'Complete {g} Rush orders', g: [2, 5, 9, 15] },
    { id: 'power', n: 'Use {g} power-ups', g: [3, 6, 10, 16] },
    { id: 'daily', n: 'Play the Market of the Day', g: [1, 1, 1, 1] },
    { id: 'clean', n: 'Finish {g} ride{s} without a crash', g: [1, 3, 5, 8] }
  ];
  var DAILY_REWARDS = [50, 75, 100, 150, 200, 250, 500];

  var BADGES = {
    first_ride:  { n: 'First ride', d: 'Finish your first ride', unlock: '#4FA866' },
    list_master: { n: 'List master', d: 'Collect every ingredient on a list', unlock: '#2F7FD6' },
    budget_boss: { n: 'Budget boss', d: 'Full list with 20% of the budget left', unlock: '#16B5A6' },
    veg_lover:   { n: 'Veg lover', d: 'Add 3 bonus vegetables in one ride', unlock: '#E84393' },
    streak_3:    { n: '3-day streak', d: 'Play 3 days in a row', unlock: '#E5533D' },
    streak_7:    { n: '7-day streak', d: 'Play 7 days in a row', unlock: '#9B59D0' },
    daily_star:  { n: 'Market star', d: '3 stars on the Market of the Day', unlock: '#F27B2B' },
    explorer:    { n: 'Explorer', d: 'Cook dishes from 5 countries', unlock: '#1E1E1E' },
    challenger:  { n: 'Challenger', d: 'Complete 5 daily challenges', unlock: '#F4F1EA' }
  };
  var KEKE_BASE = ['#F2C230'];
  var CHALLENGES = [
    { id: 'veg2', n: 'Pick up 2 bonus vegetables', test: function (r) { return r.veg >= 2; } },
    { id: 'nojunk', n: 'Deliver without buying anything off your list', test: function (r) { return r.junk === 0 && r.allItems; } },
    { id: 'saver', n: 'Deliver with 20% of the budget left', test: function (r) { return r.allItems && r.budgetLeft >= 0.2; } },
    { id: 'three', n: 'Get 3 stars on any level', test: function (r) { return r.stars === 3; } },
    { id: 'clean', n: 'Deliver without hitting anything', test: function (r) { return r.allItems && r.hits === 0; } }
  ];
  function personalChallenge(who, t) { return CHALLENGES[hashStr((who || 'guest') + '-' + dayNumber(t)) % CHALLENGES.length]; }

  window.MEURO_DATA = {
    SOURCES: SOURCES, COUNTRIES: COUNTRIES, ITEMS: ITEMS, DISHES: DISHES, STATE: STATE,
    EPISODES: EPISODES, LEVELS: LEVELS, CUSTOMERS: CUSTOMERS,
    unitPrice: unitPrice, priceSrc: priceSrc, isEstimate: isEstimate, unitsFor: unitsFor, lineCost: lineCost,
    shoppingList: shoppingList, potCost: potCost, budgetFor: budgetFor, fmtC: fmtC, qtyTxt: qtyTxt, numTxt: numTxt,
    levelCfg: levelCfg, starsFor: starsFor, dayNumber: dayNumber, dailyMarket: dailyMarket, hashStr: hashStr,
    MISSIONS: MISSIONS, DAILY_REWARDS: DAILY_REWARDS, BADGES: BADGES, KEKE_BASE: KEKE_BASE,
    CHALLENGES: CHALLENGES, personalChallenge: personalChallenge
  };
})();
