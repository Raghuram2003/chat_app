import { useContext, useEffect, useState } from "react";
import { UserContext } from "./UserContext";
import Avatar from "./Avatar";
import Logo from "./Logo";
import SendButton from "./SendButton";
import { uniqBy } from "lodash";

export default function Chat() {
  const [ws, setWs] = useState(null);
  const { username, id } = useContext(UserContext);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMessageText, setNewMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const [onlinePeople, setOnlinePeople] = useState({});
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:4040");
    console.log(ws);
    setWs(ws);
    ws.addEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setMessages((prev) => ([
      ...prev,
      { text: newMessageText, sender: id, recepient: selectedUserId , id : Date.now()},
    ]));
    setNewMessageText("");
  }
  const onlinePeopleExclOurUser = { ...onlinePeople };
  delete onlinePeopleExclOurUser[id];
  const messagesWithoutDupes = uniqBy(messages, "id");
  return (
    <div className="flex h-screen">
      <div className="bg-white w-1/3">
        <Logo />
        {Object.keys(onlinePeopleExclOurUser).map((userId) => (
          <div
            onClick={() => setSelectedUserId(userId)}
            className={
              "border-b border-gray-100 flex gap-2 items-center cursor-pointer " +
              (selectedUserId === userId ? "bg-blue-100" : "")
            }
            key={userId}
          >
            {userId === selectedUserId && (
              <div className="w-1 bg-blue-500 h-12 rounded-sm"></div>
            )}
            <div className="flex gap-2 items-center py-2 pl-4">
              <Avatar userId={userId} username={onlinePeople[userId]} />
              <span className="text-grey-800">{onlinePeople[userId]}</span>
            </div>
          </div>
        ))}
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
            <div className="overflow-y-scroll">
              {messagesWithoutDupes.map((message) => (
                <div key={message.id} className={(message.sender===id ? "text-right" : "text-left")}>
                    <div  className={"text-left inline-block p-2 m-2 rounded-md text-sm "+(message.sender===id ? "bg-blue-500 text-white" : "bg-white text-gray-500")}>
                        {message.text}
                    </div>
                </div>
                
              ))}
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
