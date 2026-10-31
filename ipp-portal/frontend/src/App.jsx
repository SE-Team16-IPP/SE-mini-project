import { useState } from "react";
import { clearSession, getUser } from "./api";
import Auth from "./pages/Auth.jsx";
import Listings from "./pages/Listings.jsx";
import MyApplications from "./pages/MyApplications.jsx";
import Tests from "./pages/Tests.jsx";
import PostListing from "./pages/PostListing.jsx";
import MyListings from "./pages/MyListings.jsx";
import AdminTests from "./pages/AdminTests.jsx";

const TABS = {
  Student: [
    ["listings", "Internships", Listings],
    ["applications", "My applications", MyApplications],
    ["tests", "Aptitude tests", Tests],
  ],
  Recruiter: [
    ["post", "Post a listing", PostListing],
    ["mine", "My listings", MyListings],
  ],
  Admin: [["admin-tests", "Create a test", AdminTests]],
};

export default function App() {
  const [user, setUser] = useState(getUser());
  const [tab, setTab] = useState(null);

  if (!user) return <Auth onLogin={setUser} />;

  const tabs = TABS[user.role] || [];
  const current = tabs.find(([key]) => key === tab) || tabs[0];
  const Page = current ? current[2] : null;

  const logout = () => {
    clearSession();
    setUser(null);
    setTab(null);
  };

  return (
    <>
      <header className="top">
        <h1>Internship and Placement Portal</h1>
        <nav>
          {tabs.map(([key, label]) => (
            <button key={key} className={current && current[0] === key ? "active" : ""} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="who">
          <span>
            {user.name} ({user.role})
          </span>
          <button className="btn ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <main>{Page ? <Page user={user} goTo={setTab} /> : null}</main>
    </>
  );
}
