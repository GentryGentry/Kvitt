import type { FoodItem } from './types';

// [namn, enhet, kcal per enhet, alias]. Riktvärden, inte exakta.
// Lägg bara till nya poster sist och byt aldrig namn: id härleds ur namnet.
type Row = [name: string, unit: string, kcal: number, aliases?: string[]];

const ROWS: Row[] = [
  // Bakverk och fika
  ['Kanelbulle', 'st', 300, ['bulle', 'kanelsnurra', 'kanelbullar']],
  ['Chokladbulle', 'st', 330, ['chokladsnurra']],
  ['Vaniljbulle', 'st', 330, ['vaniljsnurra']],
  ['Kardemummabulle', 'st', 300, ['kardemummasnurra']],
  ['Wienerbröd', 'st', 350, ['wienerbrod', 'danish', 'plunder']],
  ['Semla', 'st', 450, ['fastlagsbulle', 'fettisdagsbulle']],
  ['Lussekatt', 'st', 230, ['lussebulle']],
  ['Prinsesstårta', 'bit', 350, ['prinsessbakelse']],
  ['Tårtbit', 'bit', 400, ['tårta', 'gräddtårta']],
  ['Kladdkaka', 'bit', 350, ['kladdkakan']],
  ['Cheesecake', 'bit', 400, ['ostkaka']],
  ['Brownie', 'st', 250, ['brownies']],
  ['Chokladboll', 'st', 230, ['fika-kaka', 'fikakaka', 'havreboll']],
  ['Dammsugare', 'st', 200, ['punschrulle']],
  ['Mazarin', 'st', 350, ['mandeltårta']],
  ['Napoleonbakelse', 'st', 400, ['napoleon']],
  ['Bakelse', 'st', 350, ['fikabakelse', 'konditoribakelse']],
  ['Muffins', 'st', 400, ['muffin', 'cupcake']],
  ['Munk', 'st', 300, ['donut', 'doughnut', 'sockermunk']],
  ['Croissant', 'st', 280, ['smörgåskipa', 'frasig croissant']],
  ['Kaka (fika)', 'st', 200, ['kakor', 'kaka']],
  ['Småkaka', 'st', 70, ['småkakor', 'kex', 'cookie', 'cookies', 'pepparkaka']],
  ['Cookie (stor)', 'st', 250, ['stor cookie', 'subway cookie']],
  ['Äppelpaj', 'portion', 400, ['paj', 'äppelkaka', 'paj med vaniljsås']],
  ['Pannkaka', 'st', 150, ['pannkakor', 'plättar']],
  ['Våffla', 'st', 350, ['våfflor', 'våffla med sylt och grädde']],
  ['Hallongrotta', 'st', 150, ['hallongrottor', 'drömmar']],

  // Choklad och godis
  ['Chokladkaka (100 g)', '100 g', 550, ['marabou', 'marabou mjölkchoklad', 'chokladkaka', 'hel chokladkaka', 'choklad']],
  ['Chokladkaka (rad)', 'rad', 135, ['chokladrad', 'rad choklad', 'chokladbit']],
  ['Lösgodis', 'påse', 700, ['godis', 'lördagsgodis', 'påse godis', 'karameller']],
  ['Lösgodis (näve)', 'näve', 100, ['handfull godis', 'lite godis']],
  ['Vingummi', 'påse', 350, ['gelégodis', 'gott och blandat', 'gott & blandat']],
  ['Lakrits', 'påse', 400, ['salta katter', 'lakritsbåtar', 'lakritsgodis']],
  ['Pralin', 'st', 70, ['praliner', 'chokladpralin', 'konfekt']],
  ['Daim', 'st', 150, ['daimstor', 'daimbit']],
  ['Snickers', 'st', 250, ['snickersbar', 'mars', 'twix', 'chokladbar']],
  ['Kexchoklad', 'st', 230, ['kexchokladen']],
  ['Nutella', 'msk', 100, ['hasselnötskräm', 'chokladpålägg']],

  // Salt snacks
  ['Chips (liten påse)', 'påse', 270, ['chips', 'liten chips', 'chipspåse']],
  ['Chips (stor påse)', 'påse', 950, ['stor chips', 'stor chipspåse', 'storpåse chips']],
  ['Ostbågar', 'påse', 600, ['ostbågar stor', 'ostbåge', 'ostkrokar']],
  ['Ostbågar (liten)', 'påse', 300, ['liten ostbågar']],
  ['Popcorn (bio)', 'hink', 600, ['biopopcorn', 'popcorn']],
  ['Popcorn (micro)', 'påse', 450, ['mikropopcorn', 'micropopcorn']],
  ['Salta nötter', 'näve', 180, ['nötter', 'jordnötter', 'cashewnötter', 'cashew']],
  ['Dipp', 'skål', 250, ['dip', 'chipsdipp', 'sourcream', 'sour cream']],
  ['Nachos med dip', 'portion', 800, ['nachos', 'nachos med ost']],
  ['Tortillachips', 'påse', 700, ['tortilla', 'doritos']],
  ['Pringles', 'tub', 880, ['pringles tub', 'pringlesburk']],
  ['Saltstänger', 'skål', 200, ['saltpinnar', 'saltstick', 'cocktailnötter']],

  // Dryck
  ['Läsk (burk 33 cl)', 'burk', 140, ['läsk', 'coca-cola', 'coca cola', 'cola', 'pepsi', 'fanta', 'sprite', 'sockerdricka']],
  ['Läsk (flaska 50 cl)', 'flaska', 210, ['stor läsk', 'läsk flaska', 'cola flaska']],
  ['Läsk (1,5 liter)', 'flaska', 630, ['storflaska läsk', 'familjeläsk', 'literläsk']],
  ['Julmust (glas)', 'glas', 90, ['julmust', 'påskmust', 'must']],
  ['Energidryck (25 cl)', 'burk', 115, ['energidryck', 'red bull', 'redbull', 'celsius']],
  ['Energidryck (50 cl)', 'burk', 225, ['stor energidryck', 'monster', 'monster energy']],
  ['Chokladmjölk', 'förpackning', 190, ['kakao', 'chokladdryck', 'fria']],
  ['Milkshake', 'st', 500, ['shake', 'chokladmilkshake', 'jordgubbsmilkshake']],
  ['Öl (50 cl)', 'st', 210, ['öl', 'stor stark', 'pilsner', 'lager', 'starköl', 'stor stark öl']],
  ['Öl (33 cl)', 'st', 140, ['liten öl', 'öl burk', 'ölburk']],
  ['Folköl (33 cl)', 'st', 50, ['folköl', 'lättöl']],
  ['IPA (33 cl)', 'st', 190, ['ipa', 'craft beer', 'hantverksöl']],
  ['Vin (glas 15 cl)', 'glas', 125, ['vin', 'rött', 'vitt', 'rödvin', 'vitt vin', 'rosé', 'bubbel']],
  ['Vin (flaska)', 'flaska', 625, ['flaska vin', 'hel flaska vin']],
  ['Cider (33 cl)', 'burk', 170, ['cider', 'päroncider', 'äppelcider']],
  ['Drink', 'glas', 180, ['gin och tonic', 'g&t', 'gt', 'long drink', 'cocktail', 'mojito', 'mojitos']],
  ['Sprit (4 cl)', 'shot', 90, ['shot', 'snaps', 'vodka', 'whisky', 'gin', 'rom', 'tequila', 'brännvin']],
  ['Glögg', 'glas', 150, ['glögg med mandel', 'varm glögg']],
  ['Irish coffee', 'glas', 250, ['kaffe med sprit', 'kaffegök']],

  // Snabbmat
  ['Hamburgare', 'st', 550, ['burgare', 'hamburgare snabbmat', 'big mac', 'whopper', 'kycklingburgare']],
  ['Cheeseburgare', 'st', 300, ['cheeseburger', 'ostburgare']],
  ['Dubbelburgare', 'st', 750, ['dubbel burgare', 'dubbel cheeseburgare', 'stor burgare']],
  ['Hamburgarmeny', 'meny', 1100, ['burgarmeny', 'meny', 'happy meal', 'hamburgare meny']],
  ['Pommes frites (stor)', 'portion', 500, ['pommes', 'pommes frites', 'frites', 'stor pommes']],
  ['Pommes frites (liten)', 'portion', 300, ['liten pommes']],
  ['Kebab med tillbehör', 'portion', 900, ['kebab', 'kebabtallrik', 'kebab tallrik']],
  ['Kebabrulle', 'st', 800, ['rulle', 'kebab rulle', 'kebabrullen']],
  ['Falafelrulle', 'st', 650, ['falafel', 'falafelrulle med sås']],
  ['Korv med bröd', 'st', 330, ['korv', 'varmkorv', 'hotdog', 'hot dog', 'grillad korv', 'tunnbrödsrulle']],
  ['Chicken nuggets', 'portion', 300, ['nuggets', 'kyckling nuggets', 'nugget']],
  ['Kycklingspett', 'st', 400, ['spett', 'grillspett']],
  ['Pizza (hel)', 'hel', 900, ['pizza', 'vesuvio', 'kapricciosa', 'margherita', 'hel pizza', 'pizzor']],
  ['Pizza (liten)', 'st', 650, ['liten pizza', 'barnpizza', 'mellanpizza']],
  ['Kebabpizza', 'hel', 1100, ['kebab pizza', 'kebabpizzan']],
  ['Pizzabit', 'bit', 300, ['pizzaslice', 'pizza slice', 'slice']],
  ['Lasagne', 'portion', 600, ['lasagne portion', 'färdig lasagne']],
  ['Tacos', 'portion', 900, ['taco', 'tacokväll', 'fredagstaco', 'tacos portion']],
  ['Fredagsmys', 'paket', 1400, ['fredagsmys-paket', 'fredagsmyset', 'myskväll']],
  ['Smörgås med ost och skinka', 'st', 300, ['macka', 'ostmacka', 'smörgås']],
  ['Räkmacka', 'st', 450, ['räksmörgås', 'räkmackor']],

  // Glass
  ['Glass (kula)', 'kula', 130, ['glass', 'glasskula', 'glasskulor']],
  ['Glass (strut/pinne)', 'st', 200, ['glasstrut', 'glasspinne', 'strut', 'pinnglass', 'piggelin']],
  ['Mjukglass', 'st', 180, ['softis', 'mjukis', 'mjukglass strut']],
  ['Magnum', 'st', 270, ['magnumglass', 'glass magnum']],
  ['Glassbägare', 'st', 350, ['bägare', 'glassdessert', 'glassbowl']],
  ['Glassburk (Ben & Jerry\'s)', 'burk', 1000, ['ben jerry', 'ben & jerrys', 'ben and jerrys', 'pint', 'glassburk']],
  ['Banana split', 'st', 500, ['bananasplit']],

  // Frukostgrejer och övrigt
  ['Latte med smak', 'st', 250, ['caramel latte', 'vanilj latte', 'frappé', 'frappe']],
  ['Varm choklad med grädde', 'st', 350, ['varm choklad', 'kakao med grädde', 'chokladdryck varm']],
  ['Vaniljsås', 'dl', 200, ['sås', 'dessertsås']],
  ['Chokladpudding', 'st', 200, ['pudding', 'chokladmousse', 'mousse']],
  ['Smörgåstårta', 'bit', 400, ['smörgåstårtan']],
  ['Prinskorv', 'st', 60, ['prinskorvar', 'små korvar']],
  ['Köttbullar och potatismos', 'portion', 700, ['köttbullar', 'ikeas köttbullar', 'köttbullar med mos']],
  ['Pyttipanna', 'portion', 650, ['pytt', 'pytt i panna med ägg']],
  ['Ostbricka', 'portion', 500, ['ost och kex', 'ostar', 'brieost']],
  ['Smaksatt yoghurt', 'burk', 180, ['fruktyoghurt', 'yoghurt med müsli', 'yoghurt']],
  ['Müslibar', 'st', 190, ['barer', 'proteinbar', 'energibar', 'fruktbar']],
  ['Fish and chips', 'portion', 900, ['fisk och pommes', 'friterad fisk']],
  ['Spaghetti carbonara', 'portion', 750, ['carbonara', 'creamy pasta', 'grädde pasta']],
  ['Ost-toast', 'st', 350, ['toast', 'ostmacka grillad', 'tosti']],
  ['Kokosboll', 'st', 150, ['kokosbollar', 'kokos']],
  ['Dumle', 'påse', 400, ['dumlekarameller', 'karamellgodis']],
];

export function slugify(name: string): string {
  return name
    .toLocaleLowerCase('sv')
    .replace(/å/g, 'a')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const BUILTIN_ITEMS: FoodItem[] = ROWS.map(([name, unitLabel, kcalPerUnit, aliases = []]) => ({
  id: `b-${slugify(name)}`,
  name,
  kcalPerUnit,
  unitLabel,
  aliases,
  isFavorite: false,
  useCount: 0,
  lastUsedAt: '',
  source: 'builtin',
}));

const ORDER = new Map(BUILTIN_ITEMS.map((it, i) => [it.id, i]));

/** Position i inbyggda listan. Egna och inlärda poster sorteras före. */
export function builtinOrder(item: FoodItem): number {
  return ORDER.get(item.id) ?? -1;
}
