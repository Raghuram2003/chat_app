import { useContext } from "react";
import RegisterAndLogin from "./RegisterAndLogin";
import { UserContext } from "./UserContext";
import Chat from "./Chat";

export default function Routes(){
    const {id,username} = useContext(UserContext)
    if(username && id){
        return(
                <Chat/>
            )
    }
    return(
        <RegisterAndLogin/>    
    )
}