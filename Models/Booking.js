const mongoose=require('mongoose');

const bookingSchema=new mongoose.Schema({
    name: {type:String, required:true},
    userId: {type:mongoose.Schema.Types.ObjectId, required:true},
    place: {type:mongoose.Schema.Types.ObjectId, required:true, ref:'Place'},   //to not only get the place id but to get all info about the place
    checkIn: {type:String, required:true},
    checkOut: {type:String, required:true},
    guests: Number,
    phone: {type:String, required:true},
    price: Number
});

const Booking=mongoose.model("Booking", bookingSchema);

module.exports=Booking;