import React, { useState } from "react";

const Addadv = () => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false); // State for loading

  function handlechange(e) {
    setName(e.target.value);
  }

  async function addadvocate() {
    setLoading(true); // Set loading to true when the request starts

    try {
      let response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/create-spreadsheet/${name}`,
        {
          method: "POST",
          mode: "cors",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      let data = await response.json();
      alert(data.message);
    } catch (error) {
      // console.error("Error:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false); // Set loading to false when the request completes
      setName(""); // Reset the name input
    }
  }

  return (
    <>
      {loading ? (
        <div className="loader_container">
          <div className="loader"></div>
        </div>
      ) : (
        <div className="addadv">
          <label>Enter advocate name </label>
          <input type="text" onChange={handlechange} value={name} />
          <button onClick={addadvocate}>Add adv</button>
        </div>
      )}
    </>
  );
};

export default Addadv;
