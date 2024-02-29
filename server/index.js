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
      });
    });
  } catch (err) {
    console.log(err);
    res.status(501);
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
          });
        }
      );
    } else {
      res.status(401).send("no in");
    }
  } else {
    res.status(404).send("No user found");
  }
});

app.post("/api/logout", (req, res) => {
  res.cookie("token", "").json("ok");
});

app.get("/api/people", async (req, res) => {
  const users = await User.find({}, { _id: 1, username: 1 });
  res.json(users);
});

app.get("/api/getMessages/:userId", verifyJWT, async (req, res) => {
  const selectedUserId = req.params.userId;
  const ourUserId = req.userData.userId;
  // const selectedUserRef = await User.findOne({_id:selectedUserId});
  // const ourUserRef = await User.findOne({_id : ourUserId})
  const messages = await Message.find({
    sender: { $in: [ourUserId, selectedUserId] },
    recepient: { $in: [ourUserId, selectedUserId] },
  }).sort({ createdAt: 1 });
  res.json(messages);
});

app.post("/api/addFriend/:friendName", verifyJWT, async (req, res) => {
  const friendUserName = req.params.friendName;
  const userId = req.userData.userId;
  try {
    const friend = await Friend.findOneAndUpdate(
      { username: friendUserName },
      { $push: { friends: userId } },
      { new: true }
    );
    const user = await Friend.findOneAndUpdate(
      { userId: userId },
      { $push: { friends: friend.userId } },
      { new: true }
    );
    res.json("friend added");
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
  function notifyOnlinePeople() {
    //all users
    //wss.client[0].id , check for friend , if friend send updates
    [...wss.clients].forEach((client) => {
      client.send(
        JSON.stringify({
          online: [...wss.clients].map((c) => ({
            userId: c.userId,
            username: c.username,
          })),
        })
      );
    });
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
          // //console.log(data);
          const { username, userId } = data;
          con.userId = userId;
          con.username = username;
        });
      }
    }
  }

  // //console.log(token);
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
      fs.writeFile(path, bufferData, () => {
        console.log("file saved at ", path);
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
        .filter((c) => c.userId === recepient)
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
});
wss.on("error", console.error);
