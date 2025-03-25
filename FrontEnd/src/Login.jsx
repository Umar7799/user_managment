import { useState } from "react";

const Login = ({ onLogin, onShowRegister }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState(""); // ✅ State for error message

  const handleLogin = async () => {
    setErrorMessage(""); // Reset error message before attempting login

    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed.");
      }

      localStorage.setItem("token", data.token);
      onLogin(); // Call parent function to update state
    } catch (error) {
      console.error("❌ Login Error:", error);
      setErrorMessage(error.message); // ✅ Display error message
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Login</h2>

      {/* ✅ Show error message if exists */}
      {errorMessage && <p className="text-red-500 mb-2">{errorMessage}</p>}  

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="p-2 border rounded mb-2 w-full"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="p-2 border rounded mb-2 w-full"
      />
      <button onClick={handleLogin} className="bg-blue-500 text-white p-2 rounded w-full">
        Login
      </button>

      <p className="mt-2 text-sm">
        Don't have an account?{" "}
        <span 
          className="text-blue-500 cursor-pointer underline" 
          onClick={onShowRegister}
        >
          Register here
        </span>
      </p>
    </div>
  );
};

export default Login;
