import axios from "axios";
import { useContext, useState } from "react";
import { UserContext } from "./UserContext.jsx";
import { toast, Toaster } from "react-hot-toast";

export default function RegisterAndLogin() {
  const [username, setUsername] = useState("");
  const [password, setpassword] = useState("");
  const [loginOrRegister, setLoginOrRegister] = useState("register");
  const { setUsername: setLoggedInUsername, setId } = useContext(UserContext);
  async function handleSubmit(ev) {
    ev.preventDefault();
    try {
      const response = await axios.post("/api/" + loginOrRegister, {
        username,
        password,
      });
      if (loginOrRegister === "register") {
        if (response.status === 201) {
          toast.success(response.data.message);
        }
      } else {
        console.log(response.status)
        if (response.status === 201) {
          toast.success(response.data.message);
        }
      }
      console.log(response.data);
      setLoggedInUsername(username);
      setId(response.data.id);
    } catch (err) {
      console.log(err);
      if (err.response) {
        if (loginOrRegister === "register") {
          if (err.response.status === 501) {
            toast.error("User already exists");
          }
        } else {
          toast.error(err.data.message);
        }
      }
    }
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
          type="password"
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
