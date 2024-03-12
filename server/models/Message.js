import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
    sender : {type : mongoose.Schema.ObjectId,ref:'User'},
    recepient : {type : mongoose.Schema.ObjectId,ref:'User'},
    text : String,
    file : String
},{timestamps : true});

export const Message = mongoose.model("Message",MessageSchema);