import shuffle from 'shuffle-array'
import randomItem from 'random-item'

const vocab: { [key: string]: [string, string] } = {
    put: ['שם', 'שמֵהַ']
    , buy: ['קנה', 'קנתה']
    , own: ['שברשותו', 'שברשותה']
}

function word(word: [string, string], gender: gender) {
    const i = gender == 'boy' ? 0 : 1
    return word[i]
}

type gender = 'boy' | 'girl'



function title(gender: gender) {
    const title_first = [
        ['לוֹחֵם', 'לוֹחֶמֶת']
        , ['נָסִיךְ', 'נְסִיכַת']
        , ['מֶלֶךְ', 'מַלְכַּת']
        , ['גַּמָּד', 'פִּיַּת']
        , ['שׁוֹדֵד', 'שׁוֹדֶדֶת']
        , ['קוֹסֵם', 'מְכַשֶּׁפֶת']
    ]
    const title_second = [
        'הַשּׁוֹקוֹלָד'
        , 'הַחֲלוֹמוֹת'
        , 'הָאוֹר'
        , 'הַחֹשֶׁךְ'
        , 'הַמַּמְתַּקִּים'
        , 'הַיְּעָרוֹת'
        , 'הַבִּצּוֹת'
        , 'הַגְּבָעוֹת'
    ]
    const i = gender === 'boy' ? 0 : 1
    return `${randomItem(title_first)[i]} ${randomItem(title_second)}`
}

type kid = {
    name: string
    title: string
    gender: gender
}

interface Animal {
    name: string
    names: string
    eat(): Animal
    eatBy(): Animal
}


export const cat: Animal = {
    name: 'חָתוּל'
    , names: 'חֲתוּלִים'
    , eat: () => { return snake }
    , eatBy: () => { return dog }
}

export const dog: Animal = {
    name: 'כֶּלֶב'
    , names: 'כְּלָבִים'
    , eat: () => { return cat }
    , eatBy: () => { return snake }
}

export const snake: Animal = {
    name: 'נָחָשׁ'
    , names: 'נְחָשִׁים'
    , eat: () => { return dog }
    , eatBy: () => { return cat }
}


export function question(animal: Animal, kid: kid) {
    return `כַּמָּה ${animal.names} יֵשׁ לְ${kid.name}?`
}

function boy(name: string) {
    return { name, gender: 'boy', title: title('boy') }
}

function girl(name: string) {
    return { name, gender: 'girl', title: title('girl') }
}

// const kids = shuffle([
//     boy('חֲבוּבוֹ')
//     , boy('יוֹתָם')
//     , boy('אוּרִי')
//     , boy('יוּבָל')
//     , boy('אֶלְעָד')
//     , boy('רֹנִּי')
//     , boy('גַּיְא')

//     , girl('חֲבוּבָה')
//     , girl('נֹעָה')
//     , girl('דִּיאַנֶּה')
//     , girl('שַׁחַר')
//     , girl('שָׁקֵד')
//     , girl('נֹגַהּ בְּלִי ו')
//     , girl('מַעְיָן')
//     , girl('לֹטֶם')
//     , girl('עֲדִי')
//     , girl('דָּנִיאֵלָה')
// ])

// const kids = shuffle([
//     boy('חֲבוּבוֹ')
//     , boy('יוֹתָם')
//     , boy('אוּרִי')
//     , boy('יוּבָל')
//     , boy('אֶלְעָד')
//     , boy('רֹנִּי')
//     , boy('גַּיְא')

//     , girl('חֲבוּבָה')
//     , girl('נֹעָה')
//     , girl('דִּיאַנֶּה')
//     , girl('שַׁחַר')
//     , girl('שָׁקֵד')
//     , girl('נֹגַהּ בְּלִי ו')
//     , girl('מַעְיָן')
//     , girl('לֹטֶם')
//     , girl('עֲדִי')
//     , girl('דָּנִיאֵלָה')
// ])

const kids = shuffle([
    boy('יִפְתַּח')
    , boy('נִסִּים')
    , boy('רַן')
    , boy('אָסָף')
    , boy('גִּלְעָד')
    , boy('יְהוּדָה')
    , girl('מָרִינָה')
    , girl('אָנָה')
    , girl('שָׁרוֹן')
])

function kid(): kid {
    const kid = kids.shift() as kid
    kids.push(kid)
    return kid
}

interface Node {
    kid: kid
    strs(animal: Animal): string[]
}

function took(gender: gender) {
    const boy = ['לָקַח', 'חָטַף', 'גָּנַב']
    const girl = ['לָקְחָה', 'גָּזְלָה', 'גָּנְבָה']
    return gender == 'boy'
        ? randomItem(boy)
        : randomItem(girl)
}

export class NodePlusNode implements Node {
    kid = kid()
    l: Node
    r: Node

    constructor(l: Node, r: Node) {
        this.l = l
        this.r = r
    }

    strs(animal: Animal): string[] {
        return this.l.strs(animal).concat(this.r.strs(animal)).concat([
            `${this.kid.name}, ${this.kid.title}, ${took(this.kid.gender)} אֶת כָּל הַ${animal.names} שֶׁל ${this.l.kid.name} וְ${this.r.kid.name}.`
        ])
    }
}

export class NodeMinusNode implements Node {
    kid = kid()
    l: Node
    r: Node

    constructor(l: Node, r: Node) {
        this.l = l
        this.r = r
    }

    strs(animal: Animal): string[] {
        return this.l.strs(animal).concat(this.r.strs(animal.eatBy())).concat([
            `כָּל אֶחָד מֵהַ${animal.eatBy().names} שֶׁל ${this.r.kid.name} אָכַל ${animal.name} אֶחָד שֶׁל ${this.l.kid.name}.`,
            `${this.kid.name}, ${this.kid.title}, ${took(this.kid.gender)} אֶת כָּל הַ${animal.names} הַנּוֹתָרִים שֶׁל ${this.l.kid.name}.`
        ])
    }
}

export class NodeMulNode implements Node {
    kid = kid()
    l: Node
    r: Node

    constructor(l: Node, r: Node) {
        this.l = l
        this.r = r
    }

    strs(animal: Animal): string[] {
        return this.l.strs(animal).concat(this.r.strs(animal)).concat([
            `לְכֹל ${animal.name} שֶׁל ${this.l.kid.name} נוֹלַד גּוּר אֶחָד מִכֹּל אֶחָד מֵהַ${animal.names} שֶׁל ${this.r.kid.name}.`,
            `${this.kid.name}, ${this.kid.title}, ${took(this.kid.gender)} אֶת כָּל הַגּוּרִים שֶׁנּוֹלְדוּ.`
        ])
    }
}

export class NodeDivNode implements Node {
    kid = kid()
    l: Node
    r: Node

    constructor(l: Node, r: Node) {
        this.l = l
        this.r = r
    }

    strs(animal: Animal): string[] {
        return this.l.strs(animal).concat(this.r.strs(animal)).concat([
            `${this.r.kid.name} ${word(vocab.buy, this.r.kid.gender)} כְּלוּב אֶחָד לְכֹל אֶחָד מֵהַ${animal.names} ${word(vocab.own, this.r.kid.gender)}.`,
            `${this.l.kid.name} ${word(vocab.put, this.l.kid.gender)} אֶת הַ${animal.names} ${word(vocab.own, this.l.kid.gender)} בַּכְּלוּבִים שֶׁל ${this.r.kid.name}, מִסְפָּר זֵהֶה שֶׁל ${animal.names} בְּכָל כְּלוּב.`,
            `${this.kid.name}, ${this.kid.title}, ${took(this.kid.gender)} אֶת כָּל הַ${animal.names} מֵאֶחָד הַכְּלוּבִים.`
        ])
    }
}

function count(n: number, animal: Animal) {
    return n == 1
        ? `${animal.name} אֶחָד`
        : `${n} ${animal.names}`
}

export class NodeNumber implements Node {
    kid = kid()
    n: number

    constructor(n: number) {
        this.n = n
    }

    strs(animal: Animal): string[] {
        return [
            `לְ${this.kid.name}, ${this.kid.title}, יֵשׁ ${count(this.n, animal)}.`]
    }
}
