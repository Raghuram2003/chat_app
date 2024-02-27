import axios from "axios";
import { useContext, useState } from "react";
import { UserContext } from "./UserContext.jsx";

export default function RegisterAndLogin() {
  const [username, setUsername] = useState("");
  const [password, setpassword] = useState("");
  const [loginOrRegister, setLoginOrRegister] = useState("register");
  const { setUsername: setLoggedInUsername, setId } = useContext(UserContext);
  async function handleSubmit(ev) {
    ev.preventDefault();
    const { data } = await axios.post("/api/" + loginOrRegister, {
      username,
      password,
    });
    console.log(data);
    setLoggedInUsername(username);
    setId(data.id);
  }
  return (
    <div className="bg-slate-300 h-screen flex items-center">
      <form className="w-64 mx-auto mb-12" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="username"
          className="block w-full rounded-sm p-2 mb-2 border text-center "
          value={username}
          onChange={(ev) => setUsername(ev.target.value)}
        />
        <input
          type="text"
          placeholder="password"
          className="block w-full rounded-sm p-2 mb-2 border text-center"
          value={password}
          onChange={(ev) => setpassword(ev.target.value)}
        />
        <button className="bg-blue-500 text-white block w-full rounded-sm p-2">
          {loginOrRegister === "register" ? "Register" : "Login"}
        </button>
        {loginOrRegister === "register" && (
          <div className="text-center mr-2">
            Already a user?{" "}
            <button onClick={() => setLoginOrRegister("login")}>
              Login here
            </button>
          </div>
        )}
        {loginOrRegister === "login" && (
          <div className="text-center mr-2">
            Not a existing user?
            <button onClick={() => setLoginOrRegister("register")}>
              Register here
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
