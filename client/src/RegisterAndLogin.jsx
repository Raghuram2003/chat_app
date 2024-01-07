import axios from "axios";
import { useContext, useState } from "react"
import { UserContext } from "./UserContext.jsx";

export default function RegisterAndLogin(){
    const [username,setUsername] = useState("")
    const [password,setpassword] = useState("")    
    const {setUsername : setLoggedInUsername  ,setId } = useContext(UserContext)
    async function handleSubmit(ev){
        ev.preventDefault();
        const {data} = await axios.post("/api/register",{username,password});
        console.log(data);
        setLoggedInUsername(username);
        setId(data.id)
    }
    return(
        <div className="bg-blue-100 h-screen flex items-center">
            <form className="w-64 mx-auto mb-12" onSubmit={handleSubmit}>
                <input type="text" placeholder="username" className="block w-full rounded-sm p-2 mb-2 border text-center "value={username} onChange={(ev)=>setUsername(ev.target.value)}/>
                <input type="text" placeholder="password" className="block w-full rounded-sm p-2 mb-2 border text-center" value={password} onChange={(ev)=>setpassword(ev.target.value)}/>            
                <button className="bg-blue-500 text-white block w-full rounded-sm p-2">Register</button>
            </form>
        </div>    
    )
}