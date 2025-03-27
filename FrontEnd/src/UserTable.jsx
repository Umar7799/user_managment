import { useState, useEffect } from "react";
import io from "socket.io-client";
import Login from "./Login";
import Register from "./Register";

// Update the WebSocket connection URL to the deployed backend
const socket = io("https://user-managment-backend-twn9.onrender.com");

const UserTable = () => {
  const [users, setUsers] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showRegister, setShowRegister] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    // Set token on mount (initial load)
    const storedToken = localStorage.getItem("token");
    setToken(storedToken);

    if (storedToken) {
      setIsLoggedIn(true);
      fetchUsers(storedToken);
    } else {
      setIsLoggedIn(false);
    }

    // Setup socket listener
    if (isLoggedIn && storedToken) {
      socket.on("usersUpdated", (updatedUsers) => {
        setUsers(updatedUsers);
      });
    }

    return () => {
      socket.off("usersUpdated");
    };
  }, [isLoggedIn]);

  const fetchUsers = async (storedToken) => {
    try {
      if (!storedToken) {
        setIsLoggedIn(false);
        return;
      }

      const response = await fetch("https://user-managment-backend-twn9.onrender.com/api/users", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${storedToken}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 403) {
          setErrorMessage("You have been blocked. Please contact an administrator.");
          localStorage.removeItem("token");
          setIsLoggedIn(false);
        } else {
          throw new Error(data.error || "Unauthorized. Please log in again.");
        }
      } else {
        // Sorting users by last login time in descending order
        setUsers(data.users.sort((a, b) => new Date(b.last_login) - new Date(a.last_login)));
      }
    } catch (error) {
      setErrorMessage("Session expired. Please log in again.");
      setIsLoggedIn(false);
      localStorage.removeItem("token");
      console.log(error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setShowRegister(false);
    setErrorMessage("");
    setToken(null);  // Clear the token state
  };

  const handleAction = async (action) => {
    if (selectedUsers.length === 0 || !token) return;  // Check token validity

    try {
      for (const userId of selectedUsers) {
        let url = `https://user-managment-backend-twn9.onrender.com/api/users/${action}/${userId}`;
        let method = "PUT";

        if (action === "unblock") {
          url = `https://user-managment-backend-twn9.onrender.com/api/users/unblock/${userId}`;
        } else if (action === "delete") {
          url = `https://user-managment-backend-twn9.onrender.com/api/users/delete/${userId}`;
          method = "DELETE";
        }

        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (response.status === 403) {
          // Check for blocked user scenario
          if (data.error === "You are blocked. Action not allowed.") {
            alert("You are blocked! Logging out...");
            localStorage.removeItem("token");
            setIsLoggedIn(false);
            return;
          } else if (data.error === "Invalid token") {
            alert("Session expired or invalid. Logging out...");
            localStorage.removeItem("token");
            setIsLoggedIn(false);
            return;
          } else {
            alert(`Action failed: ${data.error}`);
          }
        }

        if (!response.ok) {
          console.error(`Error performing ${action} on user ${userId}:`, data.error);
          continue;
        }
      }

      setSelectedUsers([]);
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
    }
  };

  const toggleSelection = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };
  const isAllSelected = selectedUsers.length === users.length;

  return (
    <div className="p-4">
      {isLoggedIn ? (
        <>
          <div className="pb-4 mb-4">
            <h1 className="p-2 text-5xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 drop-shadow-lg">
              User managment app
            </h1>
          </div>
          {errorMessage && <p className="text-red-500">{errorMessage}</p>}

          <button className="bg-red-500 text-white px-4 py-2 rounded mb-4" onClick={handleLogout}>
            Logout
          </button>

          <div className="mb-4 flex gap-2">
            <button
              className="bg-yellow-500 text-white px-4 py-2 rounded disabled:opacity-50"
              onClick={() => handleAction("block")}
              disabled={selectedUsers.length === 0}
            >
              🚫 Block
            </button>
            <button
              className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
              onClick={() => handleAction("unblock")}
              disabled={selectedUsers.length === 0}
            >
              🔓 Unblock
            </button>
            <button
              className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
              onClick={() => handleAction("delete")}
              disabled={selectedUsers.length === 0}
            >
              🗑️ Delete
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border rounded-lg shadow-md">
              <thead>
                <tr className="bg-gray-200 text-left">
                  <th className="p-2">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={() =>
                        setSelectedUsers(isAllSelected ? [] : users.map((user) => user.id))
                      }
                    />
                  </th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Last Login</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleSelection(user.id)}
                      />
                    </td>
                    <td className="p-2">{user.name}</td>
                    <td className="p-2">{user.email}</td>
                    <td className="p-2">{user.last_login || "N/A"}</td>
                    <td className="p-2">{user.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : showRegister ? (
        <Register
          onLogin={() => {
            setIsLoggedIn(true);
            setShowRegister(false);
            setErrorMessage("");
          }}
        />
      ) : (
        <Login
          onLogin={() => {
            setIsLoggedIn(true);
            setErrorMessage("");
          }}
          onShowRegister={() => setShowRegister(true)}
        />
      )}
    </div>
  );
};

export default UserTable;
