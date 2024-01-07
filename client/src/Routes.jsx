import { useContext } from "react";
import RegisterAndLogin from "./RegisterAndLogin";
import { UserContext } from "./UserContext";

export default function Routes(){
    const {id,username} = useContext(UserContext)
    if(username && id){
        return(
                <div>logged in</div>
            )
    }
    return(
        <RegisterAndLogin/>    
    )
}