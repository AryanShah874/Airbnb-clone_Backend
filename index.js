require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./Models/User");
const bcyrpt = require("bcrypt");
const jwt=require("jsonwebtoken");
const cookieParser=require("cookie-parser");
const Place = require("./Models/Place");
const Booking = require("./Models/Booking");
const passport=require("passport");
const GoogleStrategy=require("passport-google-oauth20").Strategy;  //for google login
const cloudinary=require("cloudinary");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({
    origin: 'https://airbnb-clone-frontend-mocha.vercel.app',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'] 
}));
app.use(cookieParser());
app.use(passport.initialize());

app.use('/Uploads', express.static(__dirname+'/Uploads'));

passport.use(new GoogleStrategy({
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            callbackURL: "https://airbnb-clone-backend-one.vercel.app/auth/google/callback",
            scope: ['profile', 'email']
        },
        async function(accessToken, refreshToken, profile, done){
            let user=await User.findOne({googleId: profile.id})
                
            if(!user){
                user=new User({
                    name: profile.displayName,
                    username: profile.emails[0].value,
                    googleId: profile.id
                });

                user.save();
            }

            const token=jwt.sign({username: user.username, id: user.id}, process.env.SECRET, {});

            return done(null, token)
        }
    )
)

mongoose.set("strictQuery", true);

mongoose.connect(process.env.MONGODB_URL);

app.post("/register", async function (req, res) {
    try {
        await User.findOne({ username: req.body.username })
        .then((foundUser) => {
            if (foundUser) {
                res.status(403).json({"error": "User already exists. Login to continue." });
            } 
            else {
                bcyrpt.hash(req.body.password, 10, function (err, hash) {
                    const user = new User({
                        name: req.body.name,
                        username: req.body.username,
                        password: hash,
                    });
                    
                    user.save()
                    .then(()=>{
                        res.status(200).json({"success": "Registration successful. Login to continue."});
                    });
                });
            }
        });
    } 
    catch (error) {
        console.log(error);
    }
});

app.post("/login", async function(req, res){
    try {
        await User.findOne({username: req.body.username})
        .then((foundUser)=>{
            if(foundUser){
                bcyrpt.compare(req.body.password, foundUser.password, function(err, result){
                    if(err){
                        console.log(err);
                    }
                    else{
                        if(result){
                            jwt.sign({username: foundUser.username, id: foundUser._id}, process.env.SECRET, {}, function(err, token){
                                if(err){
                                    console.log(err);
                                }
                                else{
                                    res.cookie("token", token, {secure: true, sameSite: "none"}).json({"user": foundUser, "success": "Login Successful."});   //cookie options very important
                                }
                            });
                        }
                        else{
                            res.status(401).json({"error": "Incorrect Password."});
                        }
                    }
                });
            }
            else{
                res.status(400).json({"error": "User does not exist."});
            }
        })

    } catch (error) {
        console.log(error);   
    }
});

app.get("/profile", function(req, res){
    const {token}=req.cookies;
    
    if(token){
        jwt.verify(token, process.env.SECRET, {}, async function(err, user){
            if(err){
                console.log(err);
            }
            else{
                const {name, username, _id}=await User.findById(user.id);  //for getting the name as name is not included in the token
                res.json({name, username, _id});
            }
        });
    }

});

app.get("/logout", function(req, res){
    res.cookie('token', '').json({"success": "Logout Successful."});
});

app.post("/places", function(req, res){
    const {token}=req.cookies;

    if(token){
        jwt.verify(token, process.env.SECRET, {}, async function(err, user){
            if(err){
                console.log(err);
            }
            else{
                const place=new Place({
                    owner: user.id,
                    name: req.body.name,
                    address: req.body.address,
                    photos: req.body.photos,
                    description: req.body.description,
                    emenities: req.body.emenities,
                    extraInfo: req.body.extraInfo,
                    checkIn: req.body.checkIn,
                    checkOut: req.body.checkOut,
                    maxGuests: req.body.maxGuests,
                    price: req.body.price
                });

                place.save()
                .then(()=>{
                    res.status(200).json({"success": "Added place successfully."});
                })
                .catch((err)=>{
                    console.log(err);
                })
            }
        });
    }
});

app.get("/places", function(req, res){
    const {token}=req.cookies;

    if(token){
        jwt.verify(token, process.env.SECRET, {}, async function(err, user){
            if(err){
                console.log(err);
            }
            else{
                res.json(await Place.find({owner: user.id}));
            }
        });
    }
});

app.put("/places", function(req, res){
    const {token}=req.cookies;

    if(token){
        jwt.verify(token, process.env.SECRET, {}, async function(err, user){
            if(err){
                console.log(err);
            }
            else{
                if(req.body.owner===user.id){
                    await Place.replaceOne({_id: req.body._id}, {
                        owner: req.body.owner,                              //not required though added as I am using replace method (hint: check difference between upadate and replace method on stack overflow)
                        name: req.body.name,
                        address: req.body.address,
                        photos: req.body.photos,
                        description: req.body.description,
                        emenities: req.body.emenities,
                        extraInfo: req.body.extraInfo,
                        checkIn: req.body.checkIn,
                        checkOut: req.body.checkOut,
                        maxGuests: req.body.maxGuests,
                        price: req.body.price
                    });
                    res.status(200).json({"success": "Place Updated Successfully."});
                }
                else{
                    res.status(400).json({"error": "something went worng"});
                }
            }
        });
    }
});

app.delete("/places", function(req, res){
    const {token}=req.cookies;

    if(token){
        jwt.verify(token, process.env.SECRET, {}, async function(err, user){
            if(err){
                console.log(err);
            }   
            else{
                const {photos}=await Place.findById(req.body.id);

                photos.map(async (photo)=>{
                    let publicId =await photo.split('/').slice(-2).join('/').replace(/\.[^/.]+$/, '');

                    cloudinary.v2.uploader
                    .destroy(publicId)
                    .then((result)=>{console.log(result)});
                })

                await Place.deleteOne({owner: user.id, _id: req.body.id})
                .then(()=>{res.status(200).json({"success": "Place Deleted Successfully."})})
                .catch((err)=>{console.log(err);})
            }
        });   
    }
});

app.get("/places/:id", async function(req, res){
    const {id}=req.params;

    res.json(await Place.findById(id));
});


app.get("/allPlaces", async function(req, res){
    res.json(await Place.find());
});

app.post("/bookPlace", function(req, res){
    const {token}=req.cookies;

    if(token){
        jwt.verify(token, process.env.SECRET, {}, async function(err, user){
            if(err){
                console.log(err);
            }
            else{
                const booking=new Booking({
                    name: req.body.name,
                    userId: user.id,
                    place: req.body.placeId,
                    checkIn: req.body.checkIn,
                    checkOut: req.body.checkOut,
                    guests: req.body.guests,
                    phone: req.body.mobileNo,
                    price: req.body.price
                });

                booking.save()
                .then(()=>{
                    res.status(200).json({"success": "Booking Confirmed."});
                })
                .catch((err)=>{
                    console.log(err);
                })
            }
        });
    }
    else{
        res.status(401).json({"error": "User needs to login first."});
    }
});

app.get("/bookings", function(req, res){

    const {token}=req.cookies;

    if(token){
        jwt.verify(token, process.env.SECRET, async function(err, user){
            if(err){
                console.log(err);
            }
            else{
                res.json(await Booking.find({userId: user.id}).populate('place'));
            }
        });
    }
});

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get("/auth/google/callback", passport.authenticate("google", { session: false }), function (req, res){
    res.cookie('token', req.user, {secure: true, sameSite: "none"});
    res.redirect("https://airbnb-clone-frontend-mocha.vercel.app");
});
  

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

          
//Delete images from uploads folder
app.post("/deletePhoto", function(req, res){
    const {public_id}=req.body;

    cloudinary.v2.uploader
    .destroy(public_id)
    .then((result)=>{res.status(200).json(result)});
});

const PORT=process.env.PORT || 5000

app.listen(PORT, function () {
    console.log(`Server started at port ${PORT}`);
});