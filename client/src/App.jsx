import axios from "axios"

// import { useContext } from "react"
import {  UserContextProvider } from "./UserContext"
import Routes from "./Routes"
function App() {
  axios.defaults.withCredentials = true
  
  return (
      <UserContextProvider>
          <Routes/>
      </UserContextProvider>
    )
}

export default App
