const mongoose=require("mongoose");

const placeSchema=new mongoose.Schema({
    owner: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    name: {type: String, required: true},
    address: {type: String, required: true},
    photos: [String],
    description: String,
    emenities: [String],
    extraInfo: String,
    checkIn: {type: String, required: true},
    checkOut: {type: String, required: true},
    maxGuests: {type: Number, required: true},
    price: {type: Number, required: true}
});

const Place=mongoose.model("Place", placeSchema);

module.exports=Place;