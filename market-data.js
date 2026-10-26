/* Meuro Market Run: countries, ingredients, dishes and prices.
 *
 * Prices are stored per person (one portion) and scaled by the portion
 * size the player picks.
 *  - Nigeria (Lagos): official prices where they exist
 *      lagos = Lagos State Ministry of Agriculture and Food Systems price tracker, 2nd week of October 2026
 *      nbs   = National Bureau of Statistics, Selected Food Prices Watch, April 2026
 *    other Nigerian items are Meuro estimates.
 *  - Other countries: Meuro estimates, converted from Lagos prices with the
 *    African Development Bank exchange rates for October 2026 and a local
 *    price-level adjustment. Shown as "estimate" in the game until players
 *    report real prices (approved reports replace the estimate).
 */
(function () {
  'use strict';

  var SOURCES = {
    lagos: 'Lagos State Ministry of Agriculture price tracker, October 2026',
    nbs: 'NBS Selected Food Prices Watch, April 2026',
    est: 'Meuro estimate',
    crowd: 'Prices reported by Meuro players'
  };

  /* rate = naira per 1 unit of local currency (AfDB, 30 Sep 2026); level = local food price level vs Lagos */
  var COUNTRIES = {
    ng: { n: 'Nigeria', city: 'Lagos', cur: 'NGN', rate: 1, level: 1, step: 10, flag: ['#008751', '#FFFFFF', '#008751'] },
    gh: { n: 'Ghana', city: 'Accra', cur: 'GHS', rate: 113.5, level: 1.15, step: 0.5, flag: ['#CE1126', '#FCD116', '#006B3F'] },
    bj: { n: 'Benin', city: 'Cotonou', cur: 'XOF', rate: 2.30, level: 1.10, step: 25, flag: ['#008751', '#FCD116', '#E8112D'] },
    sn: { n: 'Senegal', city: 'Dakar', cur: 'XOF', rate: 2.30, level: 1.10, step: 25, flag: ['#00853F', '#FDEF42', '#E31B23'] },
    ci: { n: "Côte d'Ivoire", city: 'Abidjan', cur: 'XOF', rate: 2.30, level: 1.10, step: 25, flag: ['#F77F00', '#FFFFFF', '#009E60'] },
    cm: { n: 'Cameroon', city: 'Douala', cur: 'XAF', rate: 2.30, level: 1.05, step: 25, flag: ['#007A5E', '#CE1126', '#FCD116'] },
    ke: { n: 'Kenya', city: 'Nairobi', cur: 'KES', rate: 10.24, level: 1.10, step: 5, flag: ['#1E1E1E', '#BB0000', '#006600'] },
    et: { n: 'Ethiopia', city: 'Addis Ababa', cur: 'ETB', rate: 8.22, level: 0.90, step: 1, flag: ['#078930', '#FCDD09', '#DA121A'] },
    ug: { n: 'Uganda', city: 'Kampala', cur: 'UGX', rate: 0.339, level: 0.85, step: 100, flag: ['#1E1E1E', '#FCDC04', '#D90000'] },
    tz: { n: 'Tanzania', city: 'Dar es Salaam', cur: 'TZS', rate: 0.503, level: 0.90, step: 50, flag: ['#1EB53A', '#FCD116', '#00A3DD'] },
    za: { n: 'South Africa', city: 'Johannesburg', cur: 'ZAR', rate: 81.2, level: 1.35, step: 0.5, flag: ['#007A4D', '#FFB612', '#DE3831'] },
    eg: { n: 'Egypt', city: 'Cairo', cur: 'EGP', rate: 25.56, level: 0.75, step: 1, flag: ['#CE1126', '#FFFFFF', '#1E1E1E'] },
    ma: { n: 'Morocco', city: 'Casablanca', cur: 'MAD', rate: 137.3, level: 1.15, step: 0.5, flag: ['#C1272D', '#006233', '#C1272D'] }
  };

  /* q = [amount per person, unit]; ng = naira per person in Lagos; src = price source */
  var ITEMS = {
    rice:       { n: 'Rice', a: 'sack', c: 0xF4F1EA, c2: 0x3B8C50, q: [150, 'g'], ng: 159, src: 'lagos' },
    beans:      { n: 'Beans', a: 'basin', c: 0x8A5A3A, q: [150, 'g'], ng: 268, src: 'nbs' },
    tomatoes:   { n: 'Tomatoes', a: 'cluster', c: 0xD7261E, q: [250, 'g'], ng: 500, src: 'lagos', veg: 1 },
    pepper:     { n: 'Pepper', a: 'chili', c: 0xE02A12, q: [60, 'g'], ng: 132, src: 'lagos', veg: 1 },
    onions:     { n: 'Onions', a: 'cluster', c: 0x8E3A63, q: [1, 'bulb'], ng: 135, src: 'lagos', veg: 1 },
    eggs:       { n: 'Eggs', a: 'eggs', c: 0xF1E3C8, q: [2, 'pcs'], ng: 360, src: 'lagos' },
    yam:        { n: 'Yam', a: 'tuber', c: 0x6B4A2E, q: [0.25, 'tuber'], ng: 625, src: 'lagos' },
    garri:      { n: 'Garri', a: 'basin', c: 0xF2EEE3, q: [1, 'cup'], ng: 121, src: 'nbs' },
    palmoil:    { n: 'Palm oil', a: 'bottle', c: 0xD9461B, q: [3, 'tbsp'], ng: 108, src: 'nbs' },
    chicken:    { n: 'Chicken', a: 'chicken', c: 0xC9874A, q: [2, 'pcs'], ng: 1500, src: 'est' },
    beef:       { n: 'Beef', a: 'meat', c: 0x9E2A22, q: [150, 'g'], ng: 1200, src: 'est' },
    goat:       { n: 'Goat meat', a: 'meat', c: 0x7A2A20, q: [200, 'g'], ng: 1800, src: 'est' },
    fish:       { n: 'Fresh fish', a: 'fish', c: 0xAEB8C0, q: [1, 'pcs'], ng: 1500, src: 'est' },
    dryfish:    { n: 'Dried fish', a: 'fish', c: 0x8A5A32, q: [1, 'pcs'], ng: 600, src: 'est' },
    sardines:   { n: 'Sardines', a: 'fish', c: 0x9AA6B0, q: [1, 'tin'], ng: 900, src: 'est' },
    egusi:      { n: 'Egusi', a: 'basin', c: 0xF0DFA8, q: [4, 'tbsp'], ng: 400, src: 'est' },
    ogbono:     { n: 'Ogbono', a: 'basin', c: 0xB89A6A, q: [3, 'tbsp'], ng: 500, src: 'est' },
    crayfish:   { n: 'Crayfish', a: 'basin', c: 0xE07A4A, q: [2, 'tbsp'], ng: 300, src: 'est' },
    iru:        { n: 'Iru', a: 'iru', c: 0x3A2618, q: [1, 'tbsp'], ng: 150, src: 'est' },
    periwinkle: { n: 'Periwinkle', a: 'shells', c: 0x3A3430, q: [1, 'cup'], ng: 800, src: 'est' },
    ugu:        { n: 'Ugu leaves', a: 'leaves', c: 0x3F8A35, q: [1, 'bunch'], ng: 300, src: 'est', veg: 1 },
    efo:        { n: 'Efo (spinach)', a: 'leaves', c: 0x2E6B2A, q: [1, 'bunch'], ng: 300, src: 'est', veg: 1 },
    bitterleaf: { n: 'Bitterleaf', a: 'leaves', c: 0x55703A, q: [1, 'handful'], ng: 300, src: 'est', veg: 1 },
    waterleaf:  { n: 'Waterleaf', a: 'leaves', c: 0x6FBF4A, q: [1, 'bunch'], ng: 200, src: 'est', veg: 1 },
    ewedu:      { n: 'Ewedu leaves', a: 'leaves', c: 0x2F6A2A, q: [1, 'bunch'], ng: 200, src: 'est', veg: 1 },
    kontomire:  { n: 'Kontomire', a: 'leaves', c: 0x2F5A24, q: [1, 'bunch'], ng: 300, src: 'est', veg: 1 },
    kale:       { n: 'Sukuma (kale)', a: 'leaves', c: 0x2A5A3A, q: [1, 'bunch'], ng: 300, src: 'est', veg: 1 },
    eru:        { n: 'Eru leaves', a: 'leaves', c: 0x3A5A24, q: [1, 'handful'], ng: 400, src: 'est', veg: 1 },
    molokhia:   { n: 'Molokhia leaves', a: 'leaves', c: 0x2F6A2A, q: [1, 'bunch'], ng: 400, src: 'est', veg: 1 },
    lettuce:    { n: 'Lettuce', a: 'leaves', c: 0x9CD67A, q: [0.25, 'head'], ng: 300, src: 'est', veg: 1 },
    okra:       { n: 'Okra', a: 'pods', c: 0x5E9E3A, q: [10, 'pcs'], ng: 400, src: 'est', veg: 1 },
    peas:       { n: 'Green peas', a: 'cluster', c: 0x6BB04A, s: 0.12, q: [0.5, 'cup'], ng: 300, src: 'est', veg: 1 },
    carrots:    { n: 'Carrots', a: 'cones', c: 0xF07A1A, q: [2, 'pcs'], ng: 300, src: 'est', veg: 1 },
    cabbage:    { n: 'Cabbage', a: 'cabbage', c: 0x9CCB6A, q: [0.25, 'head'], ng: 300, src: 'est', veg: 1 },
    avocado:    { n: 'Avocado', a: 'cluster', c: 0x5E7F2A, s: 0.28, q: [1, 'pcs'], ng: 500, src: 'est', veg: 1 },
    lime:       { n: 'Limes', a: 'cluster', c: 0x7FB53A, s: 0.17, q: [1, 'pcs'], ng: 150, src: 'est', veg: 1 },
    potatoes:   { n: 'Potatoes', a: 'cluster', c: 0xC9A15A, s: 0.22, q: [2, 'pcs'], ng: 400, src: 'est' },
    plantain:   { n: 'Plantain', a: 'bunch', c: 0xD9C23A, q: [1, 'pcs'], ng: 400, src: 'est' },
    matoke:     { n: 'Green bananas', a: 'bunch', c: 0x7FA83A, q: [3, 'pcs'], ng: 500, src: 'est' },
    cocoyam:    { n: 'Cocoyam', a: 'cluster', c: 0x6B4A2E, s: 0.3, q: [3, 'pcs'], ng: 400, src: 'est' },
    cassava:    { n: 'Cassava', a: 'tuber', c: 0x9C7A55, q: [1, 'piece'], ng: 300, src: 'est' },
    elubo:      { n: 'Yam flour', a: 'sack', c: 0x8A6A52, c2: 0xC23B2B, q: [1, 'cup'], ng: 400, src: 'est' },
    maize:      { n: 'Maize', a: 'cobs', c: 0xF2C230, q: [2, 'pcs'], ng: 400, src: 'est' },
    maizeflour: { n: 'Maize flour', a: 'sack', c: 0xFFFFFF, c2: 0xF6C445, q: [1, 'cup'], ng: 250, src: 'est' },
    attieke:    { n: 'Attiéké', a: 'basin', c: 0xF6F1DF, q: [1, 'cup'], ng: 500, src: 'est' },
    couscous:   { n: 'Couscous', a: 'basin', c: 0xE8C67A, q: [1, 'cup'], ng: 600, src: 'est' },
    injera:     { n: 'Teff flour', a: 'sack', c: 0xD9C8A8, c2: 0x2F6E8F, q: [1, 'cup'], ng: 1000, src: 'est' },
    lentils:    { n: 'Red lentils', a: 'basin', c: 0xD9541F, q: [0.5, 'cup'], ng: 600, src: 'est' },
    chickpeas:  { n: 'Chickpeas', a: 'basin', c: 0xE2C27A, q: [0.5, 'cup'], ng: 500, src: 'est' },
    favabeans:  { n: 'Fava beans', a: 'basin', c: 0x9A7A3A, q: [0.5, 'cup'], ng: 500, src: 'est' },
    groundnuts: { n: 'Groundnuts', a: 'basin', c: 0xD9B07A, q: [0.5, 'cup'], ng: 300, src: 'est' },
    coconut:    { n: 'Coconut', a: 'cluster', c: 0x6E4A2A, s: 0.3, q: [0.5, 'pcs'], ng: 400, src: 'est' },
    spaghetti:  { n: 'Spaghetti', a: 'basin', c: 0xEED9A0, q: [0.25, 'pack'], ng: 250, src: 'est' },
    bread:      { n: 'Bread', a: 'tuber', c: 0xD9A35A, q: [0.5, 'loaf'], ng: 700, src: 'est' },
    chapati:    { n: 'Chapati', a: 'flat', c: 0xE0B070, q: [2, 'pcs'], ng: 400, src: 'est' },
    pspice:     { n: 'Pepper soup spice', a: 'basin', c: 0x7A4A2A, q: [1, 'sachet'], ng: 200, src: 'est' },
    yaji:       { n: 'Suya spice', a: 'basin', c: 0xA0522D, q: [2, 'tbsp'], ng: 200, src: 'est' },
    berbere:    { n: 'Berbere', a: 'basin', c: 0xB8321F, q: [2, 'tbsp'], ng: 400, src: 'est' },
    curry:      { n: 'Curry powder', a: 'basin', c: 0xD8A21E, q: [1, 'tbsp'], ng: 150, src: 'est' },
    softdrink:  { n: 'Soft drink', a: 'can', c: 0x3A1A10, q: [1, 'bottle'], ng: 400, src: 'est', junk: 1 },
    cubes:      { n: 'Seasoning cubes', a: 'box', c: 0xF6C445, q: [2, 'cube'], ng: 100, src: 'est', junk: 1 },
    sugar:      { n: 'Sugar', a: 'sack', c: 0xFFFFFF, c2: 0xE5533D, q: [2, 'tbsp'], ng: 100, src: 'est', junk: 1 }
  };

  /* r = country; img = photo in img/; kcal and prot are per-person estimates */
  var DISHES = {
    jollof:        { n: 'Jollof rice', r: 'ng', img: 'jollof', kcal: 680, prot: 36, items: ['rice', 'tomatoes', 'pepper', 'onions', 'chicken'] },
    egusi:         { n: 'Egusi soup', r: 'ng', img: 'egusi', kcal: 560, prot: 32, items: ['egusi', 'palmoil', 'ugu', 'crayfish', 'beef'] },
    okra:          { n: 'Okra soup', r: 'ng', img: 'okra', kcal: 420, prot: 38, items: ['okra', 'fish', 'palmoil', 'pepper', 'ugu'] },
    efo:           { n: 'Efo riro', r: 'ng', img: 'efo-riro', kcal: 640, prot: 30, items: ['efo', 'palmoil', 'pepper', 'iru', 'beef'] },
    amala:         { n: 'Amala, ewedu & gbegiri', r: 'ng', img: 'amala', kcal: 610, prot: 34, items: ['elubo', 'ewedu', 'beans', 'palmoil', 'beef'] },
    amalastew:     { n: 'Amala, ewedu & stew', r: 'ng', img: 'amala-stew', kcal: 640, prot: 33, items: ['elubo', 'ewedu', 'beef', 'tomatoes', 'pepper'] },
    peppersoup:    { n: 'Goat pepper soup', r: 'ng', img: 'peppersoup', kcal: 380, prot: 42, items: ['goat', 'pspice', 'pepper', 'onions'] },
    friedrice:     { n: 'Fried rice', r: 'ng', img: 'fried-rice', kcal: 720, prot: 34, items: ['rice', 'carrots', 'peas', 'onions', 'chicken'] },
    ricestew:      { n: 'Rice & stew', r: 'ng', img: 'stew-rice', kcal: 650, prot: 32, items: ['rice', 'tomatoes', 'pepper', 'onions', 'beef'] },
    suya:          { n: 'Chicken suya', r: 'ng', img: 'suya', kcal: 520, prot: 44, items: ['chicken', 'yaji', 'onions', 'tomatoes', 'cabbage'] },
    waakye:        { n: 'Waakye', r: 'gh', img: 'waakye', kcal: 720, prot: 32, items: ['rice', 'beans', 'eggs', 'fish', 'spaghetti'] },
    waakyespecial: { n: 'Waakye special', r: 'gh', img: 'waakye-special', kcal: 880, prot: 40, items: ['rice', 'beans', 'chicken', 'eggs', 'garri', 'spaghetti'] },
    redred:        { n: 'Red red', r: 'gh', img: 'red-red', kcal: 610, prot: 21, items: ['beans', 'plantain', 'palmoil', 'tomatoes', 'onions'] },
    banku:         { n: 'Banku & tilapia', r: 'gh', img: 'banku', kcal: 640, prot: 42, items: ['maize', 'cassava', 'fish', 'pepper', 'onions'] },
    lightsoup:     { n: 'Fufu & light soup', r: 'gh', img: 'light-soup', kcal: 690, prot: 36, items: ['cassava', 'plantain', 'goat', 'tomatoes', 'pepper'] },
    kontomire:     { n: 'Kontomire stew & rice', r: 'gh', img: 'kontomire', kcal: 600, prot: 24, items: ['kontomire', 'egusi', 'palmoil', 'eggs', 'rice'] },
    sardinerice:   { n: 'Rice, sardines & dodo', r: 'gh', img: 'sardine-rice', kcal: 780, prot: 30, items: ['rice', 'sardines', 'plantain', 'avocado', 'onions'] },
    telibogombo:   { n: 'Télibo & sauce gombo', r: 'bj', img: 'telibo-gombo', kcal: 620, prot: 33, items: ['elubo', 'okra', 'beef', 'tomatoes', 'pepper'] },
    amiwo:         { n: 'Amiwo & fried fish', r: 'bj', img: 'amiwo', kcal: 650, prot: 34, items: ['maizeflour', 'tomatoes', 'fish', 'onions', 'pepper'] },
    teliboarachide:{ n: 'Télibo & peanut sauce', r: 'bj', img: 'telibo-arachide', kcal: 690, prot: 35, items: ['elubo', 'groundnuts', 'chicken', 'tomatoes', 'ugu'] },
    salade:        { n: 'Street salad & bread', r: 'bj', img: 'salade', kcal: 540, prot: 18, items: ['lettuce', 'avocado', 'eggs', 'spaghetti', 'bread'] },
    thieb:         { n: 'Thieboudienne', r: 'sn', kcal: 700, prot: 38, items: ['rice', 'fish', 'tomatoes', 'carrots', 'cabbage'] },
    yassa:         { n: 'Yassa poulet', r: 'sn', kcal: 660, prot: 40, items: ['chicken', 'onions', 'lime', 'rice', 'pepper'] },
    mafe:          { n: 'Mafé', r: 'sn', kcal: 720, prot: 38, items: ['beef', 'groundnuts', 'tomatoes', 'rice', 'carrots'] },
    attiekepoisson:{ n: 'Attiéké & grilled fish', r: 'ci', kcal: 590, prot: 34, items: ['attieke', 'fish', 'tomatoes', 'onions', 'pepper'] },
    garba:         { n: 'Garba', r: 'ci', kcal: 620, prot: 30, items: ['attieke', 'fish', 'pepper', 'onions'] },
    saucearachide: { n: 'Sauce arachide', r: 'ci', kcal: 700, prot: 40, items: ['groundnuts', 'chicken', 'tomatoes', 'rice', 'onions'] },
    ndole:         { n: 'Ndolé', r: 'cm', kcal: 620, prot: 37, items: ['bitterleaf', 'groundnuts', 'beef', 'crayfish', 'onions'] },
    eru:           { n: 'Eru & garri', r: 'cm', kcal: 640, prot: 28, items: ['eru', 'waterleaf', 'palmoil', 'dryfish', 'garri'] },
    pouletdg:      { n: 'Poulet DG', r: 'cm', kcal: 720, prot: 40, items: ['chicken', 'plantain', 'carrots', 'peas', 'tomatoes'] },
    ugali:         { n: 'Ugali & sukuma wiki', r: 'ke', kcal: 560, prot: 28, items: ['maizeflour', 'kale', 'tomatoes', 'onions', 'beef'] },
    githeri:       { n: 'Githeri', r: 'ke', kcal: 480, prot: 19, items: ['maize', 'beans', 'carrots', 'onions', 'tomatoes'] },
    nyamachoma:    { n: 'Nyama choma & kachumbari', r: 'ke', kcal: 540, prot: 45, items: ['goat', 'tomatoes', 'onions', 'lime', 'pepper'] },
    pilau:         { n: 'Pilau', r: 'ke', kcal: 650, prot: 30, items: ['rice', 'beef', 'curry', 'onions', 'potatoes'] },
    dorowat:       { n: 'Doro wat', r: 'et', kcal: 640, prot: 42, items: ['chicken', 'berbere', 'onions', 'eggs', 'injera'] },
    misir:         { n: 'Misir wot', r: 'et', kcal: 450, prot: 22, items: ['lentils', 'berbere', 'onions', 'tomatoes', 'injera'] },
    shiro:         { n: 'Shiro', r: 'et', kcal: 430, prot: 20, items: ['chickpeas', 'berbere', 'onions', 'tomatoes', 'injera'] },
    rolex:         { n: 'Rolex', r: 'ug', kcal: 520, prot: 20, items: ['eggs', 'chapati', 'tomatoes', 'cabbage', 'onions'] },
    matokenuts:    { n: 'Matoke & groundnut sauce', r: 'ug', kcal: 560, prot: 24, items: ['matoke', 'groundnuts', 'tomatoes', 'onions', 'beef'] },
    walimaharage:  { n: 'Wali na maharage', r: 'tz', kcal: 600, prot: 20, items: ['rice', 'beans', 'coconut', 'onions', 'tomatoes'] },
    ndizinyama:    { n: 'Ndizi nyama', r: 'tz', kcal: 580, prot: 28, items: ['matoke', 'beef', 'tomatoes', 'onions', 'coconut'] },
    chakalaka:     { n: 'Pap & chakalaka', r: 'za', kcal: 520, prot: 17, items: ['maizeflour', 'beans', 'carrots', 'tomatoes', 'pepper'] },
    bunnychow:     { n: 'Bunny chow', r: 'za', kcal: 780, prot: 36, items: ['bread', 'chicken', 'potatoes', 'curry', 'tomatoes'] },
    bobotie:       { n: 'Bobotie', r: 'za', kcal: 650, prot: 38, items: ['beef', 'eggs', 'bread', 'onions', 'curry'] },
    koshari:       { n: 'Koshari', r: 'eg', kcal: 700, prot: 22, items: ['rice', 'lentils', 'spaghetti', 'chickpeas', 'tomatoes', 'onions'] },
    ful:           { n: 'Ful medames', r: 'eg', kcal: 480, prot: 20, items: ['favabeans', 'lime', 'onions', 'tomatoes', 'bread'] },
    molokhia:      { n: 'Molokhia & chicken', r: 'eg', kcal: 560, prot: 34, items: ['molokhia', 'chicken', 'onions', 'rice'] },
    tagine:        { n: 'Chicken tagine', r: 'ma', kcal: 600, prot: 38, items: ['chicken', 'onions', 'lime', 'carrots', 'potatoes'] },
    couscousveg:   { n: 'Couscous with vegetables', r: 'ma', kcal: 560, prot: 18, items: ['couscous', 'carrots', 'potatoes', 'chickpeas', 'cabbage'] },
    harira:        { n: 'Harira', r: 'ma', kcal: 420, prot: 24, items: ['lentils', 'chickpeas', 'tomatoes', 'onions', 'beef'] }
  };

  var STATE = { cc: 'ng', portion: 1, crowd: {} };
  var PORTIONS = [{ v: 1, n: 'Just me' }, { v: 2, n: '2 people' }, { v: 4, n: 'Family of 4' }];

  function roundTo(v, step) { return Math.max(step, Math.round(v / step) * step); }
  function priceOf(k, cc, portion) {
    var it = ITEMS[k], c = COUNTRIES[cc] || COUNTRIES.ng; if (!it) return 0;
    var per = STATE.crowd[cc] && STATE.crowd[cc][k];
    if (!(per > 0)) per = cc === 'ng' ? it.ng : it.ng / c.rate * c.level;
    return roundTo(per * (portion || 1), c.step);
  }
  function priceSrc(k, cc) {
    if (STATE.crowd[cc] && STATE.crowd[cc][k] > 0) return 'crowd';
    return cc === 'ng' ? ITEMS[k].src : 'est';
  }
  function budgetOf(dk, portion) {
    var d = DISHES[dk], c = COUNTRIES[d.r];
    var sum = d.items.reduce(function (a, k) { return a + priceOf(k, d.r, portion); }, 0);
    var nice = c.step * 10;
    return Math.ceil(sum * 1.3 / nice) * nice;
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
  function qtyOf(k, portion) {
    var it = ITEMS[k], n = it.q[0] * (portion || 1), u = it.q[1];
    var whole = Math.floor(n), part = Math.round((n - whole) * 100) / 100;
    var txt = (whole ? String(whole) : '') + (FRAC[part] || (part ? '.' + String(part).split('.')[1] : ''));
    if (u === 'g' && n >= 1000) return (n / 1000).toString().replace(/\.0+$/, '') + ' kg';
    if (u === 'pcs') return txt + (n === 1 ? ' piece' : ' pieces');
    var plural = { bulb: 'bulbs', tuber: 'tubers', cup: 'cups', bunch: 'bunches', head: 'heads', tin: 'tins', sachet: 'sachets', loaf: 'loaves', pack: 'packs', piece: 'pieces', bottle: 'bottles', cube: 'cubes', handful: 'handfuls' };
    return txt + ' ' + (n > 1 && plural[u] ? plural[u] : u);
  }

  /* Daily rotation: same Market of the Day for everyone (UTC day) */
  function dayNumber(t) { return Math.floor((t || Date.now()) / 86400000); }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function dailyMarket(t) {
    var day = dayNumber(t), keys = Object.keys(DISHES);
    return { day: day, dish: keys[hashStr('meuro-day-' + day) % keys.length], seed: 1 + (hashStr('seed-' + day) % 1000000), portion: 1 };
  }
  var CHALLENGES = [
    { id: 'veg2', n: 'Collect 2 bonus vegetables', test: function (r) { return r.veg >= 2; } },
    { id: 'nojunk', n: 'Finish without buying anything off your list', test: function (r) { return r.junk === 0 && r.allItems; } },
    { id: 'saver', n: 'Finish with at least 20% of your budget left', test: function (r) { return r.allItems && r.budgetLeft >= 0.2; } },
    { id: 'three', n: 'Get 3 stars on any dish', test: function (r) { return r.stars === 3; } },
    { id: 'abroad', n: 'Cook a dish from another country', test: function (r) { return r.country !== r.home; } }
  ];
  function personalChallenge(who, t) { return CHALLENGES[hashStr((who || 'guest') + '-' + dayNumber(t)) % CHALLENGES.length]; }

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

  /* live price getters so the game can keep using ITEMS[k].p and DISHES[k].budget */
  Object.keys(ITEMS).forEach(function (k) {
    Object.defineProperty(ITEMS[k], 'p', { get: function () { return priceOf(k, STATE.cc, STATE.portion); } });
  });
  Object.keys(DISHES).forEach(function (k) {
    Object.defineProperty(DISHES[k], 'budget', { get: function () { return budgetOf(k, STATE.portion); } });
  });

  window.MEURO_DATA = {
    SOURCES: SOURCES, COUNTRIES: COUNTRIES, ITEMS: ITEMS, DISHES: DISHES, STATE: STATE, PORTIONS: PORTIONS,
    priceOf: priceOf, priceSrc: priceSrc, budgetOf: budgetOf, fmtC: fmtC, qtyOf: qtyOf,
    dayNumber: dayNumber, dailyMarket: dailyMarket, personalChallenge: personalChallenge, hashStr: hashStr,
    CHALLENGES: CHALLENGES, BADGES: BADGES, KEKE_BASE: KEKE_BASE
  };
})();
