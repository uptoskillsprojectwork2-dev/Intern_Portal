import {createBrowserRouter} from "react-router"
import Login from "../pages/auth/Login.jsx"

const routes = createBrowserRouter([
    {
        path: "/",
        element: <div>Home</div>
    },
    {
        path: "/login",
        element: <Login />
    }
])

export default routes