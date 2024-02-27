import mongoose from "mongoose";

const FriendSchema = new mongoose.Schema({
    userId : {type : mongoose.Schema.ObjectId,ref:'User'},
    username : String,
    friends : [{
        type : mongoose.Schema.ObjectId,
        ref : 'User'
    }]
},{timestamps : true})

export const Friend = mongoose.model("Friend",FriendSchema);