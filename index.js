const request = require("request")
const _ = require('underscore')
const cheerio = require('cheerio')
const moment = require('moment')
const express = require('express')
const cors = require('cors')
const app = express()
const admin = require('firebase-admin')
const serviceAccount = require('./firebase-adminsdk')
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://mortesmarcos.firebaseio.com'
})

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
        let newMyrcosDeaths = _.uniq(_.union(myrcosDeaths, deaths), _.iteratee('date'))
        if(!_.isEqual(myrcosDeaths, newMyrcosDeaths)) {
            const newDeaths = _.difference(newMyrcosDeaths, myrcosDeaths)
            newDeaths.forEach(newDeath)
        }
        myrcosDeaths = newMyrcosDeaths
    })
}

admin.database().ref('/deds').once('value')
.then(snap => {
    const deaths = snap.val()
    if(deaths) {
        for(const k in deaths) myrcosDeaths.push(deaths[k])
    }

    fetchDeaths()
    setInterval(_ => {
        fetchDeaths()
    }, 60000)
})

const notificationTitles = [
    'MARCOS IS DIE',
    'MARCOS DED AGAIN',
    'PAI MYRCOS DED AGORA',
    'E LÁ VEM ELES DENOVO',
]
const newDeath = (death) => {
    const key = moment(death.date, 'MMM DD YYYY, HH:mm:ss').unix()
    admin.database().ref('/deds/' + key).set(death)
    myrcosDeaths.push(death)

    var message = {
        notification: {
            title: _.sample(notificationTitles),
            body: death.description
        },
        topic: 'quero_ver_o_marcos_se_fuder'
    };

    admin.messaging().send(message)
    .then((response) => {
        console.log('Successfully sent message:', response);
    })
    .catch((error) => {
        console.log('Error sending message:', error)
    })
}

app.get('/', (req, res) => {
    admin.messaging().subscribeToTopic([req.query.token], 'quero_ver_o_marcos_se_fuder')
    res.json({
        count: myrcosDeaths.length,
        deaths: myrcosDeaths
    })
})

const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log("Marcos Mortes is live on " + port + " !")
})
