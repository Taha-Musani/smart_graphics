import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();

  const [Data, setData] = useState({
    fileName: "",
    numPages: "",
    rupeesPerPage: "",
    date: "",
    advname: "",
    totalamount: "",
  });

  const [availablefile, setAvailablefile] = useState([]);
  const [loading, setLoading] = useState(false); // Loading state for fetching

  const handleChange = (event) => {
    const { name, value } = event.target;
    setData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  Data["totalamount"] = Number(Data.numPages) * Number(Data.rupeesPerPage);

  const adddata = async (e) => {
    e.preventDefault();
    let advfileName = Data.advname;

    for (const key in Data) {
      if (Data.hasOwnProperty(key) && Data[key] === "") {
        return alert("Please fill in all form details");
      }
    }

    const url = `${process.env.REACT_APP_BACKEND_URL}/append-spreadsheet`;

    setLoading(true); // Start loading

    try {
      const response = await fetch(url, {
        method: "POST",
        mode: "cors",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          advfileName,
          Data,
        }),
      });

      let data = await response.json();
      // console.log(data);
      
      if (!response.ok) {
        alert(data.message);
      } else {
        // console.log(data);
        alert(data.message);

        // alert(response)
      }

      setData({
        fileName: "",
        numPages: "",
        rupeesPerPage: "",
        date: "",
        advname: Data.advname,
        totalamount: "",
      });
    } catch (error) {
      alert(error)
      // console.error("There was a problem with the fetch operation:", error);
    } finally {
      setLoading(false); // Stop loading
    }
  };

  const getUser = async () => {
    setLoading(true); // Start loading
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/login/sucess`, {
        withCredentials: true,
      });

      // console.log("response", response);
      setAvailablefile((await response.data.files) || []); // Set the available files here
    } catch (error) {
      navigate("*");
    } finally {
      setLoading(false); // Stop loading
    }
  };

  useEffect(() => {
    getUser();
  }, []);

  return (
    <div>
      {loading ? (
        <div className="loader_container">
          <div className="loader"></div>
        </div> // Only show loader when loading
      ) : (
        <div className="form-container">
          <form id="myForm" onSubmit={adddata}>
            <label htmlFor="fileName">File Name:</label>
            <input
              onChange={handleChange}
              value={Data.fileName}
              type="text"
              id="fileName"
              name="fileName"
              placeholder="Enter file name"
              required
            />

            <label htmlFor="numPages">Number of Pages:</label>
            <input
              onChange={handleChange}
              value={Data.numPages}
              type="number"
              id="numPages"
              name="numPages"
              min="1"
              placeholder="Enter number of pages"
              required
            />

            <label htmlFor="rupeesPerPage">Rupees per Page:</label>
            <input
              onChange={handleChange}
              value={Data.rupeesPerPage}
              type="number"
              id="rupeesPerPage"
              name="rupeesPerPage"
              min="1"
              placeholder="Enter rupees per page"
              required
            />

            <label htmlFor="date">Select Date:</label>
            <input
              type="date"
              id="date"
              name="date"
              onChange={handleChange}
              value={Data.date}
              required
            />

            <label htmlFor="name">Select Name:</label>
            <select onClick={handleChange} id="name" name="advname" required>
              {availablefile.map((file) => (
                <option key={file.id} value={file.name}>
                  {file.name}
                </option>
              ))}
            </select>

            <button type="submit">Submit</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
