import { useNavigate } from "react-router-dom";
import "../../../app/App.css";

export default function Unauthorized() {
    const navigate = useNavigate();

    return (
        <div className="form-side" style={{ minHeight: "100vh" }}>
            <div className="auth-card" style={{ textAlign: "center" }}>
                <h2>Access denied</h2>
                <p className="sub">
                    You don't have permission to view that page. If you think this is a
                    mistake, contact your administrator.
                </p>

                <button className="primary" onClick={() => navigate("/login")}>
                    Back to Login
                </button>
            </div>
        </div>
    );
}
