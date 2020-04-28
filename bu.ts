import shuffle from 'shuffle-array'
import random from 'random-item'

type gender = 'boy' | 'girl'
type kid = {
    name: string
    gender: gender
}

const boy = (name: string) => ({ name, gender: 'boy' })
const girl = (name: string) => ({ name, gender: 'girl' })

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


interface unit {
    name: () => string
    plural: () => string
    count: (n: number) => string
    amount: () => string
}

export const money = {
    name() {
        return 'כסף'
    }
    , plural() {
        return 'לירות'
    }
    , count(n: number) {
        return n == 1 ? 'לירה אחת' : `${n} לירות`
    }
    , amount() {
        return 'סכום כסף'
    }
}


export function question(exp: Exp, unit: unit) {
    const q = exp.sentence(unit)
    q.push(`כמה ${unit.name()} יש ל${exp.kid.name}?`)
    return q
}

export interface Exp {
    kid: kid
    sentence: (unit: unit) => string[]
}

export class Kid implements Exp {
    kid = kid()
    n: number;

    constructor(n: number) {
        this.n = n
    }

    sentence(unit: unit) {
        return [`ל${this.kid.name} יש ${unit.count(this.n)}`]
    }
}

function take(gender: gender) {
    return gender == 'boy'
        ? random(['לקח', 'חטף', 'גנב'])
        : random(['לקחה', 'חטפה', 'גנבה'])
}

export class Add implements Exp {
    kid = kid();
    l: Exp;
    r: Exp;

    constructor(l: Exp, r: Exp) {
        this.l = l
        this.r = r
    }

    sentence(unit: unit) {
        const s = this.l.sentence(unit).concat(this.r.sentence(unit))
        s.push(`${this.kid.name} ${take(this.kid.gender)} את ה${unit.name()} של ${this.l.kid.name} ו${this.r.kid.name}`)
        return s
    }

    name() {
        return this.kid.name
    }
}

function loss(gender: gender) {
    return gender == 'boy'
        ? random(['הפסיד בהימורים', 'איבד'])
        : random(['איבדה', 'הפסידה בהימורים'])
}

const he = {
    'boy': 'הוא'
    , 'girl': 'היא'
}

export class Sub implements Exp {
    kid = kid()
    l: Exp;
    r: Exp;

    constructor(l: Exp, r: Exp) {
        this.l = l
        this.r = r
    }

    sentence(unit: unit) {
        const s = this.l.sentence(unit).concat(this.r.sentence(unit))
        s.push(`ל${this.kid.name} היה ${unit.amount()} זהה לזה של ${this.l.kid.name} ו${he[this.kid.gender]} ${loss(this.kid.gender)} ${unit.amount()} זהה לזה של ${this.r.kid.name}`)
        return s
    }

    name() {
        return this.kid.name
    }
}
