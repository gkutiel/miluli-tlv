import shuffle from 'shuffle-array'
import randomItem from 'random-item'

const vocab: { [key: string]: [string, string] } = {
    put: ['שם', 'שמה']
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
        ['לוחם', 'לוחמת']
        , ['נסיך', 'נסיכת']
        , ['מלך', 'מלכת']
        , ['גמד', 'פיית']
        , ['שודד', 'שודדת']
        , ['קוסם', 'מכשפת']
    ]
    const title_second = [
        'השוקולד'
        , 'החלומות'
        , 'האור'
        , 'החושך'
        , 'הממתקים'
        , 'היערות'
        , 'הביצות'
        , 'הגבעות'
    ]
    const i = gender === 'boy' ? 0 : 1
    return `${randomItem(title_first)[i]} ${randomItem(title_second)}`
}

function his(gender: gender) {
    return gender == 'boy'
        ? 'his'
        : 'her'
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
    name: 'חתול'
    , names: 'חתולים'
    , eat: () => { return snake }
    , eatBy: () => { return dog }
}

export const dog: Animal = {
    name: 'כלב'
    , names: 'כלבים'
    , eat: () => { return cat }
    , eatBy: () => { return snake }
}

export const snake: Animal = {
    name: 'נחש'
    , names: 'נחשים'
    , eat: () => { return dog }
    , eatBy: () => { return cat }
}


export function question(animal: Animal, kid: kid) {
    return `כמה ${animal.names} יש ל${kid.name}?`
}

function boy(name: string) {
    return { name, gender: 'boy', title: title('boy') }
}

function girl(name: string) {
    return { name, gender: 'girl', title: title('girl') }
}


// const kids = shuffle([
//     boy('חבובו')
//     , boy('יותם')
//     , boy('אורי')
//     , boy('יובל')
//     , boy('אלעד')
//     , boy('רוני')
//     , boy('גיא')
//     , girl('חבובה')
//     , girl('נועה')
//     , girl('דיאנה')

//     , girl('שחר')
//     , girl('שקד')
//     , girl('נוגה בלי ו')
//     , girl('מעיין')
//     , girl('לוטם')
//     , girl('עדי')
//     , girl('דניאלה')
// ])

const kids = shuffle([
    boy('יפתח')
    , boy('יותם')
    , boy('יואב')
    , boy('אופיר')
    , boy('גלעד')
    , boy('שי')
    , boy('אלי')
    , girl('יעל')
    , girl('עינב')
    , girl('מעיין')
    , girl('ענת')
    , girl('טליה')
    , girl('איילת')
    , girl('פסיה')
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
    const boy = ['לקח', 'חטף', 'גנב']
    const girl = ['לקחה', 'גזלה', 'גנבה']
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
            `${this.kid.name}, ${this.kid.title}, ${took(this.kid.gender)} את כל ה${animal.names} של ${this.l.kid.name} ו${this.r.kid.name}.`
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
            `כל אחד מה${animal.eatBy().names} של ${this.r.kid.name} אכל ${animal.name} אחד של ${this.l.kid.name}.`,
            `${this.kid.name}, ${this.kid.title}, ${took(this.kid.gender)} את כל ה${animal.names} הנותרים של ${this.l.kid.name}.`
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
            `לכל ${animal.name} של ${this.l.kid.name} נולד גור אחד מכל אחד מה${animal.names} של ${this.r.kid.name}.`,
            `${this.kid.name}, ${this.kid.title}, ${took(this.kid.gender)} את כל הגורים שנולדו.`
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
            `${this.r.kid.name} ${word(vocab.buy, this.r.kid.gender)} כלוב אחד לכל אחד מה${animal.names} ${word(vocab.own, this.r.kid.gender)}.`,
            `${this.l.kid.name} ${word(vocab.put, this.l.kid.gender)} את ה${animal.names} ${word(vocab.own, this.l.kid.gender)} בכלובים של ${this.r.kid.name}, מספר זהה של ${animal.names} בכל כלוב.`,
            `${this.kid.name}, ${this.kid.title}, ${took(this.kid.gender)} את כל ה${animal.names} מאחד הכלובים.`
        ])
    }
}

function count(n: number, animal: Animal) {
    return n == 1
        ? `${animal.name} אחד`
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
            `ל${this.kid.name}, ${this.kid.title}, יש ${count(this.n, animal)}.`]
    }
}
