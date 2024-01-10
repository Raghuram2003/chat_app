import { useContext, useEffect, useRef, useState } from "react";
import { UserContext } from "./UserContext";
import Avatar from "./Avatar";
import Logo from "./Logo";
import SendButton from "./SendButton";
import { uniqBy } from "lodash";
import axios from "axios";
import Contact from "./Contact";
export default function Chat() {
  const [ws, setWs] = useState(null);
  const { username, id, setUsername, setId } = useContext(UserContext);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMessageText, setNewMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [offlinePeople, setOfflinePeople] = useState({});
  const messageRef = useRef();

  //connect to the ws on mount
  useEffect(() => {
    connectToWs();
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
        console.log(res.data);
        setMessages([...res.data]);
      });
    }
  }, [selectedUserId]);

  //get offline people by filterin all users from online people
  useEffect(() => {
    axios.get("/api/people").then((res) => {
      console.log(res.data, id);
      const offlinePeopleArr = res.data
        .filter((person) => person._id !== id)
        .filter((p) => !Object.keys(onlinePeople).includes(p._id));
      const offlinePeople = {};
      offlinePeopleArr.forEach((p) => {
        offlinePeople[p._id] = p.username;
      });
      console.log(offlinePeople);
      setOfflinePeople(offlinePeople);
    });
  }, [onlinePeople]);

  function connectToWs() {
    const ws = new WebSocket("ws://localhost:4040");
    console.log(ws);
    setWs(ws);
    ws.addEventListener("message", handleMessage);
    ws.addEventListener("close", () => connectToWs());
  }

  function showOnlinePeople(peopleArray) {
    const people = {};
    peopleArray.forEach((person) => {
      people[person.userId] = person.username;
    });
    console.log(people);
    setOnlinePeople(people);
  }

  function handleMessage(ev) {
    const messageData = JSON.parse(ev.data);
    if ("online" in messageData) {
      showOnlinePeople(messageData.online);
    } else if ("text" in messageData) {
      console.log(messageData);
      setMessages((prev) => [...prev, { ...messageData }]);
    }
  }
  function sendMessage(ev) {
    ev.preventDefault();
    ws.send(
      JSON.stringify({
        message: {
          recepient: selectedUserId,
          text: newMessageText,
        },
      })
    );
    setMessages((prev) => [
      ...prev,
      {
        text: newMessageText,
        sender: id,
        recepient: selectedUserId,
        _id: Date.now(),
      },
    ]);
    setNewMessageText("");
  }
  
  function logout(){
    axios.post("/api/logout").then(()=>{
      setWs(null);
      setId(null);
      setUsername(null);
    })
    
  }
  const onlinePeopleExclOurUser = { ...onlinePeople };
  delete onlinePeopleExclOurUser[id];
  const messagesWithoutDupes = uniqBy(messages, "_id");
  return (
    <div className="flex h-screen">
      <div className="bg-white w-1/3 flex flex-col">
        <div className="flex-grow">
          <Logo />
          {Object.keys(onlinePeopleExclOurUser).map((userId) => (
            <Contact
              selectedUserId={selectedUserId}
              userId={userId}
              onClick={setSelectedUserId}
              key={userId}
              username={onlinePeople[userId]}
              online={true}
            />
          ))}
          {Object.keys(offlinePeople).map((userId) => (
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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
          </svg>{username}</span>
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
              <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
                {messagesWithoutDupes.map((message) => (
                  <div
                    key={message._id}
                    className={
                      message.sender === id ? "text-right" : "text-left"
                    }
                  >
                    <div
                      className={
                        "text-left inline-block p-2 m-2 rounded-md text-sm " +
                        (message.sender === id
                          ? "bg-blue-500 text-white"
                          : "bg-white text-gray-500")
                      }
                    >
                      {message.text}
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
