import express from "express";
import mongoose from "mongoose";
import { config } from "dotenv";
import { User } from "./models/User.js";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import WebSocket, { WebSocketServer } from "ws";
import { Message } from "./models/Message.js";
import fs from "fs";
import { Friend } from "./models/Friend.js";
import { setInterval } from "timers/promises";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fromEnv } from "@aws-sdk/credential-providers";

config();
const app = express();
app.use(express.json());
app.use(cookieParser());
const PORT = 4040;
const salt = bcrypt.genSaltSync(10);
app.use("/uploads", express.static("./uploads"));
try {
  const db = mongoose.connect(process.env.MONGO_URL);
  console.log("db connected");
} catch (e) {
  console.log("db not connected");
}

const s3 = new S3Client({
  region: "ap-southeast-2",
  credentials : fromEnv()
});



function verifyJWT(req, res, next) {
  const token = req.cookies?.token;
  if (token) {
    jwt.verify(token, secret, {}, (err, data) => {
      if (err) throw err;
      req.userData = data;
    });
  }
  next();
}

app.get("/test", (req, res) => {
  res.json("test ok");
});

const secret = process.env.JWT_SECRET;

app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, salt);
  try {
    const newUser = await User.create({ username, password: hashedPassword });
    const friendDoc = await Friend.create({
      userId: newUser._id,
      username,
      friends: [],
    });
    jwt.sign({ userId: newUser._id, username }, secret, {}, (err, token) => {
      if (err) throw err;
      res.cookie("token", token).status(201).json({
        id: newUser._id,
        message : "User created"
      });
    });
  } catch (err) {
    console.log('error');
    res.status(501).json({message : "Username already exists"});
  }
});
app.get("/api/profile", (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    jwt.verify(token, secret, {}, (err, data) => {
      if (err) throw err;
      res.json(data);
    });
  } else {
    res.status(401).json("no token");
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const foundUser = await User.findOne({ username });
  if (foundUser) {
    const authenticated = bcrypt.compareSync(password, foundUser.password);
    if (authenticated) {
      jwt.sign(
        { userId: foundUser._id, username },
        secret,
        {},
        (err, token) => {
          if (err) throw err;
          res.cookie("token", token).status(201).json({
            id: foundUser._id,
            message :  "Login Successful"
          });
        }
      );
    } else {
      res.status(401).json({message : "Not authenticated"});
    }
  } else {
    res.status(404).json({message : "User not found"});
  }
});

app.post("/api/logout", (req, res) => {
  res.cookie("token", "").status(201).json("ok");
});

//  app.get("/api/people", async (req, res) => {
//   const users = await User.find({}, { _id: 1, username: 1 });
//   res.json(users);
// });

app.get("/api/people", verifyJWT, async (req, res) => {
  const users = await Friend.findOne(
    { userId: req.userData.userId },
    { friends: 1 }
  );
  const friends = users?.friends;
  if (friends?.length) {
    const transformedFriends = friends.map((friend) => ({
      _id: friend.userId, // Change 'userId' to '_id'
      username: friend.username,
    }));
    res.json(transformedFriends);
  } else {
    res.json("No friends");
  }
});

app.get("/api/getMessages/:userId", verifyJWT, async (req, res) => {
  const selectedUserId = req.params.userId;
  const ourUserId = req.userData.userId;
  // const messages = await Message.find({
  //   $or: [
  //     { sender: ourUserId, recepient: selectedUserId },
  //     { sender: selectedUserId, recepient: ourUserId }
  //   ]
  // })
  // .sort({ createdAt: 1 })
  // .catch(err=>console.log(err));
  const messages = await Message.find({
    sender: { $in: [ourUserId, selectedUserId] },
    recepient: { $in: [ourUserId, selectedUserId] },
  })
    .sort({ createdAt: 1 })
    .catch((err) => {
      console.log("Error querying messages:", err);
      res.status(500).json({ error: "Internal server error" });
    });
  // console.log(messages);
  res.json(messages);
});

app.post("/api/addFriend/:friendName", verifyJWT, async (req, res) => {
  const friendUserName = req.params.friendName;
  const userId = req.userData.userId;
  const username = req.userData.username;
  try {
    const friend = await Friend.findOneAndUpdate(
      { username: friendUserName },
      { $push: { friends: { userId, username } } },
      { new: true }
    );
    const user = await Friend.findOneAndUpdate(
      { userId: userId },
      {
        $push: {
          friends: { userId: friend.userId, username: friend.username },
        },
      },
      { new: true }
    );
    // console.log(username, friend.username);
    res.status(200).json({ msg: "friend added", array: friend.friends });
  } catch (err) {
    console.log(err);
    res.json("Error");
  }
});

const server = app.listen(PORT, () => {
  console.log(`server listening at ${PORT}`);
});

const wss = new WebSocketServer({ server });
wss.on("connection", (con, req) => {
  // get username and userId from the cookie

  async function notifyOnlinePeople() {
    //all users
    //wss.client[0].id , check for friend , if friend send updates
    function compare(a, b) {
      if (a.userId < b.userId) {
        return -1;
      }
      if (a.userId > b.userId) {
        return 1;
      }
      return 0;
    }

    const users = await Friend.findOne({ userId: con.userId });
    const friends = users?.friends;
    if (friends?.length) {
      var FriendsUserId = friends.map((friend) => friend.userId);
      FriendsUserId = FriendsUserId.map((objectId) => objectId.toString());
      var friendsClient = [...wss.clients].filter((client) =>
        FriendsUserId.includes(client.userId)
      );

      friendsClient.sort(compare);

      con.send(
        JSON.stringify({
          online: friendsClient.map((c) => ({
            userId: c.userId,
            username: c.username,
          })),
        })
      );

      // [...wss.clients].forEach((client) => {
      //   // console.log(FriendsUserId, client.userId, con.userId);
      //   if (FriendsUserId.includes(client.userId)) {
      //     // console.log("yes");
      //     client.send(
      //       JSON.stringify({
      //         online: [...wss.clients].filter((c)=> FriendsUserId.includes(c.userId)).map((c) => ({
      //           userId: c.userId,
      //           username: c.username,
      //         })),
      //       })
      //     );
      //   }
      // });
    }
  }

  con.isAlive = true;
  con.timer = setInterval(() => {
    con.ping();
    con.deathTimer = setTimeout(() => {
      con.isAlive = false;
      clearInterval(con.timer);
      con.terminate();
      notifyOnlinePeople();
    }, 1000);
  }, 5000);

  con.on("pong", () => {
    clearTimeout(con.deathTimer);
  });

  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenCookieString = cookies
      .split(";")
      .find((str) => str.startsWith("token="));
    if (tokenCookieString) {
      const token = tokenCookieString.split("=")[1];
      if (token) {
        jwt.verify(token, secret, {}, (err, data) => {
          if (err) console.log(err);
          const { username, userId } = data;
          con.userId = userId;
          con.username = username;
        });
      }
    }
  }

  con.on("message", async (message, isBinary) => {
    const messageData = JSON.parse(message.toString("utf-8"));
    const { recepient, text, file } = messageData.message;
    let fileName = null;
    if (file) {
      const parts = file.name.split(".");
      const ext = parts[parts.length - 1];
      fileName = Date.now() + "." + ext;
      const path = "./uploads/" + fileName;
      const bufferData = new Buffer.from(file.data.split(",")[1], "base64");
      //write the bufferData into the upload folder and upload it to s3 bucket , then unlink the file from upload
      fs.writeFile(path, bufferData, async() => {
        console.log("file saved at ", path);
        fs.readFile(path, async (err, fileDataS3) => {
          if (err) {
            console.error("error while reading file", err);
            return;
          }
          try {
            const command = new PutObjectCommand({
              Body: fileDataS3,
              Bucket: "minor-project-rao",
              Key: fileName,
            });
            await s3.send(command);
            console.log("file uploaded");
            fs.unlink(path, (err) => {
              if (err) {
                console.error("Error deleting the file", err);
                return;
              }
              console.log("File deleted from local file system");
            });
          } catch (err) {
            console.error("error uploading to s3", err);
          }
        });
      });
    }
    if ((recepient && text) || (recepient && file)) {
      const messageDoc = await Message.create({
        sender: con.userId,
        recepient,
        text,
        file: fileName,
      });
      [...wss.clients]
        .filter((c) => c.userId === recepient || c.userId === con.userId)
        .forEach((c) => {
          try {
            c.send(
              JSON.stringify({
                text,
                sender: con.userId,
                _id: messageDoc._id,
                recepient,
                file: fileName,
              })
            );
          } catch (err) {
            console.log(err);
          }
        });
    }
  });

  //send the online users to every online client
  notifyOnlinePeople();
  setInterval(notifyOnlinePeople, 5 * 1000);
});
wss.on("error", console.error);
