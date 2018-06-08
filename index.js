const request = require("request")
const _ = require('underscore')
const cheerio = require('cheerio')
const express = require('express')
const cors = require('cors')
const app = express()

app.use(cors())

let myrcosDeaths = []

let options = { method: 'POST',
    url: 'https://secure.tibia.com/community/',
    qs: { subtopic: 'characters' },
    headers: 
    {
        'cache-control': 'no-cache',
        'content-type': 'application/x-www-form-urlencoded' },
    form: { name: 'Tatudo Kalibrado' } }

const fetchDeaths = () => {
    request(options, function (error, response, body) {
        if (error) throw new Error(error)
        const $ = cheerio.load(body)
        let deaths = []
        $('table tbody:contains("Deaths") tr:contains("Died")')
            .each((i, element) => {
                deaths[i] = {}
                $(element).children().each((i2, content) => {
                    if(i2 == 0){
                        deaths[i].date = $(content).text()
                    } else {
                        deaths[i].description = $(content).text()
                    }
                })
            })
        myrcosDeaths = _.uniq(_.union(myrcosDeaths, deaths), 
            _.iteratee('date'))
    })
}

fetchDeaths()
setInterval(_ => {
    fetchDeaths()
}, 60000)

app.get('/', (req, res) => res.json({
    count: myrcosDeaths.length,
    deaths: myrcosDeaths
}))

app.listen(process.env.PORT || 3000, () => {
    console.log("Marcos Mortes is live!")
})