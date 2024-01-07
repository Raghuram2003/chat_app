import express from 'express';
import mongoose from 'mongoose';
import { config } from 'dotenv';
import { User } from './models/User.js';
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs'
config();
const app = express()
app.use(express.json())
app.use(cookieParser())
const PORT = 4040
const salt = bcrypt.genSaltSync(10);

try{
    const db = mongoose.connect(process.env.MONGO_URL);
    console.log("db connected")
}catch(err){
    console.log("db not connected")
}


app.get("/test",(req,res)=>{
    res.json("test ok")
})
const secret = process.env.JWT_SECRET;
app.post("/api/register",async(req,res)=>{
    const {username,password} = req.body;
    const hashedPassword = bcrypt.hashSync(password,salt)
    console.log(hashedPassword)
    try{
        const newUser = await User.create({username,password : hashedPassword})
        jwt.sign({userId : newUser._id,username},secret,{},(err,token)=>{
            if(err) throw err;
            res.cookie('token',token).status(201).json({
                id : newUser._id,
            });
        })
    }catch(err){
        console.log(err);
        res.status(501);
    }
})
app.get("/api/profile",(req,res)=>{
    const token = req.cookies?.token
    if(token){
        jwt.verify(token,secret,{},(err,data)=>{
            if(err) throw err;
            res.json(data)
        })
    }else{
        res.status(401).json("no token");
    }
    
})

app.listen(PORT,()=>{
    console.log(`server listening at ${PORT}`);
})