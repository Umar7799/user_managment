import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";

// Initialize the socket connection
const socket = io("https://user-managment-backend-twn9.onrender.com");

const UserTable = () => {
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [isLoggedIn, setIsLoggedIn] = useState(!!token);
  const [loading, setLoading] = useState(true); // Loading state to track data fetching
  const navigate = useNavigate();

  // Redirect to login if user is not logged in
  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [isLoggedIn, navigate]);

  // Fetch users from the backend
  const fetchUsers = useCallback(async () => {
    setLoading(true); // Start loading
    try {
      const response = await fetch("https://user-managment-backend-twn9.onrender.com/api/users", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false); // Stop loading
    }
  }, [token]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchUsers();

      // Listen for real-time updates
      socket.on("usersUpdated", (updatedUsers) => {
        setUsers(updatedUsers); // Update the user list on any changes
      });

      socket.on("blocked", (data) => {
        alert(data.message); // Show blocked message
        handleLogout(); // Log out the blocked user
      });
    }

    // Cleanup the socket listeners when the component unmounts
    return () => {
      socket.off("usersUpdated");
      socket.off("blocked");
    };
  }, [isLoggedIn, fetchUsers]);

  // Logout function to clear the token and update state
  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setToken(null);
  };

  // Handle user actions (block, unblock, delete)
  const handleAction = async (action) => {
    if (selectedUsers.length === 0 || !token) return;

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
          if (data.error === "You are blocked. Action not allowed.") {
            alert("You are blocked! Logging out...");
            handleLogout();
            return;
          } else if (data.error === "Invalid token") {
            alert("Session expired or invalid. Logging out...");
            handleLogout();
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

      setSelectedUsers([]); // Clear selection after the action
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
    }
  };

  // Toggle selection of users in the table
  const toggleSelection = (userId) => {
    setSelectedUsers((prevSelectedUsers) =>
      prevSelectedUsers.includes(userId)
        ? prevSelectedUsers.filter((id) => id !== userId)
        : [...prevSelectedUsers, userId]
    );
  };

  // Show loading indicator while fetching users
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>User Management</h1>
      <table>
        <thead>
          <tr>
            <th>Select</th>
            <th>Name</th>
            <th>Email</th>
            <th>Last Login</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => toggleSelection(user.id)}
                />
              </td>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{new Date(user.last_login).toLocaleString()}</td>
              <td>{user.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <button onClick={() => handleAction("block")}>Block Selected</button>
        <button onClick={() => handleAction("unblock")}>Unblock Selected</button>
        <button onClick={() => handleAction("delete")}>Delete Selected</button>
      </div>
    </div>
  );
};

export default UserTable;
