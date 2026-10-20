const mongoose = require('mongoose')

const gameSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true }
}, { versionKey: false })

module.exports = mongoose.model('Game', gameSchema)