const express = require('express')
const app = express()
const port = 8080
const swaggerUi = require('swagger-ui-express')
const yamljs = require('yamljs')
const swaggerDocument = yamljs.load('./docs/swagger.yaml');

app.use(express.json())

const games = [
    {id: 1, name: "Witcher 3", price: 29.99},
    {id: 2, name: "Cyberpunk 2077", price: 59.99},
    {id: 3, name: "Minecraft", price: 26.99},
    {id: 4, name: "Counter-Strike: Global Offensive", price: 0},
    {id: 5, name: "Roblox", price: 0},
    {id: 6, name: "Grand Theft Auto V", price: 29.99},
    {id: 7, name: "Valorant", price: 0},
    {id: 8, name: "Forza Horizon 5", price: 59.99}
]

const users = [
    {username: "admin", password: "admin123", role: "admin"},
    {username: "user", password: "user123", role: "user"}
]

function requireAdmin(req, res, next) {
    const auth = (req.headers.authorization || '').replace('Basic ', '')
    const [username, password] = Buffer.from(auth, 'base64').toString().split(':')

    const user = users.find(u => u.username === username && u.password === password)
    if (typeof user === 'undefined') {
        return res.status(401).send({error: "Wrong username or password"})
    }
    if (user.role !== 'admin') {
        return res.status(403).send({error: "Only admin can do this"})
    }
    next()
}

app.get('/games', (req, res) => {
    res.send(games)
})

app.get('/games/:id', (req, res) => {
    const game = games.find(g => g.id == req.params.id)
    if (typeof game === 'undefined') {
        return res.status(404).send({error: "Game not found"})
    }

    res.send(game)
})

app.post('/games', requireAdmin, (req, res) => {
    if (!req.body || !req.body.name || !req.body.price) {
        return res.status(400).send({ error: 'One or all params are missing' })
    }
    let game = {
        id: Math.max(0, ...games.map(g => g.id)) + 1,
        price: req.body.price,
        name: req.body.name
    }

    games.push(game)

    res.status(201)
        .location(`${getBaseUrl(req)}/games/${game.id}`)
        .send(game)
})

app.put('/games/:id', requireAdmin, (req, res) => {
    const game = games.find(g => g.id == req.params.id)
    if (typeof game === 'undefined') {
        return res.status(404).send({error: "Game not found"})
    }
    if (!req.body || !req.body.name || !req.body.price) {
        return res.status(400).send({ error: 'One or all params are missing' })
    }

    game.name = req.body.name
    game.price = req.body.price

    res.send(game)
})

app.delete('/games/:id', requireAdmin, (req, res) => {
    const index = games.findIndex(g => g.id == req.params.id)
    if (index === -1) {
        return res.status(404).send({error: "Game not found"})
    }

    games.splice(index, 1)

    res.status(204).send({error: "No content"})
})

const swaggerCss = `
    .dark-mode-toggle, .swagger-ui .authorization__btn { display: none !important }
    .swagger-ui > div { position: relative }
    .swagger-ui .scheme-container { position: absolute; top: 5px; left: 0; right: 0; margin: 0; padding: 0; background: none !important; box-shadow: none !important; pointer-events: none }
    .swagger-ui .scheme-container .auth-wrapper { pointer-events: auto }
`

// Hides POST/PUT/DELETE in Swagger until you log in as admin
function hideAdminOperations() {
    return {
        statePlugins: {
            spec: {
                wrapSelectors: {
                    taggedOperations: (original, system) => (...args) => {
                        const username = system.getSystem().authSelectors.authorized().getIn(['basicAuth', 'value', 'username'])
                        if (username === 'admin') {
                            return original(...args)
                        }
                        return original(...args)
                            .map(tag => tag.set('operations', tag.get('operations').filter(op => op.get('method') === 'get')))
                            .filter(tag => tag.get('operations').size > 0)
                    }
                }
            }
        }
    }
}

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: swaggerCss,
    swaggerOptions: {plugins: [hideAdminOperations]}
}))

app.listen(port, () => {
    console.log(`API up at: http://localhost:${port}`)
})

function getBaseUrl(req) {
    return (req.connection && req.connection.encrypted
        ? 'https' : 'http') + `://${req.headers.host}`
}
