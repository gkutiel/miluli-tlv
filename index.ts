import * as nearley from 'nearley'
import { cat, question } from './common'

document.addEventListener('DOMContentLoaded', () => {
    const grammar = require("./grammar.js")


    function parse(exp: string) {
        try {
            const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar))
            parser.feed(exp)
            console.log(parser.results)
            const res = parser.results[0]
            return {
                story: res.strs(cat),
                question: question(cat, res.kid)
            }
        } catch (e) {
            throw e
        }
    }

    const input = document.getElementById('input') as HTMLInputElement
    const story = document.getElementById('story') as HTMLDivElement
    const q = document.getElementById('question') as HTMLDivElement

    function onInput() {
        try {
            const p = parse(input.value.trim())
            story.innerHTML = p.story.join(' ')
            q.innerText = p.question
            console.log(q)
        } catch (e) {
            console.log(e)
            story.innerText = `Can't understand ${input.value}`
            q.innerText = '¯\_(ツ)_/¯'
        }
    }

    input.addEventListener('input', onInput)

    input.focus()
    input.value = '1 + 2'
    onInput()
})