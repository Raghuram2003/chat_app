import { useContext, useEffect, useRef, useState } from "react";
import { UserContext } from "./UserContext";
import Logo from "./Logo";
import SendButton from "./SendButton";
import { uniqBy } from "lodash";
import axios from "axios";
import Contact from "./Contact";
import toast from "react-hot-toast";
// import FileDisplay from "./FileDisplay";
export default function Chat() {
  const [ws, setWs] = useState(null);
  const { username, id, setUsername, setId } = useContext(UserContext);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMessageText, setNewMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [offlinePeople, setOfflinePeople] = useState({});
  const messageRef = useRef();
  const searchRef = useRef(null);
  const [friendBox, setFriendBox] = useState("");
  // const [isLogout, setIsLogout] = useState(false);
  //connect to the ws on mount
  useEffect(() => {
    setWs(null);
    connectToWs();
    console.log(id);
  }, []);

  //scroll auto to the recent message
  useEffect(() => {
    const div = messageRef.current;
    if (div) {
      div.scrollTop = div.scrollIntoView({ behaviour: "smooth", block: "end" });
    }
  }, [messages]);

  //set messages from db
  useEffect(() => {
    if (selectedUserId) {
      axios.get("/api/getMessages/" + selectedUserId).then((res) => {
        // console.log(res.data);
        setMessages([...res.data]);
      });
    }
    setWs(null);
    connectToWs();
  }, [selectedUserId]);

  //get offline people by filterin all users from online people
  useEffect(() => {
    getPeople();
  }, [onlinePeople]);

  function getPeople() {
    axios.get("/api/people").then((res) => {
      const offlinePeopleArr = res.data
        .filter((person) => person._id !== id)
        .filter((p) => !Object.keys(onlinePeople).includes(p._id));
      const offlinePeople = {};
      offlinePeopleArr.forEach((p) => {
        offlinePeople[p._id] = p.username;
      });
      setOfflinePeople(offlinePeople);
    });
  }

  function connectToWs() {
    // if (!isLogout) {
    const ws = new WebSocket("ws://localhost:4040");
    // console.log(ws);
    setWs(ws);
    ws.addEventListener("message", handleMessage);
    ws.addEventListener("close", function (event) {
      // Add any actions you want to perform when the WebSocket is closed
      console.log("WebSocket connection closed with code:", event.code);
    });
    // }
    // ws.addEventListener("close", () => connectToWs());
  }

  function showOnlinePeople(peopleArray) {
    const people = {};
    peopleArray.forEach((person) => {
      people[person.userId] = person.username;
    });
    // console.log(people);

    setOnlinePeople(people);
    console.log("online", onlinePeople);
  }

  function handleMessage(ev) {
    const messageData = JSON.parse(ev.data);
    console.log(messageData);
    if ("online" in messageData) {
      console.log(messageData.online);
      showOnlinePeople(messageData.online);
    } else if ("text" in messageData) {
      // console.log(messageData);
      // console.log(messageData);
      if (messageData.sender === selectedUserId) {
        setMessages((prev) => [...prev, { ...messageData }]);
      }
    }
  }
  function sendMessage(ev, file = null) {
    // console.log(ws);
    if (ev) {
      ev.preventDefault();
    }
    try {
      ws.send(
        JSON.stringify({
          message: {
            recepient: selectedUserId,
            text: newMessageText,
            file: file || null,
          },
        })
      );
      console.log(ws);
    } catch (err) {
      console.log(err);
    }
    // setTimeout(100);
    if (file) {
      axios.get("/api/getMessages/" + selectedUserId).then((res) => {
        // console.log(res.data);
        setMessages([...res.data]);
      });
    } else {
      setNewMessageText("");
      setMessages((prev) => [
        ...prev,
        {
          text: newMessageText,
          sender: id,
          recepient: selectedUserId,
          _id: Date.now(),
        },
      ]);
    }
  }

  async function logout() {
    try {
      const response = await axios.post("/api/logout");
      if (response.status === 201) {
        toast.success("Logout Successful");
      }
      if (ws) {
        ws.close();
        console.log("ws clossed");
      }
      setWs(null);
      setId(null);
      setUsername(null);
    } catch (err) {
      console.log(err);
    }
  }

  function sendFile(ev) {
    const reader = new FileReader();
    reader.readAsDataURL(ev.target.files[0]);
    reader.onload = () => {
      sendMessage(null, {
        name: ev.target.files[0].name,
        data: reader.result,
      });
    };
    axios.get("/api/getMessages/" + selectedUserId).then((res) => {
      // console.log(res.data);
      setMessages([...res.data]);
    });
  }

  function focusSearch() {
    searchRef.current.focus();
  }

  async function handleAddFriend(ev) {
    ev.preventDefault();
    console.log(friendBox);
    const response = await axios.post("/api/addFriend/" + friendBox);
    console.log(response);
    setFriendBox("");
    getPeople();
  }

  const onlinePeopleExclOurUser = { ...onlinePeople };
  delete onlinePeopleExclOurUser[id];
  const messagesWithoutDupes = uniqBy(messages, "_id");

  return (
    <div className="flex h-screen">
      <div className="bg-white w-1/3 flex flex-col">
        <div className="flex-grow">
          <Logo />
          <div className="flex items-center justify-center gap-2 m-2">
            <div onClick={focusSearch}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
            </div>
            <input
              type="text"
              className="border border-black w-full p-2 rounded-sm"
              ref={searchRef}
              placeholder="Add Friend"
              value={friendBox}
              onChange={(ev) => setFriendBox(ev.target.value)}
            />
            <button
              className="border border-black p-2"
              onClick={handleAddFriend}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
            </button>
          </div>
          {!!Object.keys(onlinePeopleExclOurUser).length &&
            Object.keys(onlinePeopleExclOurUser).map((userId) => (
              <Contact
                selectedUserId={selectedUserId}
                userId={userId}
                onClick={setSelectedUserId}
                key={userId}
                username={onlinePeople[userId]}
                online={true}
              />
            ))}
          {!!Object.keys(offlinePeople).length &&
            Object.keys(offlinePeople).map((userId) => (
              <Contact
                selectedUserId={selectedUserId}
                userId={userId}
                onClick={setSelectedUserId}
                key={userId}
                username={offlinePeople[userId]}
                online={false}
              />
            ))}
        </div>
        <div className="p-2 text-center flex items-center justify-center">
          <span className="mr-2 text-gray-600 text-sm flex item-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6"
            >
              <path
                fillRule="evenodd"
                d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
                clipRule="evenodd"
              />
            </svg>
            {username}
          </span>
          <button
            className="text-sm text-gray-500 bg-blue-100 py-1 px-2 border rounded-sm"
            onClick={() => {
              logout();
            }}
          >
            Logout
          </button>
        </div>
      </div>
      <div className="bg-blue-300 w-2/3 p-2 flex flex-col">
        <div className="flex-grow">
          {!selectedUserId && (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">
                &larr; Select a user from sidebar
              </div>
            </div>
          )}
          {!!selectedUserId && (
            <div className="relative h-full">
              <div className="overflow-y-scroll  absolute top-0 left-0 right-0 bottom-2">
                {messagesWithoutDupes.map((message) => (
                  <div
                    key={message._id}
                    className={
                      message.sender === id ? "text-right" : "text-left"
                    }
                  >
                    <div
                      className={
                        "text-left inline-block p-3 m-2 rounded-md text-sm " +
                        (message.sender === id
                          ? "bg-blue-500 text-white"
                          : "bg-white text-gray-500")
                      }
                    >
                      {message.text}
                      {
                        message.file && (
                          <div className="flex gap-2 items-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
                              />
                            </svg>

                            <a
                              href={
                                "https://minor-project-rao.s3.ap-southeast-2.amazonaws.com/" +
                                message.file
                              }
                              rel="noreferrer"
                              target="_blank"
                              className="underline"
                            >
                              {message.file}
                            </a>
                          </div>
                        )
                        /* <FileDisplay message={message} />  */
                      }
                    </div>
                  </div>
                ))}
                <div ref={messageRef}></div>
              </div>
            </div>
          )}
        </div>
        <div>
          {selectedUserId && (
            <form className="flex gap-1" onSubmit={sendMessage}>
              <input
                type="text"
                value={newMessageText}
                onChange={(ev) => setNewMessageText(ev.target.value)}
                placeholder="type your message"
                className="bg-white border p-2 flex-grow rounded-sm"
              />
              <label className="bg-blue-500 text-gray-200 p-2 rounded-sm cursor-pointer">
                <input type="file" className="hidden" onChange={sendFile} />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
                  />
                </svg>
              </label>
              <button
                className="bg-blue-500 text-white p-2 rounded-sm"
                type="submit"
              >
                <SendButton />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
